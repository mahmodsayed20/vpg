import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useStore } from '@/store'
import { createCategory, updateCategory, fetchCategories } from '@/lib/db'
import toast from 'react-hot-toast'
import type { CategoryNode } from '@/types'

export function CategoryModal() {
  const { modal, closeModal, setCategories, categories } = useStore()
  const data      = modal.data as { parentId?: string | null; edit?: CategoryNode }
  const isEdit    = !!data?.edit
  const editNode  = data?.edit

  const [name, setName]         = useState(editNode?.name ?? '')
  const [parentId, setParentId] = useState<string | null>(
    isEdit ? editNode?.parentId ?? null : data?.parentId ?? null
  )
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    setName(editNode?.name ?? '')
    setParentId(isEdit ? editNode?.parentId ?? null : data?.parentId ?? null)
  }, [modal.data])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      if (isEdit && editNode) {
        await updateCategory(editNode.id, { name, parentId })
        toast.success('تم التعديل')
      } else {
        await createCategory({ name, parentId })
        toast.success('تم الإنشاء')
      }
      setCategories(await fetchCategories())
      closeModal()
    } catch { toast.error('حدث خطأ') }
    finally { setLoading(false) }
  }

  const parentOptions = categories.filter(c => isEdit ? c.id !== editNode?.id : true)

  return (
    <Modal title={isEdit ? 'تعديل القسم' : 'قسم جديد'}>
      <form onSubmit={submit} className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">اسم القسم *</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="مثال: كاميرا، أشخاص، معماري..."
            className="w-full px-3 py-2.5 bg-bg-card border border-bg-border rounded-xl text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">القسم الأب (اختياري)</label>
          <select
            value={parentId ?? ''}
            onChange={e => setParentId(e.target.value || null)}
            className="w-full px-3 py-2.5 bg-bg-card border border-bg-border rounded-xl text-text-primary text-sm focus:outline-none focus:border-accent"
          >
            <option value="">— بدون قسم أب (رئيسي) —</option>
            {parentOptions.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={closeModal} className="flex-1 py-2.5 bg-bg-card border border-bg-border text-text-secondary rounded-xl text-sm hover:bg-bg-border transition-colors">
            إلغاء
          </button>
          <button type="submit" disabled={loading || !name.trim()} className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40">
            {loading ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديل' : 'إنشاء'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
