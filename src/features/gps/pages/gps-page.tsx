import { useCallback, useState } from 'react'
import { IconPlus } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import { Sheet } from '#/components/ui/sheet'
import { GpsDeviceEditor } from '../components/gps-device-editor'
import { GpsDeviceSearch } from '../components/gps-device-search'
import { GpsMapView } from '../components/gps-map-view'
import type { GpsDeviceRow } from '../gps.queries'
import type { GpsSearch } from '../gps.schemas'

export function GpsPage({
  actorId,
  canManage,
  search,
  onSearch,
}: {
  actorId: string
  canManage: boolean
  search: GpsSearch
  onSearch: (search: GpsSearch, replace?: boolean) => void
}) {
  const [editing, setEditing] = useState<GpsDeviceRow | null | undefined>(
    undefined,
  )
  const [editorOpen, setEditorOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const edit = useCallback((device: GpsDeviceRow) => {
    setEditing(device)
    setEditorOpen(true)
  }, [])
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          GPS მოწყობილობები
        </h1>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null)
              setEditorOpen(true)
            }}
          >
            <IconPlus aria-hidden="true" /> მოწყობილობის დამატება
          </Button>
        )}
      </div>
      <GpsDeviceSearch search={search} onSearch={onSearch} />
      <GpsMapView
        actorId={actorId}
        q={search.q}
        onEdit={canManage ? edit : undefined}
      />
      {canManage && (
        <Sheet
          open={editorOpen}
          onOpenChange={(open) => {
            if (!open && !saving) setEditorOpen(false)
          }}
          onOpenChangeComplete={(open) => {
            if (!open) setEditing(undefined)
          }}
        >
          {editing !== undefined && (
            <GpsDeviceEditor
              key={editing?.id ?? 'new'}
              device={editing}
              actorId={actorId}
              close={() => setEditorOpen(false)}
              onBusyChange={setSaving}
            />
          )}
        </Sheet>
      )}
    </div>
  )
}
