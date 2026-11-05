import {
  IconCalendarWeek,
  IconClock,
  IconClipboardCheck,
} from '@tabler/icons-react'
import { APP_NAME } from '#/lib/app'
import ParticleText from './particle-text'

const highlights = [
  { icon: IconClock, label: 'სამუშაო დრო' },
  { icon: IconCalendarWeek, label: 'განრიგი' },
  { icon: IconClipboardCheck, label: 'დავალებები' },
]

export function AuthWelcome({
  animateBrand = false,
}: {
  animateBrand?: boolean
}) {
  return (
    <aside className="hidden min-w-0 flex-col items-center justify-center border-r bg-muted/30 px-6 py-12 lg:flex xl:px-10">
      <div className="flex w-full flex-col items-center gap-10 text-center">
        {animateBrand ? (
          <div className="@container h-64 w-full text-foreground xl:h-72">
            <ParticleText
              text={APP_NAME}
              fontSize="clamp(3rem, 19cqw, 10rem)"
              highlightColor="currentColor"
              density={3}
              particleSize={2}
              scatter={100}
              idleDrift={0}
              trigger="hover"
            />
          </div>
        ) : null}
        <h2 className="max-w-lg text-4xl font-semibold leading-relaxed tracking-tight xl:text-5xl">
          თქვენი გუნდი.
          <br />
          ერთ სივრცეში.
        </h2>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-4">
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
    </aside>
  )
}
