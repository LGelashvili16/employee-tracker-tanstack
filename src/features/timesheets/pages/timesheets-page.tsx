import { FeaturePage } from '#/components/common/feature-page'
import { timesheetsContent } from '../timesheets.content'

export function TimesheetsPage() {
  return <FeaturePage {...timesheetsContent.timesheets} />
}
