import { IconAlertCircle } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import { formatGeorgianDateTime } from '#/lib/date-format'
import { gpsTimeZone } from '../gps.schemas'

const descriptions = new Map([
  ['invalid_checksum', 'პაკეტის საკონტროლო ჯამი არ ემთხვევა.'],
  ['invalid_extension', 'პაკეტის დამატებითი მონაცემები არასრულია.'],
  ['invalid_heartbeat', 'საკონტროლო სიგნალის ფორმატი არასწორია.'],
  [
    'invalid_body_length',
    'პაკეტის მონაცემების სიგრძე არ ემთხვევა სათაურში მითითებულ მნიშვნელობას.',
  ],
])

export function GpsErrorSheet({
  deviceName,
  error,
}: {
  deviceName: string
  error: { receivedAt: Date; errorCode: string | null }
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="outline" depth="raised" size="sm" />}
      >
        <IconAlertCircle aria-hidden="true" className="text-destructive" />
        შეცდომის ნახვა
      </SheetTrigger>
      <SheetContent>
        <SheetHeader className="pr-12">
          <SheetTitle>ბოლო დეკოდირების შეცდომა</SheetTitle>
          <SheetDescription className="wrap-anywhere">
            {deviceName}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <Card>
            <CardContent>
              <p className="font-medium">
                {descriptions.get(error.errorCode ?? '') ??
                  'პაკეტის დამუშავება ვერ მოხერხდა.'}
              </p>
              <time
                className="mt-2 block text-sm text-muted-foreground"
                dateTime={error.receivedAt.toISOString()}
              >
                {formatGeorgianDateTime(
                  error.receivedAt.toISOString(),
                  gpsTimeZone,
                  true,
                )}
              </time>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}
