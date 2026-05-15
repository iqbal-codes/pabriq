import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ImageIcon, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useTranslations } from 'use-intl'
import { useAppForm } from '#/components/app/form'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { finalizeUpload, getUploadUrl } from '#/features/assets/server'
import {
  createOrganization,
  listUserOrgs,
  setOrganizationLogo,
} from '#/features/auth/org'
import { getCurrentSession } from '#/lib/auth-session'
import { cn } from '#/lib/utils'

const ERROR_MAP: Record<string, 'nameInvalid' | 'creationFailed' | 'taken'> = {
  name_invalid: 'nameInvalid',
  creation_failed: 'creationFailed',
  name_taken: 'taken',
}

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) {
      throw redirect({ to: '/sign-in', search: { redirect: undefined } })
    }
  },
  component: OnboardingPage,
})

const MAX_LOGO_BYTES = 5 * 1024 * 1024

function OnboardingPage() {
  const t = useTranslations('org')
  const ct = useTranslations('common')
  const navigate = useNavigate()
  const { data: orgs, isLoading } = useQuery({
    queryKey: ['user-orgs'],
    queryFn: () => listUserOrgs(),
  })

  useEffect(() => {
    if (orgs && orgs.length > 0) {
      navigate({ to: '/' })
    }
  }, [orgs, navigate])

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setLogoFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': [],
      'image/jpeg': [],
      'image/webp': [],
    },
    maxFiles: 1,
    multiple: false,
  })

  const form = useAppForm({
    defaultValues: { name: '' },
    onSubmit: async ({ value }) => {
      setSubmitError(null)

      // Step 1: Create organization first
      const result = await createOrganization({
        data: { name: value.name },
      })

      if (!result.ok) {
        const key = ERROR_MAP[result.error as keyof typeof ERROR_MAP]
        setSubmitError(key ? t(key) : t('creationFailed'))
        return
      }

      // Step 2: Upload logo if user selected one
      // resolveOrgId() now works because createOrganization added user as member ✅
      if (logoFile && logoFile.size <= MAX_LOGO_BYTES) {
        try {
          const { uploadUrl, storageKey, assetId } = await getUploadUrl({
            data: {
              fileName: logoFile.name,
              fileType: logoFile.type || 'image/png',
              fileSize: logoFile.size,
              ownerType: 'organization',
              ownerId: result.orgId,
              usage: 'logo',
            },
          })

          const arrayBuffer = await logoFile.arrayBuffer()
          await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': logoFile.type || 'image/png' },
            body: arrayBuffer,
          })

          const finalized = await finalizeUpload({
            data: {
              assetId,
              ownerType: 'organization',
              ownerId: result.orgId,
              usage: 'logo',
              originalFilename: logoFile.name,
              mimeType: logoFile.type || 'image/png',
              sizeBytes: logoFile.size,
              storageKeyOriginal: storageKey,
              variantOriginalMimeType: logoFile.type || 'image/png',
              variantOriginalSizeBytes: logoFile.size,
            },
          })

          await setOrganizationLogo({
            data: {
              orgId: result.orgId,
              logoAssetId: finalized.assetId,
            },
          })
        } catch (err) {
          // Logo upload failed but org was created - still redirect
          console.error('Logo upload failed:', err)
        }
      }

      navigate({ to: '/' })
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{ct('loading')}</p>
      </div>
    )
  }

  if (orgs && orgs.length > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{t('redirecting')}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('welcome')}</CardTitle>
          <CardDescription>{t('createDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
          >
            <div className="mb-6">
              <p className="text-sm font-medium mb-2">{t('logoPhoto')}</p>
              <div className="flex flex-wrap gap-2">
                {!logoFile ? (
                  <div
                    {...getRootProps()}
                    className={cn(
                      'size-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted transition-colors cursor-pointer shrink-0',
                      isDragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-muted',
                    )}
                  >
                    <input {...getInputProps()} />
                    <ImageIcon className="size-6 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="relative size-24 rounded-lg border bg-background overflow-hidden group shrink-0">
                    <img
                      src={URL.createObjectURL(logoFile)}
                      alt={logoFile.name}
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="size-5"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setLogoFile(null)
                        }}
                      >
                        <X className="size-2.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('logoPhotoHint')}
              </p>
            </div>

            <form.AppField
              name="name"
              validators={{
                onChange: ({ value }) =>
                  value.trim().length < 2 ? t('nameMin') : undefined,
              }}
            >
              {(field) => (
                <field.TextField
                  label={t('name')}
                  placeholder={t('namePlaceholder')}
                />
              )}
            </form.AppField>

            {submitError && (
              <form.AppForm>
                <form.FormError message={submitError} />
              </form.AppForm>
            )}

            <form.AppForm>
              <form.SubmitButton className="mt-6 w-full">
                {t('create')}
              </form.SubmitButton>
            </form.AppForm>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
