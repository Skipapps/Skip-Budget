import AVFoundation
import CoreImage
import ExpoModulesCore
import PDFKit
import UIKit
import Vision
import VisionKit

/// Apple Vision, wrapped for the receipt form.
///
/// Two jobs: put the system document scanner on screen, and read text out of
/// an image or PDF. Both run entirely on device — a receipt is a photograph of
/// someone's spending and never needs to leave the phone.
public class ReceiptScannerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReceiptScanner")

    /// False on the Simulator and on hardware without a usable camera, so the
    /// UI can offer upload alone rather than a button that always fails.
    Function("isScanningAvailable") { () -> Bool in
      VNDocumentCameraViewController.isSupported
    }

    AsyncFunction("scanDocument") { (promise: Promise) in
      DispatchQueue.main.async {
        guard VNDocumentCameraViewController.isSupported else {
          promise.reject("ERR_UNSUPPORTED", "Document scanning is not available on this device.")
          return
        }
        guard let presenter = self.appContext?.utilities?.currentViewController() else {
          promise.reject("ERR_NO_PRESENTER", "Could not present the scanner.")
          return
        }

        let scanner = VNDocumentCameraViewController()
        let delegate = ScannerDelegate(promise: promise) { [weak self] in
          self?.activeDelegate = nil
        }
        // VNDocumentCameraViewController keeps only a weak delegate reference,
        // so without this the handler is deallocated before the user finishes.
        self.activeDelegate = delegate
        scanner.delegate = delegate
        presenter.present(scanner, animated: true)
      }
    }

    /// Whether the one-shot camera can run: any back-facing capture device.
    Function("isCaptureAvailable") { () -> Bool in
      AVCaptureDevice.default(for: .video) != nil
    }

    /// One shot, and it is over.
    ///
    /// VNDocumentCameraViewController is a multi-page session, so every capture
    /// lands on a review screen and finishing takes a second confirm on top of
    /// that. Right for a contract; wrong for a receipt, which is one page shot
    /// in a hurry at a till while someone waits behind you. This puts a plain
    /// camera on screen with a single shutter and resolves the moment the text
    /// is read — no review, no confirm.
    AsyncFunction("captureReceipt") { (promise: Promise) in
      DispatchQueue.main.async {
        guard let presenter = self.appContext?.utilities?.currentViewController() else {
          promise.reject("ERR_NO_PRESENTER", "Could not present the camera.")
          return
        }

        let camera = ReceiptCameraViewController()
        camera.modalPresentationStyle = .fullScreen
        camera.onSettle = { [weak self] outcome in
          self?.activeCamera = nil
          switch outcome {
          case .scanned(let payload):
            promise.resolve(payload)
          // Backing out is a choice, not a failure — null lets the caller say
          // nothing, which is the same contract scanDocument already has.
          case .cancelled:
            promise.resolve(nil)
          case .failed(let message):
            promise.reject("ERR_CAPTURE_FAILED", message)
          }
        }

        // Held for the same reason the scanner delegate is: once presented,
        // nothing else owns the controller and its callback would be freed.
        self.activeCamera = camera
        presenter.present(camera, animated: true)
      }
    }

    /// Reads text from a local image or PDF. Returns "" rather than throwing
    /// when a document genuinely has no text — an empty result is an answer.
    AsyncFunction("recognizeText") { (uri: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        guard let image = Self.loadImage(from: uri) else {
          promise.reject("ERR_UNREADABLE", "Could not open that file as an image or PDF.")
          return
        }
        promise.resolve(Self.recognizeText(in: image))
      }
    }

    /// The same recognition, with the layout kept.
    ///
    /// A receipt is a two-column document — labels on the left, money on the
    /// right — and flattening it to lines of text throws away the one signal
    /// that says which figure belongs to which label. Every line comes back
    /// with where it sits on the page and how tall it was printed, so the
    /// parser can find the name by its size and the total by its row.
    AsyncFunction("recognizeReceipt") { (uri: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        guard let image = Self.loadImage(from: uri) else {
          promise.reject("ERR_UNREADABLE", "Could not open that file as an image or PDF.")
          return
        }
        promise.resolve(Self.recognize(in: image))
      }
    }
  }

  private var activeDelegate: ScannerDelegate?
  private var activeCamera: ReceiptCameraViewController?

  // MARK: - Loading

  /// Accepts anything the picker can hand back: photos, screenshots, and PDFs
  /// (rendered at 2x so small print survives recognition).
  private static func loadImage(from uri: String) -> UIImage? {
    let url = uri.hasPrefix("file://") ? URL(string: uri) : URL(fileURLWithPath: uri)
    guard let url else { return nil }

    if url.pathExtension.lowercased() == "pdf" {
      guard let document = PDFDocument(url: url), let page = document.page(at: 0) else {
        return nil
      }
      let bounds = page.bounds(for: .mediaBox)
      let scale: CGFloat = 2
      let size = CGSize(width: bounds.width * scale, height: bounds.height * scale)
      return UIGraphicsImageRenderer(size: size).image { context in
        UIColor.white.set()
        context.fill(CGRect(origin: .zero, size: size))
        context.cgContext.translateBy(x: 0, y: size.height)
        context.cgContext.scaleBy(x: scale, y: -scale)
        page.draw(with: .mediaBox, to: context.cgContext)
      }
    }

    guard let data = try? Data(contentsOf: url) else { return nil }
    return UIImage(data: data)
  }

  /// Redraws an image so its pixels sit the way its orientation claims.
  ///
  /// The camera hands back a landscape buffer with a rotation flag rather than
  /// rotated pixels. Vision is told `.up` everywhere in this file, so the flag
  /// has to be resolved first or every box comes back on its side.
  fileprivate static func normalised(_ image: UIImage) -> UIImage {
    guard image.imageOrientation != .up else { return image }
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = image.scale
    return UIGraphicsImageRenderer(size: image.size, format: format).image { _ in
      image.draw(in: CGRect(origin: .zero, size: image.size))
    }
  }

  /// Flattens the receipt out of the photograph.
  ///
  /// A receipt shot at a till is never square to the lens, and skew is what
  /// turns a 3 into an 8. Vision finds the page corners and Core Image warps
  /// them back to a rectangle — the same correction the system scanner applies
  /// before it hands anything back, which is most of why its readings are good.
  ///
  /// Both Vision and CIImage measure up from the bottom left, so the corners
  /// need no flipping here; the callers that reason top-down flip their own.
  ///
  /// Returns the original whenever no page is found. A photo that is already
  /// mostly receipt reads fine, and a confident wrong crop loses the total.
  fileprivate static func flattened(_ image: UIImage) -> UIImage {
    guard let cgImage = image.cgImage else { return image }

    let request = VNDetectRectanglesRequest()
    // Receipts are tall and narrow, and a long one is narrower still.
    request.minimumAspectRatio = 0.15
    request.maximumAspectRatio = 1.0
    // Anything smaller than a fifth of frame is more likely a sign or a tile
    // than the thing being photographed.
    request.minimumSize = 0.2
    request.minimumConfidence = 0.6
    request.maximumObservations = 1
    // Thermal paper curls, so the corners are rarely square.
    request.quadratureTolerance = 35

    let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
    guard (try? handler.perform([request])) != nil,
          let page = request.results?.first
    else { return image }

    let source = CIImage(cgImage: cgImage)
    let size = source.extent.size
    let corner = { (point: CGPoint) -> CIVector in
      CIVector(x: point.x * size.width, y: point.y * size.height)
    }

    guard let filter = CIFilter(name: "CIPerspectiveCorrection") else { return image }
    filter.setValue(source, forKey: kCIInputImageKey)
    filter.setValue(corner(page.topLeft), forKey: "inputTopLeft")
    filter.setValue(corner(page.topRight), forKey: "inputTopRight")
    filter.setValue(corner(page.bottomLeft), forKey: "inputBottomLeft")
    filter.setValue(corner(page.bottomRight), forKey: "inputBottomRight")

    guard let output = filter.outputImage,
          let rendered = CIContext().createCGImage(output, from: output.extent)
    else { return image }

    return UIImage(cgImage: rendered)
  }

  // MARK: - Recognition

  /// How many readings of each line to hand back.
  ///
  /// Vision ranks its guesses, and on thermal print the runner-up is often the
  /// right one — an 8 read as a 3, an O read as a 0. The parser can test a
  /// second candidate against the receipt's own arithmetic; it cannot invent
  /// one that was never returned.
  private static let candidateCount = 3

  /// Every recognised line, with where it sits and how tall it was printed.
  ///
  /// Vision's bounding boxes are normalised with the origin at the bottom
  /// left. They are flipped here so y grows downward, because every caller
  /// reasons about a receipt from the top down.
  fileprivate static func recognize(in image: UIImage) -> [[String: Any]] {
    guard let cgImage = image.cgImage else { return [] }

    let request = VNRecognizeTextRequest()
    // Receipts are thermal-printed and often skewed; accurate beats fast when
    // the alternative is a wrong total.
    request.recognitionLevel = .accurate

    // Off, deliberately. Language correction is built for prose: it pulls
    // unfamiliar tokens towards dictionary words, which is exactly wrong for a
    // document made of shop names, product codes and prices. It is what turns
    // the same storefront into a different name on two passes.
    request.usesLanguageCorrection = false

    request.recognitionLanguages = ["en-US", "en-CA", "fr-CA"]
    // Fine print — the tax line, the card footer — is small but load-bearing.
    request.minimumTextHeight = 0.008

    if #available(iOS 16.0, *) {
      request.revision = VNRecognizeTextRequestRevision3
    }

    let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
    do {
      try handler.perform([request])
    } catch {
      return []
    }

    return (request.results ?? []).compactMap { observation in
      let candidates = observation.topCandidates(candidateCount)
      guard let best = candidates.first else { return nil }

      let box = observation.boundingBox
      return [
        "text": best.string,
        "candidates": candidates.map { $0.string },
        "confidence": best.confidence,
        "x": box.origin.x,
        // Flipped: Vision measures up from the bottom, receipts read down.
        "y": 1 - box.origin.y - box.size.height,
        "width": box.size.width,
        "height": box.size.height,
      ]
    }
  }

  /// The flat reading, for callers that only want the words.
  fileprivate static func recognizeText(in image: UIImage) -> String {
    recognize(in: image)
      .compactMap { $0["text"] as? String }
      .joined(separator: "\n")
  }
}

