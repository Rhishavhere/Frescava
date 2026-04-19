import { useTabStore } from '../../store/tabStore'

export default function EditorTabBar() {
  const { tabs, activeTabId, closeTab, switchTab } = useTabStore()

  if (tabs.length === 0) return null

  return (
    <div
      className="editor-tab-bar"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        background: '#FAFAFA',
        borderBottom: '1px solid #E5E5E5',
        overflowX: 'auto',
        height: 32,
        scrollbarWidth: 'none',
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            role="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              paddingLeft: 12,
              paddingRight: 6,
              minWidth: 80,
              maxWidth: 160,
              fontSize: 11,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#111' : '#777',
              background: isActive ? '#fff' : 'transparent',
              borderRight: '1px solid #E5E5E5',
              borderBottom: isActive ? '2px solid #111' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              flexShrink: 0,
              userSelect: 'none',
              transition: 'color 0.1s, background 0.1s',
            }}
          >
            {/* Image mini-thumb */}
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 2,
                overflow: 'hidden',
                flexShrink: 0,
                background: '#DDD',
              }}
            >
              {tab.imageDataURL && (
                <img
                  src={tab.imageDataURL}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>

            {/* Filename */}
            <span
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {tab.label}
            </span>

            {/* Close button */}
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                borderRadius: 3,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: '#999',
                flexShrink: 0,
                fontSize: 10,
                padding: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#EEE')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              title={`Close ${tab.label}`}
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
