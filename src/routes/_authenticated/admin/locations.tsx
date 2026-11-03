import { createFileRoute } from '@tanstack/react-router'
import { LocationsPage } from '#/features/locations/pages/locations-page'
import { locationsContent } from '#/features/locations/locations.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/admin/locations')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'locations.manage' } }),
  head: () =>
    pageHead(
      locationsContent.locations.title,
      locationsContent.locations.description,
    ),
  component: LocationsPage,
})
