import { APP_NAME } from '#/lib/app'
import { useState } from 'react'
import { Outlet, useRouter } from '@tanstack/react-router'
import { IconLogout } from '@tabler/icons-react'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { Badge } from '#/components/ui/badge'
import ThemeToggle from '#/components/ThemeToggle'
import { authClient } from '#/lib/auth/auth-client'
import { AppSidebar } from './app-sidebar'
import type { Actor } from '#/lib/authorization/actor'

export function AppShell({ actor }: { actor: Actor }) {
  const router = useRouter()
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
      <AppSidebar actor={actor} />
      <SidebarInset>
        <header className="flex min-h-16 flex-wrap items-center gap-3 border-b p-4">
          <SidebarTrigger aria-label="მენიუს გახსნა ან დახურვა" />
          <span className="text-sm font-medium">{APP_NAME}</span>
          <Badge variant="outline" className="hidden md:inline-flex">
            დროის აღრიცხვა ჯერ არ არის გააქტიურებული
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
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
          </div>
        </header>
        <div
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 flex-col gap-4 p-4 md:p-8"
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
