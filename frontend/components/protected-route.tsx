'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/frontend/lib/auth-context'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !isAuthenticated) {
    return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="size-8 animate-spin text-primary" /></div>
  }
  return children
}
