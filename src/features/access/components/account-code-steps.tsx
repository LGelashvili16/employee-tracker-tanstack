import type { IssuedAccountCode } from '../access.types'

const handoverSteps = {
  activation: [
    'გადაამოწმეთ თანამშრომლის ვინაობა პირადად.',
    'გადაეცით კოდი პირადად ან დაცული არხით.',
    'თანამშრომელი გახსნის ანგარიშის გააქტიურების გვერდს და თავად აირჩევს პაროლს.',
  ],
  reset: [
    'გადაამოწმეთ თანამშრომლის ვინაობა პირადად.',
    'გადაეცით კოდი პირადად ან დაცული არხით.',
    'თანამშრომელი გახსნის პაროლის აღდგენის გვერდს და თავად აირჩევს ახალ პაროლს.',
  ],
} as const

export function AccountCodeSteps({
  purpose,
}: {
  purpose: IssuedAccountCode['purpose']
}) {
  return (
    <ol className="flex flex-col gap-3">
      {handoverSteps[purpose].map((step, index) => (
        <li key={step} className="flex items-start gap-3 text-sm leading-6">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
          >
            {index + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  )
}
