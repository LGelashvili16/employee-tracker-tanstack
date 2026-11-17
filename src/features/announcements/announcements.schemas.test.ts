import { describe, expect, it } from 'vitest'
import {
  announcementLookupSchema,
  announcementSearchSchema,
  publishAnnouncementSchema,
} from './announcements.schemas'

describe('announcement validation language', () => {
  it.each([
    [publishAnnouncementSchema, null],
    [
      publishAnnouncementSchema,
      { requestId: false, title: 1, body: null, showOnLogin: 'yes' },
    ],
    [announcementSearchSchema, null],
    [
      announcementSearchSchema,
      { page: 'invalid', q: 1, sort: 'invalid', status: 'invalid' },
    ],
    [announcementLookupSchema, null],
    [announcementLookupSchema, { id: 'invalid' }],
  ])('returns Georgian errors for malformed input', (schema, input) => {
    const result = schema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      for (const issue of result.error.issues)
        expect(issue.message).toMatch(/[\u10a0-\u10ff]/)
    }
  })
})
