import Vision
import Foundation
import AppKit
let args = CommandLine.arguments
let path = args[1]
let langs = args.count > 2 ? args[2].split(separator: ",").map(String.init) : []
let lc = args.count > 3 ? args[3] == "1" : false
guard let nsimage = NSImage(contentsOfFile: path), let cg = nsimage.cgImage(forProposedRect: nil, context: nil, hints: nil) else { print("no image"); exit(1) }
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = lc
if !langs.isEmpty { request.recognitionLanguages = langs }
request.minimumTextHeight = 0.008
request.revision = VNRecognizeTextRequestRevision3
let handler = VNImageRequestHandler(cgImage: cg, orientation: .up, options: [:])
do { try handler.perform([request]) } catch { print("PERFORM ERROR:", error); exit(2) }
var out: [[String: Any]] = []
for o in request.results ?? [] {
  guard let best = o.topCandidates(3).first else { continue }
  let b = o.boundingBox
  out.append(["text": best.string, "candidates": o.topCandidates(3).map{$0.string}, "confidence": best.confidence, "x": b.origin.x, "y": 1 - b.origin.y - b.size.height, "width": b.size.width, "height": b.size.height])
}
let data = try! JSONSerialization.data(withJSONObject: out, options: [.prettyPrinted, .sortedKeys])
print(String(data: data, encoding: .utf8)!)
