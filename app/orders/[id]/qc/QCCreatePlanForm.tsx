'use client'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface NewPlanItem {
  tempId: string
  name: string
  nominal_value: string
  tolerance_plus: string
  tolerance_minus: string
  unit: string
  is_critical: boolean
}

interface Props {
  planName: string
  onPlanNameChange: (value: string) => void
  planPartName: string
  onPlanPartNameChange: (value: string) => void
  planDescription: string
  onPlanDescriptionChange: (value: string) => void
  newItems: NewPlanItem[]
  onAddItem: () => void
  onRemoveItem: (tempId: string) => void
  onUpdateItem: (tempId: string, field: keyof NewPlanItem, value: string | boolean) => void
  isCreatingPlan: boolean
  onSubmit: (e: React.FormEvent) => void
}

export default function QCCreatePlanForm({
  planName, onPlanNameChange, planPartName, onPlanPartNameChange,
  planDescription, onPlanDescriptionChange, newItems, onAddItem,
  onRemoveItem, onUpdateItem, isCreatingPlan, onSubmit,
}: Props) {
  return (
    <form onSubmit={onSubmit}>
      {/* Basic info */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Informacje o planie</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-foreground text-sm mb-1">Nazwa planu *</label>
            <Input
              value={planName}
              onChange={(e) => onPlanNameChange(e.target.value)}
              placeholder="np. Kontrola tulei 50mm"
              required
            />
          </div>
          <div>
            <label className="block text-foreground text-sm mb-1">Nazwa części</label>
            <Input
              value={planPartName}
              onChange={(e) => onPlanPartNameChange(e.target.value)}
              placeholder="np. Tuleja 50x30"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-foreground text-sm mb-1">Opis</label>
            <textarea
              value={planDescription}
              onChange={(e) => onPlanDescriptionChange(e.target.value)}
              placeholder="Dodatkowe informacje o planie kontroli..."
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none text-sm"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Dimensions */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-foreground">Wymiary do kontroli</h3>
          <Button type="button" onClick={onAddItem} variant="ghost" size="sm">
            + Dodaj wymiar
          </Button>
        </div>

        <div className="space-y-4">
          {newItems.map((item, index) => (
            <div key={item.tempId} className="bg-muted border border-border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <span className="text-muted-foreground text-sm">Wymiar #{index + 1}</span>
                {newItems.length > 1 && (
                  <button type="button" onClick={() => onRemoveItem(item.tempId)} className="text-red-500 dark:text-red-400 hover:text-red-700 text-sm">
                    Usuń
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="col-span-2">
                  <label className="block text-muted-foreground text-xs mb-1">Nazwa wymiaru *</label>
                  <Input
                    value={item.name}
                    onChange={(e) => onUpdateItem(item.tempId, 'name', e.target.value)}
                    placeholder="np. Średnica zewnętrzna"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground text-xs mb-1">Wartość nom. *</label>
                  <Input
                    type="number"
                    step="0.001"
                    value={item.nominal_value}
                    onChange={(e) => onUpdateItem(item.tempId, 'nominal_value', e.target.value)}
                    placeholder="50.00"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground text-xs mb-1">Tol. +</label>
                  <Input
                    type="number"
                    step="0.001"
                    value={item.tolerance_plus}
                    onChange={(e) => onUpdateItem(item.tempId, 'tolerance_plus', e.target.value)}
                    placeholder="0.05"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground text-xs mb-1">Tol. -</label>
                  <Input
                    type="number"
                    step="0.001"
                    value={item.tolerance_minus}
                    onChange={(e) => onUpdateItem(item.tempId, 'tolerance_minus', e.target.value)}
                    placeholder="0.05"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground text-xs mb-1">Jednostka</label>
                  <select
                    value={item.unit}
                    onChange={(e) => onUpdateItem(item.tempId, 'unit', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:border-violet-500 focus:outline-none"
                  >
                    <option value="mm">mm</option>
                    <option value="um">µm</option>
                    <option value="deg">°</option>
                    <option value="Ra">Ra</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`critical-${item.tempId}`}
                  checked={item.is_critical}
                  onChange={(e) => onUpdateItem(item.tempId, 'is_critical', e.target.checked)}
                  className="w-4 h-4 rounded border-border text-red-600 focus:ring-red-500"
                />
                <label htmlFor={`critical-${item.tempId}`} className="text-muted-foreground text-sm">
                  Wymiar krytyczny (100% kontroli)
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={isCreatingPlan} variant="primary" className="w-full">
        {isCreatingPlan ? 'Tworzenie...' : 'Utwórz plan kontroli'}
      </Button>
    </form>
  )
}
