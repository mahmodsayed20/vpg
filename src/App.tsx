import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { signOut } from 'firebase/auth'
import { Layers, LogOut, Menu, Sun, Moon, Download } from 'lucide-react'
import { useStore } from '@/store'
import { useAuth } from '@/hooks/useAuth'
import { fetchCategories } from '@/lib/db'
import { LoginPage } from '@/pages/LoginPage'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { Gallery } from '@/components/gallery/Gallery'
import { Builder } from '@/components/builder/Builder'
import { CategoryModal } from '@/components/modals/CategoryModal'
import { ItemModal } from '@/components/modals/ItemModal'
import { PreviewModal } from '@/components/modals/PreviewModal'
import { auth } from '@/lib/firebase'
import toast from 'react-hot-toast'
import { fetchAllItems } from '@/lib/db'

function AppShell() {
  const { user, modal, setCategories, closeModal, refresh, items } = useStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme]             = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    fetchCategories().then(setCategories)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('gallery-search')?.focus()
      }
      if (e.key === 'Escape' && modal.type) closeModal()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [modal.type])

  // Export all data as JSON
  async function handleExport() {
    try {
      const allItems = await fetchAllItems()
      const blob = new Blob([JSON.stringify(allItems, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vpg-backup-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('تم تصدير البيانات!')
    } catch { toast.error('فشل التصدير') }
  }

  return (
    <div className="flex flex-col h-screen bg-bg text-text-primary overflow-hidden">
      {/* Navbar */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-bg-border bg-bg-secondary flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(v => !v)} className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted lg:hidden">
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent" />
            <span className="font-bold text-text-primary text-sm hidden sm:block">Visual Prompt Gallery</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {user?.isAdmin && (
            <button onClick={handleExport} className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-colors" title="تصدير كـ JSON">
              <Download className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-colors">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg bg-bg-card text-text-muted text-xs ml-1">
            <span className="max-w-[120px] truncate">{user?.email}</span>
            {user?.isAdmin && <span className="text-accent font-bold">ADMIN</span>}
          </div>
          <button onClick={() => signOut(auth)} className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-red-400 transition-colors" title="خروج">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-56 xl:w-64 flex-shrink-0 border-r border-bg-border overflow-hidden">
          <Sidebar />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed left-0 top-12 bottom-0 z-40 w-64 border-r border-bg-border flex flex-col lg:hidden shadow-2xl">
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </aside>
          </>
        )}

        {/* Main */}
        <main className="flex-1 flex flex-col min-h-0 min-w-0">
          <Gallery />
        </main>
      </div>

      {/* Builder */}
      <Builder />

      {/* Modals */}
      {modal.type === 'category'  && <CategoryModal />}
      {modal.type === 'item'      && <ItemModal onSaved={refresh} />}
      {modal.type === 'preview'   && <PreviewModal />}

      <Toaster
        position="top-right"
        toastOptions={{
          className: '!bg-bg-secondary !text-text-primary !border !border-bg-border !text-sm !rounded-xl',
          success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
        }}
      />
    </div>
  )
}

export function App() {
  useAuth()
  const { user, authReady } = useStore()

  if (!authReady) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      </div>
    )
  }

  return user ? <AppShell /> : <LoginPage />
}
