import { fileURLToPath } from 'node:url'
import type { NitroConfig } from 'nitro/types'

/** Both Nitro Vite dev and the production Node preset start this cron automatically. */
export const attendanceTaskConfig = {
  experimental: { tasks: true },
  tasks: {
    'attendance:reminders': {
      handler: fileURLToPath(
        new URL('../src/server/tasks/attendance-reminders.ts', import.meta.url),
      ),
    },
  },
  scheduledTasks: { '* * * * *': ['attendance:reminders'] },
  modules: [
    (nitro) => {
      // The dev preset otherwise installs an unauthenticated HTTP task runner.
      nitro.options.handlers = nitro.options.handlers.filter(
        (h) => !h.route.startsWith('/_nitro/tasks'),
      )
    },
  ],
} satisfies NitroConfig
