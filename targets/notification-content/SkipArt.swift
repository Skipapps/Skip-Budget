import UIKit
import UserNotifications

// Shared by targets/notification-service and targets/notification-content: keep the two copies
// identical. Each extension is its own target, and target folders cannot share a source file.

/// What a Skip notification carries for its card: `userInfo.body.card`, as
/// written by supabase/functions/send-push/card.ts. A snoozed copy, being a
/// local notification, carries the same dictionary at the top of `userInfo`.
struct SkipCard {
  let kind: String
  let title: String
  let amount: String?
  let when: String?
  let note: String?
  let sourceLabel: String?
  let source: String?
  let logo: URL?
  let glyph: String?
  let view: String

  init?(userInfo: [AnyHashable: Any]) {
    let payload = (userInfo["body"] as? [String: Any]) ?? (userInfo as? [String: Any])
    guard let raw = payload?["card"] as? [String: Any], let title = raw["title"] as? String else {
      return nil
    }
    kind = raw["kind"] as? String ?? "bill"
    self.title = title
    amount = raw["amount"] as? String
    when = raw["when"] as? String
    note = raw["note"] as? String
    sourceLabel = raw["sourceLabel"] as? String
    source = raw["source"] as? String
    logo = (raw["logo"] as? String).flatMap(URL.init(string:))
    glyph = raw["glyph"] as? String
    view = raw["view"] as? String ?? "Open Skip"
  }

  /// A notification that arrived without a card: its own words, no figures.
  init(title: String, body: String) {
    kind = "other"
    self.title = title
    amount = nil
    when = nil
    note = body
    sourceLabel = nil
    source = nil
    logo = nil
    glyph = nil
    view = "Open Skip"
  }

  /// The glyph to draw when there is no logo, or the logo will not load.
  var fallbackGlyph: String {
    if let glyph { return glyph }
    switch kind {
    case "subscription": return "repeat"
    case "card": return "card"
    case "account": return "payday"
    case "group": return "group"
    case "receipts": return "receipts"
    default: return "other"
    }
  }
}

enum SkipArt {
  /// SF Symbols for the glyph ids the server sends (the categories of src/data/glyphs.ts plus
  /// payday, card, group and receipts). Outline symbols, to match the app's Lucide icons; later
  /// names are fallbacks for iOS versions that lack the first.
  private static let symbols: [String: [String]] = [
    "housing": ["house"],
    "energy": ["bolt"],
    "water": ["drop"],
    "internet": ["wifi"],
    "mobile": ["iphone"],
    "insurance": ["checkmark.shield"],
    "loans": ["building.columns"],
    "transport": ["car"],
    "family": ["person.2"],
    "other": ["receipt", "doc.text"],
    "education": ["graduationcap"],
    "pets": ["pawprint"],
    "tv": ["tv"],
    "shopping": ["bag"],
    "travel": ["airplane"],
    "coffee": ["cup.and.saucer"],
    "music": ["music.note"],
    "waste": ["trash"],
    "software": ["macwindow"],
    "health": ["heart"],
    "groceries": ["cart"],
    "dining": ["fork.knife"],
    "fuel": ["fuelpump"],
    "pharmacy": ["pills"],
    "clothing": ["tshirt"],
    "electronics": ["laptopcomputer"],
    "home": ["sofa"],
    "beauty": ["sparkles"],
    "entertainment": ["film"],
    "fitness": ["dumbbell"],
    "news": ["newspaper"],
    "meals": ["frying.pan", "fork.knife"],
    "memberships": ["person.text.rectangle"],
    "utilities": ["bolt"],
    "telecom": ["iphone"],
    "finance": ["building.columns"],
    "payday": ["banknote"],
    "card": ["creditcard"],
    "group": ["person.3"],
    "receipts": ["receipt", "doc.text"],
    "repeat": ["arrow.triangle.2.circlepath"],
  ]

  static func symbolName(_ glyph: String) -> String {
    let names = (symbols[glyph] ?? []) + ["receipt", "doc.text"]
    return names.first { UIImage(systemName: $0) != nil } ?? "doc.text"
  }

  /// A square thumbnail tile with the glyph on it, light and neutral like the app's category tiles.
  static func glyphTile(_ glyph: String, side: CGFloat = 300) -> UIImage {
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    return UIGraphicsImageRenderer(size: CGSize(width: side, height: side), format: format).image { context in
      UIColor(red: 0.925, green: 0.918, blue: 0.898, alpha: 1).setFill()
      context.fill(CGRect(x: 0, y: 0, width: side, height: side))
      let config = UIImage.SymbolConfiguration(pointSize: side * 0.4, weight: .regular)
      guard
        let symbol = UIImage(systemName: symbolName(glyph), withConfiguration: config)?
          .withTintColor(UIColor(white: 0.235, alpha: 1), renderingMode: .alwaysOriginal)
      else { return }
      let size = symbol.size
      symbol.draw(in: CGRect(x: (side - size.width) / 2, y: (side - size.height) / 2, width: size.width, height: size.height))
    }
  }

  /// A brand logo from the brand-logos bucket. Nil on any failure: no network,
  /// a slow answer, anything that is not an image.
  static func fetchLogo(_ url: URL, timeout: TimeInterval, completion: @escaping (UIImage?) -> Void) {
    let request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad, timeoutInterval: timeout)
    URLSession.shared.dataTask(with: request) { data, response, _ in
      let ok = (response as? HTTPURLResponse).map { (200..<300).contains($0.statusCode) } ?? false
      completion(ok ? data.flatMap(UIImage.init(data:)) : nil)
    }.resume()
  }

  static func art(for card: SkipCard, timeout: TimeInterval, completion: @escaping (UIImage) -> Void) {
    guard let url = card.logo else { return completion(glyphTile(card.fallbackGlyph)) }
    fetchLogo(url, timeout: timeout) { image in
      completion(image ?? glyphTile(card.fallbackGlyph))
    }
  }

  /// An image as a notification attachment, written to its own file: iOS moves the file into its
  /// own store when the notification is shown.
  static func attachment(_ image: UIImage, name: String) -> UNNotificationAttachment? {
    guard let data = image.pngData() else { return nil }
    let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
    do {
      try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
      let file = folder.appendingPathComponent("\(name).png")
      try data.write(to: file)
      return try UNNotificationAttachment(
        identifier: name,
        url: file,
        options: [UNNotificationAttachmentOptionsTypeHintKey: "public.png"]
      )
    } catch {
      return nil
    }
  }
}
