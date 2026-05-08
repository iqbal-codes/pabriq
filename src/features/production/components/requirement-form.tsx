import { Upload, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import type { Requirement } from '../model'

type Responses = Record<string, { value: string; assetIds?: string[] }>

type Props = {
  requirements: Requirement[]
  onCancel: () => void
  onSubmit: (responses: Responses) => void
}

export function RequirementForm({ requirements, onCancel, onSubmit }: Props) {
  const t = useTranslations('production')
  const ct = useTranslations('common')
  const [responses, setResponses] = useState<Responses>({})

  function handleSubmit() {
    const filled: Responses = {}
    for (const req of requirements) {
      const val = responses[req.id]
      if (!val?.value && !val?.assetIds?.length) continue
      filled[req.id] = val
    }
    onSubmit(filled)
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">{t('completeRequirements')}</h3>
      {requirements.map((req) => (
        <div key={req.id}>
          <div className="flex items-center gap-1 mb-1">
            <Label htmlFor={`req-${req.id}`}>{req.label}</Label>
            <span className="text-[10px] text-muted-foreground">
              {req.required
                ? t('requirementRequired')
                : t('requirementOptional')}
            </span>
          </div>
          {req.type === 'text' && (
            <Textarea
              id={`req-${req.id}`}
              value={responses[req.id]?.value ?? ''}
              onChange={(e) =>
                setResponses((prev) => ({
                  ...prev,
                  [req.id]: { value: e.target.value },
                }))
              }
            />
          )}
          {req.type === 'number' && (
            <Input
              id={`req-${req.id}`}
              type="number"
              value={responses[req.id]?.value ?? ''}
              onChange={(e) =>
                setResponses((prev) => ({
                  ...prev,
                  [req.id]: { value: e.target.value },
                }))
              }
            />
          )}
          {req.type === 'upload' && (
            <div className="flex items-center gap-2">
              <Input
                id={`req-${req.id}`}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setResponses((prev) => ({
                      ...prev,
                      [req.id]: { value: file.name },
                    }))
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  document.getElementById(`req-${req.id}`)?.click()
                }}
              >
                <Upload className="size-4" />
                {responses[req.id]?.value
                  ? responses[req.id].value
                  : t('uploadFile')}
              </Button>
              {responses[req.id]?.value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    setResponses((prev) => {
                      const next = { ...prev }
                      delete next[req.id]
                      return next
                    })
                  }
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          {ct('cancel')}
        </Button>
        <Button onClick={handleSubmit}>{ct('save')}</Button>
      </div>
    </div>
  )
}
