// Runs Apple Vision over a folder of receipt images the way Skip Budget's native module does, so the
// corpus measures the shipped pipeline and not a lookalike.
//
//   xcrun swiftc -O scripts/receipt-corpus/ocr-batch.swift -o scripts/receipt-corpus/out/ocr-batch
//   scripts/receipt-corpus/out/ocr-batch scripts/receipt-corpus/out/images [--force] [--jobs N] [--only a,b]
//     [--passes legacy,next]
//
// Per image <name>.png it writes two independent groups (`--passes` picks; both by default, and
// each group is skipped when its files exist, so adding `next` never rewrites the others):
//
// legacy, the module as the first baseline measured it (kept so earlier numbers stay comparable):
//   <name>.raw.json     the app's Vision request on the untouched photo (no flattening)
//   <name>.flat.json    the same request after normalised + flattened: what the camera path shipped
//   <name>.fixed.json   the flattened page read with ["en-US","fr-FR","es-ES"] + automatic language
//   <name>.timing.json  milliseconds per pass, and what the flattening step did to the page
//
// next, the module as it is now (camera and upload paths read a photo the same way):
//   <name>.next.json         lines from `readPhoto`: upright decode (EXIF applied, pixel cap), the
//                            guarded flatten, languages en-US/es-ES/fr-FR, reading order
//   <name>.next-timing.json  milliseconds per step, how many Vision passes, which image was kept
//
// The functions below are ports of the ones in modules/receipt-scanner/ios/ReceiptScannerModule.swift
// (the legacy ones of the earlier module). They are kept in the same order with the same
// statements; only UIKit (UIImage, UIGraphicsImageRenderer) is swapped for CGImage and CIImage.

import CoreImage
import Foundation
import ImageIO
import Vision

// MARK: - Port of ReceiptScannerModule

/// Redraws an image so its pixels sit the way its orientation claims. Corpus images carry no EXIF
/// orientation, but a phone photo does, and the module resolves it before Vision sees the image.
func normalised(_ image: CGImage, exifOrientation: Int32) -> CGImage {
  guard exifOrientation != 1 else { return image }
  let rotated = CIImage(cgImage: image).oriented(forExifOrientation: exifOrientation)
  return CIContext().createCGImage(rotated, from: rotated.extent) ?? image
}

struct FlattenInfo {
  var found = false
  /// Corners of the page Vision found, top-down 0...1 (the module's coordinates are bottom-up).
  var quadTopDown: [[Double]] = []
  var confidence = 0.0
  var cropWidth = 0
  var cropHeight = 0
}

/// Flattens the receipt out of the photograph: skew turns a 3 into an 8, so Vision finds the page
/// corners and Core Image warps them back to a rectangle (as the system scanner does).
///
/// Returns the original whenever no page is found: a photo that is already mostly receipt reads
/// fine, and a confident wrong crop loses the total.
func flattened(_ cgImage: CGImage, info: inout FlattenInfo) -> CGImage {
  info = FlattenInfo(cropWidth: cgImage.width, cropHeight: cgImage.height)

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

  info.found = true
  info.confidence = Double(page.confidence)
  info.quadTopDown = [page.topLeft, page.topRight, page.bottomRight, page.bottomLeft].map {
    [Double($0.x), 1 - Double($0.y)]
  }
  info.cropWidth = rendered.width
  info.cropHeight = rendered.height
  return rendered
}

/// How many readings of each line to hand back.
let candidateCount = 3

