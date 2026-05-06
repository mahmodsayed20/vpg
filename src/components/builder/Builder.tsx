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
  Wand2, Code2, AlignLeft, Check, Loader2, Play, Sparkles,
} from 'lucide-react'
import { useStore } from '@/store'
import { buildPlainPrompt, buildContextPrompt, buildJSONTree } from '@/lib/buildPromptOutput'
import { enhancePrompt } from '@/lib/gemini'
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
        'flex-shrink-0 w-52 bg-white border border-bg-border rounded-xl overflow-hidden shadow-sm transition-all',
        isDragging ? 'opacity-40 scale-95' : 'hover:border-accent/40 hover:shadow-md'
      )}
    >
      <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-bg-border bg-bg-card">
        <button {...attributes} {...listeners} className="cursor-grab text-text-muted hover:text-text-secondary touch-none flex-shrink-0">
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <span className="flex-1 text-xs font-semibold text-accent truncate">{chip.title}</span>
        {chip.categoryPath.length > 0 && (
          <span className="text-xs text-text-muted truncate max-w-[80px]" title={chip.categoryPath.join(' › ')}>
            {chip.categoryPath.join(' › ')}
          </span>
        )}
        <button onClick={() => setEditing(e => !e)} className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0">
          <AlignLeft className="w-3 h-3" />
        </button>
        <button onClick={() => removeChip(chip.id)} className="text-text-muted hover:text-red-500 transition-colors flex-shrink-0">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="px-2.5 py-2 bg-white">
        {editing ? (
          <div className="space-y-1.5">
            <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3} autoFocus
              className="w-full bg-bg-card border border-bg-border rounded-lg px-2 py-1.5 text-xs text-text-primary resize-none focus:outline-none focus:border-accent font-mono" />
            <div className="flex gap-1.5">
              <button onClick={() => { updateChipPrompt(chip.id, draft); setEditing(false) }}
                className="flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded text-xs font-medium hover:bg-accent/20">
                <Check className="w-3 h-3" /> حفظ
              </button>
              <button onClick={() => setEditing(false)} className="px-2 py-1 bg-bg-card text-text-muted rounded text-xs hover:bg-bg-border">
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <p onClick={() => setEditing(true)}
            className="text-xs text-text-secondary font-mono leading-relaxed line-clamp-3 cursor-text hover:text-text-primary transition-colors"
            title="اضغط للتعديل">
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
  const [geminiJson, setGeminiJson] = useState('')
  const [showJson, setShowJson] = useState(false)
  const [geminiReady, setGeminiReady] = useState(false) // tab open but not generated yet
  const [loading, setLoading]   = useState(false)
  const [copied, setCopied]     = useState(false)

  const plain   = buildPlainPrompt(chips, separator)
  const context = buildContextPrompt(chips)
  const json    = buildJSONTree(chips)
  const current = tab === 'plain' ? plain
                : tab === 'context' ? context
                : tab === 'json' ? json
                : showJson ? geminiJson : geminiText

  // Just opens the Gemini tab without generating
  function openGeminiTab() {
    setTab('gemini')
    setGeminiReady(true)
  }

  // Actually calls the API
  async function generateGemini() {
    if (chips.length === 0) { toast.error('أضف prompts أولاً'); return }
    setLoading(true)
    setGemini('')
    try {
      const result = await enhancePrompt(chips.map(c => ({
        title: c.title,
        prompt: c.editedPrompt ?? c.prompt,
        categoryPath: c.categoryPath,
      })))
      if (!result.aiPrompt) throw new Error('empty')
      setGemini(result.aiPrompt)
      setGeminiJson(result.json)
    } catch (e) {
      console.error(e)
      toast.error('حدث خطأ في Gemini')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!current) return
    await navigator.clipboard.writeText(current)
    setCopied(true)
    toast.success('تم النسخ!')
    setTimeout(() => setCopied(false), 2000)
  }

  const staticTabs: { id: OutputTab; label: string; icon: React.ReactNode }[] = [
    { id: 'plain',   label: 'نص عادي',   icon: <AlignLeft className="w-3 h-3" /> },
    { id: 'context', label: 'بسياق',     icon: <AlignLeft className="w-3 h-3" /> },
    { id: 'json',    label: 'JSON شجرة', icon: <Code2 className="w-3 h-3" /> },
  ]

  return (
    <div className="border-t border-bg-border mt-2 pt-2">
      <div className="flex gap-1 mb-2 flex-wrap items-center">
        {/* Static tabs */}
        {staticTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all',
              tab === t.id
                ? 'bg-accent text-white shadow-sm'
                : 'bg-bg-card text-text-muted hover:text-text-primary hover:bg-bg-border border border-bg-border'
            )}>
            {t.icon} {t.label}
          </button>
        ))}

        {/* Gemini tab — opens without generating */}
        <button
          onClick={openGeminiTab}
          className={clsx(
            'flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all',
            tab === 'gemini'
              ? 'bg-purple-500 text-white shadow-sm'
              : 'bg-bg-card text-text-muted hover:text-purple-600 hover:bg-purple-50 border border-bg-border'
          )}>
          <Sparkles className="w-3 h-3" />
          Gemini
        </button>

        <div className="flex-1" />

        {/* Generate button — only shows on Gemini tab */}
        {tab === 'gemini' && (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            {geminiText && (
              <div className="flex gap-0.5 bg-white border border-purple-200 rounded-lg p-0.5">
                <button onClick={() => setShowJson(false)}
                  className={clsx('px-2 py-1 rounded text-xs font-medium transition-all',
                    !showJson ? 'bg-purple-500 text-white' : 'text-text-muted hover:text-purple-600')}>
                  Prompt
                </button>
                <button onClick={() => setShowJson(true)}
                  className={clsx('px-2 py-1 rounded text-xs font-medium transition-all',
                    showJson ? 'bg-purple-500 text-white' : 'text-text-muted hover:text-purple-600')}>
                  JSON
                </button>
              </div>
            )}
            <button
              onClick={generateGemini}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
            >
              {loading
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Play className="w-3 h-3" />
              }
              {loading ? 'جاري التوليد...' : 'ولّد ✨'}
            </button>
          </div>
        )}

        {/* Copy button */}
        <button onClick={handleCopy} disabled={!current}
          className="flex items-center gap-1 px-3 py-1 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 shadow-sm">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'تم!' : 'نسخ'}
        </button>
      </div>

      {/* Output box */}
      <div className="bg-white border border-bg-border rounded-xl p-3 min-h-[80px] max-h-[160px] overflow-y-auto shadow-inner">
        {tab === 'gemini' && !geminiText && !loading ? (
          <div className="flex flex-col items-center justify-center h-16 gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <p className="text-xs text-text-muted text-center">
              اضغط <span className="font-bold text-purple-500">ولّد ✨</span> لتحسين الـ prompt بـ Gemini
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 text-text-muted text-xs h-16 justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
            <span>جاري التحسين بـ Gemini...</span>
          </div>
        ) : (
          <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap leading-relaxed">
            {current || <span className="text-text-muted italic">سيظهر النص هنا...</span>}
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
    reorderChips(arrayMove(chips, chips.findIndex(c => c.id === active.id), chips.findIndex(c => c.id === over.id)))
  }

  const SEP_LABELS: Record<Separator, string> = {
    comma: 'فاصلة ,', newline: 'سطر ↵', paragraph: 'فقرة ¶',
  }

  return (
    <div id="builder-panel" className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t-2 border-accent/30 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none bg-bg-card border-b border-bg-border"
        onClick={() => setBuilderOpen(!builderOpen)}>
        <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-sm shadow-accent/50" />
        <span className="text-sm font-bold text-text-primary">Prompt Builder</span>
        {chips.length > 0 && (
          <span className="text-xs bg-accent text-white px-2 py-0.5 rounded-full font-bold shadow-sm">{chips.length}</span>
        )}
        {chips.length > 0 && (
          <div className="hidden sm:flex gap-0.5 bg-white border border-bg-border rounded-lg p-0.5 ml-1"
            onClick={e => e.stopPropagation()}>
            {(Object.keys(SEP_LABELS) as Separator[]).map(s => (
              <button key={s} onClick={() => setSeparator(s)}
                className={clsx('px-2.5 py-1 rounded text-xs transition-all font-medium',
                  separator === s ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
                )}>
                {SEP_LABELS[s]}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1" />
        {chips.length > 0 && (
          <button onClick={e => { e.stopPropagation(); if (confirm('مسح كل الـ prompts؟')) clearChips() }}
            className="hidden sm:flex items-center gap-1 px-2 py-1 hover:bg-red-50 text-text-muted hover:text-red-500 rounded-lg text-xs transition-colors border border-transparent hover:border-red-200">
            <Trash2 className="w-3 h-3" /> مسح الكل
          </button>
        )}
        <button className="text-text-muted hover:text-text-primary transition-colors"
          onClick={e => { e.stopPropagation(); setBuilderOpen(!builderOpen) }}>
          {builderOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Content */}
      {builderOpen && (
        <div className="px-4 pb-4 bg-white">
          {chips.length === 0 ? (
            <p className="text-center text-text-muted text-sm py-4">
              اضغط على أيقونة <span className="text-accent font-bold text-base">+</span> على أي صورة لإضافتها هنا
            </p>
          ) : (
            <>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={chips.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                  <div className="flex gap-2.5 overflow-x-auto py-3 scrollbar-thin">
                    {chips.map(c => <Chip key={c.id} chip={c} />)}
                  </div>
                </SortableContext>
              </DndContext>
              <OutputPanel chips={chips} separator={separator} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
