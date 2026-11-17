type GreetingClock = { instant: string; timezone: string }

export function dayPeriodGreeting({ instant, timezone }: GreetingClock) {
  const hour = Number(
    new Intl.DateTimeFormat('ka-GE', {
      timeZone: timezone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(instant)),
  )
  if (hour >= 5 && hour < 12) return 'დილა მშვიდობისა'
  if (hour >= 12 && hour < 18) return 'დღე მშვიდობისა'
  if (hour >= 18 && hour < 22) return 'საღამო მშვიდობისა'
  return 'ღამე მშვიდობისა'
}

export function TimeGreeting({
  name,
  clock,
}: {
  name: string
  clock?: GreetingClock
}) {
  // The server sample keeps SSR and browser navigation in the same company timezone.
  const greeting = clock ? dayPeriodGreeting(clock) : 'გამარჯობა'
  const displayName = name.trim().split(' ')[0]
  return (
    <h1 className="w-full text-center text-2xl font-semibold tracking-tight text-balance break-words sm:text-3xl">
      {greeting}
      {displayName ? `, ${displayName} !` : ''}
    </h1>
  )
}