/// Every recognised line, with where it sits and how tall it was printed. Vision's normalised
/// boxes have their origin at the bottom left; they are flipped here so y grows downward.
///
/// `languages` and `detectsLanguage` are the only knobs: the app passes ["en-US", "en-CA", "fr-CA"]
/// and never detects.
func recognize(
  in cgImage: CGImage,
  languages: [String],
  detectsLanguage: Bool
) -> (lines: [[String: Any]], error: String?) {
  let request = VNRecognizeTextRequest()
  // Accurate beats fast when the alternative is a wrong total.
  request.recognitionLevel = .accurate

  // Off, deliberately: language correction drags unfamiliar tokens to dictionary words.
  request.usesLanguageCorrection = false

  request.recognitionLanguages = languages
  if detectsLanguage {
    request.automaticallyDetectsLanguage = true
  }
  // Fine print (the tax line, the card footer) is small but load-bearing.
  request.minimumTextHeight = 0.008

  request.revision = VNRecognizeTextRequestRevision3

  let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
  do {
    try handler.perform([request])
  } catch {
    return ([], "\(error)")
  }

  let lines: [[String: Any]] = (request.results ?? []).compactMap { observation in
    let candidates = observation.topCandidates(candidateCount)
    guard let best = candidates.first else { return nil }

    let box = observation.boundingBox
    return [
      "text": best.string,
      "candidates": candidates.map { $0.string },
      "confidence": Double(best.confidence),
      "x": box.origin.x,
      "y": 1 - box.origin.y - box.size.height,
      "width": box.size.width,
      "height": box.size.height,
    ]
  }
  return (lines, nil)
}

// MARK: - Port of the current ReceiptScannerModule (the `next` pass)

/// Most pixels one decoded page may hold (module: `maxPixels`).
let maxPixels: CGFloat = 25_000_000

/// Module: `uprightPhoto(at:)`. ImageIO applies the EXIF orientation and the pixel cap in one decode.
func uprightPhoto(_ source: CGImageSource) -> CGImage? {
  guard CGImageSourceGetCount(source) > 0 else { return nil }

  let index = CGImageSourceGetPrimaryImageIndex(source)
  guard let properties = CGImageSourceCopyPropertiesAtIndex(source, index, nil) as? [CFString: Any],
        let width = properties[kCGImagePropertyPixelWidth] as? Int,
        let height = properties[kCGImagePropertyPixelHeight] as? Int,
        width > 0, height > 0
  else { return nil }

  let pixels = CGFloat(width) * CGFloat(height)
  let shrink = pixels > maxPixels ? (maxPixels / pixels).squareRoot() : 1
  let options: [CFString: Any] = [
    kCGImageSourceCreateThumbnailFromImageAlways: true,
    kCGImageSourceCreateThumbnailWithTransform: true,
    kCGImageSourceShouldCacheImmediately: true,
    kCGImageSourceThumbnailMaxPixelSize: max(1, Int(CGFloat(max(width, height)) * shrink)),
  ]
  return CGImageSourceCreateThumbnailAtIndex(source, index, options as CFDictionary)
}

/// Module: `minimumPageShare`, `minimumFlatLines`.
let minimumPageShare: CGFloat = 0.10
let minimumFlatLines = 5

struct NextInfo {
  var detectMs = 0.0
  var flattenMs = 0.0
  var recognizeMs = 0.0
  var passes = 0
  var found = false
  var pageShare = 0.0
  var quadTopDown: [[Double]] = []
  var flatLines = -1
  var wholeLines = -1
  /// "whole" (no usable page), "flat", or after a doubtful crop "flat-checked" / "whole-checked".
  var kept = ""
  var cropWidth = 0
  var cropHeight = 0
}

/// Module: `read(photo:)`.
func readPhoto(_ photo: CGImage, info: inout NextInfo) -> [[String: Any]] {
  var started = DispatchTime.now()
  let outline = pageOutline(in: photo)
  info.detectMs = milliseconds(since: started)
  info.found = outline != nil
  if let outline {
    info.pageShare = Double(area(of: outline))
    info.quadTopDown = [outline.topLeft, outline.topRight, outline.bottomRight, outline.bottomLeft].map {
      [Double($0.x), 1 - Double($0.y)]
    }
  }

  started = DispatchTime.now()
  let flat = outline.flatMap { flattened(photo, to: $0) }
  info.flattenMs = milliseconds(since: started)

  guard let outline, let flat else {
    started = DispatchTime.now()
    let lines = recognizeNext(in: photo)
    info.recognizeMs = milliseconds(since: started)
    info.passes = 1
    info.wholeLines = lines.count
    info.kept = "whole"
    info.cropWidth = photo.width
    info.cropHeight = photo.height
    return lines
  }

  started = DispatchTime.now()
  let flatLines = recognizeNext(in: flat)
  info.recognizeMs = milliseconds(since: started)
  info.passes = 1
  info.flatLines = flatLines.count
  info.cropWidth = flat.width
  info.cropHeight = flat.height
  if area(of: outline) >= minimumPageShare, flatLines.count >= minimumFlatLines {
    info.kept = "flat"
    return flatLines
  }

  started = DispatchTime.now()
  let wholeLines = recognizeNext(in: photo)
  info.recognizeMs += milliseconds(since: started)
  info.passes = 2
  info.wholeLines = wholeLines.count
  let whole = legibleCharacters(in: wholeLines)
  let flatCount = legibleCharacters(in: flatLines)
  if whole * 2 > flatCount * 3 {
    info.kept = "whole-checked"
    info.cropWidth = photo.width
    info.cropHeight = photo.height
    return wholeLines
  }
  info.kept = "flat-checked"
  return flatLines
}

