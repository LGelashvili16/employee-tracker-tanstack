// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { listOwnNotifications } from './notifications.service.server'
import type { Actor } from '#/lib/authorization/actor'

vi.mock('@tanstack/react-start/server-only', () => ({}))
vi.mock('./notifications.repository.server', () => ({
  listForRecipient: () =>
    Promise.resolve({
      unseenCount: 1,
      items: [
        {
          complaintId: '019aac01-0000-7000-8000-000000000001',
          createdAt: new Date('2026-11-11T00:00:00Z'),
        },
      ],
    }),
}))
it.each([false, true])(
  'uses a reachable complaint destination for partial grants: manage=%s',
  async (manage) => {
    const actor: Actor = {
      id: 'worker',
      name: 'ტესტი',
      email: null,
      emailVerified: false,
      roles: ['employee'],
      permissionOverrides: {
        allow: manage
          ? ['complaints.review.all', 'manage.access']
          : ['complaints.review.all'],
        deny: [],
      },
    }
    const result = await listOwnNotifications(actor, { limit: 5, offset: 0 })
    expect(result.items[0].complaintReview).toBe(manage)
  },
)
