export const scheduleTimezones = [
  { value: 'Asia/Tbilisi', label: 'თბილისი' },
  { value: 'UTC', label: 'უნივერსალური დრო' },
  { value: 'Asia/Yerevan', label: 'ერევანი' },
  { value: 'Asia/Baku', label: 'ბაქო' },
  { value: 'Europe/Istanbul', label: 'სტამბოლი' },
  { value: 'Europe/Berlin', label: 'ბერლინი' },
  { value: 'Europe/London', label: 'ლონდონი' },
  { value: 'America/New_York', label: 'ნიუ-იორკი' },
]

/** Show the offset on the schedule's effective date, including that timezone's daylight-saving rules. */
export function scheduleTimezoneOffset(timezone: string, date: string) {
  const name =
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    })
      .formatToParts(new Date(`${date}T12:00:00Z`))
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
  return name === 'GMT' ? 'UTC+00:00' : name.replace('GMT', 'UTC')
}