/// Module: `pageOutline(in:)`.
func pageOutline(in cgImage: CGImage) -> VNRectangleObservation? {
  let request = VNDetectRectanglesRequest()
  request.minimumAspectRatio = 0.15
  request.maximumAspectRatio = 1.0
  request.minimumSize = 0.2
  request.minimumConfidence = 0.6
  request.maximumObservations = 1
  request.quadratureTolerance = 35

  let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
  guard (try? handler.perform([request])) != nil else { return nil }
  return request.results?.first
}

/// Module: `area(of:)`.
func area(of outline: VNRectangleObservation) -> CGFloat {
  let corners = [outline.topLeft, outline.topRight, outline.bottomRight, outline.bottomLeft]
  var twice: CGFloat = 0
  for (index, point) in corners.enumerated() {
    let next = corners[(index + 1) % corners.count]
    twice += point.x * next.y - next.x * point.y
  }
  return abs(twice) / 2
}

/// Module: `flattened(_:to:)`.
func flattened(_ cgImage: CGImage, to page: VNRectangleObservation) -> CGImage? {
  let source = CIImage(cgImage: cgImage)
  let size = source.extent.size
  let corner = { (point: CGPoint) -> CIVector in
    CIVector(x: point.x * size.width, y: point.y * size.height)
  }

  guard let filter = CIFilter(name: "CIPerspectiveCorrection") else { return nil }
  filter.setValue(source, forKey: kCIInputImageKey)
  filter.setValue(corner(page.topLeft), forKey: "inputTopLeft")
  filter.setValue(corner(page.topRight), forKey: "inputTopRight")
  filter.setValue(corner(page.bottomLeft), forKey: "inputBottomLeft")
  filter.setValue(corner(page.bottomRight), forKey: "inputBottomRight")

  guard let output = filter.outputImage else { return nil }
  return CIContext().createCGImage(output, from: output.extent)
}

/// Module: `legibleCharacters(in:)`. The module stores confidence as Float, the bench as Double.
func legibleCharacters(in lines: [[String: Any]]) -> Int {
  lines.reduce(0) { total, line in
    guard let text = line["text"] as? String,
          let confidence = line["confidence"] as? Double,
          confidence >= 0.3
    else { return total }
    return total + text.unicodeScalars.filter { CharacterSet.alphanumerics.contains($0) }.count
  }
}

struct Line {
  let text: String
  let candidates: [String]
  let confidence: Float
  let box: CGRect
}

/// Module: `recognize(in:)`.
func recognizeNext(in cgImage: CGImage) -> [[String: Any]] {
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = false
  request.recognitionLanguages = ["en-US", "es-ES", "fr-FR"]
  request.minimumTextHeight = 0.008
  request.revision = VNRecognizeTextRequestRevision3

  let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
  do {
    try handler.perform([request])
  } catch {
    return []
  }

  let lines: [Line] = (request.results ?? []).compactMap { observation in
    let candidates = observation.topCandidates(candidateCount)
    guard let best = candidates.first else { return nil }

    let box = observation.boundingBox
    guard box.origin.x.isFinite, box.origin.y.isFinite,
          box.size.width.isFinite, box.size.height.isFinite
    else { return nil }

    return Line(
      text: best.string,
      candidates: candidates.map { $0.string },
      confidence: best.confidence,
      box: CGRect(
        x: box.origin.x, y: 1 - box.origin.y - box.size.height,
        width: box.size.width, height: box.size.height))
  }

  return inReadingOrder(lines).map { line in
    [
      "text": line.text,
      "candidates": line.candidates,
      "confidence": Double(line.confidence),
      "x": line.box.minX,
      "y": line.box.minY,
      "width": line.box.width,
      "height": line.box.height,
    ]
  }
}

