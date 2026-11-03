import { createFileRoute } from '@tanstack/react-router'
import { AuditLogPage } from '#/features/audit-log/pages/audit-log-page'
import { auditLogContent } from '#/features/audit-log/audit-log.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/admin/audit-log')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'audit.read' } }),
  head: () =>
    pageHead(
      auditLogContent.auditLog.title,
      auditLogContent.auditLog.description,
    ),
  component: AuditLogPage,
})
