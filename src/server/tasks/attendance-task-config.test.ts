// @vitest-environment node
import { createNitro } from 'nitro/builder'
import { expect, it } from 'vitest'
import { attendanceTaskConfig } from '../../../scripts/attendance-task-config'

it.each([true, false])(
  'registers only internal minute scheduling (development: %s)',
  async (dev) => {
    const nitro = await createNitro({
      ...attendanceTaskConfig,
      dev,
      preset: dev ? 'nitro-dev' : 'node-server',
    })
    try {
      expect(nitro.options.scheduledTasks['* * * * *']).toEqual([
        'attendance:reminders',
      ])
      expect(nitro.options.tasks['attendance:reminders'].handler).toMatch(
        /attendance-reminders\.ts$/,
      )
      expect(
        nitro.options.handlers.some((handler) =>
          handler.route.startsWith('/_nitro/tasks'),
        ),
      ).toBe(false)
    } finally {
      await nitro.close()
    }
  },
)
