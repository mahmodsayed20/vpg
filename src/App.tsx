import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { signOut } from 'firebase/auth'
import { Layers, LogOut, Download, Sun, Moon, Settings } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '@/store'
import { useAuth } from '@/hooks/useAuth'
import { fetchCategories, fetchAllItems } from '@/lib/db'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { Gallery } from '@/components/gallery/Gallery'
import { Builder } from '@/components/builder/Builder'
import { CategoryModal } from '@/components/modals/CategoryModal'
import { ItemModal } from '@/components/modals/ItemModal'
import { PreviewModal } from '@/components/modals/PreviewModal'
import { LoginPage } from '@/pages/LoginPage'
import { auth } from '@/lib/firebase'
import toast from 'react-hot-toast'

function AppShell() {
  const { user, modal, setCategories, closeModal, refresh, theme, toggleTheme } = useStore()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)

  // Apply theme on mount and change
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

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
      const all = await fetchAllItems()
      const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `athar-backup-${new Date().toISOString().slice(0,10)}.json`; a.click()
      URL.revokeObjectURL(url)
      toast.success('تم التصدير!')
    } catch { toast.error('فشل التصدير') }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>

      {/* Navbar */}
      <header className="h-12 flex items-center justify-between px-4 flex-shrink-0 z-20 shadow-sm"
        style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--bg-border)' }}>

        <div className="flex items-center gap-2">
          {/* Mobile menu */}
          <button onClick={() => setMobileSidebarOpen(v => !v)}
            className="p-1.5 rounded-lg lg:hidden"
            style={{ color: 'var(--text-muted)' }}>
            <Layers className="w-4 h-4" />
          </button>

          {/* Desktop sidebar toggle */}
          <button onClick={() => setDesktopSidebarOpen(v => !v)}
            className="hidden lg:flex p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="الأقسام">
            <Layers className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 ml-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent)' }}>
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="font-bold text-sm hidden sm:block" style={{ color: 'var(--text-primary)' }}>
              ATHAR Visual Prompt Gallery
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Dark/Light toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg transition-all hover:scale-105"
            style={{
              background: theme === 'dark' ? 'var(--bg-card)' : 'var(--bg-card)',
              color: 'var(--text-muted)',
              border: '1px solid var(--bg-border)',
            }}
            title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
          >
            {theme === 'dark'
              ? <Sun  className="w-4 h-4" style={{ color: '#f59e0b' }} />
              : <Moon className="w-4 h-4" style={{ color: '#6175ff' }} />
            }
          </button>

          {user?.isAdmin && (
            <>
              <button onClick={handleExport}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }} title="تصدير JSON">
                <Download className="w-4 h-4" />
              </button>
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs ml-1"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)' }}>
                <span className="max-w-[120px] truncate">{user.email}</span>
                <span className="font-bold px-1.5 py-0.5 rounded text-xs"
                  style={{ background: 'var(--accent)', color: 'white' }}>ADMIN</span>
              </div>
              <button onClick={() => signOut(auth)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }} title="خروج">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Login link for guests */}
          {!user && (
            <a href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)', background: 'var(--bg-card)' }}>
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إدارة</span>
            </a>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        {desktopSidebarOpen && (
          <aside className="hidden lg:flex flex-col flex-shrink-0 relative"
            style={{ width: 230, borderRight: '1px solid var(--bg-border)', background: 'var(--bg-secondary)' }}>
            <Sidebar />
            {/* Resize handle */}
            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/30 transition-colors" />
          </aside>
        )}

        {/* Mobile sidebar */}
        {mobileSidebarOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileSidebarOpen(false)} />
            <aside className="fixed left-0 top-12 bottom-0 z-40 w-72 flex flex-col lg:hidden shadow-2xl"
              style={{ borderRight: '1px solid var(--bg-border)', background: 'var(--bg-secondary)' }}>
              <Sidebar onClose={() => setMobileSidebarOpen(false)} />
            </aside>
          </>
        )}

        <main className="flex-1 flex flex-col min-h-0 min-w-0">
          <Gallery />
        </main>
      </div>

      <Builder />

      {modal.type === 'category' && <CategoryModal />}
      {modal.type === 'item'     && <ItemModal onSaved={refresh} />}
      {modal.type === 'preview'  && <PreviewModal />}

      <Toaster position="top-right" toastOptions={{
        style: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--bg-border)', borderRadius: '12px', fontSize: '14px' },
        success: { iconTheme: { primary: 'var(--accent)', secondary: '#fff' } },
      }} />
    </div>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────
export function App() {
  useAuth()
  const { user, authReady, theme } = useStore()

  // Apply saved theme on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [])

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2.5 h-2.5 rounded-full animate-bounce"
              style={{ background: 'var(--accent)', animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      </div>
    )
  }

  // /admin route → show login page
  if (window.location.pathname === '/admin' && !user) {
    return <LoginPage />
  }

  // Main app — accessible to everyone (guests + admin)
  return <AppShell />
}
