import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'
import { Alert, AlertDescription } from '#/components/ui/alert'
import {
  hasPermission,
  parseRoles,
  roleLabels,
} from '#/lib/authorization/permissions'
import { listAccounts } from '../access.functions'
import { ProvisionAccountForm } from './provision-account-form'
import { AccountCodeDialog } from './account-code-dialog'
import {
  AccountActionDialog,
  accountActionLabels,
} from './account-action-dialog'
import type { EmployeeAccountRecord, IssuedAccountCode } from '../access.types'
import type { Actor } from '#/lib/authorization/actor'

type Action = keyof typeof accountActionLabels
const stateLabels: Record<string, string> = {
  invited: 'გასააქტიურებელი',
  active: 'აქტიური',
  suspended: 'შეჩერებული',
}

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
    queryKey: ['employee-accounts', page],
    queryFn: () => listAccounts({ data: { page } }),
    retry: false,
    staleTime: 0,
  })
  const [issuedCode, setIssuedCode] = useState<IssuedAccountCode | null>(null)
  const [selected, setSelected] = useState<{
    target: EmployeeAccountRecord
    action: Action
  } | null>(null)
  const data = query.data?.ok ? query.data.value : null
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">თანამშრომლების ანგარიშები</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ადმინისტრატორი ქმნის ანგარიშს. თანამშრომელი თავად ირჩევს პაროლს.
          აღდგენა იყენებს არსებულ ანგარიშს.
        </p>
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <section
          aria-label="თანამშრომლების ანგარიშების სია"
          className="min-w-0 space-y-3"
        >
          {query.isPending ? (
            <div
              role="status"
              aria-busy="true"
              aria-label="ანგარიშები იტვირთება"
            >
              <div aria-hidden="true" className="space-y-3">
                {[1, 2, 3].map((key) => (
                  <Skeleton key={key} className="h-32 w-full" />
                ))}
              </div>
            </div>
          ) : query.isError || !data ? (
            <Alert>
              <AlertDescription>
                {query.data && !query.data.ok
                  ? query.data.message
                  : 'ანგარიშების ჩატვირთვა ვერ მოხერხდა. გადაამოწმეთ თქვენი წვდომა.'}
              </AlertDescription>
            </Alert>
          ) : !data.records.length ? (
            <Card>
              <CardContent className="py-8 text-sm text-muted-foreground">
                ამ გვერდზე თანამშრომლის ანგარიშები არ არის.
              </CardContent>
            </Card>
          ) : (
            data.records.map((record) => {
              const actions: Array<Action> =
                record.state === 'suspended'
                  ? ['restore']
                  : record.state === 'invited'
                    ? ['issue_activation', 'suspend']
                    : ['issue_reset', 'suspend']
              const permittedActions =
                record.employmentStatus === 'active'
                  ? actions
                  : actions.filter((action) => action === 'suspend')
              const targetRoles = parseRoles(record.roles)
              const canManage =
                record.userId !== actor.id &&
                (!targetRoles.some(
                  (role) => role === 'admin' || role === 'owner',
                ) ||
                  actor.roles.includes('owner'))
              return (
                <Card key={record.userId}>
                  <CardContent className="space-y-3 py-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-semibold">{record.name}</h2>
                      <Badge variant="outline">
                        {record.employmentStatus !== 'active'
                          ? 'დასაქმება შეჩერებულია'
                          : (stateLabels[record.state] ?? 'მიუწვდომელი')}
                      </Badge>
                    </div>
                    <p className="break-all text-sm text-muted-foreground">
                      {record.code} ·{' '}
                      {targetRoles.map((role) => roleLabels[role]).join(', ')}
                      {record.contactEmail ? ` · ${record.contactEmail}` : ''}
                    </p>
                    {canManage && permittedActions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {permittedActions.map((action) => (
                          <Button
                            key={action}
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setSelected({ target: record, action })
                            }
                          >
                            {accountActionLabels[action]}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )
            })
          )}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={page === 1 || query.isFetching}
              onClick={() => onPageChange(page - 1)}
            >
              წინა
            </Button>
            <span className="text-sm">გვერდი {page}</span>
            <Button
              variant="outline"
              disabled={!data || page * 20 >= data.total || query.isFetching}
              onClick={() => onPageChange(page + 1)}
            >
              შემდეგი
            </Button>
          </div>
        </section>
        <ProvisionAccountForm
          onCode={setIssuedCode}
          canAssignRoles={hasPermission(actor.roles, 'roles.manage')}
        />
      </div>
      {selected ? (
        <AccountActionDialog
          target={selected.target}
          action={selected.action}
          onClose={() => setSelected(null)}
          onCode={setIssuedCode}
        />
      ) : null}
      {issuedCode ? (
        <AccountCodeDialog
          value={issuedCode}
          onClose={() => setIssuedCode(null)}
        />
      ) : null}
    </div>
  )
}
