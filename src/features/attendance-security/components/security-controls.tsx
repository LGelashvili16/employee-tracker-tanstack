import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { DataPagination } from '#/components/common/data-pagination'
import { Badge } from '#/components/ui/badge'

export function SecuritySubmit({
  pending,
  children,
}: {
  pending: boolean
  children: React.ReactNode
}) {
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="relative min-w-44 px-8"
    >
      {pending ? (
        <Spinner className="absolute left-3" aria-hidden="true" />
      ) : null}
      {children}
    </Button>
  )
}
export function DeviceState({ state }: { state: string }) {
  const labels: Record<string, string> = {
    pending: 'დასადასტურებელი',
    approved: 'აქტიური',
    rejected: 'უარყოფილი',
    revoked: 'გაუქმებული',
  }
  return (
    <Badge
      variant={
        state === 'approved' ? 'green' : state === 'pending' ? 'yellow' : 'red'
      }
    >
      {labels[state] ?? 'შეზღუდული'}
    </Badge>
  )
}
export function SecurityPagination({
  page,
  total,
  onPage,
}: {
  page: number
  total: number
  onPage: (page: number) => void
}) {
  const last = Math.max(1, Math.ceil(total / 20))
  if (last === 1 && page === 1) return null
  return (
    <div className="border-t p-3">
      <DataPagination
        page={page}
        total={total}
        pageSize={20}
        renderLink={(next) => (
          <Button variant="ghost" size="icon" onClick={() => onPage(next)} />
        )}
      />
    </div>
  )
}
