import { PlannedFeaturePage } from '#/components/common/planned-feature-page'

export function SecuritySettingsPage() {
  return (
    <PlannedFeaturePage
      title="უსაფრთხოების პოლიტიკა"
      items={[
        'მოქმედი სესიებისა და მოწყობილობების მიმოხილვა.',
        'მრავალფაქტორიანი ავტორიზაციისა და ანგარიშის აღდგენის პოლიტიკა.',
        'შესვლის წარუმატებელი მცდელობებისა და საეჭვო აქტივობის მიმოხილვა.',
        'სესიის ხანგრძლივობისა და უსაფრთხოების ცვლილებების ისტორია.',
      ]}
    />
  )
}
