import AVFoundation
import CoreImage
import ExpoModulesCore
import PDFKit
import UIKit
import Vision
import VisionKit

/// Apple Vision for the receipt form: the document scanner and text recognition. Everything runs on
/// device; a receipt never needs to leave the phone.
public class ReceiptScannerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReceiptScanner")

    /// False on the Simulator and on hardware without a usable camera, so the UI can offer upload
    /// alone rather than a button that always fails.
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
        // VNDocumentCameraViewController keeps only a weak delegate reference, so without this the
        // handler is deallocated before the user finishes.
        self.activeDelegate = delegate
        scanner.delegate = delegate
        presenter.present(scanner, animated: true)
      }
    }

    Function("isCaptureAvailable") { () -> Bool in
      AVCaptureDevice.default(for: .video) != nil
    }

    /// One shot, and it is over: a plain camera with a single shutter that resolves the moment the
    /// text is read. VNDocumentCameraViewController is a multi-page session (review screen plus a
    /// second confirm), which is wrong for a receipt shot in a hurry at a till.
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
          // Backing out is a choice, not a failure: null, the same contract as scanDocument.
          case .cancelled:
            promise.resolve(nil)
          case .failed(let message):
            promise.reject("ERR_CAPTURE_FAILED", message)
          }
        }

        // Held for the same reason as the scanner delegate: nothing else owns the controller.
        self.activeCamera = camera
        presenter.present(camera, animated: true)
      }
    }

    /// Reads text from a local image or PDF. Returns "" rather than throwing when a document has no
    /// text: an empty result is an answer.
    AsyncFunction("recognizeText") { (uri: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        guard let image = Self.loadImage(from: uri) else {
          promise.reject("ERR_UNREADABLE", "Could not open that file as an image or PDF.")
          return
        }
        promise.resolve(Self.recognizeText(in: image))
      }
    }

    /// The same recognition, with the layout kept. A receipt is two columns (labels left, money
    /// right), so each line comes back with its position and printed height: the parser finds the
    /// name by its size and the total by its row.
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

  /// Accepts photos, screenshots and PDFs (rendered at 2x so small print survives recognition).
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

  /// Redraws an image so its pixels sit the way its orientation claims. The camera returns a
  /// landscape buffer plus a rotation flag, and Vision is told `.up` throughout this file, so the
  /// flag must be resolved first or every box comes back on its side.
  fileprivate static func normalised(_ image: UIImage) -> UIImage {
    guard image.imageOrientation != .up else { return image }
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = image.scale
    return UIGraphicsImageRenderer(size: image.size, format: format).image { _ in
      image.draw(in: CGRect(origin: .zero, size: image.size))
    }
  }

  /// Flattens the receipt out of the photograph: skew turns a 3 into an 8, so Vision finds the page
  /// corners and Core Image warps them back to a rectangle (as the system scanner does).
  ///
  /// Vision and CIImage both measure up from the bottom left, so the corners need no flipping here.
  ///
  /// Returns the original whenever no page is found: a photo that is already mostly receipt reads
  /// fine, and a confident wrong crop loses the total.
  fileprivate static func flattened(_ image: UIImage) -> UIImage {
    guard let cgImage = image.cgImage else { return image }

    let request = VNDetectRectanglesRequest()
    // Receipts are tall and narrow, and a long one is narrower still.
    request.minimumAspectRatio = 0.15
    request.maximumAspectRatio = 1.0
    // Anything smaller than a fifth of frame is more likely a sign or a tile than the receipt.
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

  /// How many readings of each line to hand back. On thermal print Vision's runner-up is often the
  /// right one (an 8 read as a 3, an O as a 0), and the parser can test it against the receipt's
  /// own arithmetic.
  private static let candidateCount = 3

  /// Every recognised line, with where it sits and how tall it was printed. Vision's normalised
  /// boxes have their origin at the bottom left; they are flipped here so y grows downward.
  fileprivate static func recognize(in image: UIImage) -> [[String: Any]] {
    guard let cgImage = image.cgImage else { return [] }

    let request = VNRecognizeTextRequest()
    // Accurate beats fast when the alternative is a wrong total.
    request.recognitionLevel = .accurate

    // Off, deliberately: language correction drags unfamiliar tokens to dictionary words, which
    // is wrong for shop names, product codes and prices, and can read one storefront as different
    // names on two passes.
    request.usesLanguageCorrection = false

    request.recognitionLanguages = ["en-US", "en-CA", "fr-CA"]
    // Fine print (the tax line, the card footer) is small but load-bearing.
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
        "y": 1 - box.origin.y - box.size.height,
        "width": box.size.width,
        "height": box.size.height,
      ]
    }
  }

  fileprivate static func recognizeText(in image: UIImage) -> String {
    recognize(in: image)
      .compactMap { $0["text"] as? String }
      .joined(separator: "\n")
  }
}

private class ScannerDelegate: NSObject, VNDocumentCameraViewControllerDelegate {
  private let promise: Promise
  private let onFinish: () -> Void
  private var settled = false

  init(promise: Promise, onFinish: @escaping () -> Void) {
    self.promise = promise
    self.onFinish = onFinish
  }

