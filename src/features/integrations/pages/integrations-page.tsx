import { PlannedFeaturePage } from '#/components/common/planned-feature-page'

export function IntegrationsPage() {
  return (
    <PlannedFeaturePage
      title="ინტეგრაციები"
      items={[
        'ელფოსტისა და ფაილების საცავის პროვაიდერებთან კავშირების მართვა.',
        'კავშირის მდგომარეობის, ბოლო შეცდომისა და შემოწმების შედეგის ჩვენება.',
        'საიდუმლო გასაღებების დაცული შეცვლა და კავშირის გაუქმება.',
        'გარე სისტემებისთვის ნებადართული მონაცემების ფარგლების განსაზღვრა.',
      ]}
    />
  )
}
