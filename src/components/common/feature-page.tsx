import { IconInbox } from '@tabler/icons-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import type { ReactNode } from 'react'

export type PageContent = { title: string; description?: string }
/** Presentation only: feature pages own their content and eventual data/workflows. */
export function FeaturePage({
  title,
  description,
  children,
}: PageContent & { children?: ReactNode }) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {/* <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          {description}
        </p> */}
      </div>
      {children ?? (
        <Card>
          <CardHeader>
            <IconInbox
              className="mb-2 size-6 text-muted-foreground"
              aria-hidden="true"
            />
            <CardTitle>ეს განყოფილება მზადდება</CardTitle>
            <CardDescription>
              ფუნქციები ეტაპობრივად გახდება ხელმისაწვდომი.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              მონაცემების მართვა ჯერ არ არის გააქტიურებული.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
