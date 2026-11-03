import { Link } from '@tanstack/react-router'
import {
  IconLogout,
  IconSelector,
  IconUser,
  IconShield,
} from '@tabler/icons-react'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '#/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '#/components/ui/sidebar'
import { Spinner } from '#/components/ui/spinner'
import { roleLabels } from '#/lib/authorization/permissions'
import type { Actor } from '#/lib/authorization/actor'

export function WorkspaceUserMenu({
  actor,
  signingOut,
  onSignOut,
}: {
  actor: Actor
  signingOut: boolean
  onSignOut: () => Promise<void>
}) {
  const { isMobile } = useSidebar()
  const initials = actor.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join('')
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" aria-label="ანგარიშის მენიუ" />
            }
          >
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{actor.name}</span>
              <span className="truncate text-xs">
                {actor.roles.map((role) => roleLabels[role]).join(', ')}
              </span>
            </div>
            <IconSelector className="ml-auto size-4" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
            className="min-w-56 rounded-lg"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex items-center gap-2 py-1 text-left">
                  <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate text-sm font-medium text-foreground">
                      {actor.name}
                    </span>
                    <span className="truncate text-xs">
                      {actor.email ??
                        actor.roles.map((role) => roleLabels[role]).join(', ')}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link to="/settings/profile" />}>
                <IconUser aria-hidden="true" />
                ჩემი პროფილი
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to="/settings/security" />}>
                <IconShield aria-hidden="true" />
                ანგარიშის უსაფრთხოება
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                closeOnClick={false}
                disabled={signingOut}
                aria-busy={signingOut}
                onClick={onSignOut}
              >
                {signingOut ? (
                  <Spinner aria-hidden="true" />
                ) : (
                  <IconLogout aria-hidden="true" />
                )}
                {signingOut ? 'მიმდინარეობს გამოსვლა…' : 'გამოსვლა'}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