/// Module: `inReadingOrder(_:)`.
func inReadingOrder(_ lines: [Line]) -> [Line] {
  let downThePage = lines.sorted { ($0.box.midY, $0.box.minX) < ($1.box.midY, $1.box.minX) }

  var rows: [[Line]] = []
  for line in downThePage {
    if let first = rows.last?.first,
       abs(line.box.midY - first.box.midY) <= min(line.box.height, first.box.height) / 2 {
      rows[rows.count - 1].append(line)
    } else {
      rows.append([line])
    }
  }
  return rows.flatMap { row in row.sorted { $0.box.minX < $1.box.minX } }
}

// MARK: - Batch driver

let appLanguages = ["en-US", "en-CA", "fr-CA"]
let fixedLanguages = ["en-US", "fr-FR", "es-ES"]

func rounded(_ value: Double) -> Double { (value * 100).rounded() / 100 }

func milliseconds(since start: DispatchTime) -> Double {
  rounded(Double(DispatchTime.now().uptimeNanoseconds - start.uptimeNanoseconds) / 1_000_000)
}

func writeJSON(_ object: Any, to url: URL) throws {
  let data = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
  try data.write(to: url)
}

/// The `next` pass: the photo opened the way the upload path now opens it, then `readPhoto`.
func processNext(at url: URL, force: Bool) -> [String: Any]? {
  let base = url.deletingPathExtension()
  let outputs = ["next", "next-timing"].map { base.appendingPathExtension($0 + ".json") }
  if !force && outputs.allSatisfy({ FileManager.default.fileExists(atPath: $0.path) }) {
    return nil
  }

  let started = DispatchTime.now()
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let photo = uprightPhoto(source)
  else {
    FileHandle.standardError.write(Data("cannot read \(url.lastPathComponent)\n".utf8))
    return nil
  }
  let loadMs = milliseconds(since: started)

  var info = NextInfo()
  let lines = readPhoto(photo, info: &info)
  let timing: [String: Any] = [
    "width": photo.width,
    "height": photo.height,
    "loadMs": loadMs,
    "detectMs": info.detectMs,
    "flattenMs": info.flattenMs,
    "recognizeMs": info.recognizeMs,
    // Comparable with the legacy flatMs (normalise + flatten + recognise), which left the decode
    // to the raw pass; nextMs adds the decode.
    "readMs": rounded(info.detectMs + info.flattenMs + info.recognizeMs),
    "nextMs": rounded(loadMs + info.detectMs + info.flattenMs + info.recognizeMs),
    "passes": info.passes,
    "found": info.found,
    "pageShare": info.pageShare,
    "quadTopDown": info.quadTopDown,
    "flatLines": info.flatLines,
    "wholeLines": info.wholeLines,
    "kept": info.kept,
    "cropWidth": info.cropWidth,
    "cropHeight": info.cropHeight,
  ]

  do {
    try writeJSON(lines, to: outputs[0])
    try writeJSON(timing, to: outputs[1])
  } catch {
    FileHandle.standardError.write(Data("cannot write \(url.lastPathComponent): \(error)\n".utf8))
    return nil
  }
  var outcome = timing
  outcome["name"] = base.lastPathComponent
  outcome["lines"] = lines.count
  return outcome
}

