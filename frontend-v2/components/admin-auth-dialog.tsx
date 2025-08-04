"use client"

import type * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation" // Import useRouter
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Lock } from "lucide-react"

interface AdminAuthDialogProps {
  children: React.ReactNode
}

export function AdminAuthDialog({ children }: AdminAuthDialogProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter() // Initialize useRouter

  const correctUsername = "nar.adm.47923"
  const correctPassword = "h6@de#25874"

  const handleLogin = () => {
    if (username === correctUsername && password === correctPassword) {
      setIsAuthenticated(true)
      setError(null)
    } else {
      setError("Nume de utilizator sau parolă incorecte.")
    }
  }

  // This function handles attempts to close the dialog
  const handleOpenChange = (openState: boolean) => {
    // If the dialog is attempting to close (openState is false)
    // and the user is not authenticated, redirect to the main page.
    if (!openState && !isAuthenticated) {
      router.push("/")
    }
    // If authenticated, the dialog will naturally close as isAuthenticated becomes true
    // and the children content will be rendered.
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  return (
    <Dialog open={!isAuthenticated} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent className="max-w-sm border-[#D0337D]/20">
        <DialogHeader>
          <DialogTitle className="text-[#07050a] flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#D0337D]" />
            Autentificare Administrator
          </DialogTitle>
          <DialogDescription className="text-[#07050a]/70">
            Introduceți credențialele pentru a accesa panoul de administrare.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="username" className="text-[#07050a]">
              Nume de utilizator
            </Label>
            <Input
              id="username"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="border-[#D0337D]/20 text-[#07050a]"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-[#07050a]">
              Parolă
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-[#D0337D]/20 text-[#07050a]"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button onClick={handleLogin} className="w-full bg-[#D0337D] hover:bg-[#B02A6B] text-white rounded-full">
            Autentificare
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
