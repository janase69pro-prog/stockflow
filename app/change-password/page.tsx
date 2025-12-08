'use client'

import { useState } from 'react'
import { updatePassword } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LockKeyhole, AlertCircle } from 'lucide-react'

export default function ChangePasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(event.currentTarget)
    const p1 = formData.get('p1') as string
    const p2 = formData.get('p2') as string

    if (p1.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      setLoading(false)
      return
    }

    if (p1 !== p2) {
      setError("Las contraseñas no coinciden")
      setLoading(false)
      return
    }

    const res = await updatePassword(p1)
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-amber-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-amber-100 p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-2">
            <LockKeyhole className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Seguridad Requerida</h1>
          <p className="text-slate-500 text-sm">Es tu primer inicio de sesión. Por favor, crea una nueva contraseña personal.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none text-slate-700">Nueva Contraseña</label>
            <Input name="p1" type="password" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none text-slate-700">Confirmar Contraseña</label>
            <Input name="p2" type="password" required />
          </div>
          {error && <div className="text-sm text-red-600 flex items-center gap-2 bg-red-50 p-2 rounded"><AlertCircle className="w-4 h-4"/> {error}</div>}
          <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white" type="submit" disabled={loading}>
            {loading ? 'Actualizando...' : 'Establecer Contraseña'}
          </Button>
        </form>
      </div>
    </div>
  )
}
