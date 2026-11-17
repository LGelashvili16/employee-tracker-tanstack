import type { ReactNode } from 'react'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from '#/components/ui/sidebar'

/** Reserve the private shell without mounting session-dependent navigation or subscriptions. */
export function AppShellSkeleton({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider
      role="status"
      aria-busy="true"
      aria-label="სამუშაო სივრცე იტვირთება"
      className="h-dvh min-h-0 overflow-hidden"
    >
      <Sidebar variant="inset" aria-hidden="true">
        <SidebarHeader>
          <div className="flex h-12 items-center gap-2 px-2">
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {[6, 5].map((rows, group) => (
            <div key={group} className="flex flex-col gap-px p-2">
              <div className="flex h-8 items-center px-2">
                <Skeleton className="h-3 w-24" />
              </div>
              {Array.from({ length: rows }, (_, row) => (
                <div key={row} className="flex h-8 items-center gap-2 px-2">
                  <Skeleton className="size-4 shrink-0" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ))}
          <div className="mt-auto p-2">
            <Skeleton className="h-8 w-full" />
          </div>
        </SidebarContent>
        <SidebarFooter>
          <Skeleton className="h-12 w-full" />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset
        aria-hidden="true"
        className="m-2 min-h-0 min-w-0 overflow-hidden rounded-xl"
      >
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <Skeleton className="size-7" />
          <Skeleton className="ml-2 h-4 w-40 max-w-[40vw]" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
          </div>
        </header>
        <div className="app-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-y-contain p-4 md:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
