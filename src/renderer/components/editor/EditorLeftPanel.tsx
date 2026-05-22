import type { ReactNode } from 'react'
import { useUIStore, type LeftDockTool } from '../../store/uiStore'
import PresetStrip from './PresetStrip'

const RAIL: {
  id: LeftDockTool
  title: string
  Icon: () => ReactNode
}[] = [
  {
    id: 'effects',
    title: 'Effects — preset looks & LUTs',
    Icon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path strokeLinecap="round" d="M12 3v1M5.6 5.6l.7.7M3 12h1m-.3 6.1l.7-.7M12 21v-1m6.4-2.6l-.7-.7M21 12h-1m.3-6.1l-.7.7" />
        <circle cx="12" cy="12" r="3.2" />
      </svg>
    ),
  },
  {
    id: 'filters',
    title: 'Filters',
    Icon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16l-6.2 7.4V19l-3.6-2.2v-4.4L4 5z" />
      </svg>
    ),
  },
  {
    id: 'text',
    title: 'Text',
    Icon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path strokeLinecap="round" d="M7 6.5h10M12 6.5v12" />
        <path strokeLinecap="round" d="M9 18.5h6" />
      </svg>
    ),
  },
  {
    id: 'brush',
    title: 'Brush',
    Icon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.4 5.6l-2.8 9.4-4.3 2.6-2-2.1 2.6-4.2 9.4-2.8c.5-.2.8-.8.6-1.3l-.6-1.8c-.2-.5-.8-.8-1.3-.6z" />
        <path strokeLinecap="round" d="M3.5 20.5h5" />
      </svg>
    ),
  },
  {
    id: 'more',
    title: 'More tools',
    Icon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
]

function LeftDockPlaceholder({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="h-full min-h-0 flex flex-col items-center justify-center px-3 py-6 text-center">
      <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted dark:text-zinc-500 mb-2">{title}</p>
      <p className="text-xs text-text-secondary dark:text-zinc-400 leading-relaxed max-w-[12rem]">{hint}</p>
    </div>
  )
}

function SecondColumn() {
  const leftDockTool = useUIStore(s => s.leftDockTool)

  switch (leftDockTool) {
    case 'effects':
      return <PresetStrip />
    case 'filters':
      return (
        <LeftDockPlaceholder
          title="Filters"
          hint="Color and tonal filters (coming soon). Use adjustments on the right for now."
        />
      )
    case 'text':
      return (
        <div className="h-full flex flex-col justify-between p-4 panel-slide-right">
          <div className="flex flex-col items-center justify-center text-center py-12">
            <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted dark:text-zinc-500 mb-2">Text Workspace</p>
            <p className="text-xs text-text-secondary dark:text-zinc-400 leading-relaxed max-w-[12rem] mb-4">
              Add premium typography compositions and stylized type layers to your image.
            </p>
            <button
              onClick={() => {
                useUIStore.getState().setEditorWorkspace('text')
              }}
              className="px-4 py-2 rounded-lg bg-text-primary text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:opacity-90 active:scale-95 transition-all shadow-sm"
            >
              Open Text Workspace
            </button>
          </div>
        </div>
      )
    case 'brush':
      return <LeftDockPlaceholder title="Brush" hint="Dodge, burn, and local paint (coming soon)." />
    case 'more':
      return (
        <LeftDockPlaceholder
          title="More"
          hint="Healing, clone, and extra tools (coming soon)."
        />
      )
  }
}

export default function EditorLeftPanel() {
  const { leftDockTool, setLeftDockTool } = useUIStore()

  return (
    <div className="flex h-full min-h-0 w-full">
      <nav
        className="w-12 shrink-0 flex flex-col items-stretch border-r border-border dark:border-zinc-800/60 bg-surface-50/90 dark:bg-zinc-950/95"
        aria-label="Tool categories"
      >
        {RAIL.map(({ id, title, Icon }) => {
          const active = leftDockTool === id
          return (
            <button
              key={id}
              type="button"
              title={title}
              aria-pressed={active}
              onClick={() => setLeftDockTool(id)}
              className={`shrink-0 h-11 flex items-center justify-center border-b border-border/60 dark:border-zinc-800/50 transition-colors ${
                active
                  ? 'bg-white text-indigo-600 shadow-[inset_2px_0_0_0] shadow-indigo-500 dark:bg-zinc-900/90 dark:text-[#a4a6ff] dark:shadow-[#494be7]'
                  : 'text-text-muted hover:bg-surface-100 hover:text-text-primary dark:text-zinc-500 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-200'
              }`}
            >
              <Icon />
            </button>
          )
        })}
      </nav>

      <div className="min-w-0 flex-1 flex flex-col overflow-hidden bg-surface-50/70 dark:bg-zinc-950/75">
        <SecondColumn />
      </div>
    </div>
  )
}
