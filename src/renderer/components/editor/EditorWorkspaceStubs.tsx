import type { EditorWorkspace } from '../../store/uiStore'

const COPY: Record<Exclude<EditorWorkspace, 'main'>, { left: string; right: string }> = {
  text: {
    left: 'Text-related presets and styles will appear here.',
    right: 'Typography, captions, and text layers (stub).',
  },
  templates: {
    left: 'Template packs and layout presets will appear here.',
    right: 'Template controls and options (stub).',
  },
}

export function PresetColumnStub({ mode }: { mode: 'text' | 'templates' }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-3 py-4 text-center border-b border-border sm:border-b-0">
      <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">Presets</p>
      <p className="text-xs text-text-secondary leading-relaxed max-w-[11rem]">{COPY[mode].left}</p>
    </div>
  )
}

export function InspectorColumnStub({ mode }: { mode: 'text' | 'templates' }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-4 py-6 text-center">
      <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">Inspector</p>
      <p className="text-xs text-text-secondary leading-relaxed max-w-xs">{COPY[mode].right}</p>
    </div>
  )
}
