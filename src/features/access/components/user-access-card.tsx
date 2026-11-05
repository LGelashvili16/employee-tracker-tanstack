import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { accountActionContent } from './account-action-content'
import type { AccountAction } from './account-action-content'

export function UserAccessCard({
  actions,
  onAction,
}: {
  actions: Array<AccountAction>
  onAction: (action: AccountAction) => void
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>ანგარიშის მართვა</CardTitle>
      </CardHeader>
      <CardContent>
        {actions.length ? (
          <ul className="flex flex-col divide-y">
            {actions.map((action) => {
              const content = accountActionContent[action]
              const Icon = content.confirmIcon
              return (
                <li
                  key={action}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{content.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {content.description}
                    </p>
                  </div>
                  <Button
                    variant={content.destructive ? 'destructive' : 'outline'}
                    className="shrink-0"
                    onClick={() => onAction(action)}
                  >
                    <Icon data-icon="inline-start" aria-hidden="true" />
                    {content.confirmLabel}
                  </Button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            ამ ანგარიშზე ამჟამად ხელმისაწვდომი მოქმედება არ არის.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
