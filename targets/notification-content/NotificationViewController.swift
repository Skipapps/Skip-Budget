import SwiftUI
import UIKit
import UserNotifications
import UserNotificationsUI

/// What the card shows; published so the logo can arrive after the card does.
final class CardModel: ObservableObject {
  @Published var card: SkipCard?
  @Published var logo: UIImage?
}

/// The press-and-hold view of a Skip notification.
final class NotificationViewController: UIViewController, UNNotificationContentExtension {
  private let model = CardModel()
  private var host: UIHostingController<CardView>?

  override func viewDidLoad() {
    super.viewDidLoad()
    let host = UIHostingController(rootView: CardView(model: model))
    host.view.backgroundColor = .clear
    host.view.translatesAutoresizingMaskIntoConstraints = false
    addChild(host)
    view.addSubview(host.view)
    NSLayoutConstraint.activate([
      host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      host.view.topAnchor.constraint(equalTo: view.topAnchor),
      host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
    ])
    host.didMove(toParent: self)
    self.host = host
  }

  func didReceive(_ notification: UNNotification) {
    let content = notification.request.content
    let card = SkipCard(userInfo: content.userInfo) ?? SkipCard(title: content.title, body: content.body)
    model.card = card

    // Set here, not only in the registered category, so "View" can name what it opens.
    extensionContext?.notificationActions = [
      UNNotificationAction(
        identifier: "view",
        title: card.view,
        options: [.foreground],
        icon: UNNotificationActionIcon(systemImageName: "arrow.up.forward.app")
      ),
      UNNotificationAction(
        identifier: "snooze",
        title: "Remind me in 1 hour",
        options: [],
        icon: UNNotificationActionIcon(systemImageName: "clock")
      ),
    ]

    // The logo the service extension attached, or fetched now if it did not get the chance.
    if card.logo != nil {
      if let attached = Self.attachedImage(content) {
        model.logo = attached
      } else if let url = card.logo {
        SkipArt.fetchLogo(url, timeout: 10) { [weak self] image in
          DispatchQueue.main.async { self?.model.logo = image }
        }
      }
    }

    fitToContent()
  }

  func didReceive(
    _ response: UNNotificationResponse,
    completionHandler completion: @escaping (UNNotificationContentExtensionResponseOption) -> Void
  ) {
    // Everything but snooze belongs to the app (src/api/push.ts reads the route).
    guard response.actionIdentifier == "snooze" else { return completion(.dismissAndForwardAction) }
    snooze(response.notification) { completion(.dismiss) }
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    fitToContent()
  }

  private func fitToContent() {
    guard let host else { return }
    let width = view.bounds.width > 0 ? view.bounds.width : UIScreen.main.bounds.width
    let height = host.sizeThatFits(in: CGSize(width: width, height: .greatestFiniteMagnitude)).height
    if abs(preferredContentSize.height - height) > 0.5 {
      preferredContentSize = CGSize(width: width, height: height)
    }
  }

  /// The same notification again in an hour, picture and card included.
  private func snooze(_ notification: UNNotification, then done: @escaping () -> Void) {
    let original = notification.request.content
    let copy = UNMutableNotificationContent()
    copy.title = original.title
    copy.subtitle = original.subtitle
    copy.body = original.body
    copy.sound = .default
    copy.categoryIdentifier = original.categoryIdentifier
    copy.threadIdentifier = original.threadIdentifier
    // To expo-notifications a local notification's data is its whole userInfo (a remote one's is
    // userInfo.body), so the payload moves up a level for the app to route the copy's tap.
    copy.userInfo = (original.userInfo["body"] as? [AnyHashable: Any]) ?? original.userInfo

    let art = model.logo ?? model.card.map { SkipArt.fallbackArt(for: $0) }
    if let art, let attachment = SkipArt.attachment(art, name: "art") {
      copy.attachments = [attachment]
    }

    let request = UNNotificationRequest(
      identifier: "skip-snooze-\(notification.request.identifier)",
      content: copy,
      trigger: UNTimeIntervalNotificationTrigger(timeInterval: 60 * 60, repeats: false)
    )
    UNUserNotificationCenter.current().add(request) { _ in
      DispatchQueue.main.async(execute: done)
    }
  }

  private static func attachedImage(_ content: UNNotificationContent) -> UIImage? {
    guard let url = content.attachments.first?.url else { return nil }
    let scoped = url.startAccessingSecurityScopedResource()
    defer { if scoped { url.stopAccessingSecurityScopedResource() } }
    return UIImage(contentsOfFile: url.path)
  }
}

private extension Color {
  /// Skip's accent, #905479, lifted for dark mode the way the app lifts it.
  static let skipAccent = Color(UIColor { traits in
    traits.userInterfaceStyle == .dark
      ? UIColor(red: 0.86, green: 0.62, blue: 0.76, alpha: 1)
      : UIColor(red: 0.565, green: 0.329, blue: 0.475, alpha: 1)
  })
}

struct CardView: View {
  @ObservedObject var model: CardModel

  var body: some View {
    if let card = model.card {
      VStack(spacing: 0) {
        Mark(card: card, logo: model.logo)
          .padding(.top, 18)

        Text(card.title)
          .font(.system(size: 17, weight: .semibold))
          .multilineTextAlignment(.center)
          .padding(.top, 12)

        if let amount = card.amount {
          Text(amount)
            .font(.system(size: 34, weight: .bold))
            .monospacedDigit()
            .padding(.top, 2)
        }

        if let note = card.note {
          Text(note)
            .font(.system(size: 15))
            .foregroundColor(.secondary)
            .multilineTextAlignment(.center)
            .padding(.top, 4)
        }

        if let when = card.when {
          Text(when)
            .font(.system(size: 13, weight: .semibold))
            .foregroundColor(.skipAccent)
            .padding(.horizontal, 14)
            .padding(.vertical, 6)
            .background(Capsule().fill(Color.skipAccent.opacity(0.14)))
            .padding(.top, 10)
        }

        if let source = card.source {
          Divider()
            .padding(.top, 16)
          HStack {
            Text(card.sourceLabel ?? "Paid from")
              .foregroundColor(.secondary)
            Spacer()
            Text(source)
              .fontWeight(.semibold)
          }
          .font(.system(size: 13))
          .padding(.top, 12)
        }
      }
      .padding(.horizontal, 16)
      .padding(.bottom, 16)
      .frame(maxWidth: .infinity)
      .accessibilityElement(children: .combine)
    }
  }
}

/// The logo in a circle; without one, the store's initials or the category's glyph.
private struct Mark: View {
  let card: SkipCard
  let logo: UIImage?

  var body: some View {
    Group {
      if let logo {
        Image(uiImage: logo)
          .resizable()
          .scaledToFill()
          .background(Color.white)
      } else if let letters = card.letters, let background = card.lettersColor, let ink = card.lettersInk {
        ZStack {
          Color(background)
          Text(letters)
            .font(.system(size: 23, weight: .semibold))
            .foregroundColor(Color(ink))
        }
      } else {
        ZStack {
          Color(UIColor.tertiarySystemFill)
          Image(systemName: SkipArt.symbolName(card.fallbackGlyph))
            .font(.system(size: 26, weight: .regular))
            .foregroundColor(.primary)
        }
      }
    }
    .frame(width: 64, height: 64)
    .clipShape(Circle())
    .overlay(Circle().stroke(Color.primary.opacity(0.08), lineWidth: 1))
    .accessibilityHidden(true)
  }
}
