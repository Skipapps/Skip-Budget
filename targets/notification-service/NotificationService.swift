import UserNotifications

/// Gives a Skip notification its picture: the brand logo, or the category's
/// icon when the bill or subscription has no brand.
final class NotificationService: UNNotificationServiceExtension {
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var content: UNMutableNotificationContent?
  private let lock = NSLock()
  private var delivered = false

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    let content = (request.content.mutableCopy() as? UNMutableNotificationContent) ?? UNMutableNotificationContent()
    self.content = content

    guard let card = SkipCard(userInfo: content.userInfo) else { return deliver(nil) }

    // Comfortably inside the time iOS allows, so the picture either arrives or
    // is given up on before the extension is cut off.
    SkipArt.art(for: card, timeout: 15) { [weak self] image in
      self?.deliver(SkipArt.attachment(image, name: "art"))
    }
  }

  /// iOS is about to give up on us: send what we have, with no picture.
  override func serviceExtensionTimeWillExpire() {
    deliver(nil)
  }

  /// Hands the notification back exactly once, whichever path gets here first.
  private func deliver(_ attachment: UNNotificationAttachment?) {
    lock.lock()
    defer { lock.unlock() }
    guard !delivered, let contentHandler, let content else { return }
    delivered = true
    if let attachment { content.attachments = [attachment] }
    contentHandler(content)
  }
}
