import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppSidebar } from './app-sidebar'
import { SidebarProvider } from '#/components/ui/sidebar'
import { WorkspaceUserMenu } from './workspace-user-menu'
import { AttendanceNavigation } from '#/features/attendance/components/attendance-navigation'
import type { AnchorHTMLAttributes } from 'react'
import type { PermissionOverrides, Role } from '#/lib/authorization/permissions'

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

function renderSidebar(
  role: Role | ReadonlyArray<Role>,
  inset = false,
  permissionOverrides?: PermissionOverrides,
  hasUnreadAnnouncements = false,
  hasUnreadComplaints = false,
) {
  return render(
    <SidebarProvider>
      <AppSidebar
        hasUnreadAnnouncements={hasUnreadAnnouncements}
        hasUnreadComplaints={hasUnreadComplaints}
        inset={inset}
        actor={{
          id: 'test',
          name: 'ტესტი',
          email: null,
          emailVerified: false,
          roles: typeof role === 'string' ? [role] : [...role],
          permissionOverrides,
        }}
      />
    </SidebarProvider>,
  )
}

describe('workspace navigation', () => {
  it('labels the announcement unread dot accessibly without adding another header icon', () => {
    const { container } = renderSidebar('employee', false, undefined, true)
    expect(
      screen.getByRole('link', {
        name: /განცხადებები.*წაუკითხავი განცხადებები/,
      }),
    ).toHaveAttribute('href', '/announcements')
    expect(
      container.querySelector('[data-slot="announcement-unread-dot"]'),
    ).toHaveAttribute('aria-hidden', 'true')
  })
  it('shows the dedicated work schedule entry and keeps only it active on that page', () => {
    location.pathname = '/manage/schedule'
    const { container } = renderSidebar('owner')
    expect(
      screen.getByRole('link', { name: 'სამუშაო განრიგი' }),
    ).toHaveAttribute('data-active')
    expect(
      container.querySelector('a[href="/manage/attendance"]'),
    ).not.toHaveAttribute('data-active')
    expect(
      screen.queryByRole('link', { name: 'დასწრების წესები' }),
    ).not.toBeInTheDocument()
  })
  it('hides sections revoked by explicit individual permission denials', () => {
    renderSidebar('admin', false, {
      allow: [],
      deny: ['admin.access', 'manage.access'],
    })
    expect(screen.queryByText('ადმინისტრირება')).not.toBeInTheDocument()
    expect(screen.queryByText('მართვა')).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'მთავარი გვერდი' }),
    ).toBeInTheDocument()
  })
  beforeEach(() => {
    location.pathname = '/dashboard'
  })
  it.each(['hr_manager', 'admin', 'owner'] as const)(
    'places company attendance and rules in team management for %s',
    async (role) => {
      const user = userEvent.setup()
      renderSidebar(role, true)
      const management = screen.getByRole('button', {
        name: 'მართვა',
      })
      expect(management).toHaveAttribute('aria-expanded', 'false')
      await user.click(management)
      expect(
        screen.queryByRole('link', { name: 'გუნდები' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: 'მართვის მიმოხილვა' }),
      ).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'დასწრებები' })).toHaveAttribute(
        'href',
        '/manage/attendance',
      )
      expect(
        screen.queryByRole('link', {
          name: 'ყველა თანამშრომლის სამუშაო საათები',
        }),
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: 'სამუშაო განრიგი' }),
      ).toHaveAttribute('href', '/manage/schedule')
      expect(
        screen.getByRole('link', { name: 'თანამშრომლები' }),
      ).toHaveAttribute('href', '/manage/employees')
      if (role === 'hr_manager')
        expect(
          screen.queryByRole('button', { name: 'ადმინისტრირება' }),
        ).not.toBeInTheDocument()
      else
        expect(
          screen.getByRole('button', { name: 'ადმინისტრირება' }),
        ).toBeInTheDocument()
    },
  )
  it('keeps personal and admin navigation together on admin routes with a real account menu', async () => {
    location.pathname = '/manage/attendance'
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
    expect(screen.getByRole('button', { name: 'მართვა' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(
      screen.queryByRole('link', { name: 'მომხმარებლები' }),
    ).not.toBeInTheDocument()
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
    expect(screen.getByRole('link', { name: 'არყოფნები' })).toHaveAttribute(
      'href',
      '/manage/leave',
    )
    expect(screen.getByText('ჩემი სივრცე')).toBeInTheDocument()
    expect(screen.getByText('მართვა')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'მთავარი გვერდი' }),
    ).toHaveAttribute('href', '/dashboard')
    expect(screen.getByText('ადმინისტრირება')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'საათების განხილვა' }),
    ).not.toBeInTheDocument()
  })
  it('keeps personal work and platform access for admins without team-management access', () => {
    renderSidebar('admin')
    expect(
      screen.getByRole('link', { name: 'მთავარი გვერდი' }),
    ).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'დასწრება' })).toBeInTheDocument()
    expect(screen.getByText('ადმინისტრირება')).toBeInTheDocument()
    expect(screen.getByText('მართვა')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'თანამშრომლები' })).toHaveAttribute(
      'href',
      '/manage/employees',
    )
    expect(screen.getByRole('link', { name: 'დასწრებები' })).toHaveAttribute(
      'href',
      '/manage/attendance',
    )
  })
  it('combines administration and the explicitly assigned management role', () => {
    renderSidebar(['admin', 'supervisor'])
    expect(screen.getByRole('link', { name: 'დასწრებები' })).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'საათების განხილვა' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('ადმინისტრირება')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'სამუშაო განრიგი' }),
    ).toHaveAttribute('href', '/manage/schedule')
  })
  it('opens employee management under the management group for HR without admin links', async () => {
    location.pathname = '/manage/employees/worker-123'
    const { container } = renderSidebar('hr_manager', true)
    expect(screen.getByRole('button', { name: 'მართვა' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByRole('link', { name: 'თანამშრომლები' })).toHaveAttribute(
      'href',
      '/manage/employees',
    )
    expect(
      container.querySelector('a[href="/manage/employees"]'),
    ).toHaveAttribute('data-active')
    expect(
      screen.queryByRole('button', { name: 'ადმინისტრირება' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'მომხმარებლები' }),
    ).not.toBeInTheDocument()
  })
  it.each(['supervisor', 'hr_manager'] as const)(
    'keeps platform configuration out of the %s workspace',
    (role) => {
      renderSidebar(role)
      expect(screen.getByText('მართვა')).toBeInTheDocument()
      expect(screen.queryByText('ადმინისტრირება')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: 'მომხმარებლები' }),
      ).not.toBeInTheDocument()
    },
  )
  it.each(['owner', 'supervisor'] as const)(
    'uses one attendance workspace for %s without duplicate management routes',
    (role) => {
      location.pathname = '/manage/attendance/worker'
      const { container } = renderSidebar(role)
      expect(
        container.querySelector('a[href="/manage/attendance"]'),
      ).toHaveAttribute('data-active')
      for (const path of [
        '/manage/company-attendance',
        '/manage/attendance/exceptions',
        '/manage/timesheets',
      ])
        expect(
          container.querySelector(`a[href="${path}"]`),
        ).not.toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: 'სამუშაოების რუკა' }),
      ).toHaveAttribute('href', '/jobs')
    },
  )
  it.each(['admin', 'owner'] as const)(
    'keeps personal navigation visible on admin pages for %s',
    (role) => {
      location.pathname = '/manage/attendance'
      renderSidebar(role)
      expect(
        screen.getByRole('link', { name: 'თანამშრომლები' }),
      ).toHaveAttribute('href', '/manage/employees')
      expect(
        screen.getByRole('link', { name: 'სამუშაო განრიგი' }),
      ).toHaveAttribute('href', '/manage/schedule')
      for (const name of ['ადმინისტრირების მიმოხილვა', 'მოწვევები'])
        expect(screen.queryByRole('link', { name })).not.toBeInTheDocument()
      for (const name of [
        'როლები და უფლებები',
        'კომპანიის პარამეტრები',
        'ინტეგრაციები',
        'მოქმედებების ჟურნალი',
      ])
        expect(screen.getByRole('link', { name })).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: 'მომხმარებლების წვდომა' }),
      ).toHaveAttribute('href', '/admin/access')
      expect(
        screen.queryByRole('link', { name: 'სამუშაო სივრცეში დაბრუნება' }),
      ).not.toBeInTheDocument()
      expect(screen.getByText('ჩემი სივრცე')).toBeInTheDocument()
      expect(screen.getByText('მართვა')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'დასწრება' })).toBeInTheDocument()
    },
  )
  it('hides administration and management from employees', () => {
    renderSidebar('employee')
    expect(screen.getByRole('link', { name: 'არყოფნა' })).toHaveAttribute(
      'href',
      '/leave',
    )
    for (const name of [
      'მთავარი გვერდი',
      'დასწრება',
      'ჩემი განრიგი',
      'სამუშაოების რუკა',
      'არყოფნა',
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
    expect(screen.queryByText('მართვა')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'ადმინისტრირების მიმოხილვა' }),
    ).not.toBeInTheDocument()
  })
  it('keeps attendance selected and its supporting pages reachable', async () => {
    location.pathname = '/attendance'
    const { container } = renderSidebar('employee')
    expect(container.querySelector('a[href="/attendance"]')).toHaveAttribute(
      'data-active',
    )
    render(
      <AttendanceNavigation>
        <h1>დასწრების ჩანაწერები</h1>
      </AttendanceNavigation>,
    )
    expect(screen.getByRole('tab', { name: 'დასწრება' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      screen.getByRole('tab', { name: 'დროის შესწორებები' }),
    ).toHaveAttribute('href', '/attendance/corrections')
    expect(
      screen.getByRole('tab', { name: 'სამუშაო საათები' }),
    ).toHaveAttribute('href', '/timesheets')
    expect(
      screen.queryByRole('tab', { name: 'დასწრების ისტორია' }),
    ).not.toBeInTheDocument()
    const attendance = screen.getByRole('tab', { name: 'დასწრება' })
    expect(attendance).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('დასწრება')
    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'დასწრების ჩანაწერები',
    )
    const user = userEvent.setup()
    attendance.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'დროის შესწორებები' })).toHaveFocus()
    expect(attendance).toHaveAttribute('aria-selected', 'true')
  })
  it('uses timesheets for personal attendance history', () => {
    location.pathname = '/timesheets'
    render(
      <AttendanceNavigation>
        <h1>ჩემი სამუშაო საათები</h1>
      </AttendanceNavigation>,
    )
    expect(
      screen.getByRole('tab', { name: 'სამუშაო საათები' }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'ჩემი სამუშაო საათები',
    )
    expect(
      screen.queryByRole('tab', { name: 'დასწრების ისტორია' }),
    ).not.toBeInTheDocument()
  })
})

it.each(['hr_manager', 'admin'] as const)(
  'shows the complaint unread dot to %s and on the collapsed management group',
  (role) => {
    const { container } = renderSidebar(role, true, undefined, false, true)
    expect(
      screen.getByRole('button', { name: /მართვა.*წაუკითხავი საჩივრები/ }),
    ).toBeInTheDocument()
    expect(
      container.querySelector('[data-slot="complaint-group-unread-dot"]'),
    ).toHaveAttribute('aria-hidden', 'true')
  },
)
it('shows a complaint dot on the management destination without granting employees review access', () => {
  const { container, unmount } = renderSidebar(
    'hr_manager',
    false,
    undefined,
    false,
    true,
  )
  expect(
    screen.getByRole('link', {
      name: /საჩივრების მართვა.*წაუკითხავი საჩივრები/,
    }),
  ).toHaveAttribute('href', '/manage/complaints')
  expect(
    container.querySelector('[data-slot="complaint-unread-dot"]'),
  ).toBeInTheDocument()
  unmount()
  renderSidebar('employee', false, undefined, false, true)
  expect(
    screen.queryByRole('link', { name: /საჩივრების მართვა/ }),
  ).not.toBeInTheDocument()
})
