import {
  IconClock,
  IconLogin,
  IconLogout,
  IconPlayerPause,
} from '@tabler/icons-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'

export function ClockControls() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconClock aria-hidden="true" />
          სამუშაო დრო
        </CardTitle>
        <CardDescription>
          დროის აღრიცხვა ჯერ არ არის გააქტიურებული.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          შესვლის, გასვლისა და შესვენების ღილაკები ხელმისაწვდომი გახდება დროის
          აღრიცხვის ჩართვის შემდეგ.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button disabled>
            <IconLogin aria-hidden="true" />
            სამუშაოს დაწყება
          </Button>
          <Button variant="outline" disabled>
            <IconPlayerPause aria-hidden="true" />
            შესვენება
          </Button>
          <Button variant="outline" disabled>
            <IconLogout aria-hidden="true" />
            სამუშაოს დასრულება
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
