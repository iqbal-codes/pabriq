import { parseAsString, useQueryState } from 'nuqs'
import { z } from 'zod'

export const globalOverlaySearchSchema = z.object({
  modal: z.string().nullable().optional(),
  modalId: z.string().nullable().optional(),
  sheet: z.string().nullable().optional(),
  sheetId: z.string().nullable().optional(),
})

export type GlobalOverlaySearchParams = z.infer<
  typeof globalOverlaySearchSchema
>

export function useGlobalModal() {
  const [modal, setModal] = useQueryState('modal', parseAsString)
  const [modalId, setModalId] = useQueryState('modalId', parseAsString)

  const openModal = async (name: string, id?: string) => {
    await setModal(name)
    if (id) {
      await setModalId(id)
    } else {
      await setModalId(null)
    }
  }

  const closeModal = async () => {
    await setModal(null)
    await setModalId(null)
  }

  return {
    modal,
    modalId,
    openModal,
    closeModal,
    isOpen: !!modal,
  }
}

export function useGlobalSheet() {
  const [sheet, setSheet] = useQueryState('sheet', parseAsString)
  const [sheetId, setSheetId] = useQueryState('sheetId', parseAsString)

  const openSheet = async (name: string, id?: string) => {
    await setSheet(name)
    if (id) {
      await setSheetId(id)
    } else {
      await setSheetId(null)
    }
  }

  const closeSheet = async () => {
    await setSheet(null)
    await setSheetId(null)
  }

  return {
    sheet,
    sheetId,
    openSheet,
    closeSheet,
    isOpen: !!sheet,
  }
}