  /// The delegate outlives the controller by a moment; guarding stops a stray second callback from
  /// resolving an already-settled promise.
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

    // Pages are joined into one text: a receipt spilling onto a second page is one purchase.
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

/// A plain camera with one button, deliberately not a document scanner: VisionKit's multi-page
/// session (capture, review, keep, save) is too many taps at a till. The perspective correction it
/// is valued for happens after the shutter and runs here too (see `flattened`). Only a way out and
/// a torch (dim shops) besides the shutter.
private final class ReceiptCameraViewController: UIViewController {
  enum Outcome {
    case scanned([String: Any])
    case cancelled
    case failed(String)
  }

  var onSettle: ((Outcome) -> Void)?

  private let session = AVCaptureSession()
  private let photoOutput = AVCapturePhotoOutput()
  private let videoOutput = AVCaptureVideoDataOutput()
  private let detectionQueue = DispatchQueue(label: "com.skipapps.receipt-detect")
  // startRunning blocks until the camera warms up, so it must stay off the main thread.
  private let sessionQueue = DispatchQueue(label: "com.skipapps.receipt-camera")

  private var previewLayer: AVCaptureVideoPreviewLayer?
  private var device: AVCaptureDevice?

  /// The found receipt, drawn over the preview so "it sees it" is visible before the tap.
  private let outlineLayer = CAShapeLayer()
  private var detecting = false
  private var missCount = 0

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
    outlineLayer.frame = view.bounds
  }

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

  private func setBusy(_ busy: Bool) {
    if busy { outlineLayer.opacity = 0 }
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

    // Above the preview, below the controls. CAShapeLayer animates path and opacity changes on its
    // own, so the outline glides with the receipt rather than snapping between detections.
    outlineLayer.strokeColor = UIColor.systemBlue.cgColor
    outlineLayer.fillColor = UIColor.systemBlue.withAlphaComponent(0.14).cgColor
    outlineLayer.lineWidth = 2
    outlineLayer.lineJoin = .round
    outlineLayer.opacity = 0
    outlineLayer.frame = view.bounds
    view.layer.insertSublayer(outlineLayer, above: layer)

    sessionQueue.async { [weak self] in
      guard let self else { return }

      self.session.beginConfiguration()
      // Photo preset: the total is often 8pt thermal print, and recognition cannot read detail the
      // capture never resolved.
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

      // Preview frames handed to Vision. Late frames are dropped rather than queued: an outline for
      // where the receipt was a second ago is worse than none.
      if self.session.canAddOutput(self.videoOutput) {
        self.videoOutput.alwaysDiscardsLateVideoFrames = true
        self.videoOutput.setSampleBufferDelegate(self, queue: self.detectionQueue)
        self.session.addOutput(self.videoOutput)
      }

      self.session.commitConfiguration()
      self.device = camera

      // Close focus: a receipt is held a hand's width from the lens.
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
    // A second tap while the first is developing would capture and settle twice.
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

    // Straightening and recognition are slow enough to freeze the preview still on screen.
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

extension ReceiptCameraViewController: AVCaptureVideoDataOutputSampleBufferDelegate {
  func captureOutput(
    _ output: AVCaptureOutput,
    didOutput sampleBuffer: CMSampleBuffer,
    from connection: AVCaptureConnection
  ) {
    // One request in flight at a time is the throttle; skipped frames cost nothing.
    guard !settled, !capturing, !detecting,
          let buffer = CMSampleBufferGetImageBuffer(sampleBuffer)
    else { return }
    detecting = true

    let request = VNDetectRectanglesRequest { [weak self] request, _ in
      let found = (request.results as? [VNRectangleObservation])?.first
      DispatchQueue.main.async {
        self?.showOutline(for: found)
        self?.detecting = false
      }
    }
    // The same shape rules as the post-shot flattening, so the outline promises what it delivers.
    request.minimumAspectRatio = 0.15
    request.maximumAspectRatio = 1.0
    request.minimumSize = 0.2
    request.minimumConfidence = 0.6
    request.maximumObservations = 1
    request.quadratureTolerance = 35

    // Deliberately .up: the corners come back in the sensor's landscape space, and
    // layerPointConverted below applies every rotation and crop the preview does; doing any by hand
    // here would double it.
    let handler = VNImageRequestHandler(cvPixelBuffer: buffer, orientation: .up, options: [:])
    try? handler.perform([request])
  }

  private func showOutline(for rect: VNRectangleObservation?) {
    guard let previewLayer, let rect, !settled, !capturing else {
      missCount += 1
      // A few misses before letting go: detection flickers, and a blinking outline reads as a bug.
      if missCount > 4 { outlineLayer.opacity = 0 }
      return
    }
    missCount = 0

    // Vision measures up from the bottom of the buffer; the capture-device space down from the top.
    let corners = [rect.topLeft, rect.topRight, rect.bottomRight, rect.bottomLeft].map {
      previewLayer.layerPointConverted(fromCaptureDevicePoint: CGPoint(x: $0.x, y: 1 - $0.y))
    }

    let path = UIBezierPath()
    path.move(to: corners[0])
    for corner in corners.dropFirst() { path.addLine(to: corner) }
    path.close()

    outlineLayer.path = path.cgPath
    outlineLayer.opacity = 1
  }
}
