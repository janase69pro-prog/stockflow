'use client'

import { signOut } from "@/app/actions"
import { Button } from "./ui/button"
import { LogOut } from "lucide-react"

export default function Navbar({ email, role }: { email: string, role: string }) {
  return (
    <nav className="border-b border-slate-200 bg-white p-4 flex justify-between items-center shadow-sm">
      <div className="flex flex-col">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">StockFlow</h1>
        <span className="text-xs text-slate-500">{email} ({role})</span>
      </div>
      <form action={signOut}>
        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
          <LogOut className="h-5 w-5" />
        </Button>
      </form>
    </nav>
  )
}
