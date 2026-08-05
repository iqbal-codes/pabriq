import { Suspense, useEffect, useState } from 'react'
import { useGlobalModal, useGlobalSheet } from '#/hooks/use-global-overlay'
import {
  InviteMemberDialogWrapper,
  MaterializeBusinessTemplateDialogWrapper,
  PaymentMethodFormDialogWrapper,
  ProductTemplateFormDialogWrapper,
  RecordPaymentDialogWrapper,
  ReviewModalWrapper,
  StageFormWrapper,
  TaskDetailModalWrapper,
} from './global-modal-registry-map'

const GLOBAL_MODALS = {
  'invite-member': InviteMemberDialogWrapper,
  'payment-method-form': PaymentMethodFormDialogWrapper,
  'record-payment': RecordPaymentDialogWrapper,
  'stage-form': StageFormWrapper,
  'task-detail': TaskDetailModalWrapper,
  'review-task': ReviewModalWrapper,
  'product-template-form': ProductTemplateFormDialogWrapper,
  'materialize-business-template': MaterializeBusinessTemplateDialogWrapper,
} as const

export function GlobalModalContainer() {
  const { modal, modalId, closeModal: closeModalState } = useGlobalModal()
  const { sheet, sheetId, closeSheet } = useGlobalSheet()

  // Animation preservation — hold the last overlay key so exit animations play
  const [lastModal, setLastModal] = useState<string | null>(null)
  const [lastModalId, setLastModalId] = useState<string | null>(null)

  const [lastSheet, setLastSheet] = useState<string | null>(null)
  const [lastSheetId, setLastSheetId] = useState<string | null>(null)

  useEffect(() => {
    if (modal) {
      setLastModal(modal)
      setLastModalId(modalId)
    }
  }, [modal, modalId])

  useEffect(() => {
    if (sheet) {
      setLastSheet(sheet)
      setLastSheetId(sheetId)
    }
  }, [sheet, sheetId])

  const activeModal = modal || lastModal
  const activeModalId = modalId || lastModalId

  const activeSheet = sheet || lastSheet
  const activeSheetId = sheetId || lastSheetId

  return (
    <>
      {activeModal &&
        (() => {
          const ModalComponent =
            GLOBAL_MODALS[activeModal as keyof typeof GLOBAL_MODALS]
          if (!ModalComponent) return null
          return (
            <Suspense fallback={null}>
              <ModalComponent
                open={!!modal}
                onOpenChange={(open: boolean) => {
                  if (!open) closeModalState()
                }}
                id={activeModalId}
              />
            </Suspense>
          )
        })()}

      {activeSheet &&
        (() => {
          const SheetComponent =
            GLOBAL_MODALS[activeSheet as keyof typeof GLOBAL_MODALS]
          if (!SheetComponent) return null
          return (
            <Suspense fallback={null}>
              <SheetComponent
                open={!!sheet}
                onOpenChange={(open: boolean) => {
                  if (!open) closeSheet()
                }}
                id={activeSheetId}
              />
            </Suspense>
          )
        })()}
    </>
  )
}
