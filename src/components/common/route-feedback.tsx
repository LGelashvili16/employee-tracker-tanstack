import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { PageSkeleton } from './page-skeleton'
import { FeaturePage } from './feature-page'

export function RouteError() {
  return (
    <FeaturePage
      title="გვერდის გახსნა ვერ მოხერხდა"
      description="შეამოწმეთ თქვენი წვდომა ან სცადეთ მოგვიანებით."
    >
      <Button
        nativeButton={false}
        role="link"
        variant="outline"
        render={<Link to="/dashboard" />}
      >
        მთავარ გვერდზე დაბრუნება
      </Button>
    </FeaturePage>
  )
}
export function RouteNotFound() {
  return (
    <FeaturePage
      title="გვერდი ვერ მოიძებნა"
      description="შეამოწმეთ ბმული და სცადეთ ხელახლა."
    >
      <Button
        nativeButton={false}
        role="link"
        variant="outline"
        render={<Link to="/" />}
      >
        მთავარ გვერდზე დაბრუნება
      </Button>
    </FeaturePage>
  )
}
export function RoutePending() {
  return <PageSkeleton />
}