/// Bridges VNDocumentCameraViewController's delegate callbacks to one promise.
private class ScannerDelegate: NSObject, VNDocumentCameraViewControllerDelegate {
  private let promise: Promise
  private let onFinish: () -> Void
  private var settled = false

  init(promise: Promise, onFinish: @escaping () -> Void) {
    self.promise = promise
    self.onFinish = onFinish
  }

  /// The delegate outlives the controller by a moment; guarding means a stray
  /// second callback cannot resolve an already-settled promise.
  private func settle(_ work: () -> Void) {
    guard !settled else { return }
    settled = true
    work()
    onFinish()
  }

  func documentCameraViewController(
    _ controller: VNDocumentCameraViewController,
    didFinishWith scan: VNDocumentCameraScan
  ) {
    controller.dismiss(animated: true)

    // Multi-page scans are joined into one body of text: a receipt that spills
    // onto a second page is still one purchase.
    var pages: [String] = []
    var lines: [[String: Any]] = []
    var savedPath: String?

    for index in 0..<scan.pageCount {
      let page = scan.imageOfPage(at: index)
      let recognised = ReceiptScannerModule.recognize(in: page)
      lines.append(contentsOf: recognised)
      pages.append(recognised.compactMap { $0["text"] as? String }.joined(separator: "\n"))

      if index == 0, let data = page.jpegData(compressionQuality: 0.8) {
        let url = FileManager.default.temporaryDirectory
          .appendingPathComponent("receipt-\(UUID().uuidString).jpg")
        if (try? data.write(to: url)) != nil {
          savedPath = url.absoluteString
        }
      }
    }

    settle {
      promise.resolve([
        "text": pages.joined(separator: "\n"),
        "lines": lines,
        "imageUri": savedPath as Any,
        "pageCount": scan.pageCount,
      ])
    }
  }

