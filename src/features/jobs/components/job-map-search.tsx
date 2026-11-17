import { useId, useRef } from 'react'
import { IconSearch, IconChevronLeft, IconX } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '#/components/ui/input-group'
import { Popover, PopoverContent, PopoverTitle } from '#/components/ui/popover'
import { JobMapSearchResults } from './job-map-search-results'
import type { ResolvedLocation } from '../job-locations.types'
import type {
  JobMapSearchModel,
  MapSearchItem,
} from '../hooks/use-job-map-search'

export function JobMapSearch({
  model,
  onLocation,
  onJob,
  onShowJobs,
}: {
  model: JobMapSearchModel
  onLocation: (location: ResolvedLocation) => void
  onJob: (id: string) => void
  onShowJobs: (q: string) => void
}) {
  const anchor = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const popupId = useId()
  const open = model.open && model.valid
  if (model.minimized)
    return (
      <Button
        variant="outline"
        depth="raised"
        size="icon-lg"
        className="bg-background"
        aria-label="რუკაზე ძიების გახსნა"
        title="ძიება"
        onClick={() => {
          model.setMinimized(false)
          model.setOpen(true)
          requestAnimationFrame(() => input.current?.focus())
        }}
      >
        <IconSearch aria-hidden="true" />
      </Button>
    )
  function select(item: MapSearchItem) {
    model.setOpen(false)
    if (item.type === 'location') onLocation(item.location)
    else onJob(item.job.id)
  }
  return (
    <Popover open={open} onOpenChange={model.setOpen} modal={false}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void model.form.handleSubmit()
        }}
      >
        <model.form.Field name="q">
          {(field) => (
            <Field data-invalid={!field.state.meta.isValid}>
              <FieldLabel htmlFor="job-map-search" className="sr-only">
                მდებარეობის ან სამუშაოს ძიება
              </FieldLabel>
              <div ref={anchor}>
                <InputGroup className="h-11 bg-background shadow-md dark:bg-background">
                  <InputGroupAddon>
                    <IconSearch aria-hidden="true" />
                  </InputGroupAddon>
                  <InputGroupInput
                    ref={input}
                    id="job-map-search"
                    role="combobox"
                    aria-autocomplete="list"
                    placeholder="ქუჩა, მისამართი ან სამუშაო"
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value)
                      model.setOpen(true)
                    }}
                    onClick={() => model.setOpen(true)}
                    onBlur={field.handleBlur}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    aria-controls={open ? popupId : undefined}
                    aria-invalid={!field.state.meta.isValid}
                    aria-describedby={
                      field.state.meta.errors.length
                        ? 'job-map-search-error'
                        : undefined
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown') {
                        event.preventDefault()
                        model.setOpen(true)
                        const first =
                          popup.current?.querySelector<HTMLButtonElement>(
                            '[data-search-result]',
                          )
                        if (first) first.focus()
                        else
                          requestAnimationFrame(() =>
                            popup.current
                              ?.querySelector<HTMLButtonElement>(
                                '[data-search-result]',
                              )
                              ?.focus(),
                          )
                      }
                    }}
                  />
                  <InputGroupAddon align="inline-end">
                    {model.value ? (
                      <Button
                        type="button"
                        variant="ghost"
                        depth="raised"
                        size="icon"
                        aria-label="რუკის ძიების გასუფთავება"
                        onClick={() => {
                          field.handleChange('')
                          input.current?.focus()
                        }}
                      >
                        <IconX aria-hidden="true" />
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      depth="raised"
                      size="icon"
                      aria-label="რუკის ძიების ჩაკეცვა"
                      title="ძიების ჩაკეცვა"
                      onClick={() => {
                        model.setOpen(false)
                        model.setMinimized(true)
                      }}
                    >
                      <IconChevronLeft aria-hidden="true" />
                    </Button>
                  </InputGroupAddon>
                </InputGroup>
              </div>
              <FieldError
                id="job-map-search-error"
                errors={field.state.meta.errors}
                className="rounded-lg bg-background p-2"
              />
            </Field>
          )}
        </model.form.Field>
      </form>
      <PopoverContent
        id={popupId}
        ref={popup}
        anchor={anchor}
        align="start"
        sideOffset={8}
        initialFocus={false}
        finalFocus={(interaction) =>
          interaction === 'keyboard' ? input.current : false
        }
        className="w-(--anchor-width) max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-xl p-0"
      >
        <PopoverTitle className="sr-only">რუკის ძიების შედეგები</PopoverTitle>
        <div className="max-h-[min(28rem,50dvh,var(--available-height))] overflow-y-auto overscroll-contain p-1.5">
          <JobMapSearchResults model={model} onSelect={select} />
        </div>
        {model.jobsTotal > 5 ? (
          <div className="border-t p-2">
            <Button
              variant="outline"
              depth="raised"
              className="w-full"
              onClick={() => {
                model.setOpen(false)
                onShowJobs(model.query)
              }}
            >
              ყველა სამუშაოს ნახვა ({model.jobsTotal})
            </Button>
          </div>
        ) : null}
        <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
          მისამართები:{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            © OpenStreetMap
          </a>{' '}
          ·{' '}
          <a
            href="https://photon.komoot.io"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Photon
          </a>
        </p>
      </PopoverContent>
    </Popover>
  )
}
