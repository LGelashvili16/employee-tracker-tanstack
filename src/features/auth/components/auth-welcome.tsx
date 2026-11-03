import {
  IconBuildingCommunity,
  IconCalendarWeek,
  IconClock,
  IconClipboardCheck,
} from '@tabler/icons-react'
import { APP_NAME } from '#/lib/app'

const highlights = [
  { icon: IconClock, label: 'სამუშაო დრო' },
  { icon: IconCalendarWeek, label: 'განრიგი' },
  { icon: IconClipboardCheck, label: 'დავალებები' },
]

export function AuthWelcome() {
  return (
    <aside className="hidden flex-col justify-between gap-12 border-r bg-muted/30 p-10 lg:flex xl:p-16">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl border bg-background">
          <IconBuildingCommunity className="size-6" aria-hidden="true" />
        </div>
        <span className="text-xl font-semibold tracking-tight">{APP_NAME}</span>
      </div>
      <div className="flex max-w-lg flex-col gap-10">
        <h2 className="text-4xl font-semibold leading-relaxed tracking-tight xl:text-5xl">
          თქვენი გუნდი.
          <br />
          ერთ სივრცეში.
        </h2>
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          {highlights.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Icon className="size-4" aria-hidden="true" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <span aria-hidden="true" />
    </aside>
  )
}