  func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
    controller.dismiss(animated: true)
    // Cancelling is a choice, not a failure — null lets the caller say nothing.
    settle { promise.resolve(nil) }
  }

  func documentCameraViewController(
    _ controller: VNDocumentCameraViewController,
    didFailWithError error: Error
  ) {
    controller.dismiss(animated: true)
    settle { promise.reject("ERR_SCAN_FAILED", error.localizedDescription) }
  }
}

/// A plain camera with one button.
///
/// Deliberately not a document scanner. VisionKit's controller is built around
/// a multi-page session — capture, review, keep, then save — and every one of
/// those steps is a tap standing between someone at a till and a logged
/// receipt. The correction VisionKit is really valued for happens after the
/// shutter, not in its review screen, and that runs here too (see `flattened`).
///
/// So: preview, shutter, done. The only other controls are a way out and a
/// torch, because receipts get handed over in dim shops.
private final class ReceiptCameraViewController: UIViewController {
  enum Outcome {
    case scanned([String: Any])
    case cancelled
    case failed(String)
  }

  var onSettle: ((Outcome) -> Void)?

  private let session = AVCaptureSession()
  private let photoOutput = AVCapturePhotoOutput()
  // startRunning blocks until the camera warms up, which is long enough to drop
  // frames off the main thread's animation.
  private let sessionQueue = DispatchQueue(label: "com.skipapps.receipt-camera")

