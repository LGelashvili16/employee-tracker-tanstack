import { FeaturePage } from '#/components/common/feature-page'
import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { companySettingsContent } from '../company-settings.content'

export function AdministrationPage() {
  return (
    <FeaturePage {...companySettingsContent.administration}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>მომხმარებლები და წვდომა</CardTitle>
            <CardDescription>
              შექმენით თანამშრომლის ანგარიში, გასცით გააქტიურების ან პაროლის
              აღდგენის კოდი და მართეთ ანგარიშის წვდომა.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              nativeButton={false}
              role="link"
              render={<Link to="/admin/users" search={{ page: 1 }} />}
            >
              მომხმარებლების მართვა
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>კომპანიის პარამეტრები</CardTitle>
            <CardDescription>
              კომპანიის ინფორმაცია და სამუშაო სივრცის წესები.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">მზადდება</Badge>
            <p className="mt-3 text-sm text-muted-foreground">
              პარამეტრების შეცვლა ჯერ არ არის ხელმისაწვდომი.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>მოქმედებების ჟურნალი</CardTitle>
            <CardDescription>
              ანგარიშებისა და წვდომის ცვლილებების ისტორია.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">მზადდება</Badge>
            <p className="mt-3 text-sm text-muted-foreground">
              ცვლილებები ინახება. ჟურნალის ნახვა ამ გვერდიდან ჯერ არ არის
              ხელმისაწვდომი.
            </p>
          </CardContent>
        </Card>
      </div>
    </FeaturePage>
  )
}
