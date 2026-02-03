'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import QuickMeasureForm from './QuickMeasureForm'

interface OrderItem {
  id: string
  part_name: string
  length: number | null
  width: number | null
  height: number | null
  tolerance_length: number | null
  tolerance_width: number | null
  tolerance_height: number | null
}

interface QuickMeasureModalProps {
  orderId: string
  orderItems: OrderItem[]
  companyId: string
  userId: number
}

export default function QuickMeasureModal({
  orderId,
  orderItems,
  companyId,
  userId,
}: QuickMeasureModalProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedItemIndex, setSelectedItemIndex] = useState(0)

  const handleSuccess = () => {
    // Odśwież stronę po zapisaniu
    router.refresh()
    setIsOpen(false)
  }

  // Filtruj pozycje które mają wymiary
  const itemsWithDimensions = orderItems.filter(
    item => item.length || item.width || item.height
  )

  if (itemsWithDimensions.length === 0) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-gray-400 text-white text-sm rounded-lg cursor-not-allowed font-semibold"
        title="Brak pozycji z wymiarami"
      >
        Szybki pomiar (brak wymiarow)
      </button>
    )
  }

  const selectedItem = itemsWithDimensions[selectedItemIndex]

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition font-semibold"
      >
        Szybki pomiar
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border border-border">
            <div className="p-6">
              {/* Item selector (if multiple items) */}
              {itemsWithDimensions.length > 1 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Wybierz pozycje do pomiaru:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {itemsWithDimensions.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItemIndex(index)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          selectedItemIndex === index
                            ? 'bg-violet-600 text-white'
                            : 'bg-muted text-foreground hover:bg-accent'
                        }`}
                      >
                        {index + 1}. {item.part_name || 'Pozycja'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <QuickMeasureForm
                orderItem={selectedItem}
                orderId={orderId}
                companyId={companyId}
                userId={userId}
                onSuccess={handleSuccess}
                onCancel={() => setIsOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