  private var previewLayer: AVCaptureVideoPreviewLayer?
  private var device: AVCaptureDevice?

  private let shutter = UIButton(type: .custom)
  private let closeButton = UIButton(type: .system)
  private let torchButton = UIButton(type: .system)
  private let hint = UILabel()
  private let spinner = UIActivityIndicatorView(style: .large)

  private var settled = false
  private var capturing = false

  // MARK: - Lifecycle

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .black
    buildInterface()
    requestAccessThenStart()
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    previewLayer?.frame = view.bounds
  }

  /// Portrait only, matching the app — a receipt is read down the page anyway.
  override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }
  override var prefersStatusBarHidden: Bool { true }

  // MARK: - Interface

  private func buildInterface() {
    closeButton.setImage(UIImage(systemName: "xmark"), for: .normal)
    closeButton.tintColor = .white
    closeButton.accessibilityLabel = "Close the camera"
    closeButton.addTarget(self, action: #selector(handleClose), for: .touchUpInside)

    torchButton.setImage(UIImage(systemName: "bolt.slash.fill"), for: .normal)
    torchButton.tintColor = .white
    torchButton.accessibilityLabel = "Torch off"
    torchButton.addTarget(self, action: #selector(toggleTorch), for: .touchUpInside)
    torchButton.isHidden = true

    hint.text = "Fit the whole receipt in frame"
    hint.textColor = UIColor.white.withAlphaComponent(0.85)
    hint.font = .systemFont(ofSize: 14, weight: .medium)
    hint.textAlignment = .center
    hint.numberOfLines = 2
    // Legible over whatever the camera happens to be pointed at.
    hint.layer.shadowColor = UIColor.black.cgColor
    hint.layer.shadowOpacity = 0.6
    hint.layer.shadowRadius = 3
    hint.layer.shadowOffset = .zero

    shutter.backgroundColor = .white
    shutter.layer.cornerRadius = 34
    shutter.layer.borderWidth = 4
    shutter.layer.borderColor = UIColor.white.withAlphaComponent(0.45).cgColor
    shutter.accessibilityLabel = "Take the photo"
    shutter.addTarget(self, action: #selector(handleShutter), for: .touchUpInside)

    spinner.color = .white
    spinner.hidesWhenStopped = true

    for control in [closeButton, torchButton, hint, shutter, spinner] as [UIView] {
      control.translatesAutoresizingMaskIntoConstraints = false
      view.addSubview(control)
    }

    let guide = view.safeAreaLayoutGuide
    NSLayoutConstraint.activate([
      closeButton.topAnchor.constraint(equalTo: guide.topAnchor, constant: 8),
      closeButton.leadingAnchor.constraint(equalTo: guide.leadingAnchor, constant: 20),
      closeButton.widthAnchor.constraint(equalToConstant: 44),
      closeButton.heightAnchor.constraint(equalToConstant: 44),

      torchButton.centerYAnchor.constraint(equalTo: closeButton.centerYAnchor),
      torchButton.trailingAnchor.constraint(equalTo: guide.trailingAnchor, constant: -20),
      torchButton.widthAnchor.constraint(equalToConstant: 44),
      torchButton.heightAnchor.constraint(equalToConstant: 44),

      hint.leadingAnchor.constraint(equalTo: guide.leadingAnchor, constant: 32),
      hint.trailingAnchor.constraint(equalTo: guide.trailingAnchor, constant: -32),
      hint.bottomAnchor.constraint(equalTo: shutter.topAnchor, constant: -28),

      shutter.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      shutter.bottomAnchor.constraint(equalTo: guide.bottomAnchor, constant: -32),
      shutter.widthAnchor.constraint(equalToConstant: 68),
      shutter.heightAnchor.constraint(equalToConstant: 68),

      spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor),
    ])
  }

  /// Everything except the preview, dimmed while the shot is being read.
  private func setBusy(_ busy: Bool) {
    shutter.isEnabled = !busy
    shutter.alpha = busy ? 0.4 : 1
    torchButton.isEnabled = !busy
    hint.text = busy ? "Reading the receipt…" : "Fit the whole receipt in frame"
    if busy { spinner.startAnimating() } else { spinner.stopAnimating() }
  }

  // MARK: - Session

  private func requestAccessThenStart() {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      configureAndStart()
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        DispatchQueue.main.async {
          guard let self else { return }
          granted
            ? self.configureAndStart()
            : self.settle(.failed("Skip needs camera access to scan a receipt."))
        }
      }
    default:
      settle(.failed("Camera access is off for Skip. Turn it on in Settings to scan."))
    }
  }

  private func configureAndStart() {
    let layer = AVCaptureVideoPreviewLayer(session: session)
    layer.videoGravity = .resizeAspectFill
    layer.frame = view.bounds
    view.layer.insertSublayer(layer, at: 0)
    previewLayer = layer

    sessionQueue.async { [weak self] in
      guard let self else { return }

      self.session.beginConfiguration()
      // Photo preset: the total is often 8pt thermal print, and recognition
      // cannot read detail the capture never resolved.
      self.session.sessionPreset = .photo

      guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
              ?? AVCaptureDevice.default(for: .video),
            let input = try? AVCaptureDeviceInput(device: camera),
            self.session.canAddInput(input),
            self.session.canAddOutput(self.photoOutput)
      else {
        self.session.commitConfiguration()
        DispatchQueue.main.async { self.settle(.failed("This device has no camera to scan with.")) }
        return
      }

      self.session.addInput(input)
      self.session.addOutput(self.photoOutput)
      self.session.commitConfiguration()
      self.device = camera

      // Close focus, because a receipt is held a hand's width from the lens.
      if (try? camera.lockForConfiguration()) != nil {
        if camera.isFocusModeSupported(.continuousAutoFocus) {
          camera.focusMode = .continuousAutoFocus
        }
        if camera.isAutoFocusRangeRestrictionSupported {
          camera.autoFocusRangeRestriction = .near
        }
        camera.unlockForConfiguration()
      }

      self.session.startRunning()

      DispatchQueue.main.async {
        self.torchButton.isHidden = !camera.hasTorch
      }
    }
  }

  // MARK: - Actions

  @objc private func handleClose() {
    settle(.cancelled)
  }

  @objc private func toggleTorch() {
    guard let device, device.hasTorch, (try? device.lockForConfiguration()) != nil else { return }
    let turningOn = device.torchMode != .on
    device.torchMode = turningOn ? .on : .off
    device.unlockForConfiguration()

    torchButton.setImage(UIImage(systemName: turningOn ? "bolt.fill" : "bolt.slash.fill"), for: .normal)
    torchButton.accessibilityLabel = turningOn ? "Torch on" : "Torch off"
  }

  @objc private func handleShutter() {
    // A second tap while the first is still developing would capture twice and
    // settle the promise twice.
    guard !capturing, !settled, session.isRunning else { return }
    capturing = true
    setBusy(true)

    let settings = AVCapturePhotoSettings()
    if let device, device.hasTorch, device.torchMode == .on {
      settings.flashMode = .on
    }
    photoOutput.capturePhoto(with: settings, delegate: self)
  }

  // MARK: - Settling

  /// Resolves once and once only, and always leaves the torch off behind it.
  private func settle(_ outcome: Outcome) {
    guard !settled else { return }
    settled = true

    if let device, device.hasTorch, device.torchMode == .on,
       (try? device.lockForConfiguration()) != nil {
      device.torchMode = .off
      device.unlockForConfiguration()
    }

    sessionQueue.async { [session] in
      if session.isRunning { session.stopRunning() }
    }

    let finish = onSettle
    onSettle = nil
    dismiss(animated: true) { finish?(outcome) }
  }
}