func processImage(at url: URL, force: Bool) -> [String: Any]? {
  let base = url.deletingPathExtension()
  let outputs = ["raw", "flat", "fixed", "timing"].map { base.appendingPathExtension($0 + ".json") }
  if !force && outputs.allSatisfy({ FileManager.default.fileExists(atPath: $0.path) }) {
    return nil
  }

  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let decoded = CGImageSourceCreateImageAtIndex(source, 0, nil)
  else {
    FileHandle.standardError.write(Data("cannot read \(url.lastPathComponent)\n".utf8))
    return nil
  }
  let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
  let orientation = (properties?[kCGImagePropertyOrientation] as? Int32) ?? 1

  var timing: [String: Any] = ["width": decoded.width, "height": decoded.height]
  var errors: [String] = []

  // Pass 1, raw: what the upload path does (recognizeReceipt): no flattening.
  var started = DispatchTime.now()
  let raw = recognize(in: decoded, languages: appLanguages, detectsLanguage: false)
  timing["rawMs"] = milliseconds(since: started)
  if let error = raw.error { errors.append("raw: \(error)") }

  // Pass 2, flat: what the camera path does (didFinishProcessingPhoto).
  started = DispatchTime.now()
  let upright = normalised(decoded, exifOrientation: orientation)
  timing["normaliseMs"] = milliseconds(since: started)

  started = DispatchTime.now()
  var info = FlattenInfo()
  let page = flattened(upright, info: &info)
  timing["flattenMs"] = milliseconds(since: started)

  started = DispatchTime.now()
  let flat = recognize(in: page, languages: appLanguages, detectsLanguage: false)
  timing["flatRecognizeMs"] = milliseconds(since: started)
  timing["flatMs"] = rounded(
    (timing["normaliseMs"] as! Double) + (timing["flattenMs"] as! Double)
      + (timing["flatRecognizeMs"] as! Double))
  if let error = flat.error { errors.append("flat: \(error)") }

  // Pass 3, fixed: the flattened page again, with languages Vision actually has models for.
  started = DispatchTime.now()
  let fixed = recognize(in: page, languages: fixedLanguages, detectsLanguage: true)
  timing["fixedRecognizeMs"] = milliseconds(since: started)
  // Flattening is shared with the flat pass, but a build shipping this pass would pay for it once.
  timing["fixedMs"] = rounded(
    (timing["normaliseMs"] as! Double) + (timing["flattenMs"] as! Double)
      + (timing["fixedRecognizeMs"] as! Double))
  if let error = fixed.error { errors.append("fixed: \(error)") }

  timing["flattened"] = info.found
  timing["flattenConfidence"] = info.confidence
  timing["quadTopDown"] = info.quadTopDown
  timing["cropWidth"] = info.cropWidth
  timing["cropHeight"] = info.cropHeight
  timing["errors"] = errors

  do {
    try writeJSON(raw.lines, to: outputs[0])
    try writeJSON(flat.lines, to: outputs[1])
    try writeJSON(fixed.lines, to: outputs[2])
    try writeJSON(timing, to: outputs[3])
  } catch {
    FileHandle.standardError.write(Data("cannot write \(url.lastPathComponent): \(error)\n".utf8))
    return nil
  }
  timing["name"] = base.lastPathComponent
  timing["rawLines"] = raw.lines.count
  timing["flatLines"] = flat.lines.count
  timing["fixedLines"] = fixed.lines.count
  return timing
}

func percentile(_ sorted: [Double], _ fraction: Double) -> Double {
  guard !sorted.isEmpty else { return 0 }
  return sorted[min(sorted.count - 1, Int((Double(sorted.count) * fraction).rounded(.down)))]
}

func describe(_ label: String, _ values: [Double]) {
  let sorted = values.sorted()
  guard !sorted.isEmpty else { return }
  let mean = sorted.reduce(0, +) / Double(sorted.count)
  print(
    "  \(label.padding(toLength: 18, withPad: " ", startingAt: 0)) mean \(String(format: "%7.1f", mean)) ms"
      + "   median \(String(format: "%7.1f", percentile(sorted, 0.5)))"
      + "   p95 \(String(format: "%7.1f", percentile(sorted, 0.95)))"
      + "   max \(String(format: "%7.1f", sorted.last!))")
}

// MARK: - Entry point

var directory: String?
var force = false
var jobs = 1
var only: Set<String>?
var passes: Set<String> = ["legacy", "next"]

var arguments = CommandLine.arguments.dropFirst()
while let argument = arguments.popFirst() {
  switch argument {
  case "--force": force = true
  case "--jobs": jobs = max(1, Int(arguments.popFirst() ?? "1") ?? 1)
  case "--only": only = Set((arguments.popFirst() ?? "").split(separator: ",").map(String.init))
  case "--passes": passes = Set((arguments.popFirst() ?? "").split(separator: ",").map(String.init))
  default: directory = argument
  }
}

