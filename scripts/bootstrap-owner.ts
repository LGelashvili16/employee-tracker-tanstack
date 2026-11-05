import { parseArgs } from 'node:util'
import {
  bootstrapOwner,
  recoverOwnerCode,
} from '../src/features/access/server/access.service.server'

const { values } = parseArgs({
  options: {
    code: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string', default: '' },
    recover: { type: 'boolean', default: false },
    reason: { type: 'string', default: '' },
  },
})
try {
  const result = values.recover
    ? await recoverOwnerCode({ code: values.code ?? '', reason: values.reason })
    : await bootstrapOwner({
        code: values.code ?? '',
        name: values.name ?? '',
        contactEmail: values.email,
      })
  // Deliberate one-time handoff to the operator, never emitted by application logging.
  process.stdout.write(
    `მფლობელის შესვლის სახელი: ${values.code}\nერთჯერადი კოდი (მხოლოდ ერთხელ): ${result.code}\nვადა: ${result.expiresAt}\nგახსენით ${result.purpose === 'activation' ? '/auth/register' : '/auth/reset-password'} და თავად აირჩიეთ პაროლი.\n`,
  )
  process.exit(0)
} catch {
  process.stderr.write(
    'პირველი მფლობელის შექმნა ვერ მოხერხდა. გადაამოწმეთ მონაცემები და დარწმუნდით, რომ ადმინისტრატორი ჯერ არ არსებობს.\n',
  )
  process.exit(1)
}
