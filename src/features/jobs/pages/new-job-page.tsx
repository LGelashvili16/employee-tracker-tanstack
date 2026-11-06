import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { JobEditor } from '../components/job-editor'

const route = getRouteApi('/_authenticated/manage/jobs/new')
export function NewJobPage() {
  const { actor } = route.useRouteContext()
  const navigate = useNavigate()
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">ახალი სამუშაო</h1>
      <JobEditor
        actorId={actor.id}
        onClose={() => {
          void navigate({ to: '/jobs' })
        }}
        onSaved={(id) => {
          void navigate({ to: '/jobs', search: { pin: id } })
        }}
      />
    </div>
  )
}
