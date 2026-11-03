import { APP_NAME } from '#/lib/app'

export const authContent = {
  login: {
    title: 'შესვლა',
    description: `შედით თქვენს ${APP_NAME} ანგარიშში.`,
  },
  register: {
    title: 'ანგარიშის შექმნა',
    description: 'რეგისტრაცია ხელმისაწვდომია მხოლოდ კომპანიის მოწვევით.',
  },
  acceptInvitation: {
    title: 'მოწვევის მიღება',
    description: 'კომპანიის სამუშაო სივრცეში გაწევრიანების მოწვევა.',
  },
  forgotPassword: {
    title: 'პაროლის აღდგენა',
    description: 'ანგარიშზე წვდომის აღდგენა.',
  },
  resetPassword: {
    title: 'ახალი პაროლი',
    description: 'ანგარიშის ახალი პაროლის დაყენება.',
  },
  verifyEmail: {
    title: 'ელფოსტის დადასტურება',
    description: 'თქვენი ელფოსტის მისამართის დადასტურება.',
  },
  mfa: {
    title: 'დამატებითი დადასტურება',
    description: 'ანგარიშზე შესვლის დამატებითი შემოწმება.',
  },
} as const
