import { useState } from 'react'
import { IconRefresh, IconWifiOff } from '@tabler/icons-react'
import { useServiceWorker } from '#/hooks/use-service-worker'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'

export function PwaStatus({ online }: { online: boolean }) {
  const worker = useServiceWorker()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function update() {
    setPending(true)
    setFailed(false)
    try {
      await worker.applyUpdate()
    } catch {
      setFailed(true)
      setPending(false)
    }
  }

  if (online && !worker.updateAvailable && !worker.registrationFailed)
    return null

  return (
    <div className="fixed right-4 bottom-4 left-4 z-40 sm:left-auto sm:w-96">
      <Alert role="status" aria-live="polite" className="p-4 shadow-lg">
        {!online ? (
          <IconWifiOff aria-hidden="true" />
        ) : (
          <IconRefresh aria-hidden="true" />
        )}
        <AlertTitle>
          {!online
            ? 'ინტერნეტთან კავშირი შეწყდა'
            : worker.updateAvailable
              ? 'ახალი ვერსია ხელმისაწვდომია'
              : 'ოფლაინ ეკრანი ჯერ მიუწვდომელია'}
        </AlertTitle>
        <AlertDescription>
          {!online ? (
            <p>
              ცვლილებების შენახვას ინტერნეტი სჭირდება. ოფლაინ მოქმედებები
              მოგვიანებით ავტომატურად არ გაიგზავნება.
            </p>
          ) : worker.updateAvailable ? (
            <>
              <p>
                განახლებამდე შეინახეთ ცვლილებები ყველა გახსნილ ჩანართში. აპი
                თავიდან ჩაიტვირთება.
              </p>
              {failed ? <p>განახლება ვერ მოხერხდა. სცადეთ ხელახლა.</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={() => void update()}
                  disabled={pending}
                  aria-busy={pending}
                >
                  {pending ? (
                    <Spinner aria-hidden="true" />
                  ) : (
                    <IconRefresh aria-hidden="true" />
                  )}
                  განახლება
                </Button>
                <Button
                  variant="outline"
                  onClick={worker.dismissUpdate}
                  disabled={pending}
                >
                  მოგვიანებით
                </Button>
              </div>
            </>
          ) : (
            <>
              <p>
                აპი ინტერნეტით მუშაობს. ოფლაინ ეკრანის ჩასართავად მოგვიანებით
                გახსენით აპი ხელახლა.
              </p>
              <Button
                className="mt-3"
                variant="outline"
                onClick={worker.dismissRegistrationError}
              >
                დახურვა
              </Button>
            </>
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}
