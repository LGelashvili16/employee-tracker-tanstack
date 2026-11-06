import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppSidebar } from './app-sidebar'
import { SidebarProvider } from '#/components/ui/sidebar'
import { AdministrationPage } from '#/features/company-settings/pages/administration-page'
import { WorkspaceUserMenu } from './workspace-user-menu'
import { AttendanceNavigation } from '#/features/attendance/components/attendance-navigation'
import { TeamAttendanceNavigation } from '#/features/attendance/components/team-attendance-navigation'
import { ManageJobsPage } from '#/features/jobs/pages/manage-jobs-page'
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

function renderSidebar(role: Role | ReadonlyArray<Role>, inset = false) {
  return render(
    <SidebarProvider>
      <AppSidebar
        inset={inset}
        actor={{
          id: 'test',
          name: 'ტესტი',
          email: null,
          emailVerified: false,
          roles: typeof role === 'string' ? [role] : [...role],
        }}
      />
    </SidebarProvider>,
  )
}

describe('workspace navigation', () => {
  beforeEach(() => {
    location.pathname = '/dashboard'
  })
  it('expands the permission-based administration group from the personal workspace', async () => {
    const user = userEvent.setup()
    renderSidebar('admin', true)
    const administration = screen.getByRole('button', {
      name: 'ადმინისტრირება',
    })
    expect(administration).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByRole('link', { name: 'მომხმარებლები' }),
    ).not.toBeInTheDocument()
    await user.click(administration)
    expect(screen.getByRole('link', { name: 'მომხმარებლები' })).toHaveAttribute(
      'href',
      '/admin/users',
    )
    expect(
      screen.getByRole('link', { name: 'დასწრების წესები' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'ყველა თანამშრომლის დასწრება' }),
    ).toHaveAttribute('href', '/admin/attendance')
    expect(
      screen.getByRole('link', { name: 'ყველა თანამშრომლის სამუშაო საათები' }),
    ).toHaveAttribute('href', '/admin/timesheets')
    expect(screen.getByRole('link', { name: 'დასწრება' })).toBeInTheDocument()
  })
  it('keeps personal and admin navigation together on admin routes with a real account menu', async () => {
    location.pathname = '/admin/users'
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
      screen.getByRole('button', { name: 'ადმინისტრირება' }),
    ).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'მომხმარებლები' })).toHaveAttribute(
      'href',
      '/admin/users',
    )
    expect(screen.getByRole('link', { name: 'დასწრება' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'ანგარიშის მენიუ' }))
    expect(
      await screen.findByRole('menuitem', { name: 'ჩემი პროფილი' }),
    ).toHaveAttribute('href', '/settings/profile')
    await user.click(screen.getByRole('menuitem', { name: 'გამოსვლა' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })
  it.each(['owner'] as const)('shows all workspace sections to %s', (role) => {
    renderSidebar(role)
    expect(screen.getByText('ჩემი სივრცე')).toBeInTheDocument()
    expect(screen.getByText('გუნდის მართვა')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'მთავარი გვერდი' }),
    ).toHaveAttribute('href', '/dashboard')
    expect(screen.getByText('ადმინისტრირება')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'საათების განხილვა' }),
    ).toBeInTheDocument()
  })
  it('keeps personal work and platform access for admins without team-management access', () => {
    renderSidebar('admin')
    expect(
      screen.getByRole('link', { name: 'მთავარი გვერდი' }),
    ).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'დასწრება' })).toBeInTheDocument()
    expect(screen.getByText('ადმინისტრირება')).toBeInTheDocument()
    expect(screen.queryByText('გუნდის მართვა')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'გუნდის დასწრება' }),
    ).not.toBeInTheDocument()
  })
  it('combines administration and the explicitly assigned management role', () => {
    renderSidebar(['admin', 'supervisor'])
    expect(
      screen.getByRole('link', { name: 'გუნდის დასწრება' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'საათების განხილვა' }),
    ).toBeInTheDocument()
    expect(screen.getByText('ადმინისტრირება')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'განრიგის მართვა' }),
    ).not.toBeInTheDocument()
  })
  it.each(['supervisor', 'operations_manager', 'hr_manager'] as const)(
    'keeps platform configuration out of the %s workspace',
    (role) => {
      renderSidebar(role)
      expect(screen.getByText('გუნდის მართვა')).toBeInTheDocument()
      expect(screen.queryByText('ადმინისტრირება')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: 'მომხმარებლები' }),
      ).not.toBeInTheDocument()
    },
  )
  it('keeps attendance exceptions within attendance and job creation on the jobs page', () => {
    location.pathname = '/manage/attendance/exceptions'
    const { container } = renderSidebar('owner')
    expect(
      container.querySelector('a[href="/manage/attendance"]'),
    ).toHaveAttribute('data-active')
    expect(
      screen.queryByRole('link', { name: 'დასწრების გამონაკლისები' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'ახალი სამუშაო' }),
    ).not.toBeInTheDocument()
    render(<TeamAttendanceNavigation roles={['supervisor']} />)
    expect(
      screen.getByRole('link', { name: 'დასწრების გამონაკლისები' }),
    ).toHaveAttribute('aria-current', 'page')
    render(<ManageJobsPage />)
    expect(screen.getByRole('link', { name: 'ახალი სამუშაო' })).toHaveAttribute(
      'href',
      '/manage/jobs/new',
    )
    expect(screen.getByText('ეს განყოფილება მზადდება')).toBeInTheDocument()
  })
  it('does not show attendance review navigation to read-only operations managers', () => {
    render(<TeamAttendanceNavigation roles={['operations_manager']} />)
    expect(
      screen.getByRole('link', { name: 'გუნდის დასწრება' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'დასწრების გამონაკლისები' }),
    ).not.toBeInTheDocument()
  })
  it.each(['admin', 'owner'] as const)(
    'keeps personal navigation visible on admin pages for %s',
    (role) => {
      location.pathname = '/admin/users'
      renderSidebar(role)
      expect(
        screen.getByRole('link', { name: 'მომხმარებლები' }),
      ).toHaveAttribute('href', '/admin/users')
      expect(
        screen.getByRole('link', { name: 'დასწრების წესები' }),
      ).toHaveAttribute('href', '/admin/settings/attendance')
      for (const name of [
        'ადმინისტრირების მიმოხილვა',
        'მოწვევები',
        'როლები და უფლებები',
        'კომპანიის პარამეტრები',
        'ინტეგრაციები',
        'მოქმედებების ჟურნალი',
      ]) {
        expect(screen.queryByRole('link', { name })).not.toBeInTheDocument()
      }
      expect(
        screen.queryByRole('link', { name: 'სამუშაო სივრცეში დაბრუნება' }),
      ).not.toBeInTheDocument()
      expect(screen.getByText('ჩემი სივრცე')).toBeInTheDocument()
      if (role === 'owner')
        expect(screen.getByText('გუნდის მართვა')).toBeInTheDocument()
      else expect(screen.queryByText('გუნდის მართვა')).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'დასწრება' })).toBeInTheDocument()
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
  it('keeps attendance selected and its supporting pages reachable', async () => {
    location.pathname = '/attendance/history'
    const { container } = renderSidebar('employee')
    expect(container.querySelector('a[href="/attendance"]')).toHaveAttribute(
      'data-active',
    )
    render(
      <AttendanceNavigation>
        <h1>დასწრების ჩანაწერები</h1>
      </AttendanceNavigation>,
    )
    expect(
      screen.getByRole('tab', { name: 'დასწრების ისტორია' }),
    ).toHaveAttribute('aria-current', 'page')
    expect(
      screen.getByRole('tab', { name: 'დროის შესწორებები' }),
    ).toHaveAttribute('href', '/attendance/corrections')
    expect(
      screen.getByRole('tab', { name: 'სამუშაო საათები' }),
    ).toHaveAttribute('href', '/timesheets')
    const history = screen.getByRole('tab', { name: 'დასწრების ისტორია' })
    expect(history).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(
      'დასწრების ისტორია',
    )
    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'დასწრების ჩანაწერები',
    )
    const user = userEvent.setup()
    history.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'დროის შესწორებები' })).toHaveFocus()
    expect(history).toHaveAttribute('aria-selected', 'true')
  })
  it('retains the legacy overview without a workspace switch', () => {
    render(<AdministrationPage />)
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'ადმინისტრირების მიმოხილვა',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'სამუშაო სივრცეში დაბრუნება' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'მომხმარებლების მართვა' }),
    ).toHaveAttribute('href', '/admin/users')
    expect(screen.getAllByText('მზადდება')).toHaveLength(2)
  })
})
