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
