import { useState, useId } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  IconTrash,
  IconChevronDown,
  IconArchive,
  IconRestore,
} from '@tabler/icons-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Badge } from '#/components/ui/badge'
import { Spinner } from '#/components/ui/spinner'
import { Alert, AlertDescription } from '#/components/ui/alert'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { SheetFooter } from '#/components/ui/sheet'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from '#/components/ui/card'
import { TeamMemberPicker } from './team-member-picker'
import { deleteTeam, restoreTeam, saveTeam } from '../teams.functions'
import { teamDraftSchema } from '../teams.schemas'
import { teamsKey } from '../teams.queries'
import { TeamWorkflowError } from '../teams.rules'
import type { readTeams } from '../teams.functions'
import type { TeamDraft, TeamSave } from '../teams.schemas'

type Detail = NonNullable<
  Extract<
    Awaited<ReturnType<typeof readTeams>>,
    { ok: true }
  >['value']['selected']
>
export type TeamCandidate = {
  userId: string
  name: string
  teamId: string | null
  teamName: string | null
}

export function TeamEditor({
  actorId,
  team,
  onClose,
  onBusyChange,
}: {
  actorId: string
  team: Detail | null
  onClose: () => void
  onBusyChange: (busy: boolean) => void
}) {
  // Keep the loaded revision with the draft so background refetches cannot authorize stale edits.
  const [initial] = useState(team)
  const nameId = useId()
  const formId = useId()
  const client = useQueryClient()
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [availabilityPending, setAvailabilityPending] = useState(false)
  async function changeAvailability(action: 'delete' | 'restore') {
    if (!initial) return
    setAvailabilityPending(true)
    onBusyChange(true)
    try {
      const result = await (action === 'delete' ? deleteTeam : restoreTeam)({
        data: { id: initial.id, version: initial.version },
      })
      if (!result.ok) throw new TeamWorkflowError(result.message)
      toast.success(
        action === 'delete' ? 'გუნდი წაიშალა.' : 'გუნდი აღდგენილია.',
      )
      await client.invalidateQueries({ queryKey: teamsKey(actorId) })
      setConfirmDelete(false)
      onClose()
    } catch (failure) {
      toast.error(
        failure instanceof TeamWorkflowError
          ? failure.message
          : 'მოქმედება ვერ შესრულდა. სცადეთ ხელახლა.',
      )
    } finally {
      setAvailabilityPending(false)
      onBusyChange(false)
    }
  }
  const [people, setPeople] = useState<
    Record<string, { name: string; teamName: string | null } | undefined>
  >(() =>
    Object.fromEntries(
      (team?.members ?? []).map((member) => [
        member.userId,
        { name: member.name, teamName: null },
      ]),
    ),
  )
  const mutation = useMutation({
    mutationFn: async (data: TeamSave) => {
      const result = await saveTeam({ data })
      if (!result.ok) throw new TeamWorkflowError(result.message)
      return result.value
    },
    retry: false,
  })
  const [defaultValues] = useState<TeamDraft>(() => ({
    name: initial?.name ?? '',
    members: (initial?.members ?? []).map((member) => ({
      userId: member.userId,
      fromTeamId: initial!.id,
    })),
    leaderId: initial?.members.find((member) => member.leader)?.userId ?? null,
    active: initial?.active ?? true,
  }))
  const form = useForm({
    defaultValues,
    validators: { onChange: teamDraftSchema, onSubmit: teamDraftSchema },
    onSubmit: async ({ value }) => {
      setError('')
      onBusyChange(true)
      try {
        await mutation.mutateAsync({
          ...value,
          name: value.name.trim(),
          id: initial?.id ?? null,
          version: initial?.version ?? null,
        })
        toast.success('გუნდის ცვლილებები შენახულია.')
        await client.invalidateQueries({ queryKey: teamsKey(actorId) })
        onClose()
      } catch (failure) {
        const message =
          failure instanceof TeamWorkflowError
            ? failure.message
            : 'შენახვა ვერ მოხერხდა. გადაამოწმეთ კავშირი და წვდომა.'
        setError(message)
        toast.error(message)
      } finally {
        onBusyChange(false)
      }
    },
  })
  return (
    <>
      <form
        id={formId}
        noValidate
        className="min-h-0 flex-1 overflow-y-auto px-6 py-6"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <FieldGroup className="gap-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Card>
            <CardHeader>
              <CardTitle>გუნდის ინფორმაცია</CardTitle>
            </CardHeader>
            <CardContent>
              <form.Field name="name">
                {(field) => (
                  <Field data-invalid={!field.state.meta.isValid}>
                    <FieldLabel htmlFor={nameId}>
                      გუნდის სახელი <span aria-hidden="true">*</span>
                    </FieldLabel>
                    <Input
                      id={nameId}
                      required
                      disabled={mutation.isPending || initial?.active === false}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={!field.state.meta.isValid}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>
            </CardContent>
          </Card>
          <form.Subscribe selector={(state) => state.values}>
            {(draft) => (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>გუნდის წევრები</CardTitle>
                    <CardAction>
                      <Badge variant="secondary">{draft.members.length}</Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {!draft.members.length && (
                      <p className="text-sm text-muted-foreground">
                        დაამატეთ თანამშრომლები ქვემოთ მოცემული სიიდან.
                      </p>
                    )}
                    {draft.members.map((member) => (
                      <div
                        key={member.userId}
                        className="flex flex-wrap items-center justify-between gap-3 border-b py-3"
                      >
                        <div className="min-w-0">
                          <p className="break-words">
                            {people[member.userId]?.name}
                          </p>
                          {draft.leaderId === member.userId && (
                            <Badge>ხელმძღვანელი</Badge>
                          )}
                          {member.fromTeamId &&
                            member.fromTeamId !== initial?.id && (
                              <p className="text-sm text-muted-foreground">
                                შენახვისას დატოვებს გუნდს „
                                {people[member.userId]?.teamName}“.
                              </p>
                            )}
                        </div>
                        {initial?.active !== false && (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={mutation.isPending}
                              onClick={() =>
                                form.setFieldValue(
                                  'leaderId',
                                  draft.leaderId === member.userId
                                    ? null
                                    : member.userId,
                                )
                              }
                            >
                              {draft.leaderId === member.userId
                                ? 'ხელმძღვანელობის მოხსნა'
                                : 'ხელმძღვანელად არჩევა'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={mutation.isPending}
                              onClick={() => {
                                form.setFieldValue(
                                  'members',
                                  draft.members.filter(
                                    (person) => person.userId !== member.userId,
                                  ),
                                )
                                if (draft.leaderId === member.userId)
                                  form.setFieldValue('leaderId', null)
                              }}
                            >
                              <IconTrash
                                data-icon="inline-start"
                                aria-hidden="true"
                              />
                              ამოღება
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    <form.Field name="members">
                      {(field) => (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </form.Field>
                    <form.Field name="leaderId">
                      {(field) => (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </form.Field>
                  </CardContent>
                </Card>
                {initial?.active !== false && (
                  <TeamMemberPicker
                    actorId={actorId}
                    selected={draft.members.map((member) => member.userId)}
                    disabled={mutation.isPending || !draft.active}
                    onAdd={(person) => {
                      setPeople((current) => ({
                        ...current,
                        [person.userId]: {
                          name: person.name,
                          teamName: person.teamName,
                        },
                      }))
                      form.setFieldValue('members', [
                        ...draft.members,
                        { userId: person.userId, fromTeamId: person.teamId },
                      ])
                    }}
                  />
                )}
                {initial?.active && (
                  <section className="border-t pt-4">
                    <Button
                      type="button"
                      variant={draft.active ? 'destructive' : 'outline'}
                      disabled={mutation.isPending || draft.members.length > 0}
                      onClick={() =>
                        form.setFieldValue('active', !draft.active)
                      }
                    >
                      <IconArchive
                        data-icon="inline-start"
                        aria-hidden="true"
                      />
                      {draft.active ? 'გუნდის გაუქმება' : 'გაუქმების მოხსნა'}
                    </Button>
                    {!draft.active && (
                      <Alert className="mt-3">
                        <AlertDescription>
                          გუნდი გაუქმდება ცვლილებების შენახვისას.
                        </AlertDescription>
                      </Alert>
                    )}
                  </section>
                )}
              </>
            )}
          </form.Subscribe>
          {initial && (
            <section className="flex flex-wrap items-center gap-3 border-t pt-4">
              {!initial.active && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={availabilityPending}
                  onClick={() => {
                    void changeAvailability('restore')
                  }}
                >
                  <IconRestore data-icon="inline-start" aria-hidden="true" />
                  გუნდის აღდგენა
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                disabled={availabilityPending || mutation.isPending}
                onClick={() => setConfirmDelete(true)}
              >
                <IconTrash data-icon="inline-start" aria-hidden="true" />
                გუნდის სამუდამოდ წაშლა
              </Button>
            </section>
          )}
          {initial && (
            <Card>
              <CardContent>
                <Collapsible className="group/history">
                  <CollapsibleTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-between"
                      />
                    }
                  >
                    ცვლილებების ისტორია
                    <IconChevronDown
                      data-icon="inline-end"
                      className="transition-transform group-data-[panel-open]/history:rotate-180"
                      aria-hidden="true"
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-4 flex flex-col gap-3">
                      {initial.history.map((event) => (
                        <div key={event.id} className="border-b pb-3 text-sm">
                          <p>
                            {event.actorName}
                            {event.subjectName ? ` · ${event.subjectName}` : ''}
                          </p>
                          <p>
                            {
                              (
                                {
                                  created: 'გუნდი შეიქმნა',
                                  renamed: 'სახელი შეიცვალა',
                                  member_added: 'წევრი დაემატა',
                                  member_removed: 'წევრი ამოღებულია',
                                  leader_changed: 'ხელმძღვანელი შეიცვალა',
                                  deactivated: 'გუნდი გაუქმდა',
                                  reactivated: 'გუნდი აღდგა',
                                } as Record<string, string>
                              )[event.action]
                            }
                          </p>
                          <p>{event.details.name}</p>
                          <time
                            dateTime={new Date(event.createdAt).toISOString()}
                            className="text-muted-foreground"
                          >
                            {new Intl.DateTimeFormat('ka-GE', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                              timeZone: 'Asia/Tbilisi',
                            }).format(new Date(event.createdAt))}
                          </time>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          )}
        </FieldGroup>
      </form>
      <Dialog
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!availabilityPending) setConfirmDelete(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>გუნდის სამუდამოდ წაშლა</DialogTitle>
            <DialogDescription>
              გუნდი „{initial?.name}“ წაიშლება და მისი წევრები გათავისუფლდებიან.
              მოქმედების გაუქმება შეუძლებელია. ისტორია აუდიტისთვის შეინახება.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={availabilityPending}
              onClick={() => setConfirmDelete(false)}
            >
              დაბრუნება
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={availabilityPending}
              aria-busy={availabilityPending}
              onClick={() => {
                void changeAvailability('delete')
              }}
            >
              {availabilityPending ? (
                <Spinner />
              ) : (
                <IconTrash data-icon="inline-start" aria-hidden="true" />
              )}
              წაშლა
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SheetFooter className="flex-row justify-end border-t px-6 py-4">
        <Button
          type="button"
          variant="outline"
          disabled={mutation.isPending}
          onClick={onClose}
        >
          გაუქმება
        </Button>
        {initial?.active !== false && (
          <Button
            type="submit"
            form={formId}
            className="min-w-32"
            disabled={mutation.isPending}
            aria-busy={mutation.isPending}
          >
            <span className="inline-flex size-4" aria-hidden="true">
              {mutation.isPending && <Spinner />}
            </span>
            შენახვა
          </Button>
        )}
      </SheetFooter>
    </>
  )
}
