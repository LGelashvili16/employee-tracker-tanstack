import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/employees')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/employees"!</div>
}
