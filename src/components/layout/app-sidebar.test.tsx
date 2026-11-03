import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppSidebar } from './app-sidebar'
import { SidebarProvider } from '#/components/ui/sidebar'
import { AdministrationPage } from '#/features/company-settings/pages/administration-page'
import { WorkspaceUserMenu } from './workspace-user-menu'
import { AttendanceNavigation } from '#/features/attendance/components/attendance-navigation'
import type { AnchorHTMLAttributes } from 'react'
import type { Role } from '#/lib/authorization/permissions'

vi.mock('#/hooks/use-mobile', () => ({ useIsMobile: () => false }))
const location = vi.hoisted(() => ({ pathname: '/dashboard' }))
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => location.pathname,
  Link: ({
    to,
    search: _search,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string
    search?: unknown
  }) => <a href={to} {...props} />,
}))

function renderSidebar(role: Role) {
  return render(
    <SidebarProvider>
      <AppSidebar
        actor={{
          id: 'test',
          name: 'ტესტი',
          email: null,
          emailVerified: false,
          roles: [role],
        }}
      />
    </SidebarProvider>,
  )
}

describe('workspace navigation', () => {
  beforeEach(() => {
    location.pathname = '/dashboard'
  })
  it('keeps a single administration link in the inset workspace and a real account menu', async () => {
    const user = userEvent.setup()
    const actor = {
      id: 'test',
      name: 'ტესტი მომხმარებელი',
      email: null,
      emailVerified: false,
      roles: ['admin'] as const,
    }
    const onSignOut = vi.fn(async () => {})
    const { container } = render(
      <SidebarProvider>
        <AppSidebar
          actor={{ ...actor, roles: [...actor.roles] }}
          inset
          footer={
            <WorkspaceUserMenu
              actor={{ ...actor, roles: [...actor.roles] }}
              signingOut={false}
              onSignOut={onSignOut}
            />
          }
        />
      </SidebarProvider>,
    )
    expect(container.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
      'data-variant',
      'inset',
    )
    expect(screen.getByRole('button', { name: 'ჩემი სივრცე' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(
      screen.getByRole('link', { name: 'ადმინისტრირება' }),
    ).toHaveAttribute('href', '/admin/dashboard')
    expect(
      screen.queryByRole('link', { name: 'მომხმარებლები' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'ანგარიშის მენიუ' }))
    expect(
      await screen.findByRole('menuitem', { name: 'ჩემი პროფილი' }),
    ).toHaveAttribute('href', '/settings/profile')
    await user.click(screen.getByRole('menuitem', { name: 'გამოსვლა' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })
  it.each(['admin', 'owner'] as const)(
    'shows all workspace sections to %s',
    (role) => {
      renderSidebar(role)
      expect(screen.getByText('ჩემი სივრცე')).toBeInTheDocument()
      expect(screen.getByText('გუნდის მართვა')).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: 'მთავარი გვერდი' }),
      ).toHaveAttribute('href', '/dashboard')
      expect(
        screen.getByRole('link', { name: 'ადმინისტრირება' }),
      ).toHaveAttribute('href', '/admin/dashboard')
      expect(
        screen.getByRole('link', { name: 'საათების განხილვა' }),
      ).toBeInTheDocument()
    },
  )
  it.each(['admin', 'owner'] as const)(
    'shows only administration navigation in the admin workspace for %s',
    (role) => {
      location.pathname = '/admin/users'
      renderSidebar(role)
      expect(
        screen.getByRole('link', { name: 'მომხმარებლები' }),
      ).toHaveAttribute('href', '/admin/users')
      expect(
        screen.getByRole('link', { name: 'ადმინისტრირების მიმოხილვა' }),
      ).toHaveAttribute('href', '/admin/dashboard')
      expect(
        screen.getByRole('link', { name: 'სამუშაო სივრცეში დაბრუნება' }),
      ).toHaveAttribute('href', '/dashboard')
      expect(screen.queryByText('ჩემი სივრცე')).not.toBeInTheDocument()
      expect(screen.queryByText('გუნდის მართვა')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: 'დასწრება' }),
      ).not.toBeInTheDocument()
    },
  )
  it('hides administration and management from employees', () => {
    renderSidebar('employee')
    for (const name of [
      'მთავარი გვერდი',
      'დასწრება',
      'ჩემი განრიგი',
      'ჩემი სამუშაოები',
      'შვებულება და გაცდენა',
    ]) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument()
    }
    for (const name of [
      'დასწრების ისტორია',
      'დროის შესწორებები',
      'სამუშაო საათები',
      'შეტყობინებები',
      'ჩემი პროფილი',
      'ანგარიშის უსაფრთხოება',
      'სამუშაო სივრცეში დაწყება',
    ]) {
      expect(screen.queryByRole('link', { name })).not.toBeInTheDocument()
    }
    expect(screen.queryByText('ადმინისტრირება')).not.toBeInTheDocument()
    expect(screen.queryByText('გუნდის მართვა')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'ადმინისტრირების მიმოხილვა' }),
    ).not.toBeInTheDocument()
  })
  it('keeps attendance selected and its supporting pages reachable', () => {
    location.pathname = '/attendance/history'
    const { container } = renderSidebar('employee')
    expect(container.querySelector('a[href="/attendance"]')).toHaveAttribute(
      'data-active',
    )
    render(<AttendanceNavigation />)
    expect(
      screen.getByRole('link', { name: 'დასწრების ისტორია' }),
    ).toHaveAttribute('aria-current', 'page')
    expect(
      screen.getByRole('link', { name: 'დროის შესწორებები' }),
    ).toHaveAttribute('href', '/attendance/corrections')
    expect(
      screen.getByRole('link', { name: 'სამუშაო საათები' }),
    ).toHaveAttribute('href', '/timesheets')
  })
  it('keeps navigation between administration and the workspace explicit', () => {
    render(<AdministrationPage />)
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'ადმინისტრირების მიმოხილვა',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'სამუშაო სივრცეში დაბრუნება' }),
    ).toHaveAttribute('href', '/dashboard')
    expect(
      screen.getByRole('link', { name: 'მომხმარებლების მართვა' }),
    ).toHaveAttribute('href', '/admin/users')
    expect(screen.getAllByText('მზადდება')).toHaveLength(2)
  })
})