guard let directory, !passes.isEmpty, passes.isSubset(of: ["legacy", "next"]) else {
  print("usage: ocr-batch <image directory> [--force] [--jobs N] [--only name,name] [--passes legacy,next]")
  exit(64)
}

let folder = URL(fileURLWithPath: directory)
let images = ((try? FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)) ?? [])
  .filter { ["png", "jpg", "jpeg"].contains($0.pathExtension.lowercased()) }
  .filter { only == nil || only!.contains($0.deletingPathExtension().lastPathComponent) }
  .sorted { $0.lastPathComponent < $1.lastPathComponent }

print("\(images.count) images in \(directory), \(jobs) job(s). Timings are only meaningful with --jobs 1.")

let results = NSMutableArray()
let nextResults = NSMutableArray()
let lock = NSLock()
let wallStart = DispatchTime.now()
var done = 0

/// One image, start to finish. Serial by default so each pass is timed alone on the machine.
func handle(_ index: Int) {
  // Each image's CGImage and Vision requests are local, so a pass never shares state.
  autoreleasepool {
    let outcome = passes.contains("legacy") ? processImage(at: images[index], force: force) : nil
    let next = passes.contains("next") ? processNext(at: images[index], force: force) : nil
    lock.lock()
    done += 1
    if let outcome {
      results.add(outcome)
      FileHandle.standardError.write(
        Data(
          "[\(done)/\(images.count)] \(outcome["name"]!) raw \(outcome["rawMs"]!) ms (\(outcome["rawLines"]!)), flat \(outcome["flatMs"]!) ms (\(outcome["flatLines"]!), flattened \(outcome["flattened"]!)), fixed \(outcome["fixedMs"]!) ms (\(outcome["fixedLines"]!))\n"
            .utf8))
    }
    if let next {
      nextResults.add(next)
      FileHandle.standardError.write(
        Data(
          "[\(done)/\(images.count)] \(next["name"]!) next \(next["nextMs"]!) ms (\(next["lines"]!) lines, \(next["passes"]!) pass(es), kept \(next["kept"]!))\n"
            .utf8))
    }
    lock.unlock()
  }
}

if jobs == 1 {
  for index in 0..<images.count { handle(index) }
} else {
  let slots = DispatchSemaphore(value: jobs)
  DispatchQueue.concurrentPerform(iterations: images.count) { index in
    slots.wait()
    handle(index)
    slots.signal()
  }
}

let timings = (results as? [[String: Any]]) ?? []
let nextTimings = (nextResults as? [[String: Any]]) ?? []
print("processed \(max(timings.count, nextTimings.count)) image(s) in \(String(format: "%.1f", milliseconds(since: wallStart) / 1000)) s wall")
func column(_ key: String) -> [Double] { timings.compactMap { $0[key] as? Double } }
if !timings.isEmpty {
  print("per-image time (this run):")
  describe("raw", column("rawMs"))
  describe("flat total", column("flatMs"))
  describe("  normalise", column("normaliseMs"))
  describe("  flatten", column("flattenMs"))
  describe("  recognize", column("flatRecognizeMs"))
  describe("fixed total", column("fixedMs"))
  describe("  recognize", column("fixedRecognizeMs"))
  let flattenedCount = timings.filter { ($0["flattened"] as? Bool) == true }.count
  print("  flattening found a page in \(flattenedCount) of \(timings.count)")
}

func nextColumn(_ key: String) -> [Double] { nextTimings.compactMap { $0[key] as? Double } }
if !nextTimings.isEmpty {
  print("next pass, per-image time (this run):")
  describe("next total", nextColumn("nextMs"))
  describe("  decode upright", nextColumn("loadMs"))
  describe("  find page", nextColumn("detectMs"))
  describe("  flatten", nextColumn("flattenMs"))
  describe("  recognize", nextColumn("recognizeMs"))
  var kept: [String: Int] = [:]
  for timing in nextTimings { kept[timing["kept"] as? String ?? "?", default: 0] += 1 }
  let twice = nextTimings.filter { ($0["passes"] as? Int) == 2 }.count
  print("  kept \(kept.sorted { $0.key < $1.key }.map { "\($0.key) \($0.value)" }.joined(separator: ", ")); two Vision passes on \(twice) of \(nextTimings.count)")
}
