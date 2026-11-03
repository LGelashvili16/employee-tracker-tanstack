import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { FeaturePage } from './feature-page'

export function RouteError() {
  return (
    <FeaturePage
      title="გვერდის გახსნა ვერ მოხერხდა"
      description="შეამოწმეთ თქვენი წვდომა ან სცადეთ მოგვიანებით."
    >
      <Button variant="outline" render={<Link to="/dashboard" />}>
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
      <Button variant="outline" render={<Link to="/" />}>
        მთავარ გვერდზე დაბრუნება
      </Button>
    </FeaturePage>
  )
}
export function RoutePending() {
  return (
    <p role="status" className="p-6 text-sm text-muted-foreground">
      გვერდი იტვირთება…
    </p>
  )
}
