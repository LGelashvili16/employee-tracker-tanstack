import { Link } from '@tanstack/react-router'
import { IconArrowRight, IconKey } from '@tabler/icons-react'
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
    <Card className="w-full py-8 shadow-sm sm:px-4 sm:py-10">
      <CardHeader className="flex flex-col items-center gap-4 text-center">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full bg-muted text-foreground ring-8 ring-muted/50"
        >
          <IconKey className="size-8" />
        </span>
        <CardTitle>
          <h1 className="text-2xl font-semibold tracking-tight">
            {authContent.forgotPassword.title}
          </h1>
        </CardTitle>
        <CardDescription className="max-w-sm leading-6">
          აღდგენის კოდის მისაღებად დაუკავშირდით კომპანიის ადმინისტრატორს. კოდი
          მოქმედებს 15 წუთის განმავლობაში.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button
          nativeButton={false}
          role="link"
          className="h-10 w-full"
          render={<Link to="/auth/reset-password" />}
        >
          უკვე მაქვს აღდგენის კოდი
          <IconArrowRight aria-hidden="true" />
        </Button>
        <Button
          nativeButton={false}
          role="link"
          className="h-10 w-full"
          variant="outline"
          render={<Link to="/auth/login" />}
        >
          შესვლაზე დაბრუნება
        </Button>
      </CardContent>
    </Card>
  )
}
