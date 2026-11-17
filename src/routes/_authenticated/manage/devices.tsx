import { createFileRoute } from '@tanstack/react-router'
import { requirePagePermission } from '#/lib/auth/auth.functions'
import { pageHead } from '#/lib/page-head'
import { securityListSchema } from '#/features/attendance-security/attendance-security.schemas'
import { DeviceReviewPage } from '#/features/attendance-security/components/device-review-page'

export const Route = createFileRoute('/_authenticated/manage/devices')({
  validateSearch: securityListSchema,
  beforeLoad: () =>
    requirePagePermission({
      data: { permission: 'attendance.devices.manage' },
    }),
  head: () =>
    pageHead(
      'დასწრების მოწყობილობები',
      'დასწრების მოწყობილობების მოთხოვნები და დადასტურება.',
    ),
  component: DeviceReviewPage,
})
