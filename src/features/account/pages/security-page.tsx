import { IconInfoCircle } from '@tabler/icons-react'
import { FeaturePage } from '#/components/common/feature-page'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { accountContent } from '../account.content'
import { ChangePasswordForm } from '../components/change-password-form'

export function SecurityPage() {
  return (
    <FeaturePage {...accountContent.security}>
      <Card>
        <CardHeader>
          <CardTitle>პაროლის შეცვლა</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Alert variant="info" role="note" className="max-w-md">
            <IconInfoCircle aria-hidden="true" />
            <AlertTitle>დაგავიწყდათ პაროლი?</AlertTitle>
            <AlertDescription>
              თუ ვეღარ შედიხართ, სთხოვეთ ადმინისტრატორს აღდგენის კოდი.
            </AlertDescription>
          </Alert>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </FeaturePage>
  )
}
