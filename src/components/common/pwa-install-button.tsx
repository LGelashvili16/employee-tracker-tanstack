import { useState } from 'react'
import { IconDownload, IconShare2 } from '@tabler/icons-react'
import { usePwa } from '#/hooks/use-pwa'
import { APP_NAME } from '#/lib/app'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { Alert, AlertDescription } from '#/components/ui/alert'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

export function PwaInstallButton() {
  const pwa = usePwa()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function install() {
    setFailed(false)
    if (!pwa.requestInstall) {
      setOpen(true)
      return
    }
    setPending(true)
    try {
      await pwa.requestInstall()
    } catch {
      setFailed(true)
      setOpen(true)
    } finally {
      setPending(false)
    }
  }

  if (pwa.installed) return null

  return (
    <>
      {/* A desktop install action is available only when the browser offers it. */}
      {pwa.requestInstall || pwa.ios ? (
        <Button
          variant="outline"
          className="h-10 min-w-10 sm:h-8"
          onClick={() => void install()}
          disabled={pending}
          aria-busy={pending}
          aria-label="აპის დაყენება"
          title="აპის დაყენება"
        >
          {pending ? (
            <Spinner aria-hidden="true" />
          ) : (
            <IconDownload aria-hidden="true" />
          )}
          <span className="hidden sm:inline">აპის დაყენება</span>
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{APP_NAME} თქვენს მოწყობილობაზე</DialogTitle>
            <DialogDescription>
              დაამატეთ აპი მთავარ ეკრანზე და გახსენით ცალკე ფანჯარაში.
            </DialogDescription>
          </DialogHeader>
          {failed ? (
            <Alert variant="destructive">
              <AlertDescription>
                დაყენების ფანჯარა ვერ გაიხსნა. სცადეთ ბრაუზერის მენიუდან.
              </AlertDescription>
            </Alert>
          ) : null}
          {pwa.ios ? (
            <ol className="list-decimal space-y-3 pl-5 leading-7">
              <li>
                ბრაუზერის მენიუში აირჩიეთ გაზიარება{' '}
                <IconShare2 className="inline size-4" aria-hidden="true" />.
              </li>
              <li>აირჩიეთ მთავარ ეკრანზე დამატება.</li>
              <li>
                დაადასტურეთ დამატება. თუ ეს პუნქტი არ ჩანს, გახსენით გვერდი
                Safari-ში.
              </li>
            </ol>
          ) : (
            <p className="leading-7">
              ბრაუზერის მისამართის ზოლში ან მენიუში მოძებნეთ აპის დაყენება. თუ
              ეს ფუნქცია არ ჩანს, სცადეთ Chrome ან Edge.
            </p>
          )}
          <p className="text-sm leading-6 text-muted-foreground">
            შესვლასა და სამუშაო მოქმედებებს ინტერნეტთან კავშირი სჭირდება.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              დახურვა
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
