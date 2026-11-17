import { PlannedFeaturePage } from '#/components/common/planned-feature-page'

export function CompanySettingsPage() {
  return (
    <PlannedFeaturePage
      title="კომპანიის პარამეტრები"
      items={[
        'კომპანიის დასახელების, ლოგოსა და საკონტაქტო ინფორმაციის მართვა.',
        'სამუშაო სივრცის ბრენდინგისა და ანგარიშებში გამოყენებული კომპანიის მონაცემების გამართვა.',
        'მნიშვნელოვანი პარამეტრების ცვლილებების ისტორია და პასუხისმგებელი მომხმარებლის ჩვენება.',
      ]}
    />
  )
}
