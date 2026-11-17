import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useInfiniteQuery } from '@tanstack/react-query'
import {
  IconCheck,
  IconPlus,
  IconSearch,
  IconFilter,
  IconBriefcase,
  IconX,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '#/components/ui/card'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { roleLabels } from '#/lib/authorization/permissions'
import { Badge } from '#/components/ui/badge'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from '#/components/ui/popover'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from '#/components/ui/input-group'
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
  FieldSet,
  FieldLegend,
} from '#/components/ui/field'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { readCandidates } from '../teams.functions'
import { teamCandidateFiltersSchema, teamsPageSize } from '../teams.schemas'
import { teamsKey } from '../teams.queries'
import { teamMemberRoles, TeamWorkflowError } from '../teams.rules'
import type { TeamCandidate } from './team-editor'

export function TeamMemberPicker({
  actorId,
  selected,
  disabled,
  onAdd,
}: {
  actorId: string
  selected: Array<string>
  disabled: boolean
  onAdd: (person: TeamCandidate) => void
}) {
  const [filters, setFilters] = useState(() =>
    teamCandidateFiltersSchema.parse({
      q: '',
      jobTitle: '',
      roles: ['production_specialist'],
    }),
  )
  const [draft, setDraft] = useState(filters)
  const [rolesOpen, setRolesOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const sentinel = useRef<HTMLDivElement>(null)
  const fieldId = useId()
  const form = useForm({
    defaultValues: filters,
    validators: { onChange: teamCandidateFiltersSchema },
  })
  useEffect(() => {
    const timer = setTimeout(() => {
      const parsed = teamCandidateFiltersSchema.safeParse(draft)
      if (parsed.success) {
        setFilters(parsed.data)
        if (root.current) root.current.scrollTop = 0
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [draft])
  const query = useInfiniteQuery({
    queryKey: [...teamsKey(actorId), 'candidates', 'infinite', filters],
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      const result = await readCandidates({
        data: { ...filters, page: pageParam },
        signal,
      })
      if (!result.ok) throw new TeamWorkflowError(result.message)
      return result.value
    },
    getNextPageParam: (page, _pages, pageNumber) =>
      page.items.length === teamsPageSize &&
      pageNumber * teamsPageSize < page.total
        ? pageNumber + 1
        : undefined,
    retry: false,
  })
  const {
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = query
  useEffect(() => {
    if (
      !root.current ||
      !sentinel.current ||
      !hasNextPage ||
      isFetchingNextPage ||
      isFetchNextPageError ||
      typeof IntersectionObserver === 'undefined'
    )
      return
    let requested = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !requested) {
          requested = true
          void fetchNextPage()
        }
      },
      { root: root.current, rootMargin: '80px' },
    )
    observer.observe(sentinel.current)
    return () => observer.disconnect()
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    filters,
  ])
  const items = [
    ...new Map(
      (query.data?.pages.flatMap((page) => page.items) ?? []).map((person) => [
        person.userId,
        person,
      ]),
    ).values(),
  ]
  const total = query.data?.pages[0]?.total ?? 0
  async function loadMore() {
    try {
      await fetchNextPage({ throwOnError: true })
      toast.success('თანამშრომლების სია განახლებულია.')
    } catch {
      toast.error('სიის ჩატვირთვა ვერ მოხერხდა. სცადეთ ხელახლა.')
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>თანამშრომლები</CardTitle>
        <CardDescription>მოქმედი თანამშრომლები არჩეული როლებით</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FieldGroup className="gap-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <form.Field name="q">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor={`${fieldId}-name`} className="sr-only">
                    თანამშრომლის ძიება
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <IconSearch aria-hidden="true" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id={`${fieldId}-name`}
                      disabled={disabled}
                      value={draft.q}
                      maxLength={100}
                      placeholder="სახელის ან მომხმარებლის ძიება"
                      onChange={(event) => {
                        setDraft((current) => ({
                          ...current,
                          q: event.target.value,
                        }))
                        field.handleChange(event.target.value)
                      }}
                      aria-invalid={!field.state.meta.isValid}
                    />
                    {draft.q && (
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          size="icon-xs"
                          aria-label="ძიების გასუფთავება"
                          disabled={disabled}
                          onClick={() => {
                            setDraft((current) => ({ ...current, q: '' }))
                            field.handleChange('')
                          }}
                        >
                          <IconX aria-hidden="true" />
                        </InputGroupButton>
                      </InputGroupAddon>
                    )}
                  </InputGroup>
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            <Popover open={rolesOpen} onOpenChange={setRolesOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    aria-label={`როლების ფილტრი, არჩეულია ${draft.roles.length}`}
                  />
                }
              >
                <IconFilter aria-hidden="true" />
                როლები<Badge variant="secondary">{draft.roles.length}</Badge>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-72 max-w-[calc(100vw-2rem)] gap-3 p-3"
              >
                <PopoverHeader>
                  <PopoverTitle>როლებით გაფილტვრა</PopoverTitle>
                </PopoverHeader>
                <form.Field name="roles">
                  {(field) => (
                    <FieldSet className="gap-1">
                      <FieldLegend variant="label" className="sr-only">
                        როლები
                      </FieldLegend>
                      {teamMemberRoles.map((role) => (
                        <Field
                          key={role}
                          orientation="horizontal"
                          className="rounded-md px-2 py-2 hover:bg-accent"
                        >
                          <Checkbox
                            id={`${fieldId}-${role}`}
                            checked={draft.roles.includes(role)}
                            disabled={disabled}
                            onCheckedChange={(checked) => {
                              const roles = teamMemberRoles.filter((value) =>
                                value === role
                                  ? checked
                                  : draft.roles.includes(value),
                              )
                              field.handleChange(roles)
                              setDraft((current) => ({ ...current, roles }))
                            }}
                          />
                          <FieldLabel
                            htmlFor={`${fieldId}-${role}`}
                            className="cursor-pointer text-sm font-normal"
                          >
                            {roleLabels[role]}
                          </FieldLabel>
                        </Field>
                      ))}
                      <FieldError errors={field.state.meta.errors} />
                      <div className="mt-2 flex items-center justify-between gap-2 border-t pt-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={disabled}
                          onClick={() => {
                            field.handleChange(['production_specialist'])
                            setDraft((current) => ({
                              ...current,
                              roles: ['production_specialist'],
                            }))
                          }}
                        >
                          ნაგულისხმევი
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setRolesOpen(false)}
                        >
                          მზადაა
                        </Button>
                      </div>
                    </FieldSet>
                  )}
                </form.Field>
              </PopoverContent>
            </Popover>
            <form.Field name="jobTitle">
              {(field) => (
                <Field
                  className="col-span-2"
                  data-invalid={!field.state.meta.isValid}
                >
                  <FieldLabel htmlFor={`${fieldId}-title`} className="sr-only">
                    თანამდებობით გაფილტვრა
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <IconBriefcase aria-hidden="true" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id={`${fieldId}-title`}
                      disabled={disabled}
                      value={draft.jobTitle}
                      maxLength={100}
                      placeholder="თანამდებობა, მაგალითად მემონტაჟე"
                      onChange={(event) => {
                        setDraft((current) => ({
                          ...current,
                          jobTitle: event.target.value,
                        }))
                        field.handleChange(event.target.value)
                      }}
                      aria-invalid={!field.state.meta.isValid}
                    />
                    {draft.jobTitle && (
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          size="icon-xs"
                          aria-label="თანამდებობის ფილტრის გასუფთავება"
                          disabled={disabled}
                          onClick={() => {
                            setDraft((current) => ({
                              ...current,
                              jobTitle: '',
                            }))
                            field.handleChange('')
                          }}
                        >
                          <IconX aria-hidden="true" />
                        </InputGroupButton>
                      </InputGroupAddon>
                    )}
                  </InputGroup>
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
          </div>
        </FieldGroup>
        {query.isPending ? (
          <div role="status" aria-busy="true">
            <span className="sr-only">თანამშრომლები იტვირთება</span>
            <div className="flex flex-col gap-3" aria-hidden="true">
              {[0, 1, 2].map((value) => (
                <Skeleton key={value} className="h-16 w-full" />
              ))}
            </div>
          </div>
        ) : query.isError && !query.data ? (
          <Alert variant="destructive">
            <AlertDescription>
              თანამშრომლები ვერ ჩაიტვირთა. შეცვალეთ ფილტრი ან გახსენით სია
              ხელახლა.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              ნაჩვენებია {items.length} / {total}
            </p>
            <div
              ref={root}
              className="max-h-80 overflow-y-auto overscroll-contain rounded-lg border"
              role="region"
              aria-label="თანამშრომლების სია"
              tabIndex={0}
            >
              <ul className="divide-y">
                {items.map((person) => {
                  const picked = selected.includes(person.userId)
                  return (
                    <li
                      key={person.userId}
                      className="flex flex-wrap items-center gap-3 p-3"
                    >
                      <Avatar aria-hidden="true">
                        <AvatarFallback>
                          {person.name
                            .trim()
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium break-words">{person.name}</p>
                        <p className="text-sm text-muted-foreground break-words">
                          {person.jobTitle || 'თანამდებობა მითითებული არ არის'}
                        </p>
                        {person.teamName && (
                          <Badge variant="outline" className="mt-1">
                            {person.teamName}
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant={picked ? 'secondary' : 'outline'}
                        size="sm"
                        disabled={disabled || picked}
                        onClick={() => onAdd(person)}
                      >
                        {picked ? (
                          <IconCheck aria-hidden="true" />
                        ) : (
                          <IconPlus aria-hidden="true" />
                        )}
                        {picked
                          ? 'არჩეულია'
                          : person.teamId
                            ? 'გადმოყვანის დამატება'
                            : 'დამატება'}
                      </Button>
                    </li>
                  )
                })}
              </ul>
              {!items.length && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  {filters.q || filters.jobTitle || !filters.roles.length
                    ? 'ამ ფილტრებით თანამშრომლები ვერ მოიძებნა.'
                    : 'მოქმედი თანამშრომლები არჩეული როლებით ჯერ არ არიან.'}
                </p>
              )}
              <div ref={sentinel} className="h-1" aria-hidden="true" />
              {isFetchingNextPage && (
                <div
                  className="flex items-center justify-center gap-2 p-4"
                  role="status"
                  aria-busy="true"
                >
                  <Spinner />
                  თანამშრომლები იტვირთება
                </div>
              )}
            </div>
            {hasNextPage && (
              <Button
                type="button"
                variant="outline"
                disabled={isFetchingNextPage}
                aria-busy={isFetchingNextPage}
                onClick={() => {
                  void loadMore()
                }}
              >
                {isFetchingNextPage && <Spinner />}
                {isFetchNextPageError ? 'ხელახლა ცდა' : 'მეტის ჩატვირთვა'}
              </Button>
            )}
            {isFetchNextPageError && (
              <Alert variant="destructive">
                <AlertDescription>
                  დარჩენილი თანამშრომლები ვერ ჩაიტვირთა. უკვე ჩატვირთული სია
                  შენარჩუნებულია.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
