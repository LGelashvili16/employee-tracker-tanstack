import { useState } from 'react'
import { Link, Outlet, useLocation, useRouter } from '@tanstack/react-router'
import { IconBell } from '@tabler/icons-react'
import { toast } from 'sonner'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'
import { Button } from '#/components/ui/button'
import ThemeToggle from '#/components/ThemeToggle'
import { PwaInstallButton } from '#/components/common/pwa-install-button'
import { authClient } from '#/lib/auth/auth-client'
import { AppSidebar } from './app-sidebar'
import { WorkspaceUserMenu } from './workspace-user-menu'
import { navigationItems } from './navigation'
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
      ?.label ?? 'სამუშაო სივრცე'
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
    <SidebarProvider>
      <a className="sr-only focus:not-sr-only" href="#main-content">
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
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
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
            <Button
              nativeButton={false}
              role="link"
              variant="ghost"
              size="icon"
              aria-label="შეტყობინებები"
              render={<Link to="/notifications" />}
            >
              <IconBell aria-hidden="true" />
            </Button>
            <PwaInstallButton />
            <ThemeToggle />
          </div>
        </header>
        <div
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 flex-col gap-4 p-4 md:p-8"
        >
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
