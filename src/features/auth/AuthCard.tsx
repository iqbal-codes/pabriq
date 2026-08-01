import type { ReactElement, ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

type AuthCardProps = {
  title: ReactNode
  description: ReactNode
  children: ReactNode
}

export default function AuthCard({
  title,
  description,
  children,
}: AuthCardProps): ReactElement {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <img
          src="/labq_bq_logo_vector.svg"
          alt="labq.dev"
          className="h-20 w-auto"
        />
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </main>
  )
}
