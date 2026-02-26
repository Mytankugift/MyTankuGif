'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { showNotification } from '@/components/notifications'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalculatorIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

interface PriceFormula {
  id: string
  name: string
  type: 'STANDARD' | 'CUSTOM_STANDARD' | 'PERCENTAGE' | 'FIXED' | 'MIN_MARGIN'
  value: {
    multiplier?: number
    fixedAmount?: number
    percentage?: number
    fixed?: number
    minMargin?: number
  }
  description: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export default function PriceFormulasPage() {
  const router = useRouter()
  const { isAuthenticated, _hasHydrated: hasHydrated, user } = useAdminAuthStore()
  const [formulas, setFormulas] = useState<PriceFormula[]>([])
  const [filteredFormulas, setFilteredFormulas] = useState<PriceFormula[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingFormula, setEditingFormula] = useState<PriceFormula | null>(null)
  
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const defaultFormula = formulas.find(f => f.isDefault)

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return
    loadFormulas()
  }, [hasHydrated, isAuthenticated])

  // Filtrar fórmulas por búsqueda
  useEffect(() => {
    if (!search.trim()) {
      setFilteredFormulas(formulas)
      return
    }

    const searchLower = search.toLowerCase()
    const filtered = formulas.filter((formula) => {
      const name = formula.name.toLowerCase()
      const description = (formula.description || '').toLowerCase()
      const type = formula.type.toLowerCase()
      
      return (
        name.includes(searchLower) ||
        description.includes(searchLower) ||
        type.includes(searchLower)
      )
    })
    setFilteredFormulas(filtered)
  }, [search, formulas])

  const loadFormulas = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get<{ success: boolean; data: PriceFormula[] }>(
        API_ENDPOINTS.ADMIN.PRICE_FORMULAS.LIST
      )
      if (response.data.success) {
        setFormulas(response.data.data)
        setFilteredFormulas(response.data.data)
      }
    } catch (err: any) {
      console.error('Error cargando fórmulas:', err)
      showNotification(err.response?.data?.error?.message || 'Error al cargar fórmulas', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta fórmula?')) {
      return
    }

    try {
      await apiClient.delete(API_ENDPOINTS.ADMIN.PRICE_FORMULAS.DELETE(id))
      showNotification('Fórmula eliminada correctamente', 'success')
      loadFormulas()
    } catch (err: any) {
      console.error('Error eliminando fórmula:', err)
      showNotification(err.response?.data?.error?.message || 'Error al eliminar fórmula', 'error')
    }
  }

  const getFormulaDescription = (formula: PriceFormula): string => {
    switch (formula.type) {
      case 'STANDARD':
        return '(base × 1.15) + $10,000'
      case 'CUSTOM_STANDARD':
        const mult = formula.value.multiplier || 1.15
        const fixed = formula.value.fixedAmount || 10000
        return `(base × ${mult}) + $${fixed.toLocaleString('es-CO')}`
      case 'PERCENTAGE':
        return `base × (1 + ${formula.value.percentage || 0}%)`
      case 'FIXED':
        return `base + $${(formula.value.fixed || 0).toLocaleString('es-CO')}`
      case 'MIN_MARGIN':
        return `base + max(15% de base, $${(formula.value.minMargin || 0).toLocaleString('es-CO')})`
      default:
        return ''
    }
  }

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="max-w-7xl mx-auto">
          {/* Filters - Todo en una sola barra */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              {/* Search - Ocupa el resto del espacio */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar fórmulas..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Botón Nueva fórmula */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Nueva fórmula
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 pt-0">

          {/* Formulas List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredFormulas.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <CalculatorIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {search ? 'No se encontraron fórmulas' : 'No hay fórmulas'}
              </h3>
              <p className="text-gray-600 mb-6">
                {search ? 'Intenta con otro término de búsqueda' : 'Crea tu primera fórmula de precio para empezar'}
              </p>
              {!search && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  Crear Fórmula
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fórmula
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFormulas.map((formula) => (
                  <tr key={formula.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{formula.name}</span>
                        {formula.isDefault && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            Predeterminada
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">{formula.type.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 font-mono">{getFormulaDescription(formula)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">{formula.description || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingFormula(formula)}
                          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                        >
                          <PencilIcon className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(formula.id)}
                          disabled={formula.isDefault}
                          className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          title={formula.isDefault ? 'No se puede eliminar la fórmula predeterminada' : 'Eliminar'}
                        >
                          <TrashIcon className="w-4 h-4" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}

          {/* Create/Edit Modal */}
          {(showCreateModal || editingFormula) && (
            <PriceFormulaModal
              formula={editingFormula}
              onClose={() => {
                setShowCreateModal(false)
                setEditingFormula(null)
              }}
              onSuccess={() => {
                setShowCreateModal(false)
                setEditingFormula(null)
                loadFormulas()
              }}
              isSuperAdmin={isSuperAdmin}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Componente Modal para crear/editar fórmulas
function PriceFormulaModal({
  formula,
  onClose,
  onSuccess,
  isSuperAdmin = false,
}: {
  formula: PriceFormula | null
  onClose: () => void
  onSuccess: () => void
  isSuperAdmin?: boolean
}) {
  const [formData, setFormData] = useState({
    name: formula?.name || '',
    type: (formula?.type || 'STANDARD') as 'STANDARD' | 'CUSTOM_STANDARD' | 'PERCENTAGE' | 'FIXED' | 'MIN_MARGIN',
    value: {
      multiplier: formula?.value.multiplier || 1.15,
      fixedAmount: formula?.value.fixedAmount || 10000,
      percentage: formula?.value.percentage || 0,
      fixed: formula?.value.fixed || 0,
      minMargin: formula?.value.minMargin || 0,
    },
    description: formula?.description || '',
    isDefault: formula?.isDefault || false,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload: any = {
        name: formData.name,
        type: formData.type,
        value: {},
        description: formData.description || null,
        isDefault: formData.isDefault,
      }

      // Agregar valores según el tipo
      switch (formData.type) {
        case 'CUSTOM_STANDARD':
          payload.value.multiplier = formData.value.multiplier
          payload.value.fixedAmount = formData.value.fixedAmount
          break
        case 'PERCENTAGE':
          payload.value.percentage = formData.value.percentage
          break
        case 'FIXED':
          payload.value.fixed = formData.value.fixed
          break
        case 'MIN_MARGIN':
          payload.value.minMargin = formData.value.minMargin
          break
        case 'STANDARD':
          // No requiere valores adicionales (usa valores fijos: 1.15 y 10000)
          break
      }

      if (formula) {
        // Actualizar
        await apiClient.patch(API_ENDPOINTS.ADMIN.PRICE_FORMULAS.UPDATE(formula.id), payload)
        showNotification('Fórmula actualizada correctamente', 'success')
      } else {
        // Crear
        await apiClient.post(API_ENDPOINTS.ADMIN.PRICE_FORMULAS.CREATE, payload)
        showNotification('Fórmula creada correctamente', 'success')
      }

      onSuccess()
    } catch (err: any) {
      console.error('Error guardando fórmula:', err)
      showNotification(err.response?.data?.error?.message || 'Error al guardar fórmula', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {formula ? 'Editar Fórmula' : 'Nueva Fórmula'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Ej: Estándar 15% + $10k"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Fórmula *
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as 'STANDARD' | 'CUSTOM_STANDARD' | 'PERCENTAGE' | 'FIXED' | 'MIN_MARGIN',
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            >
              <option value="STANDARD">Estándar: (base × 1.15) + $10,000 (fijo)</option>
              <option value="CUSTOM_STANDARD">Personalizada: (base × multiplicador) + suma fija</option>
              <option value="PERCENTAGE">Solo Porcentaje: base × (1 + %)</option>
              <option value="FIXED">Solo Suma Fija: base + monto fijo</option>
              <option value="MIN_MARGIN">Margen Mínimo: base + max(15% de base, monto mínimo)</option>
            </select>
          </div>

          {/* Inputs dinámicos según el tipo */}
          {formData.type === 'CUSTOM_STANDARD' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Multiplicador *
                </label>
                <input
                  type="number"
                  value={formData.value.multiplier}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      value: { ...formData.value, multiplier: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Ej: 1.20 (para 20% de aumento)"
                  min="1"
                  step="0.01"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Multiplicador del precio base. Ej: 1.15 = +15%, 1.20 = +20%, 1.30 = +30%
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Suma Fija (COP) *
                </label>
                <input
                  type="number"
                  value={formData.value.fixedAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      value: { ...formData.value, fixedAmount: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Ej: 15000"
                  min="0"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cantidad fija a sumar después de multiplicar. Ej: 10000, 15000, 20000
                </p>
              </div>
            </>
          )}

          {formData.type === 'PERCENTAGE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Porcentaje (%)
              </label>
              <input
                type="number"
                value={formData.value.percentage}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    value: { ...formData.value, percentage: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Ej: 15"
                min="0"
                step="0.1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Solo aplica el porcentaje. Ej: 15% → base × 1.15 (sin suma fija adicional)
              </p>
            </div>
          )}

          {formData.type === 'FIXED' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto Fijo (COP)
              </label>
              <input
                type="number"
                value={formData.value.fixed}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    value: { ...formData.value, fixed: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Ej: 10000"
                min="0"
                required
              />
            </div>
          )}

          {formData.type === 'MIN_MARGIN' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Margen Mínimo (COP)
              </label>
              <input
                type="number"
                value={formData.value.minMargin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    value: { ...formData.value, minMargin: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Ej: 5000"
                min="0"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Garantiza un margen mínimo. Si el 15% del precio base es menor al margen mínimo, usa el margen mínimo.
                <br />
                Ejemplo: base=$20,000, minMargin=$5,000 → margen=15%=$3,000, pero usa $5,000 → resultado=$25,000
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción (opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
              rows={3}
              placeholder="Descripción de la fórmula..."
            />
          </div>

          <div className={`p-4 rounded-lg ${isSuperAdmin ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                disabled={!isSuperAdmin}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <label htmlFor="isDefault" className={`text-sm font-medium block mb-1 ${isSuperAdmin ? 'text-gray-700' : 'text-gray-500'}`}>
                  Marcar como fórmula por defecto
                  {!isSuperAdmin && <span className="ml-2 text-xs text-amber-600">(Solo SUPER_ADMIN)</span>}
                </label>
                <p className="text-xs text-gray-600 mb-2">
                  Si está marcada, esta fórmula se aplicará automáticamente a <strong>todos los productos nuevos</strong> sincronizados desde Dropi
                  (solo si el producto no tiene una fórmula personalizada ya asignada).
                </p>
                {isSuperAdmin && formData.isDefault && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                    ⚠️ <strong>Advertencia:</strong> Cambiar la fórmula predeterminada afectará todos los productos futuros sincronizados. 
                    Los productos existentes con fórmulas personalizadas no se verán afectados.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : formula ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

