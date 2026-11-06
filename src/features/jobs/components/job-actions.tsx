import { IconPencil } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import { ContextMenuItem } from '#/components/ui/context-menu'
import { Separator } from '#/components/ui/separator'
import { allowedJobTransitions, canEditJob } from '../jobs.rules'
import { jobStatuses } from '../jobs.presentation'
import { JobEditor } from './job-editor'
import { JobTransitionDialog } from './job-transition-dialog'
import type { Actor } from '#/lib/authorization/actor'
import type { JobDetail, JobStatus } from '../jobs.types'

export type JobAction =
  | { type: 'edit'; job: JobDetail }
  | { type: 'transition'; job: JobDetail; status: JobStatus }

export function JobActions({
  actor,
  job,
  onAction,
  contextMenu = false,
}: {
  actor: Actor
  job: JobDetail
  onAction: (action: JobAction) => void
  contextMenu?: boolean
}) {
  const transitions = allowedJobTransitions(actor, job)
  return (
    <>
      {transitions.map((status) => {
        const Icon = jobStatuses[status].icon
        const action = () => onAction({ type: 'transition', job, status })
        return contextMenu ? (
          <ContextMenuItem
            key={status}
            onClick={action}
            className={
              status === 'rejected'
                ? 'text-destructive data-highlighted:text-destructive'
                : undefined
            }
          >
            <Icon aria-hidden="true" />
            {jobStatuses[status].action}
          </ContextMenuItem>
        ) : (
          <Button
            key={status}
            variant={
              status === 'rejected'
                ? 'destructive'
                : status === 'pending'
                  ? 'outline'
                  : 'default'
            }
            depth="raised"
            className="h-auto min-h-11 justify-start whitespace-normal"
            onClick={action}
          >
            <Icon data-icon="inline-start" aria-hidden="true" />
            {jobStatuses[status].action}
          </Button>
        )
      })}
      {canEditJob(actor, job) ? (
        contextMenu ? (
          <>
            {transitions.length ? <Separator className="my-1" /> : null}
            <ContextMenuItem onClick={() => onAction({ type: 'edit', job })}>
              <IconPencil aria-hidden="true" />
              რედაქტირება
            </ContextMenuItem>
          </>
        ) : (
          <Button
            variant="outline"
            depth="raised"
            className="min-h-11 justify-start"
            onClick={() => onAction({ type: 'edit', job })}
          >
            <IconPencil data-icon="inline-start" aria-hidden="true" />
            რედაქტირება
          </Button>
        )
      ) : null}
    </>
  )
}

export function JobActionDialog({
  actor,
  action,
  onClose,
}: {
  actor: Actor
  action: JobAction | null
  onClose: () => void
}) {
  if (!action) return null
  return action.type === 'edit' ? (
    <JobEditor
      actorId={actor.id}
      job={action.job}
      onClose={onClose}
      onSaved={onClose}
    />
  ) : (
    <JobTransitionDialog
      actor={actor}
      job={action.job}
      status={action.status}
      onClose={onClose}
    />
  )
}
