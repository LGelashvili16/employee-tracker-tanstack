import { IconUser } from '@tabler/icons-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { EmployeeAccountRecord } from '../access.types'

const notProvided = 'არ არის მითითებული'

export function UserProfileCard({ record }: { record: EmployeeAccountRecord }) {
  const details = [
    { label: 'ელფოსტა', value: record.contactEmail ?? notProvided },
    { label: 'ტელეფონი', value: record.phone ?? notProvided },
    { label: 'თანამდებობა', value: record.jobTitle ?? notProvided },
  ]
  return (
    <Card className="rounded-2xl py-5 sm:py-6">
      <CardHeader className="px-5 sm:px-6">
        <CardTitle className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <IconUser className="size-5" aria-hidden="true" />
          </span>
          <h2>პირადი მონაცემები</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 sm:px-6">
        <dl className="grid gap-x-6 gap-y-5 text-sm sm:grid-cols-3">
          {details.map(({ label, value }) => (
            <div key={label} className="min-w-0">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="mt-2 wrap-anywhere font-medium leading-6">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
