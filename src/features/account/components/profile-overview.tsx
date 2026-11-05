import { useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription } from '#/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { roleLabels } from '#/lib/authorization/permissions'
import { ownProfileQueryOptions } from '../account.queries'
import { OwnPhoneForm } from './own-phone-form'
import type { Actor } from '#/lib/authorization/actor'

const notProvided = 'არ არის მითითებული'

export function ProfileOverview({ actor }: { actor: Actor }) {
  const profile = useQuery(ownProfileQueryOptions(actor.id))
  const details = [
    { label: 'სახელი', value: actor.name },
    { label: 'მომხმარებლის სახელი', value: profile.data?.code },
    { label: 'ელფოსტა', value: actor.email ?? notProvided },
    {
      label: 'თანამდებობა',
      value: profile.data ? (profile.data.jobTitle ?? notProvided) : undefined,
    },
    {
      label: 'როლები',
      value: actor.roles.map((role) => roleLabels[role]).join(', '),
    },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>ანგარიშის ინფორმაცია</CardTitle>
          {/* <CardDescription>
            ამ მონაცემების შეცვლა შეუძლია მხოლოდ ადმინისტრატორს.
          </CardDescription> */}
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm">
            {details.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd>
                  {value ?? (
                    <Skeleton className="mt-1 h-4 w-32" aria-hidden="true" />
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>საკონტაქტო ინფორმაცია</CardTitle>
          <CardDescription>
            ტელეფონის ნომერი შეგიძლიათ თავად განაახლოთ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile.isPending ? (
            <div role="status" aria-busy="true" aria-label="პროფილი იტვირთება">
              <Skeleton className="h-9 w-full max-w-xs" aria-hidden="true" />
            </div>
          ) : profile.data ? (
            <OwnPhoneForm actorId={actor.id} phone={profile.data.phone} />
          ) : (
            <Alert>
              <AlertDescription>
                პროფილის ჩატვირთვა ვერ მოხერხდა. განაახლეთ გვერდი.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
