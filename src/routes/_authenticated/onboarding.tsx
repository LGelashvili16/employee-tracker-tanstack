import { createFileRoute } from '@tanstack/react-router'
import { OnboardingPage } from '#/features/onboarding/pages/onboarding-page'
import { onboardingContent } from '#/features/onboarding/onboarding.content'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/onboarding')({
  head: () =>
    pageHead(
      onboardingContent.onboarding.title,
      onboardingContent.onboarding.description,
    ),
  component: OnboardingPage,
})
