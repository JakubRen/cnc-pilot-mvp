'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { logger } from '@/lib/logger'

interface Material {
  id: string
  material_name: string
  material_category: string
  emission_factor: number
}

interface Energy {
  id: string
  energy_name: string
  energy_type: string
  emission_factor: number
  unit: string
}

interface CarbonCalculatorProps {
  materials: Material[]
  energies: Energy[]
  companyId: string
  userId: number
}

export default function CarbonCalculator({ materials, energies, companyId, userId }: CarbonCalculatorProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form fields
  const [productName, setProductName] = useState('')
  const [productQuantity, setProductQuantity] = useState('1')
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [materialWeight, setMaterialWeight] = useState('')
  const [selectedEnergy, setSelectedEnergy] = useState('')
  const [energyUsage, setEnergyUsage] = useState('')
  const [orderId, setOrderId] = useState('')
  const [orders, setOrders] = useState<{ id: string; order_number: string; customer_name: string }[]>([])

  // Calculated values
  const [materialCO2, setMaterialCO2] = useState(0)
  const [energyCO2, setEnergyCO2] = useState(0)
  const [totalCO2, setTotalCO2] = useState(0)
  const [co2PerUnit, setCo2PerUnit] = useState(0)

  // Load orders
  useEffect(() => {
    const loadOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, customer_name')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data) setOrders(data)
    }
    loadOrders()
  }, [companyId])

  // Calculate CO2 on input change
  useEffect(() => {
    const material = materials.find(m => m.id === selectedMaterial)
    const energy = energies.find(e => e.id === selectedEnergy)
    const weight = parseFloat(materialWeight) || 0
    const kwh = parseFloat(energyUsage) || 0
    const qty = parseFloat(productQuantity) || 1

    const matCO2 = weight * (material?.emission_factor || 0)
    const enCO2 = kwh * (energy?.emission_factor || 0)
    const total = matCO2 + enCO2
    const perUnit = qty > 0 ? total / qty : 0

    setMaterialCO2(matCO2)
    setEnergyCO2(enCO2)
    setTotalCO2(total)
    setCo2PerUnit(perUnit)
  }, [selectedMaterial, materialWeight, selectedEnergy, energyUsage, productQuantity, materials, energies])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!productName.trim()) {
      toast.error('Podaj nazwę produktu')
      return
    }

    if (totalCO2 <= 0) {
      toast.error('Oblicz emisję przed zapisaniem')
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading('Generowanie raportu...')

    try {
      // Generate report number
      const { data: reportNumber } = await supabase
        .rpc('generate_carbon_report_number', { p_company_id: companyId })

      const material = materials.find(m => m.id === selectedMaterial)
      const energy = energies.find(e => e.id === selectedEnergy)

      const { error } = await supabase
        .from('carbon_reports')
        .insert({
          company_id: companyId,
          order_id: orderId || null,
          report_number: reportNumber || `CO2-${Date.now()}`,
          product_name: productName,
          product_quantity: parseFloat(productQuantity) || 1,
          material_name: material?.material_name || null,
          material_weight_kg: parseFloat(materialWeight) || null,
          material_emission_factor: material?.emission_factor || null,
          material_co2_kg: materialCO2 || null,
          energy_kwh: parseFloat(energyUsage) || null,
          energy_emission_factor: energy?.emission_factor || null,
          energy_co2_kg: energyCO2 || null,
          total_co2_kg: totalCO2,
          co2_per_unit: co2PerUnit,
          created_by: userId
        })

      if (error) throw error

      toast.dismiss(loadingToast)
      toast.success(`Raport ${reportNumber} utworzony!`)

      // Reset form
      setProductName('')
      setProductQuantity('1')
      setSelectedMaterial('')
      setMaterialWeight('')
      setSelectedEnergy('')
      setEnergyUsage('')
      setOrderId('')

      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      logger.error('Error creating carbon report', { error })
      toast.error('Nie udało się utworzyć raportu')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Group materials by category
  const materialsByCategory = materials.reduce((acc, mat) => {
    if (!acc[mat.material_category]) acc[mat.material_category] = []
    acc[mat.material_category].push(mat)
    return acc
  }, {} as Record<string, Material[]>)

  const categoryLabels: Record<string, string> = {
    steel: '🔩 Stal',
    aluminum: '🪶 Aluminium',
    copper: '🔶 Miedź/Mosiądz',
    titanium: '⚙️ Tytan',
    plastic: '🧪 Tworzywa',
    iron: '⚫ Żeliwo',
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
      {/* Product Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2">
          <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">Nazwa produktu *</label>
          <Input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="np. Wałek Ø50x200"
            required
          />
        </div>
        <div>
          <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">Ilość (szt)</label>
          <Input
            type="number"
            min="1"
            value={productQuantity}
            onChange={(e) => setProductQuantity(e.target.value)}
          />
        </div>
      </div>

      {/* Order Link */}
      <div className="mb-6">
        <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">Powiąż z zamówieniem (opcjonalne)</label>
        <select
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">-- Bez powiązania --</option>
          {orders.map(order => (
            <option key={order.id} value={order.id}>
              {order.order_number} - {order.customer_name}
            </option>
          ))}
        </select>
      </div>

      {/* Material Section */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-4">
        <h3 className="text-slate-900 dark:text-white font-semibold mb-3 flex items-center gap-2">
          <span>🔩</span> Emisja z materiału
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-2 text-sm">Materiał</label>
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">-- Wybierz materiał --</option>
              {Object.entries(materialsByCategory).map(([cat, mats]) => (
                <optgroup key={cat} label={categoryLabels[cat] || cat}>
                  {mats.map(mat => (
                    <option key={mat.id} value={mat.id}>
                      {mat.material_name} ({mat.emission_factor} kg CO₂/kg)
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-2 text-sm">Waga materiału (kg)</label>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={materialWeight}
              onChange={(e) => setMaterialWeight(e.target.value)}
              placeholder="np. 2.5"
            />
          </div>
        </div>
        {materialCO2 > 0 && (
          <div className="mt-3 text-right">
            <span className="text-slate-500 dark:text-slate-400 text-sm">Emisja materiału: </span>
            <span className="text-green-400 font-semibold">{materialCO2.toFixed(3)} kg CO₂</span>
          </div>
        )}
      </div>

      {/* Energy Section */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-6">
        <h3 className="text-slate-900 dark:text-white font-semibold mb-3 flex items-center gap-2">
          <span>⚡</span> Emisja z energii
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-2 text-sm">Źródło energii</label>
            <select
              value={selectedEnergy}
              onChange={(e) => setSelectedEnergy(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">-- Wybierz źródło --</option>
              {energies.map(en => (
                <option key={en.id} value={en.id}>
                  {en.energy_name} ({en.emission_factor} kg CO₂/{en.unit})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-2 text-sm">
              Zużycie ({energies.find(e => e.id === selectedEnergy)?.unit || 'kWh'})
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={energyUsage}
              onChange={(e) => setEnergyUsage(e.target.value)}
              placeholder="np. 15.5"
            />
          </div>
        </div>
        {energyCO2 > 0 && (
          <div className="mt-3 text-right">
            <span className="text-slate-500 dark:text-slate-400 text-sm">Emisja energii: </span>
            <span className="text-green-400 font-semibold">{energyCO2.toFixed(3)} kg CO₂</span>
          </div>
        )}
      </div>

      {/* Results */}
      {totalCO2 > 0 && (
        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-lg p-6 mb-6">
          <h3 className="text-green-400 font-semibold mb-4 text-lg">📊 Wynik obliczeń</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Całkowita emisja</p>
              <p className="text-3xl font-bold text-green-400">{totalCO2.toFixed(3)} kg</p>
              <p className="text-slate-500 text-xs">CO₂</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Emisja na sztukę</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{co2PerUnit.toFixed(3)} kg</p>
              <p className="text-slate-500 text-xs">CO₂ / szt</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-green-700/30">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Materiał:</span>
              <span className="text-slate-900 dark:text-white">{materialCO2.toFixed(3)} kg CO₂</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Energia:</span>
              <span className="text-slate-900 dark:text-white">{energyCO2.toFixed(3)} kg CO₂</span>
            </div>
          </div>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting || totalCO2 <= 0}
        variant="primary"
        className="w-full"
      >
        {isSubmitting ? 'Generowanie...' : '🌱 Zapisz Paszport Węglowy'}
      </Button>
    </form>
  )
}
