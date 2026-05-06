import { memo, useState } from 'react'
import { Plus, Edit2, Trash2, Copy, Eye, Check, X, ExternalLink } from 'lucide-react'
import { useStore } from '@/store'
import { deleteItem, duplicateItem } from '@/lib/db'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import type { PromptItem } from '@/lib/db.types'

// ─── Inline Preview Modal (for guests) ───────────────────────────────────────
function PreviewOverlay({ item, onClose }: { item: PromptItem; onClose: () => void }) {
  const { addChip } = useStore()
  const [copied, setCopied] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(item.prompt)
    setCopied(true)
    toast.success('تم نسخ المطالبة!')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleAdd() {
    const result = addChip(item)
    if (result === 'added') {
      setJustAdded(true)
      toast.success(`أُضيف: ${item.title}`)
      setTimeout(() => { setJustAdded(false); onClose() }, 800)
    } else {
      toast('موجود بالفعل في البانيل', { icon: '⚠️' })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl animate-slide-up flex flex-col sm:flex-row"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--bg-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg transition-colors"
          style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image */}
        <div className="sm:w-1/2 min-h-48 flex items-center justify-center"
          style={{ background: 'var(--bg)' }}>
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className={clsx(
                'w-full h-full max-h-[60vh]',
                item.displayMode === 'cover' ? 'object-cover' : 'object-contain p-4'
              )}
            />
          ) : (
            <div className="text-6xl">🖼</div>
          )}
        </div>

        {/* Info */}
        <div className="sm:w-1/2 p-5 flex flex-col gap-4">
          {/* Title */}
          <div>
            <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              {item.title}
            </h2>
            {item.categoryPath.length > 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {item.categoryPath.join(' › ')}
              </p>
            )}
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map(t => (
                <span key={t} className="text-xs px-2 py-1 rounded-lg"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Prompt */}
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'var(--text-muted)' }}>
              المطالبة
            </label>
            <div className="p-3 rounded-xl text-sm font-mono leading-relaxed"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--bg-border)',
                color: 'var(--text-secondary)',
              }}>
              {item.prompt}
            </div>
          </div>

          {/* Notes */}
          {item.notes && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{item.notes}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--bg-border)',
                color: 'var(--text-primary)',
              }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'تم النسخ!' : 'نسخ المطالبة'}
            </button>

            <button
              onClick={handleAdd}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              {justAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {justAdded ? 'أُضيف!' : 'إضافة للبانيل'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface Props {
  item: PromptItem
  imgHeight: number
  onRefresh: () => void
  selected?: boolean
  onCardClick?: (e: React.MouseEvent) => void
  onRightClick?: (e: React.MouseEvent) => void
}

export const PromptCard = memo(function PromptCard({
  item, imgHeight, onRefresh, selected, onCardClick, onRightClick
}: Props) {
  const { user, addChip, openModal } = useStore()
  const [imgLoaded, setImgLoaded]   = useState(false)
  const [justAdded, setJustAdded]   = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // + button — always adds to builder
  function handleAddToBuilder(e: React.MouseEvent) {
    e.stopPropagation()
    const result = addChip(item)
    if (result === 'added') {
      setJustAdded(true)
      setTimeout(() => setJustAdded(false), 1200)
      toast.success(`أُضيف: ${item.title}`)
    } else {
      toast('موجود بالفعل في البانيل', { icon: '⚠️' })
    }
  }

  // Card click behavior depends on user role
  function handleCardClick(e: React.MouseEvent) {
    if (user?.isAdmin) {
      // Admin: pass to parent for multi-select logic
      onCardClick?.(e)
    } else {
      // Guest: show preview modal on single click
      setShowPreview(true)
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`حذف "${item.title}"؟`)) return
    await deleteItem(item.id)
    onRefresh()
    toast.success('تم الحذف')
  }

  async function handleDuplicate(e: React.MouseEvent) {
    e.stopPropagation()
    await duplicateItem(item)
    onRefresh()
    toast.success('تم النسخ')
  }

  const isSmall = imgHeight < 120

  return (
    <>
      <div
        className={clsx(
          'group relative bg-bg-card border-2 rounded-xl overflow-hidden transition-all select-none',
          'hover:shadow-lg hover:-translate-y-0.5',
          selected
            ? 'border-accent shadow-md'
            : 'border-bg-border hover:border-accent/40',
          'animate-fade-in',
          !user?.isAdmin && 'cursor-pointer' // guests get pointer cursor
        )}
        onClick={handleCardClick}
        onContextMenu={user?.isAdmin ? onRightClick : undefined}
      >
        {/* Selection indicator — admin only */}
        {selected && (
          <div className="absolute top-2 left-2 z-10 w-5 h-5 rounded-md flex items-center justify-center shadow-sm"
            style={{ background: 'var(--accent)' }}>
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        )}

        {/* Image */}
        <div className="relative overflow-hidden" style={{ height: imgHeight, background: 'var(--bg)' }}>
          {!imgLoaded && item.imageUrl && (
            <div className="absolute inset-0 animate-skeleton" style={{ background: 'var(--bg-border)' }} />
          )}
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              className={clsx(
                'w-full h-full transition-opacity duration-300',
                item.displayMode === 'cover' ? 'object-cover' : 'object-contain p-2',
                imgLoaded ? 'opacity-100' : 'opacity-0'
              )}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl" style={{ color: 'var(--text-muted)' }}>🖼</div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

          {/* Guest hover hint */}
          {!user?.isAdmin && !isSmall && (
            <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="text-xs text-white text-center py-1 px-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.6)' }}>
                اضغط لعرض التفاصيل
              </div>
            </div>
          )}

          {/* + ADD button */}
          <button
            onClick={handleAddToBuilder}
            className={clsx(
              'absolute z-10 rounded-full flex items-center justify-center transition-all shadow-xl',
              'opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100',
              isSmall
                ? 'w-7 h-7 right-1.5 bottom-1.5'
                : 'w-10 h-10 right-2 bottom-2'
            )}
            style={{
              background: justAdded ? '#22c55e' : 'var(--accent)',
              color: 'white',
            }}
            title="إضافة للبانيل"
          >
            {justAdded
              ? <Check className={isSmall ? 'w-3 h-3' : 'w-4 h-4'} />
              : <Plus  className={isSmall ? 'w-3 h-3' : 'w-4 h-4'} />
            }
          </button>

          {/* Admin action buttons — top right */}
          {user?.isAdmin && !isSmall && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button onClick={e => { e.stopPropagation(); openModal('preview', item) }}
                className="p-1.5 rounded-lg shadow-sm backdrop-blur"
                style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--text-secondary)' }}>
                <Eye className="w-3 h-3" />
              </button>
              <button onClick={e => { e.stopPropagation(); openModal('item', { edit: item }) }}
                className="p-1.5 rounded-lg shadow-sm backdrop-blur"
                style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--text-secondary)' }}>
                <Edit2 className="w-3 h-3" />
              </button>
              <button onClick={handleDuplicate}
                className="p-1.5 rounded-lg shadow-sm backdrop-blur"
                style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--text-secondary)' }}>
                <Copy className="w-3 h-3" />
              </button>
              <button onClick={handleDelete}
                className="p-1.5 rounded-lg shadow-sm backdrop-blur"
                style={{ background: 'rgba(255,255,255,0.9)', color: '#ef4444' }}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Title */}
        {!isSmall && (
          <div className="p-2">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {item.title}
            </p>
          </div>
        )}
      </div>

      {/* Preview overlay — guests only */}
      {showPreview && (
        <PreviewOverlay item={item} onClose={() => setShowPreview(false)} />
      )}
    </>
  )
})
