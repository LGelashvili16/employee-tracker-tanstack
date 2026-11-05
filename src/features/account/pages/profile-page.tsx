import { getRouteApi } from '@tanstack/react-router'
import { FeaturePage } from '#/components/common/feature-page'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { roleLabels } from '#/lib/authorization/permissions'
import { accountContent } from '../account.content'

const authenticatedRoute = getRouteApi('/_authenticated')
export function ProfilePage() {
  const { actor } = authenticatedRoute.useRouteContext()
  return (
    <FeaturePage {...accountContent.profile}>
      <Card>
        <CardHeader>
          <CardTitle>ანგარიშის ინფორმაცია</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">სახელი</dt>
              <dd>{actor.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ელფოსტა</dt>
              <dd>{actor.email ?? 'არ არის მითითებული'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">როლები</dt>
              <dd>{actor.roles.map((role) => roleLabels[role]).join(', ')}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </FeaturePage>
  )
}
