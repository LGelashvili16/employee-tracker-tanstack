import { FeaturePage } from '#/components/common/feature-page'
import { onboardingContent } from '../onboarding.content'

export function OnboardingPage() {
  return <FeaturePage {...onboardingContent.onboarding} />
}
