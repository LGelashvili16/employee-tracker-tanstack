import { FeaturePage } from './feature-page'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'

export function PlannedFeaturePage({
  title,
  items,
}: {
  title: string
  items: ReadonlyArray<string>
}) {
  return (
    <FeaturePage title={title}>
      <Card>
        <CardHeader>
          <div>
            <Badge variant="secondary">დაგეგმილია</Badge>
          </div>
          <CardTitle>სამომავლო შესაძლებლობები</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex list-disc flex-col gap-3 pl-5 text-sm">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </FeaturePage>
  )
}
