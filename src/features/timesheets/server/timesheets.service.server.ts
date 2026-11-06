import '@tanstack/react-start/server-only'
import { assertPermission } from '#/lib/authorization/access'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import { parseRoles } from '#/lib/authorization/permissions'
import { getCompanyWorkday } from '#/features/scheduling/server/scheduling.service.server'
import { timesheetRequestSchema } from '../timesheets.schemas'
import { timesheetMonthBounds } from '../timesheets.rules'
import * as repository from './timesheets.repository.server'
import type { Actor } from '#/lib/authorization/actor'

export async function readTimesheets(
  actor: Actor | null,
  input: unknown,
  scope: 'self' | 'team' | 'company',
) {
  if (!actor) throw new AuthorizationError()
  const data = timesheetRequestSchema.parse(input)
  if (scope === 'self' && data.userId && data.userId !== actor.id)
    throw new AuthorizationError()
  return repository.transactTimesheets(
    async (tx) => {
      const identity = await repository.currentTimesheetActor(tx, actor.id)
      if (
        !identity ||
        identity.state !== 'active' ||
        (identity.employmentStatus !== 'active' &&
          !(scope === 'company' && identity.employmentStatus === null))
      )
        throw new AuthorizationError()
      if (scope === 'team') {
        const current = { ...actor, roles: parseRoles(identity.roles) }
        assertPermission(current, 'manage.access')
        assertPermission(current, 'timesheets.review.team')
      }
      if (scope === 'company') {
        const current = { ...actor, roles: parseRoles(identity.roles) }
        assertPermission(current, 'admin.access')
        assertPermission(current, 'attendance.read.all')
      }
      const now = new Date()
      const month =
        data.month ?? (await getCompanyWorkday(now, tx)).date.slice(0, 7)
      const { start, end } = timesheetMonthBounds(month)
      const result = await repository.readPeriod(
        tx,
        actor.id,
        scope,
        start,
        end,
        data,
        now,
      )
      return {
        month,
        total: result.totals.records,
        pageSize: 50,
        totals: result.totals,
        hasMore: result.rows.length > 50,
        rows: result.rows.slice(0, 50).map((row) => ({
          ...row,
          firstIn: row.firstIn.toISOString(),
          lastOut: row.open > 0 ? null : (row.lastOut?.toISOString() ?? null),
        })),
      }
    },
    { isolationLevel: 'repeatable read' },
  )
}
