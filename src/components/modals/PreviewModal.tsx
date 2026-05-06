import { Copy, Plus, Edit2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useStore } from '@/store'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import type { PromptItem } from '@/lib/db.types'

export function PreviewModal() {
  const { modal, closeModal, addChip, openModal, user } = useStore()
  const item = modal.data as PromptItem

  if (!item) return null

  function handleAdd() {
    const r = addChip(item)
    if (r === 'added') toast.success('أُضيف للبانيل')
    else toast('موجود بالفعل', { icon: '⚠️' })
    closeModal()
  }

  return (
    <Modal title={item.title} maxWidth="max-w-3xl">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="sm:w-1/2 bg-bg min-h-48 flex items-center justify-center">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className={clsx('w-full h-full max-h-[60vh]', item.displayMode === 'cover' ? 'object-cover' : 'object-contain p-4')}
            />
          ) : <div className="text-6xl">🖼</div>}
        </div>

        {/* Info */}
        <div className="sm:w-1/2 p-5 flex flex-col gap-4">
          {item.categoryPath.length > 0 && (
            <div className="text-xs text-text-muted">
              {item.categoryPath.join(' › ')}
            </div>
          )}

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map(t => (
                <span key={t} className="text-xs px-2 py-1 bg-bg-card text-text-muted rounded-lg">{t}</span>
              ))}
            </div>
          )}

          <div className="flex-1">
            <label className="block text-xs font-medium text-text-muted uppercase tracking-widest mb-2">Prompt</label>
            <div className="bg-bg-card border border-bg-border rounded-xl p-3 text-sm text-text-secondary font-mono leading-relaxed">
              {item.prompt}
            </div>
          </div>

          {item.notes && (
            <div>
              <label className="block text-xs font-medium text-text-muted uppercase tracking-widest mb-1">ملاحظات</label>
              <p className="text-sm text-text-secondary">{item.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => { navigator.clipboard.writeText(item.prompt); toast.success('تم النسخ') }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-bg-card border border-bg-border text-text-secondary hover:text-text-primary rounded-xl text-sm font-medium transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> نسخ
            </button>
            {user?.isAdmin && (
              <button
                onClick={() => { closeModal(); setTimeout(() => openModal('item', { edit: item }), 50) }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-bg-card border border-bg-border text-text-secondary hover:text-text-primary rounded-xl text-sm font-medium transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> تعديل
              </button>
            )}
            <button
              onClick={handleAdd}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> إضافة
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
