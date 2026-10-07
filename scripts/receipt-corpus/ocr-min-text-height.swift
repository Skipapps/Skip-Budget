// Re-reads receipt photos with different VNRecognizeTextRequest.minimumTextHeight values, to see what
// the module's 0.008 costs. Raw and flat, same request as ReceiptScannerModule otherwise.
//
//   xcrun swiftc -O scripts/receipt-corpus/ocr-min-text-height.swift -o scripts/receipt-corpus/out/ocr-mth
//   scripts/receipt-corpus/out/ocr-mth <image dir> --heights 0.008,0.003,0.001 [--only a,b] [--force]
//
// Writes <name>.mth.json: {"raw": {"0.008": [lines], ...}, "flat": {...}, "ms": {...}} with each line as
// {text, x, y, width, height} (y top-down). Kept separate from ocr-batch.swift, which another agent owns;
// normalised / flattened / the request are copied from the module and ocr-batch.swift as they stand on
// 2026-10-07 and have to be kept in step by hand.

import CoreImage
import Foundation
import ImageIO
import Vision

func normalised(_ image: CGImage, exifOrientation: Int32) -> CGImage {
  guard exifOrientation != 1 else { return image }
  let rotated = CIImage(cgImage: image).oriented(forExifOrientation: exifOrientation)
  return CIContext().createCGImage(rotated, from: rotated.extent) ?? image
}

func flattened(_ cgImage: CGImage) -> CGImage {
  let request = VNDetectRectanglesRequest()
  request.minimumAspectRatio = 0.15
  request.maximumAspectRatio = 1.0
  request.minimumSize = 0.2
  request.minimumConfidence = 0.6
  request.maximumObservations = 1
  request.quadratureTolerance = 35

  let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
  guard (try? handler.perform([request])) != nil,
        let page = request.results?.first
  else { return cgImage }

  let source = CIImage(cgImage: cgImage)
  let size = source.extent.size
  let corner = { (point: CGPoint) -> CIVector in
    CIVector(x: point.x * size.width, y: point.y * size.height)
  }

  guard let filter = CIFilter(name: "CIPerspectiveCorrection") else { return cgImage }
  filter.setValue(source, forKey: kCIInputImageKey)
  filter.setValue(corner(page.topLeft), forKey: "inputTopLeft")
  filter.setValue(corner(page.topRight), forKey: "inputTopRight")
  filter.setValue(corner(page.bottomLeft), forKey: "inputBottomLeft")
  filter.setValue(corner(page.bottomRight), forKey: "inputBottomRight")

  guard let output = filter.outputImage,
        let rendered = CIContext().createCGImage(output, from: output.extent)
  else { return cgImage }
  return rendered
}

func recognize(in cgImage: CGImage, minimumTextHeight: Float) -> [[String: Any]] {
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = false
  request.recognitionLanguages = ["en-US", "en-CA", "fr-CA"]
  request.minimumTextHeight = minimumTextHeight
  request.revision = VNRecognizeTextRequestRevision3

  let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
  do { try handler.perform([request]) } catch { return [] }

  return (request.results ?? []).compactMap { observation in
    guard let best = observation.topCandidates(1).first else { return nil }
    let box = observation.boundingBox
    return [
      "text": best.string,
      "x": box.origin.x,
      "y": 1 - box.origin.y - box.size.height,
      "width": box.size.width,
      "height": box.size.height,
    ]
  }
}

var directory: String?
var heights: [Float] = [0.008, 0.003]
var only: Set<String>?
var force = false
var arguments = CommandLine.arguments.dropFirst()
while let argument = arguments.popFirst() {
  switch argument {
  case "--heights": heights = (arguments.popFirst() ?? "").split(separator: ",").compactMap { Float($0) }
  case "--only": only = Set((arguments.popFirst() ?? "").split(separator: ",").map(String.init))
  case "--force": force = true
  default: directory = argument
  }
}
guard let directory else {
  print("usage: ocr-mth <image directory> [--heights 0.008,0.003] [--only name,name] [--force]")
  exit(64)
}

let folder = URL(fileURLWithPath: directory)
let images = ((try? FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)) ?? [])
  .filter { ["png", "jpg", "jpeg"].contains($0.pathExtension.lowercased()) }
  .filter { only == nil || only!.contains($0.deletingPathExtension().lastPathComponent) }
  .sorted { $0.lastPathComponent < $1.lastPathComponent }

for (index, url) in images.enumerated() {
  let output = url.deletingPathExtension().appendingPathExtension("mth.json")
  if !force && FileManager.default.fileExists(atPath: output.path) { continue }
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let decoded = CGImageSourceCreateImageAtIndex(source, 0, nil)
  else { continue }
  let orientation = ((CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any])?[kCGImagePropertyOrientation] as? Int32) ?? 1
  let upright = normalised(decoded, exifOrientation: orientation)
  let page = flattened(upright)

  var raw: [String: Any] = [:]
  var flat: [String: Any] = [:]
  var milliseconds: [String: Double] = [:]
  for height in heights {
    var started = DispatchTime.now()
    raw[String(height)] = recognize(in: decoded, minimumTextHeight: height)
    milliseconds["raw" + String(height)] = Double(DispatchTime.now().uptimeNanoseconds - started.uptimeNanoseconds) / 1_000_000
    started = DispatchTime.now()
    flat[String(height)] = recognize(in: page, minimumTextHeight: height)
    milliseconds["flat" + String(height)] = Double(DispatchTime.now().uptimeNanoseconds - started.uptimeNanoseconds) / 1_000_000
  }
  let json: [String: Any] = ["raw": raw, "flat": flat, "ms": milliseconds, "width": decoded.width, "height": decoded.height]
  if let data = try? JSONSerialization.data(withJSONObject: json, options: [.sortedKeys]) { try? data.write(to: output) }
  FileHandle.standardError.write(Data("[\(index + 1)/\(images.count)] \(url.lastPathComponent)\n".utf8))
}
