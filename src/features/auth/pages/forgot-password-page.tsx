import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { authContent } from '../auth.content'

export function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-2xl">{authContent.forgotPassword.title}</h1>
        </CardTitle>
        <CardDescription>
          {authContent.forgotPassword.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm leading-7">
          დაუკავშირდით კომპანიის ადმინისტრატორს. პირადობის გადამოწმების შემდეგ
          მიიღებთ ერთჯერად კოდს, რომელიც 15 წუთის განმავლობაში მოქმედებს. ახალი
          ანგარიშის შექმნა საჭირო არ არის.
        </p>
        <Button
          nativeButton={false}
          role="link"
          className="w-full"
          render={<Link to="/auth/reset-password" />}
        >
          უკვე მაქვს აღდგენის კოდი
        </Button>
        <Button
          nativeButton={false}
          role="link"
          className="w-full"
          variant="outline"
          render={<Link to="/auth/login" />}
        >
          შესვლაზე დაბრუნება
        </Button>
      </CardContent>
    </Card>
  )
}
