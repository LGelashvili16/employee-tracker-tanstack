import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  IconUsers,
  IconChevronLeft,
  IconChevronRight,
  IconUserPlus,
} from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'
import { Alert, AlertDescription } from '#/components/ui/alert'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import { hasPermission } from '#/lib/authorization/permissions'
import { listAccounts } from '../access.functions'
import { ProvisionAccountForm } from './provision-account-form'
import { AccountCodeDialog } from './account-code-dialog'
import { EmployeeAccountsTable } from './employee-accounts-table'
import type { IssuedAccountCode } from '../access.types'
import type { Actor } from '#/lib/authorization/actor'

export function EmployeeAccounts({
  page,
  onPageChange,
  actor,
}: {
  page: number
  onPageChange: (page: number) => void
  actor: Actor
}) {
  const query = useQuery({
    queryKey: ['employee-accounts', 'list', page],
    queryFn: () => listAccounts({ data: { page } }),
    retry: false,
    staleTime: 0,
  })
  const [issuedCode, setIssuedCode] = useState<IssuedAccountCode | null>(null)
  const [creating, setCreating] = useState(false)
  const [creatingBusy, setCreatingBusy] = useState(false)
  const data = query.data?.ok ? query.data.value : null
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">თანამშრომლები</h1>
        <Sheet
          open={creating}
          onOpenChange={(open) => {
            if (!creatingBusy) setCreating(open)
          }}
        >
          <SheetTrigger render={<Button />}>
            <IconUserPlus data-icon="inline-start" aria-hidden="true" />
            თანამშრომლის დამატება
          </SheetTrigger>
          <SheetContent
            side="right"
            className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
            showCloseButton={!creatingBusy}
          >
            <SheetHeader className="border-b">
              <SheetTitle>ახალი თანამშრომელი</SheetTitle>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <ProvisionAccountForm
                framed={false}
                onCode={(value) => {
                  setCreating(false)
                  setIssuedCode(value)
                }}
                onPendingChange={setCreatingBusy}
                canAssignRoles={hasPermission(actor, 'roles.manage')}
                canConfigureSchedule={hasPermission(
                  actor,
                  'attendance.configure',
                )}
              />
            </div>
          </SheetContent>
        </Sheet>
      </header>
      <div className="min-w-0">
        <Card
          aria-label="თანამშრომლების ანგარიშების სია"
          className="min-w-0 gap-0 rounded-2xl"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b pb-4">
            <CardTitle className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <IconUsers className="size-5" aria-hidden="true" />
              </span>
              <h2>ანგარიშები</h2>
            </CardTitle>
            {data ? <Badge variant="secondary">სულ {data.total}</Badge> : null}
          </CardHeader>
          <CardContent className="px-0">
            {query.isPending ? (
              <div
                role="status"
                aria-busy="true"
                aria-label="ანგარიშები იტვირთება"
              >
                <div aria-hidden="true" className="flex flex-col gap-3 p-5">
                  {[1, 2, 3].map((key) => (
                    <Skeleton key={key} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              </div>
            ) : query.isError || !data ? (
              <Alert className="mx-5 my-5 w-auto">
                <AlertDescription>
                  {query.data && !query.data.ok
                    ? query.data.message
                    : 'ანგარიშების ჩატვირთვა ვერ მოხერხდა. გადაამოწმეთ თქვენი წვდომა.'}
                </AlertDescription>
              </Alert>
            ) : !data.records.length ? (
              <div className="flex flex-col items-center gap-3 px-5 py-12 text-center text-sm text-muted-foreground">
                <IconUsers className="size-8" aria-hidden="true" />
                <p>ამ გვერდზე თანამშრომლის ანგარიშები არ არის.</p>
              </div>
            ) : (
              <EmployeeAccountsTable
                records={data.records}
                actorId={actor.id}
              />
            )}
          </CardContent>
          <CardFooter className="flex items-center justify-between gap-3 border-t py-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || query.isFetching}
              onClick={() => onPageChange(page - 1)}
            >
              <IconChevronLeft data-icon="inline-start" aria-hidden="true" />{' '}
              წინა
            </Button>
            <span className="text-xs text-muted-foreground">
              გვერდი {page}
              {data ? ` / ${Math.max(1, Math.ceil(data.total / 20))}` : ''}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!data || page * 20 >= data.total || query.isFetching}
              onClick={() => onPageChange(page + 1)}
            >
              შემდეგი{' '}
              <IconChevronRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </CardFooter>
        </Card>
      </div>
      {issuedCode ? (
        <AccountCodeDialog
          value={issuedCode}
          onClose={() => setIssuedCode(null)}
        />
      ) : null}
    </div>
  )
}
