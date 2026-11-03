import { APP_NAME } from '#/lib/app'
import { Link, useLocation } from '@tanstack/react-router'
import { IconBuildingCommunity, IconLayoutDashboard } from '@tabler/icons-react'
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
} from '#/components/ui/sidebar'
import { navigationItems } from './navigation'
import { hasPermission, roleLabels } from '#/lib/authorization/permissions'
import type { Actor } from '#/lib/authorization/actor'

export function AppSidebar({ actor }: { actor: Actor }) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const groups = [
    {
      label: 'ჩემი სივრცე',
      items: navigationItems.filter(
        (item) =>
          !item.to.startsWith('/manage') && !item.to.startsWith('/admin'),
      ),
    },
    {
      label: 'გუნდის მართვა',
      items: navigationItems.filter((item) => item.to.startsWith('/manage')),
    },
    {
      label: 'ადმინისტრირება',
      items: navigationItems.filter((item) => item.to.startsWith('/admin')),
    },
  ]
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to="/dashboard" />} size="lg">
              <IconBuildingCommunity aria-hidden="true" />
              <span className="font-semibold">{APP_NAME}</span>
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
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        render={<Link to={item.to} />}
                        isActive={pathname.replace(/\/$/, '') === item.to}
                      >
                        <IconLayoutDashboard aria-hidden="true" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col gap-1 px-2 py-3 text-sm">
          <span className="truncate font-medium">{actor.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {actor.roles.map((role) => roleLabels[role]).join(', ')}
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
