import { APP_NAME } from '#/lib/app'
import { Link, useLocation } from '@tanstack/react-router'
import {
  IconLayoutDashboard,
  IconChevronRight,
  IconUsers,
  IconSettings,
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
  hasUnreadAnnouncements = false,
  hasUnreadComplaints = false,
}: {
  actor: Actor
  inset?: boolean
  footer?: ReactNode
  hasUnreadAnnouncements?: boolean
  hasUnreadComplaints?: boolean
}) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const { setOpenMobile } = useSidebar()
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
      label: 'მართვა',
      items: navigationItems.filter(
        (item) =>
          item.to.startsWith('/manage') &&
          !('secondary' in item && item.secondary),
      ),
    },
    {
      label: 'ადმინისტრირება',
      items: navigationItems.filter((item) =>
        [
          '/admin/access',
          '/admin/roles',
          '/admin/audit-log',
          '/admin/settings/security',
          '/admin/settings/company',
          '/admin/settings/notifications',
          '/admin/integrations',
        ].includes(item.to),
      ),
    },
  ]
  return (
    <Sidebar variant={inset ? 'inset' : 'sidebar'}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <Link to="/dashboard" onClick={() => setOpenMobile(false)} />
              }
              size="lg"
            >
              <img
                src="/favicon.svg"
                alt=""
                className="size-8 shrink-0 rounded-lg"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{APP_NAME}</span>
                <span className="truncate text-xs">სამუშაო სივრცე</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => {
          if (
            group.label === 'მართვა' &&
            !hasPermission(actor, 'manage.access')
          )
            return null
          if (
            group.label === 'ადმინისტრირება' &&
            !hasPermission(actor, 'admin.access')
          )
            return null
          const items = group.items.filter(
            (item) =>
              !item.permission ||
              (typeof item.permission === 'string'
                ? hasPermission(actor, item.permission)
                : item.permission.some((permission) =>
                    hasPermission(actor, permission),
                  )),
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
                      {item.to === '/manage/complaints' &&
                      hasUnreadComplaints ? (
                        <>
                          <span
                            aria-hidden="true"
                            data-slot="complaint-unread-dot"
                            className="ml-auto size-2 shrink-0 rounded-full bg-destructive"
                          />
                          <span className="sr-only">
                            , წაუკითხავი საჩივრები
                          </span>
                        </>
                      ) : null}
                      {item.to === '/announcements' &&
                      hasUnreadAnnouncements ? (
                        <>
                          <span
                            aria-hidden="true"
                            data-slot="announcement-unread-dot"
                            className="ml-auto size-2 shrink-0 rounded-full bg-destructive"
                          />
                          <span className="sr-only">
                            , წაუკითხავი განცხადებები
                          </span>
                        </>
                      ) : null}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )
          return (
            <SidebarGroup
              key={group.label}
              className={
                group.label === 'ადმინისტრირება' ? 'mt-auto' : undefined
              }
            >
              {inset ? (
                <Collapsible
                  key={`${group.label}-${pathname.split('/')[1]}`}
                  defaultOpen={
                    group.label === 'ჩემი სივრცე' ||
                    items.some((item) =>
                      isNavigationItemActive(pathname, item.to),
                    )
                  }
                  className="group/navigation"
                >
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <CollapsibleTrigger render={<SidebarMenuButton />}>
                        {group.label === 'ჩემი სივრცე' ? (
                          <IconLayoutDashboard aria-hidden="true" />
                        ) : group.label === 'მართვა' ? (
                          <IconUsers aria-hidden="true" />
                        ) : (
                          <IconSettings aria-hidden="true" />
                        )}
                        <span>{group.label}</span>
                        {group.label === 'მართვა' &&
                        hasUnreadComplaints &&
                        items.some(
                          (item) => item.to === '/manage/complaints',
                        ) ? (
                          <>
                            <span
                              aria-hidden="true"
                              data-slot="complaint-group-unread-dot"
                              className="ml-auto size-2 shrink-0 rounded-full bg-destructive"
                            />
                            <span className="sr-only">
                              , წაუკითხავი საჩივრები
                            </span>
                          </>
                        ) : null}
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
