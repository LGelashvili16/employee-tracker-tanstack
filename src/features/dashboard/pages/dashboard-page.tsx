import { Link } from '@tanstack/react-router'
import { FeaturePage } from '#/components/common/feature-page'
import { Button } from '#/components/ui/button'
import { ClockControls } from '#/features/attendance/components/clock-controls'
import { dashboardContent } from '../dashboard.content'

export function DashboardPage() {
  return (
    <FeaturePage {...dashboardContent.dashboard}>
      <ClockControls />
      <nav aria-label="სწრაფი გადასვლა" className="flex flex-wrap gap-3">
        <Button variant="outline" render={<Link to="/schedule" />}>
          ჩემი განრიგი
        </Button>
        <Button variant="outline" render={<Link to="/jobs" />}>
          ჩემი სამუშაოები
        </Button>
        <Button variant="outline" render={<Link to="/timesheets" />}>
          სამუშაო საათები
        </Button>
      </nav>
    </FeaturePage>
  )
}
