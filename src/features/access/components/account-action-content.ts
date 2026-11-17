import {
  IconCheck,
  IconKey,
  IconLockPassword,
  IconTrash,
  IconUserCheck,
  IconUserOff,
} from '@tabler/icons-react'
import type { Icon } from '@tabler/icons-react'
import type { z } from 'zod'
import type { accountActionSchema } from '../access.schemas'

export type AccountAction = z.infer<typeof accountActionSchema>['action']

interface AccountActionContent {
  label: string
  description: string
  summary: string
  confirmLabel: string
  successMessage: string
  icon: Icon
  confirmIcon: Icon
  destructive: boolean
}

export const accountActionContent: Record<AccountAction, AccountActionContent> =
  {
    issue_activation: {
      label: 'გააქტიურების კოდის გაცემა',
      summary: 'ერთჯერადი კოდი ანგარიშის გასააქტიურებლად.',
      description:
        'თანამშრომელი ამ კოდით პირველად აირჩევს პაროლს. წინა გააქტიურების კოდი გაუქმდება.',
      confirmLabel: 'კოდის გაცემა',
      successMessage: 'გააქტიურების კოდი გაცემულია.',
      icon: IconKey,
      confirmIcon: IconKey,
      destructive: false,
    },
    issue_reset: {
      label: 'აღდგენის კოდის გაცემა',
      summary: 'მოქმედი პაროლი კოდის გამოყენებამდე შენარჩუნდება.',
      description:
        'თანამშრომელი ამ კოდით აირჩევს ახალ პაროლს. მიმდინარე პაროლი მოქმედებს, სანამ კოდს არ გამოიყენებს. წინა კოდი გაუქმდება.',
      confirmLabel: 'კოდის გაცემა',
      successMessage: 'პაროლის აღდგენის კოდი გაცემულია.',
      icon: IconLockPassword,
      confirmIcon: IconKey,
      destructive: false,
    },
    suspend: {
      label: 'წვდომის შეჩერება',
      summary: 'სესიები და გამოუყენებელი კოდები გაუქმდება.',
      description:
        'თანამშრომელი ვეღარ შევა სისტემაში. მიმდინარე სესიები და გამოუყენებელი კოდები გაუქმდება. წვდომის აღდგენა მოგვიანებით შესაძლებელია.',
      confirmLabel: 'შეჩერება',
      successMessage: 'წვდომა შეჩერებულია.',
      icon: IconUserOff,
      confirmIcon: IconTrash,
      destructive: true,
    },
    restore: {
      label: 'წვდომის აღდგენა',
      summary: 'თანამშრომელი ანგარიშზე წვდომას დაიბრუნებს.',
      description:
        'თანამშრომელი იმავე ანგარიშით კვლავ მიიღებს წვდომას. თუ ანგარიში არასდროს გააქტიურებულა, დაგჭირდებათ ახალი გააქტიურების კოდი.',
      confirmLabel: 'აღდგენა',
      successMessage: 'წვდომა აღდგენილია.',
      icon: IconUserCheck,
      confirmIcon: IconCheck,
      destructive: false,
    },
  }
