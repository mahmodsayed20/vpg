import { useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, horizontalListSortingStrategy,
  useSortable, arrayMove, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown, ChevronUp, X, GripVertical, Copy, Trash2,
  Download, Wand2, Code2, AlignLeft, Check, Loader2,
} from 'lucide-react'
import { useStore } from '@/store'
import { buildPlainPrompt, buildContextPrompt, buildJSONTree } from '@/lib/buildPromptOutput'
import { enhancePrompt, convertToJSON } from '@/lib/gemini'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import type { BuilderChip, Separator } from '@/types'

// ─── Single chip ──────────────────────────────────────────────────────────────
function Chip({ chip }: { chip: BuilderChip }) {
  const { removeChip, updateChipPrompt } = useStore()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(chip.editedPrompt ?? chip.prompt)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: chip.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(
        'flex-shrink-0 w-52 bg-bg-secondary border border-bg-border rounded-xl overflow-hidden transition-all',
        isDragging ? 'opacity-40 scale-95' : 'hover:border-accent/30'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-bg-border">
        <button {...attributes} {...listeners} className="cursor-grab text-text-muted hover:text-text-secondary touch-none">
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <span className="flex-1 text-xs font-semibold text-accent truncate">{chip.title}</span>
        {chip.categoryPath.length > 0 && (
          <span className="text-xs text-text-muted truncate max-w-[80px]">
            {chip.categoryPath.join(' › ')}
          </span>
        )}
        <button onClick={() => setEditing(e => !e)} className="text-text-muted hover:text-text-primary transition-colors" title="تعديل">
          <AlignLeft className="w-3 h-3" />
        </button>
        <button onClick={() => removeChip(chip.id)} className="text-text-muted hover:text-red-400 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Body */}
      <div className="px-2.5 py-2">
        {editing ? (
          <div className="space-y-1.5">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={3}
              autoFocus
              className="w-full bg-bg-card border border-bg-border rounded-lg px-2 py-1.5 text-xs text-text-primary resize-none focus:outline-none focus:border-accent font-mono"
            />
            <div className="flex gap-1.5">
              <button
                onClick={() => { updateChipPrompt(chip.id, draft); setEditing(false) }}
                className="flex items-center gap-1 px-2 py-1 bg-accent/20 text-accent rounded text-xs font-medium"
              >
                <Check className="w-3 h-3" /> حفظ
              </button>
              <button onClick={() => setEditing(false)} className="px-2 py-1 bg-bg-card text-text-muted rounded text-xs">
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <p
            onClick={() => setEditing(true)}
            className="text-xs text-text-secondary font-mono leading-relaxed line-clamp-3 cursor-text hover:text-text-primary transition-colors"
            title="اضغط للتعديل"
          >
            {chip.editedPrompt ?? chip.prompt}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Output panel ─────────────────────────────────────────────────────────────
type OutputTab = 'plain' | 'context' | 'json' | 'gemini'

function OutputPanel({ chips, separator }: { chips: BuilderChip[]; separator: Separator }) {
  const [tab, setTab]           = useState<OutputTab>('plain')
  const [geminiText, setGemini] = useState('')
  const [loading, setLoading]   = useState(false)
  const [copied, setCopied]     = useState(false)

  const plain   = buildPlainPrompt(chips, separator)
  const context = buildContextPrompt(chips)
  const json    = buildJSONTree(chips)

  const current = tab === 'plain' ? plain : tab === 'context' ? context : tab === 'json' ? json : geminiText

  async function handleGemini() {
    setTab('gemini')
    if (geminiText) return
    setLoading(true)
    try {
      const enhanced = await enhancePrompt(plain)
      setGemini(enhanced)
    } catch { toast.error('خطأ في Gemini API') }
    finally { setLoading(false) }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(current)
    setCopied(true)
    toast.success('تم النسخ!')
    setTimeout(() => setCopied(false), 2000)
  }

  const tabs: { id: OutputTab; label: string; icon: React.ReactNode }[] = [
    { id: 'plain',   label: 'نص عادي',    icon: <AlignLeft className="w-3 h-3" /> },
    { id: 'context', label: 'بسياق',      icon: <AlignLeft className="w-3 h-3" /> },
    { id: 'json',    label: 'JSON شجرة',  icon: <Code2 className="w-3 h-3" /> },
    { id: 'gemini',  label: 'Gemini ✨',  icon: <Wand2 className="w-3 h-3" /> },
  ]

  return (
    <div className="border-t border-bg-border mt-2 pt-2">
      {/* Tabs */}
      <div className="flex gap-1 mb-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => t.id === 'gemini' ? handleGemini() : setTab(t.id)}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
              tab === t.id ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-card'
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={handleCopy}
          disabled={!current}
          className="flex items-center gap-1 px-2.5 py-1 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'تم!' : 'نسخ'}
        </button>
      </div>

      {/* Output text */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-3 max-h-28 overflow-y-auto">
        {loading ? (
          <div className="flex items-center gap-2 text-text-muted text-xs">
            <Loader2 className="w-3 h-3 animate-spin" /> جاري التحسين بـ Gemini...
          </div>
        ) : (
          <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap leading-relaxed">
            {current || <span className="text-text-muted">سيظهر النص هنا...</span>}
          </pre>
        )}
      </div>
    </div>
  )
}

// ─── Main Builder ─────────────────────────────────────────────────────────────
export function Builder() {
  const { chips, clearChips, reorderChips, separator, setSeparator, builderOpen, setBuilderOpen } = useStore()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oi = chips.findIndex(c => c.id === active.id)
    const ni = chips.findIndex(c => c.id === over.id)
    reorderChips(arrayMove(chips, oi, ni))
  }

  const SEP_LABELS: Record<Separator, string> = {
    comma: 'فاصلة  ,',
    newline: 'سطر ↵',
    paragraph: 'فقرة ¶',
  }

  if (chips.length === 0 && !builderOpen) return null

  return (
    <div
      id="builder-panel"
      className="fixed bottom-0 left-0 right-0 z-30 bg-bg-secondary/98 backdrop-blur border-t border-bg-border"
    >
      {/* Header bar */}
      <div
        className="flex items-center gap-2 px-4 py-2 cursor-pointer select-none"
        onClick={() => setBuilderOpen(!builderOpen)}
      >
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span className="text-sm font-semibold text-text-primary">Prompt Builder</span>

        {chips.length > 0 && (
          <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-bold">
            {chips.length}
          </span>
        )}

        {/* Separator */}
        {chips.length > 0 && (
          <div className="hidden sm:flex gap-0.5 bg-bg-card border border-bg-border rounded-lg p-0.5 ml-1" onClick={e => e.stopPropagation()}>
            {(Object.keys(SEP_LABELS) as Separator[]).map(s => (
              <button
                key={s}
                onClick={() => setSeparator(s)}
                className={clsx('px-2 py-1 rounded text-xs transition-all', separator === s ? 'bg-bg-border text-text-primary' : 'text-text-muted hover:text-text-primary')}
              >
                {SEP_LABELS[s]}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1" />

        {chips.length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); clearChips() }}
            className="hidden sm:flex items-center gap-1 px-2 py-1 hover:bg-red-950/30 text-text-muted hover:text-red-400 rounded-lg text-xs transition-colors"
            title="مسح الكل"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}

        <button className="text-text-muted" onClick={e => { e.stopPropagation(); setBuilderOpen(!builderOpen) }}>
          {builderOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Chips + output */}
      {builderOpen && (
        <div className="px-4 pb-3">
          {chips.length === 0 ? (
            <p className="text-center text-text-muted text-sm py-3">
              اضغط على أيقونة <span className="text-accent font-bold">+</span> على أي صورة لإضافتها هنا
            </p>
          ) : (
            <>
              {/* Chips row */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={chips.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                  <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                    {chips.map(c => <Chip key={c.id} chip={c} />)}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Output panel */}
              <OutputPanel chips={chips} separator={separator} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
