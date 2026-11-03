import { APP_NAME } from '#/lib/app'
import { useState } from 'react'
import { Link, Outlet, useLocation, useRouter } from '@tanstack/react-router'
import { cn } from 'cn'
import { IconBell, IconLogout } from '@tabler/icons-react'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { Badge } from '#/components/ui/badge'
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
  const isAdministration =
    pathname === '/admin' || pathname.startsWith('/admin/')
  const pageTitle =
    navigationItems.find((item) => item.to === pathname.replace(/\/$/, ''))
      ?.label ?? 'სამუშაო სივრცე'
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  async function signOut() {
    setSigningOut(true)
    setError('')
    try {
      const result = await authClient.signOut()
      if (result.error) throw new Error('გამოსვლა ვერ მოხერხდა.')
      router.clearCache()
      await router.navigate({ to: '/auth/login' })
      await router.invalidate()
    } catch {
      setError('გამოსვლა ვერ მოხერხდა. სცადეთ ხელახლა.')
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
        inset={!isAdministration}
        footer={
          !isAdministration ? (
            <WorkspaceUserMenu
              actor={actor}
              signingOut={signingOut}
              onSignOut={signOut}
            />
          ) : undefined
        }
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger aria-label="მენიუს გახსნა ან დახურვა" />
          {isAdministration ? (
            <>
              <span className="text-sm font-medium">{APP_NAME}</span>
              <Badge variant="outline" className="hidden md:inline-flex">
                ადმინისტრირება
              </Badge>
            </>
          ) : (
            <>
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
            </>
          )}
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
            {isAdministration && (
              <Button
                variant="ghost"
                disabled={signingOut}
                aria-busy={signingOut}
                onClick={signOut}
                aria-label="ანგარიშიდან გამოსვლა"
              >
                {signingOut ? (
                  <Spinner aria-hidden="true" />
                ) : (
                  <IconLogout aria-hidden="true" />
                )}
                <span className="hidden sm:inline">გამოსვლა</span>
              </Button>
            )}
          </div>
        </header>
        <div
          id="main-content"
          tabIndex={-1}
          className={cn(
            'flex flex-1 flex-col gap-4 p-4',
            isAdministration && 'md:p-8',
          )}
        >
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
