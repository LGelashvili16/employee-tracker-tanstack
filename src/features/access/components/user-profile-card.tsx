import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { parseRoles, roleLabels } from '#/lib/authorization/permissions'
import { accountStatus } from '../access.presentation'
import type { EmployeeAccountRecord } from '../access.types'

const notProvided = 'არ არის მითითებული'

export function UserProfileCard({ record }: { record: EmployeeAccountRecord }) {
  const details = [
    { label: 'ელფოსტა', value: record.contactEmail ?? notProvided },
    { label: 'ტელეფონი', value: record.phone ?? notProvided },
    { label: 'თანამდებობა', value: record.jobTitle ?? notProvided },
    {
      label: 'როლი',
      value: parseRoles(record.roles)
        .map((role) => roleLabels[role])
        .join(', '),
    },
    { label: 'სტატუსი', value: accountStatus(record).label },
  ]
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>პირადი მონაცემები</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          {details.map(({ label, value }) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-words font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
