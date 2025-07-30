import * as React from "react"

// Type definitions for toast
export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
  action?: React.ReactNode
}

interface ToastState {
  toasts: Toast[]
}

// Simple toast hook implementation
let toastCount = 0

export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback(
    ({ title, description, variant = "default", action }: Omit<Toast, "id">) => {
      const id = (++toastCount).toString()
      const newToast: Toast = { id, title, description, variant, action }
      
      setToasts((prev) => [...prev, newToast])
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 5000)
      
      return id
    },
    []
  )

  const dismiss = React.useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId))
  }, [])

  return {
    toast,
    dismiss,
    toasts,
  }
}