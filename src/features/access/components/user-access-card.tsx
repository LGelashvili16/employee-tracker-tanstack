import { IconShieldLock } from '@tabler/icons-react'
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
    <Card className="rounded-2xl py-5 sm:py-6">
      <CardHeader className="px-5 sm:px-6">
        <CardTitle className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <IconShieldLock className="size-5" aria-hidden="true" />
          </span>
          <h2>ანგარიშის მართვა</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 sm:px-6">
        {actions.length ? (
          <ul className="flex flex-col divide-y">
            {actions.map((action) => {
              const content = accountActionContent[action]
              const Icon = content.icon
              return (
                <li
                  key={action}
                  className="flex flex-col items-start gap-3 py-5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{content.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {content.summary}
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
