import { defineTask } from 'nitro/task'
import { runAttendanceReminders } from '#/features/attendance/server/attendance-reminders.service.server'

export default defineTask({
  async run() {
    try {
      return { result: await runAttendanceReminders() }
    } catch {
      // Nitro logs task errors; never include database errors or employee data.
      throw new Error('Attendance notification task failed')
    }
  },
})
