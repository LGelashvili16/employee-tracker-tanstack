import { useState } from 'react'
import { Link, Outlet, useLocation, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'
import { NotificationsPopover } from '#/features/notifications/components/notifications-popover'
import { NotificationsProvider } from '#/features/notifications/components/notifications-provider'
import ThemeToggle from '#/components/ThemeToggle'
import { PwaInstallButton } from '#/components/common/pwa-install-button'
import { authClient } from '#/lib/auth/auth-client'
import { AppSidebar } from './app-sidebar'
import { WorkspaceUserMenu } from './workspace-user-menu'
import { isNavigationItemActive, navigationItems } from './navigation'
import { Separator } from '#/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '#/components/ui/breadcrumb'
import type { Actor } from '#/lib/authorization/actor'

export function AppShell({ actor }: { actor: Actor }) {
  const router = useRouter()
  const pathname = useLocation({ select: (location) => location.pathname })
  const pageTitle =
    navigationItems.find((item) => item.to === pathname.replace(/\/$/, ''))
      ?.label ??
    navigationItems.find((item) => isNavigationItemActive(pathname, item.to))
      ?.label ??
    'სამუშაო სივრცე'
  const [signingOut, setSigningOut] = useState(false)
  async function signOut() {
    setSigningOut(true)
    try {
      const result = await authClient.signOut()
      if (result.error) throw new Error('გამოსვლა ვერ მოხერხდა.')
      router.clearCache()
      await router.navigate({ to: '/auth/login' })
      await router.invalidate()
      toast.success('ანგარიშიდან გამოხვედით.')
    } catch {
      toast.error('გამოსვლა ვერ მოხერხდა. სცადეთ ხელახლა.')
    } finally {
      setSigningOut(false)
    }
  }
  return (
    <NotificationsProvider key={actor.id}>
      <SidebarProvider className="h-dvh min-h-0 overflow-hidden">
        <a
          className="sr-only focus:absolute focus:top-3 focus:left-3 focus:z-30 focus:not-sr-only focus:rounded-md focus:bg-background focus:p-3"
          href="#main-content"
        >
          მთავარ შიგთავსზე გადასვლა
        </a>
        <AppSidebar
          actor={actor}
          inset
          footer={
            <WorkspaceUserMenu
              actor={actor}
              signingOut={signingOut}
              onSignOut={signOut}
            />
          }
        />
        <SidebarInset className="m-2 min-h-0 min-w-0 overflow-hidden rounded-xl">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger aria-label="მენიუს გახსნა ან დახურვა" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-center"
            />
            <Breadcrumb aria-label="გვერდის მდებარეობა">
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink render={<Link to="/dashboard" />}>
                    სამუშაო სივრცე
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              <NotificationsPopover actorId={actor.id} />
              <ThemeToggle />
            </div>
          </header>
          <div
            id="main-content"
            data-scroll-restoration-id="app-content"
            tabIndex={-1}
            className="app-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-y-contain p-4 md:p-8"
          >
            <Outlet />
          </div>
        </SidebarInset>
        <PwaInstallButton />
      </SidebarProvider>
    </NotificationsProvider>
  )
}
