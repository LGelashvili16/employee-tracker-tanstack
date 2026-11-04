import { z } from 'zod'

const identifier = z.uuid({ error: 'ჩანაწერის იდენტიფიკატორი არასწორია.' })
export const checkInSchema = z.object(
  {
    requestId: identifier,
    expectedLastSessionId: identifier.nullable(),
  },
  { error: 'შესვლის მოთხოვნა არასწორია.' },
)
export const checkOutSchema = z.object(
  {
    sessionId: identifier,
    confirmEarly: z.boolean({
      error: 'დაადასტურეთ სამუშაო დღის ადრე დასრულება.',
    }),
  },
  { error: 'გასვლის მოთხოვნა არასწორია.' },
)
