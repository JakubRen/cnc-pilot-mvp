'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { logger } from '@/lib/logger'
import { useConfirmation } from '@/components/ui/ConfirmationDialog'

interface Props {
  documentId: string
  documentNumber: string
  companyId: string
}

export default function DeleteButton({ documentId, documentNumber, companyId }: Props) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const { confirm, ConfirmDialog } = useConfirmation()

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Usunąć dokument?',
      description: `Czy na pewno chcesz usunąć dokument ${documentNumber}? Ta operacja jest nieodwracalna!`,
      confirmText: 'Usuń',
      cancelText: 'Anuluj',
      variant: 'danger',
    })

    if (!confirmed) return

    setIsDeleting(true)
    const loadingToast = toast.loading('Usuwam dokument...')

    try {
      // Delete document (CASCADE will delete items automatically)
      const { error } = await supabase
        .from('warehouse_documents')
        .delete()
        .eq('id', documentId)
        .eq('company_id', companyId) // Security: ensure same company

      if (error) throw error

      toast.dismiss(loadingToast)
      toast.success('Dokument usunięty!')
      router.push('/documents')
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Błąd usuwania: ' + (error as Error).message)
      logger.error('Error deleting document', { error })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <ConfirmDialog />
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
      >
        {isDeleting ? 'Usuwam...' : 'Usuń'}
      </button>
    </>
  )
}
