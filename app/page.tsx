import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PackageOpen } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 bg-slate-900 rounded-xl flex items-center justify-center text-white mb-2">
            <PackageOpen className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bienvenido a StockFlow</h1>
          <p className="text-slate-500 text-sm">Gestiona tu inventario de forma inteligente.</p>
        </div>

        <form action={login} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700" htmlFor="email">
              Email
            </label>
            <Input id="email" name="email" type="email" placeholder="usuario@stockflow.app" required className="bg-white text-slate-900 border-slate-300" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700" htmlFor="password">
              Contraseña
            </label>
            <Input id="password" name="password" type="password" required className="bg-white text-slate-900 border-slate-300" />
          </div>
          <Button className="w-full bg-slate-900 text-white hover:bg-slate-800" type="submit">
            Iniciar Sesión
          </Button>
        </form>
      </div>
    </div>
  )
}