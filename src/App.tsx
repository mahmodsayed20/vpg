import { useEffect, useState, useRef, useCallback } from 'react'
import { Toaster } from 'react-hot-toast'
import { signOut } from 'firebase/auth'
import { Layers, LogOut, Menu, Download, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useStore } from '@/store'
import { useAuth } from '@/hooks/useAuth'
import { fetchCategories, fetchAllItems } from '@/lib/db'
import { LoginPage } from '@/pages/LoginPage'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { Gallery } from '@/components/gallery/Gallery'
import { Builder } from '@/components/builder/Builder'
import { CategoryModal } from '@/components/modals/CategoryModal'
import { ItemModal } from '@/components/modals/ItemModal'
import { PreviewModal } from '@/components/modals/PreviewModal'
import { auth } from '@/lib/firebase'
import toast from 'react-hot-toast'

function AppShell() {
  const { user, modal, setCategories, closeModal, refresh } = useStore()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)

  // Resizable sidebar
  const [sidebarW, setSidebarW] = useState(230)
  const isResizing = useRef(false)
  const startX     = useRef(0)
  const startW     = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true
    startX.current = e.clientX
    startW.current = sidebarW
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [sidebarW])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const newW = Math.min(420, Math.max(160, startW.current + e.clientX - startX.current))
      setSidebarW(newW)
    }
    const onUp = () => {
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  useEffect(() => { fetchCategories().then(setCategories) }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); document.getElementById('gallery-search')?.focus() }
      if (e.key === 'Escape' && modal.type) closeModal()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [modal.type])

  async function handleExport() {
    try {
      const all  = await fetchAllItems()
      const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `vpg-backup-${new Date().toISOString().slice(0,10)}.json`; a.click()
      URL.revokeObjectURL(url)
      toast.success('تم التصدير!')
    } catch { toast.error('فشل التصدير') }
  }

  return (
    <div className="flex flex-col h-screen bg-bg text-text-primary overflow-hidden">
      {/* Navbar */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-bg-border bg-white flex-shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-2">
          {/* Mobile menu */}
          <button onClick={() => setMobileSidebarOpen(v => !v)}
            className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted lg:hidden">
            <Menu className="w-4 h-4" />
          </button>

          {/* Desktop sidebar toggle */}
          <button
            onClick={() => setDesktopSidebarOpen(v => !v)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-accent transition-colors"
            title={desktopSidebarOpen ? 'إغلاق الأقسام' : 'فتح الأقسام'}
          >
            {desktopSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2 ml-1">
            <Layers className="w-5 h-5 text-accent" />
            <span className="font-bold text-text-primary text-sm hidden sm:block">Visual Prompt Gallery</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {user?.isAdmin && (
            <button onClick={handleExport}
              className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-colors" title="تصدير JSON">
              <Download className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-bg-card border border-bg-border text-text-muted text-xs ml-1">
            <span className="max-w-[140px] truncate">{user?.email}</span>
            {user?.isAdmin && <span className="text-accent font-bold bg-accent/10 px-1.5 py-0.5 rounded">ADMIN</span>}
          </div>
          <button onClick={() => signOut(auth)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors border border-transparent hover:border-red-200" title="خروج">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        {desktopSidebarOpen && (
          <aside
            className="hidden lg:flex flex-col flex-shrink-0 border-r border-bg-border overflow-hidden relative bg-white"
            style={{ width: sidebarW }}
          >
            <Sidebar />
            {/* Resize handle */}
            <div
              onMouseDown={onMouseDown}
              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent/30 transition-colors group"
              title="اسحب لتغيير العرض"
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-bg-border rounded-full group-hover:bg-accent/50 transition-colors" />
            </div>
          </aside>
        )}

        {/* Mobile sidebar */}
        {mobileSidebarOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileSidebarOpen(false)} />
            <aside className="fixed left-0 top-12 bottom-0 z-40 w-72 border-r border-bg-border flex flex-col lg:hidden shadow-2xl bg-white">
              <Sidebar onClose={() => setMobileSidebarOpen(false)} />
            </aside>
          </>
        )}

        {/* Main gallery */}
        <main className="flex-1 flex flex-col min-h-0 min-w-0">
          <Gallery />
        </main>
      </div>

      {/* Prompt Builder */}
      <Builder />

      {/* Modals */}
      {modal.type === 'category' && <CategoryModal />}
      {modal.type === 'item'     && <ItemModal onSaved={refresh} />}
      {modal.type === 'preview'  && <PreviewModal />}

      <Toaster position="top-right" toastOptions={{
        className: '!bg-white !text-text-primary !border !border-bg-border !text-sm !rounded-xl !shadow-lg',
        success: { iconTheme: { primary: '#4f6ef7', secondary: '#fff' } },
      }} />
    </div>
  )
}

export function App() {
  useAuth()
  const { user, authReady } = useStore()
  if (!authReady) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="flex gap-1.5">
        {[0,1,2].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.12}s` }} />)}
      </div>
    </div>
  )
  return user ? <AppShell /> : <LoginPage />
}
