import { useEffect, useMemo, useState } from 'react'
import { useEditStore } from '../../store/editStore'
import { useSessionStore } from '../../store/tabStore'
import { useAuthStore } from '../../store/authStore'
import { TYPOGRAPHY_TEMPLATES } from '../../lib/textTemplates'
import type { TextLayer, TypographyTemplate } from '@shared/types'

interface TextLeftPanelProps {
  mode: 'text' | 'templates'
}

export default function TextLeftPanel({ mode }: TextLeftPanelProps) {
  const { params, addTextLayer, removeTextLayer, setActiveTextId, applyTypographyTemplate } = useEditStore()
  const { markActiveImageDirty } = useSessionStore()
  const profile = useAuthStore(s => s.profile)
  const [savedTemplates, setSavedTemplates] = useState<TypographyTemplate[]>([])
  const [templateName, setTemplateName] = useState('')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const isTemplateAuthor = profile?.role === 'admin' || import.meta.env.DEV
  const allTemplates = useMemo(
    () => [...TYPOGRAPHY_TEMPLATES, ...savedTemplates],
    [savedTemplates],
  )

  const refreshSavedTemplates = async () => {
    try {
      const templates = await window.frame.assets.listTextTemplates()
      setSavedTemplates(templates)
    } catch (e) {
      console.error('[TextTemplates] Failed to load saved text templates:', e)
    }
  }

  useEffect(() => {
    void refreshSavedTemplates()
  }, [])

  const handleAddCustomText = (type: 'heading' | 'subheading' | 'body') => {
    let newLayer: Omit<TextLayer, 'id'>

    if (type === 'heading') {
      newLayer = {
        text: 'HEADING TITLE',
        fontFamily: 'Playfair Display',
        fontSize: 7.5,
        fontWeight: '700',
        fontStyle: 'normal',
        color: '#FFFFFF',
        opacity: 1.0,
        letterSpacing: 0.1,
        lineHeight: 1.2,
        alignment: 'center',
        position: { x: 50, y: 45 },
        textCase: 'uppercase'
      }
    } else if (type === 'subheading') {
      newLayer = {
        text: 'Subheading editorial text',
        fontFamily: 'Cormorant Garamond',
        fontSize: 4.0,
        fontWeight: '400',
        fontStyle: 'italic',
        color: '#E4E4E7',
        opacity: 0.9,
        letterSpacing: 0.05,
        lineHeight: 1.2,
        alignment: 'center',
        position: { x: 50, y: 55 },
        textCase: 'none'
      }
    } else {
      newLayer = {
        text: 'This is body text. Double-click or select to edit settings.',
        fontFamily: 'Inter',
        fontSize: 2.5,
        fontWeight: '400',
        fontStyle: 'normal',
        color: '#A1A1AA',
        opacity: 0.85,
        letterSpacing: 0.02,
        lineHeight: 1.3,
        alignment: 'center',
        position: { x: 50, y: 65 },
        textCase: 'none'
      }
    }

    addTextLayer(newLayer)
    markActiveImageDirty()
  }

  const handleApplyTemplate = (layers: Omit<TextLayer, 'id'>[]) => {
    // Generate new unique ids
    const resolvedLayers: TextLayer[] = layers.map(l => ({
      ...l,
      id: 'text-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
    }))
    applyTypographyTemplate(resolvedLayers)
    markActiveImageDirty()
  }

  const handleSaveCurrentAsTemplate = async () => {
    if (!isTemplateAuthor || params.textLayers.length === 0) return

    const name = templateName.trim()
    if (!name) {
      setSaveMessage('Add a template name first.')
      return
    }

    const layers = params.textLayers.map(({ id: _id, ...layer }) => ({ ...layer }))
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const template: TypographyTemplate = {
      id,
      name,
      thumbnailText: layers[0]?.text?.slice(0, 28) || name,
      layers,
    }

    if (typeof window.frame.assets.saveTextTemplate !== 'function') {
      setSaveMessage('Restart the dev app once to enable text-template saving.')
      return
    }

    try {
      await window.frame.assets.saveTextTemplate(template)
      setTemplateName('')
      setSaveMessage(`Saved "${name}"`)
      await refreshSavedTemplates()
    } catch (e: any) {
      setSaveMessage(e?.message || 'Failed to save template.')
    }
  }

  const renderTemplateCard = (template: TypographyTemplate) => (
    <button
      key={template.id}
      onClick={() => handleApplyTemplate(template.layers)}
      className="w-full flex flex-col text-left p-3.5 rounded-xl border border-border/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-surface-100 dark:hover:bg-zinc-900 transition-all hover:scale-[1.01] active:scale-[0.99] group shadow-sm hover:shadow"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-text-muted dark:text-zinc-500 font-mono">
          {template.name}
        </span>
        <span className="text-[9px] text-indigo-500 dark:text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Apply Layout →
        </span>
      </div>
      <div className="w-full h-16 rounded-lg bg-zinc-950 flex flex-col items-center justify-center p-2 overflow-hidden border border-black/10 dark:border-white/5 relative">
        <div className="text-center scale-[0.8] origin-center flex flex-col gap-0.5 pointer-events-none select-none">
          {template.layers.map((layer, idx) => {
            const size = Math.min(layer.fontSize * 4.5, 24)
            return (
              <div
                key={idx}
                style={{
                  fontFamily: layer.fontFamily,
                  fontSize: `${size}px`,
                  fontWeight: layer.fontWeight,
                  fontStyle: layer.fontStyle,
                  color: layer.color,
                  opacity: layer.opacity,
                  letterSpacing: `${(layer.letterSpacing || 0) * 8}px`,
                  textTransform: layer.textCase === 'uppercase' ? 'uppercase' : layer.textCase === 'lowercase' ? 'lowercase' : 'none'
                }}
                className="leading-none truncate max-w-[200px]"
              >
                {layer.text}
              </div>
            )
          })}
        </div>
      </div>
    </button>
  )

  if (mode === 'templates') {
    return (
      <div className="h-full flex flex-col min-h-0 bg-surface-50 dark:bg-zinc-950/90 text-text-primary dark:text-zinc-100">
        <div className="p-4 border-b border-border/80 dark:border-zinc-800/80 shrink-0">
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted dark:text-zinc-500">
            Templates
          </h2>
          <p className="text-[11px] text-text-secondary dark:text-zinc-400 mt-1 leading-relaxed">
            Reserved for full composition templates. Typography layouts now live in the Text tab.
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p className="text-xs text-text-muted dark:text-zinc-500 max-w-[14rem] leading-relaxed">
            Full image templates are coming here later.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col min-h-0 bg-surface-50 dark:bg-zinc-950/90 text-text-primary dark:text-zinc-100">
      
      {/* ── Header ── */}
      <div className="p-4 border-b border-border/80 dark:border-zinc-800/80 shrink-0">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted dark:text-zinc-500">
          Typography Editor
        </h2>
        <p className="text-[11px] text-text-secondary dark:text-zinc-400 mt-1 leading-relaxed">
          Add, arrange, and apply typography layouts to your image.
        </p>
      </div>

      {/* ── Content Area (Scrollable) ── */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 right-panel-scroll">
        
        <div className="flex flex-col gap-5">
            
            {/* Quick Add Buttons */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold text-text-muted dark:text-zinc-500 uppercase tracking-wider mb-1">
                Add Layer
              </span>
              <button
                onClick={() => handleAddCustomText('heading')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-surface-100 dark:hover:bg-zinc-900 font-serif font-bold text-sm text-left transition-colors"
              >
                <span>Add Heading</span>
                <span className="text-xs text-text-muted font-normal font-sans">+</span>
              </button>
              <button
                onClick={() => handleAddCustomText('subheading')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-surface-100 dark:hover:bg-zinc-900 font-serif italic text-xs text-left transition-colors"
              >
                <span>Add Subheading</span>
                <span className="text-xs text-text-muted font-normal font-sans">+</span>
              </button>
              <button
                onClick={() => handleAddCustomText('body')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-surface-100 dark:hover:bg-zinc-900 font-sans text-[11px] text-left transition-colors"
              >
                <span>Add Body Text</span>
                <span className="text-xs text-text-muted font-normal font-sans">+</span>
              </button>
            </div>

            {/* Active Layers list */}
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-[10px] font-semibold text-text-muted dark:text-zinc-500 uppercase tracking-wider mb-1">
                Layers list ({params.textLayers.length})
              </span>
              {params.textLayers.length === 0 ? (
                <div className="text-center py-6 px-3 rounded-lg border border-dashed border-border dark:border-zinc-800 text-[11px] text-text-muted dark:text-zinc-500">
                  No text layers added yet. Click one of the buttons above to get started.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {params.textLayers.map((layer) => {
                    const isActive = params.activeTextId === layer.id
                    return (
                      <div
                        key={layer.id}
                        onClick={() => setActiveTextId(layer.id)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                          isActive
                            ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/60'
                            : 'bg-white border-border/80 hover:bg-surface-100 dark:bg-zinc-900/60 dark:border-zinc-800 dark:hover:bg-zinc-900'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-xs font-semibold truncate dark:text-zinc-200">
                            {layer.text || '(empty)'}
                          </p>
                          <p className="text-[9px] text-text-muted dark:text-zinc-500 font-mono mt-0.5">
                            {layer.fontFamily} · {layer.fontSize}%
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeTextLayer(layer.id)
                            markActiveImageDirty()
                          }}
                          className="p-1 rounded hover:bg-surface-200 dark:hover:bg-zinc-800 text-text-muted hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors"
                          title="Delete layer"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.78 0L9 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-2 border-t border-border/70 dark:border-zinc-800/70">
              <div>
                <span className="text-[10px] font-semibold text-text-muted dark:text-zinc-500 uppercase tracking-wider">
                  Typography Templates
                </span>
                <p className="text-[11px] text-text-secondary dark:text-zinc-400 mt-1 leading-relaxed">
                  Apply saved Frescava text presets directly from the Text tab.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {allTemplates.map(renderTemplateCard)}
              </div>
            </div>

            {isTemplateAuthor && (
              <div className="flex flex-col gap-2.5 pt-2 border-t border-border/70 dark:border-zinc-800/70">
                <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                  Template Authoring
                </span>
                <input
                  type="text"
                  value={templateName}
                  onChange={e => {
                    setTemplateName(e.target.value)
                    setSaveMessage(null)
                  }}
                  placeholder="Template name"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  disabled={params.textLayers.length === 0}
                  onClick={handleSaveCurrentAsTemplate}
                  className="w-full px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Save Current Text as Template
                </button>
                {saveMessage && (
                  <p className="text-[10px] text-text-muted dark:text-zinc-500 leading-relaxed">
                    {saveMessage}
                  </p>
                )}
              </div>
            )}

          </div>

      </div>
      
    </div>
  )
}
