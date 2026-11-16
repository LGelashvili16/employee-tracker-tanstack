import { IconLockPassword } from '@tabler/icons-react'
import { FeaturePage } from '#/components/common/feature-page'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { accountContent } from '../account.content'
import { ChangePasswordForm } from '../components/change-password-form'
import { getRouteApi } from '@tanstack/react-router'
import { OwnDevices } from '#/features/attendance-security/components/own-devices'
import { AttendanceSecurityProvider } from '#/features/attendance-security/providers/attendance-security-provider'

export function SecurityPage() {
  const route = getRouteApi('/_authenticated/settings/security')
  const { actor } = route.useRouteContext()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  return (
    <div className="w-full max-w-5xl">
      <FeaturePage {...accountContent.security}>
        <AttendanceSecurityProvider key={actor.id}>
          <OwnDevices
            actorId={actor.id}
            search={{
              page: search.devicePage,
              q: search.deviceQ,
              state: search.deviceState,
              sort: search.deviceSort,
            }}
            onSearch={(next) => {
              void navigate({
                search: {
                  devicePage: next.page,
                  deviceQ: next.q,
                  deviceState: next.state,
                  deviceSort: next.sort,
                },
              })
            }}
          />
        </AttendanceSecurityProvider>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <IconLockPassword
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              პაროლის შეცვლა
            </CardTitle>
          </CardHeader>
          <CardContent className="grid items-start gap-6 lg:grid-cols-2 lg:gap-10">
            <div className="flex max-w-sm flex-col gap-3 text-sm leading-7 text-muted-foreground">
              <p>
                პაროლის შეცვლის შემდეგ სხვა მოწყობილობებზე სესიები დასრულდება.
              </p>
              <p>
                თუ პაროლი დაგავიწყდათ, სთხოვეთ ადმინისტრატორს აღდგენის კოდი.
              </p>
            </div>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </FeaturePage>
    </div>
  )
}
