import { z } from 'zod'

export const notificationListSchema = z.object({
  limit: z
    .number({ error: 'რაოდენობა არასწორია.' })
    .int({ error: 'რაოდენობა მთელი რიცხვი უნდა იყოს.' })
    .min(1, 'მინიმუმ ერთი ჩანაწერი აირჩიეთ.')
    .max(50, 'მაქსიმუმ 50 ჩანაწერის მოთხოვნაა შესაძლებელი.'),
  offset: z
    .number({ error: 'გვერდი არასწორია.' })
    .int({ error: 'გვერდი არასწორია.' })
    .min(0, 'გვერდი არასწორია.')
    .max(100000, 'გვერდების ზღვარი მიღწეულია.'),
})

export const markNotificationsSeenSchema = z.object({
  ids: z
    .array(z.uuid({ error: 'შეტყობინების იდენტიფიკატორი არასწორია.' }), {
      error: 'აირჩიეთ შეტყობინებები.',
    })
    .min(1, 'აირჩიეთ შეტყობინება.')
    .max(50, 'ერთდროულად მაქსიმუმ 50 შეტყობინება მონიშნეთ.'),
})