extension ReceiptCameraViewController: AVCapturePhotoCaptureDelegate {
  func photoOutput(
    _ output: AVCapturePhotoOutput,
    didFinishProcessingPhoto photo: AVCapturePhoto,
    error: Error?
  ) {
    capturing = false

    if let error {
      setBusy(false)
      settle(.failed(error.localizedDescription))
      return
    }

    guard let data = photo.fileDataRepresentation(), let image = UIImage(data: data) else {
      setBusy(false)
      settle(.failed("That photo could not be read."))
      return
    }

    // Straightening and recognition are both slow enough to freeze the preview,
    // and the preview is still on screen until this finishes.
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      let page = ReceiptScannerModule.flattened(ReceiptScannerModule.normalised(image))
      let lines = ReceiptScannerModule.recognize(in: page)
      let text = lines.compactMap { $0["text"] as? String }.joined(separator: "\n")

      var savedPath: String?
      if let jpeg = page.jpegData(compressionQuality: 0.8) {
        let url = FileManager.default.temporaryDirectory
          .appendingPathComponent("receipt-\(UUID().uuidString).jpg")
        if (try? jpeg.write(to: url)) != nil { savedPath = url.absoluteString }
      }

      DispatchQueue.main.async {
        self?.settle(.scanned([
          "text": text,
          "lines": lines,
          "imageUri": savedPath as Any,
          "pageCount": 1,
        ]))
      }
    }
  }
}
