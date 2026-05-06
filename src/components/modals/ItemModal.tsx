import { useState, useEffect, useRef } from 'react'
import { Upload, Loader2, Tag } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useStore } from '@/store'
import { createItem, updateItem } from '@/lib/db'
import { uploadImage } from '@/lib/cloudinary'
import { buildCategoryPath } from '@/lib/buildCategoryPath'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import type { PromptItem } from '@/lib/db.types'
import type { DisplayMode } from '@/types'

export function ItemModal({ onSaved }: { onSaved: () => void }) {
  const { modal, closeModal, categories, activeCategoryId } = useStore()
  const data     = modal.data as { categoryId?: string | null; edit?: PromptItem }
  const isEdit   = !!data?.edit
  const editItem = data?.edit

  const [title, setTitle]         = useState(editItem?.title ?? '')
  const [prompt, setPrompt]       = useState(editItem?.prompt ?? '')
  const [catId, setCatId]         = useState(editItem?.categoryId ?? data?.categoryId ?? activeCategoryId ?? '')
  const [tags, setTags]           = useState(editItem?.tags.join(', ') ?? '')
  const [notes, setNotes]         = useState(editItem?.notes ?? '')
  const [mode, setMode]           = useState<DisplayMode>(editItem?.displayMode ?? 'cover')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview]     = useState(editItem?.imageUrl ?? '')
  const [uploadPct, setUploadPct] = useState(0)
  const [loading, setLoading]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTitle(editItem?.title ?? '')
    setPrompt(editItem?.prompt ?? '')
    setCatId(editItem?.categoryId ?? data?.categoryId ?? activeCategoryId ?? '')
    setTags(editItem?.tags.join(', ') ?? '')
    setNotes(editItem?.notes ?? '')
    setMode(editItem?.displayMode ?? 'cover')
    setImageFile(null)
    setPreview(editItem?.imageUrl ?? '')
    setUploadPct(0)
  }, [modal.data])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setImageFile(f)
    const r = new FileReader()
    r.onload = () => setPreview(r.result as string)
    r.readAsDataURL(f)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !prompt.trim() || !catId) return
    setLoading(true)

    try {
      let imageUrl  = editItem?.imageUrl  ?? ''
      let imagePath = editItem?.imagePath ?? ''

      if (imageFile) {
        const res = await uploadImage(imageFile, p => setUploadPct(p))
        imageUrl  = res.url
        imagePath = res.publicId
      }

      const categoryPath = buildCategoryPath(catId, categories)
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)

      const payload = { title: title.trim(), prompt: prompt.trim(), imageUrl, imagePath, categoryId: catId, categoryPath, tags: tagList, notes: notes.trim(), displayMode: mode }

      if (isEdit && editItem) {
        await updateItem(editItem.id, payload)
        toast.success('تم التعديل')
      } else {
        await createItem(payload)
        toast.success('تمت الإضافة')
      }

      onSaved()
      closeModal()
    } catch (err) {
      console.error(err)
      toast.error('حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  const sortedCats = [...categories].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Modal title={isEdit ? 'تعديل العنصر' : 'إضافة عنصر جديد'} maxWidth="max-w-2xl">
      <form onSubmit={submit} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* Image upload */}
        <div className="sm:row-span-3">
          <label className="block text-sm font-medium text-text-secondary mb-2">الصورة</label>
          <div
            onClick={() => fileRef.current?.click()}
            className={clsx(
              'relative aspect-[4/5] border-2 border-dashed border-bg-border rounded-xl cursor-pointer overflow-hidden bg-bg-card hover:border-accent/50 transition-colors',
              'flex items-center justify-center'
            )}
          >
            {preview ? (
              <img src={preview} alt="preview" className={clsx('w-full h-full', mode === 'cover' ? 'object-cover' : 'object-contain p-3')} />
            ) : (
              <div className="text-center text-text-muted p-4">
                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">اضغط لرفع صورة</p>
              </div>
            )}
            {loading && uploadPct > 0 && uploadPct < 100 && (
              <div className="absolute inset-0 bg-bg/70 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-6 h-6 text-accent animate-spin mx-auto mb-2" />
                  <p className="text-white text-sm">{uploadPct}%</p>
                </div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />

          {/* Display mode */}
          <div className="mt-3 flex gap-2">
            {(['cover', 'contain'] as DisplayMode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={clsx(
                  'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all',
                  mode === m ? 'bg-accent/15 border-accent/40 text-accent' : 'bg-bg-card border-bg-border text-text-muted hover:text-text-primary'
                )}
              >
                {m === 'cover' ? '📸 Cover (أشخاص)' : '🏛 Contain (معماري)'}
              </button>
            ))}
          </div>
        </div>

        {/* Right fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">العنوان *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="مثال: بشرة فاتحة" className="w-full px-3 py-2.5 bg-bg-card border border-bg-border rounded-xl text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent transition-colors" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">القسم *</label>
            <select value={catId} onChange={e => setCatId(e.target.value)} required className="w-full px-3 py-2.5 bg-bg-card border border-bg-border rounded-xl text-text-primary text-sm focus:outline-none focus:border-accent">
              <option value="">اختر قسماً...</option>
              {sortedCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              <Tag className="w-3.5 h-3.5 inline mr-1" />
              Tags (مفصولة بفاصلة)
            </label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="portrait, skin, light..." className="w-full px-3 py-2.5 bg-bg-card border border-bg-border rounded-xl text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent transition-colors" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">ملاحظات</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="أي ملاحظات..." className="w-full px-3 py-2.5 bg-bg-card border border-bg-border rounded-xl text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent transition-colors" />
          </div>
        </div>

        {/* Prompt — full width */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            نص الـ Prompt *
            <span className="ml-2 text-xs text-text-muted font-mono">{prompt.length} حرف</span>
          </label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            required
            rows={4}
            placeholder="اكتب الـ prompt الإنجليزي هنا... مثال: light skin tone, smooth texture, natural glow"
            className="w-full px-3 py-2.5 bg-bg-card border border-bg-border rounded-xl text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent resize-none font-mono leading-relaxed transition-colors"
          />
        </div>

        {/* Footer buttons */}
        <div className="sm:col-span-2 flex gap-3">
          <button type="button" onClick={closeModal} disabled={loading} className="flex-1 py-2.5 bg-bg-card border border-bg-border text-text-secondary rounded-xl text-sm hover:bg-bg-border transition-colors disabled:opacity-40">
            إلغاء
          </button>
          <button type="submit" disabled={loading || !title.trim() || !prompt.trim() || !catId} className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديل' : 'إضافة'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
