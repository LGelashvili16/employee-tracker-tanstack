import { FeaturePage } from '#/components/common/feature-page'
import { auditLogContent } from '../audit-log.content'

export function AuditLogPage() {
  return <FeaturePage {...auditLogContent.auditLog} />
}
