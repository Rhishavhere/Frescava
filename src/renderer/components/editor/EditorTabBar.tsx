import { useSessionStore } from '../../store/tabStore'

export default function EditorTabBar() {
  const { sessions, activeSessionId, closeSession, switchSession } = useSessionStore()

  if (sessions.length === 0) return null

  return (
    <div
      className="flex items-stretch overflow-x-auto shrink-0 h-8 border-b border-border dark:border-zinc-800/80 bg-surface-50 dark:bg-zinc-900/50 scrollbar-none"
    >
      {sessions.map((session) => {
        const isActive = session.id === activeSessionId
        return (
          <div
            key={session.id}
            onClick={() => switchSession(session.id)}
            role="button"
            className={`
              group flex items-center gap-1.5 pl-3 pr-1.5 min-w-[5rem] max-w-[12.5rem] text-[11px] font-sans
              border-r border-border dark:border-zinc-800/80 cursor-pointer whitespace-nowrap overflow-hidden flex-shrink-0 select-none
              transition-[color,background] duration-100
              ${isActive
                ? 'font-semibold text-text-primary dark:text-zinc-100 bg-white dark:bg-zinc-950/90 border-b-2 border-b-text-primary dark:border-b-[color:var(--editor-accent)] -mb-px z-[1]'
                : 'font-normal text-text-secondary dark:text-zinc-500 bg-transparent border-b-2 border-b-transparent hover:text-text-primary dark:hover:text-zinc-300'
              }`}
          >
            {session.images[0] && (
              <div className="w-3.5 h-3.5 rounded-sm overflow-hidden flex-shrink-0 bg-surface-300 dark:bg-zinc-700">
                <img
                  src={session.images[0].imageDataURL}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <span className="flex-1 min-w-0 overflow-hidden text-ellipsis flex items-center gap-1">
              {session.label}
              {session.images.length > 1 && (
                <span className="text-text-muted dark:text-zinc-600 font-normal ml-0.5">
                  +{session.images.length - 1}
                </span>
              )}
              {session.images.some((img) => img.isDirty) && (
                <span
                  title="Unsaved edits"
                  className="w-[5px] h-[5px] rounded-full bg-film flex-shrink-0 inline-block ml-0.5"
                />
              )}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                closeSession(session.id)
              }}
              className="flex items-center justify-center w-4 h-4 rounded-sm border-0 bg-transparent cursor-pointer text-text-muted dark:text-zinc-600 text-[10px] p-0 flex-shrink-0
                hover:bg-surface-200 dark:hover:bg-zinc-800"
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
