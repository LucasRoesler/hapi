import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export type SimpleToastType = 'success' | 'error' | 'info'

export type SimpleToast = {
    id: string
    type: SimpleToastType
    message: string
}

export type SimpleToastContextValue = {
    toasts: SimpleToast[]
    showToast: (type: SimpleToastType, message: string) => void
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
    removeToast: (id: string) => void
}

const SimpleToastContext = createContext<SimpleToastContextValue | null>(null)
const TOAST_DURATION_MS = 4000

function createToastId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID()
    }
    return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function SimpleToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<SimpleToast[]>([])
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

    useEffect(() => {
        return () => {
            for (const timer of timersRef.current.values()) {
                clearTimeout(timer)
            }
            timersRef.current.clear()
        }
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
        const timer = timersRef.current.get(id)
        if (timer) {
            clearTimeout(timer)
            timersRef.current.delete(id)
        }
    }, [])

    const showToast = useCallback((type: SimpleToastType, message: string) => {
        const id = createToastId()
        setToasts((prev) => [...prev, { id, type, message }])
        const timer = setTimeout(() => {
            removeToast(id)
        }, TOAST_DURATION_MS)
        timersRef.current.set(id, timer)
    }, [removeToast])

    const success = useCallback((message: string) => {
        showToast('success', message)
    }, [showToast])

    const error = useCallback((message: string) => {
        showToast('error', message)
    }, [showToast])

    const info = useCallback((message: string) => {
        showToast('info', message)
    }, [showToast])

    const value = useMemo<SimpleToastContextValue>(() => ({
        toasts,
        showToast,
        success,
        error,
        info,
        removeToast
    }), [toasts, showToast, success, error, info, removeToast])

    return (
        <SimpleToastContext.Provider value={value}>
            {children}
            <SimpleToastContainer toasts={toasts} onRemove={removeToast} />
        </SimpleToastContext.Provider>
    )
}

export function useSimpleToast(): SimpleToastContextValue {
    const ctx = useContext(SimpleToastContext)
    if (!ctx) {
        throw new Error('useSimpleToast must be used within SimpleToastProvider')
    }
    return ctx
}

function SimpleToastContainer({ toasts, onRemove }: { toasts: SimpleToast[]; onRemove: (id: string) => void }) {
    if (toasts.length === 0) return null

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <SimpleToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    )
}

function SimpleToastItem({ toast, onRemove }: { toast: SimpleToast; onRemove: (id: string) => void }) {
    const bgColor = toast.type === 'success'
        ? 'bg-green-500'
        : toast.type === 'error'
        ? 'bg-red-500'
        : 'bg-blue-500'

    return (
        <div
            className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg max-w-md pointer-events-auto animate-slide-in-right`}
            onClick={() => onRemove(toast.id)}
        >
            <div className="flex items-center gap-2">
                {toast.type === 'success' && (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                )}
                {toast.type === 'error' && (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                )}
                {toast.type === 'info' && (
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
                <p className="text-sm font-medium">{toast.message}</p>
            </div>
        </div>
    )
}
