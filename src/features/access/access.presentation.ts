import type { EmployeeAccountSummary } from './access.types'

const stateLabels: Record<string, string> = {
  invited: 'გასააქტიურებელი',
  active: 'აქტიური',
  suspended: 'შეჩერებული',
}

export function accountInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toLocaleUpperCase('ka')
}

/** Inactive employment overrides the login state because it blocks login on its own. */
export function accountStatus(
  record: Pick<EmployeeAccountSummary, 'state' | 'employmentStatus'>,
) {
  if (record.employmentStatus !== 'active')
    return { label: 'დასაქმება შეჩერებულია', variant: 'orange' as const }
  return {
    label: stateLabels[record.state] ?? 'მიუწვდომელი',
    variant:
      record.state === 'suspended'
        ? ('orange' as const)
        : record.state === 'active'
          ? ('green' as const)
          : ('secondary' as const),
  }
}
