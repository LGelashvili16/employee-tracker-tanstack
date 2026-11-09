import { PlannedFeaturePage } from '#/components/common/planned-feature-page'

export function NotificationSettingsPage() {
  return (
    <PlannedFeaturePage
      title="შეტყობინებების პარამეტრები"
      items={[
        'ელფოსტისა და სხვა გარე მიწოდების არხების გამართვა.',
        'შეტყობინებების შაბლონებისა და სისტემური მოვლენების შესაბამისობის მართვა.',
        'გაგზავნის შეცდომებისა და განმეორებითი მცდელობების მიმოხილვა.',
        'საცდელი შეტყობინების გაგზავნა და შედეგის დადასტურება.',
      ]}
    />
  )
}
