import { APP_NAME } from '#/lib/app'
import { Link, useLocation } from '@tanstack/react-router'
import {
  IconBuildingCommunity,
  IconLayoutDashboard,
  IconChevronRight,
  IconUsers,
  IconSettings,
  IconArrowLeft,
} from '@tabler/icons-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import type { ReactNode } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '#/components/ui/sidebar'
import { isNavigationItemActive, navigationItems } from './navigation'
import { hasPermission, roleLabels } from '#/lib/authorization/permissions'
import type { Actor } from '#/lib/authorization/actor'

export function AppSidebar({
  actor,
  inset = false,
  footer,
}: {
  actor: Actor
  inset?: boolean
  footer?: ReactNode
}) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const { setOpenMobile } = useSidebar()
  const isAdministration =
    pathname === '/admin' || pathname.startsWith('/admin/')
  const groups = [
    {
      label: 'ჩემი სივრცე',
      items: navigationItems.filter(
        (item) =>
          !item.to.startsWith('/manage') &&
          !item.to.startsWith('/admin') &&
          !('secondary' in item && item.secondary),
      ),
    },
    {
      label: 'გუნდის მართვა',
      items: navigationItems.filter(
        (item) =>
          item.to.startsWith('/manage') &&
          !('secondary' in item && item.secondary),
      ),
    },
    {
      label: 'ადმინისტრირება',
      // Surface working admin workflows as they ship; keep unfinished routes out of navigation.
      items: navigationItems.filter(
        (item) =>
          item.to === '/admin/users' ||
          item.to === '/admin/settings/attendance',
      ),
    },
  ].filter((group) =>
    isAdministration
      ? group.label === 'ადმინისტრირება'
      : group.label !== 'ადმინისტრირება',
  )
  return (
    <Sidebar variant={inset ? 'inset' : 'sidebar'}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <Link
                  to={isAdministration ? '/admin/users' : '/dashboard'}
                  onClick={() => setOpenMobile(false)}
                />
              }
              size="lg"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <IconBuildingCommunity className="size-4" aria-hidden="true" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{APP_NAME}</span>
                <span className="truncate text-xs">
                  {isAdministration ? 'ადმინისტრირება' : 'სამუშაო სივრცე'}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => {
          const items = group.items.filter(
            (item) =>
              !item.permission || hasPermission(actor.roles, item.permission),
          )
          if (!items.length) return null
          const content = (
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      render={
                        <Link
                          to={item.to}
                          onClick={() => setOpenMobile(false)}
                        />
                      }
                      isActive={isNavigationItemActive(pathname, item.to)}
                    >
                      <item.icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )
          return (
            <SidebarGroup key={group.label}>
              {inset ? (
                <Collapsible
                  key={`${group.label}-${pathname.split('/')[1]}`}
                  defaultOpen={items.some((item) =>
                    isNavigationItemActive(pathname, item.to),
                  )}
                  className="group/navigation"
                >
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <CollapsibleTrigger render={<SidebarMenuButton />}>
                        {group.label === 'ჩემი სივრცე' ? (
                          <IconLayoutDashboard aria-hidden="true" />
                        ) : group.label === 'გუნდის მართვა' ? (
                          <IconUsers aria-hidden="true" />
                        ) : (
                          <IconSettings aria-hidden="true" />
                        )}
                        <span>{group.label}</span>
                        <IconChevronRight
                          className="ml-auto transition-transform group-data-[open]/navigation:rotate-90"
                          aria-hidden="true"
                        />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="ml-3 border-l pl-2">
                        {content}
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </Collapsible>
              ) : (
                <>
                  <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                  {content}
                </>
              )}
            </SidebarGroup>
          )
        })}
        {(isAdministration || hasPermission(actor.roles, 'admin.access')) && (
          <SidebarGroup className="mt-auto">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={
                    <Link
                      to={isAdministration ? '/dashboard' : '/admin/users'}
                      onClick={() => setOpenMobile(false)}
                    />
                  }
                >
                  {isAdministration ? (
                    <IconArrowLeft aria-hidden="true" />
                  ) : (
                    <IconSettings aria-hidden="true" />
                  )}
                  <span>
                    {isAdministration
                      ? 'სამუშაო სივრცეში დაბრუნება'
                      : 'ადმინისტრირება'}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        {footer ?? (
          <div className="flex flex-col gap-1 px-2 py-3 text-sm">
            <span className="truncate font-medium">{actor.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {actor.roles.map((role) => roleLabels[role]).join(', ')}
            </span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
