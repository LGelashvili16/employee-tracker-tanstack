import { APP_NAME } from '#/lib/app'

export const authContent = {
  login: {
    title: 'შესვლა',
    description: `შედით თქვენს ${APP_NAME} ანგარიშში.`,
  },
  register: {
    title: 'ანგარიშის გააქტიურება',
    description:
      'გამოიყენეთ ადმინისტრატორისგან მიღებული კოდი და აირჩიეთ პაროლი.',
  },
  acceptInvitation: {
    title: 'მოწვევის მიღება',
    description: 'კომპანიის სამუშაო სივრცეში გაწევრიანების მოწვევა.',
  },
  forgotPassword: {
    title: 'პაროლის აღდგენა',
    description: 'პაროლის აღდგენა კომპანიის ადმინისტრატორის დახმარებით.',
  },
  resetPassword: {
    title: 'ახალი პაროლი',
    description: 'მიუთითეთ ადმინისტრატორის მიერ გაცემული კოდი და ახალი პაროლი.',
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
