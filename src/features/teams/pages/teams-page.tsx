import { FeaturePage } from '#/components/common/feature-page'
import { teamsContent } from '../teams.content'

export function TeamsPage() {
  return <FeaturePage {...teamsContent.teams} />
}
