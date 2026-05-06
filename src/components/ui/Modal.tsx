import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useStore } from '@/store'

interface Props {
  title: string
  children: React.ReactNode
  maxWidth?: string
}

export function Modal({ title, children, maxWidth = 'max-w-lg' }: Props) {
  const closeModal = useStore(s => s.closeModal)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
      <div className={`relative bg-bg-secondary border border-bg-border rounded-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col shadow-2xl animate-slide-up`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border flex-shrink-0">
          <h2 className="font-semibold text-text-primary">{title}</h2>
          <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
