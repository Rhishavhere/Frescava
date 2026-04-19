import { useEffect, useState } from 'react'
import { useProjectStore } from '../store/projectStore'
import { usePresetStore } from '../store/presetStore'
import { useUIStore } from '../store/uiStore'
import { useSessionStore } from '../store/tabStore'
import type { ProjectMeta } from '@shared/types'

export default function Home() {
  const { projects, loadProjects, isLoading } = useProjectStore()
  const { presets } = usePresetStore()
  const { setActiveTab } = useUIStore()
  const { openSession } = useSessionStore()
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting('Good morning')
    else if (h < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
    loadProjects()
  }, [loadProjects])

  const handleOpenImage = async () => {
    // Multi-select allowed → batch session
    const results = await window.frame.file.openMultiple()
    if (!results.length) return
    openSession(results.map(r => ({ path: r.path, dataURL: r.dataURL, width: r.width, height: r.height })))
    setActiveTab('editor')
  }

  const handleOpenProject = async (project: ProjectMeta) => {
    try {
      const file = await window.frame.projects.load(project.path)
      const imageResult = await window.frame.file.load(file.imagePath)
      // Open as a new session
      openSession([{ path: imageResult.path, dataURL: imageResult.dataURL, width: imageResult.width, height: imageResult.height }])
      setActiveTab('editor')
    } catch (e) {
      console.error('[Home] Failed to open project:', e)
    }
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="home-page flex-1 overflow-y-auto" style={{ background: '#F6F2EC' }}>
      
      {/* ── Hero Header ── */}
      <div className="home-hero relative px-12 pt-16 pb-10 overflow-hidden">
        {/* Decorative torn paper / brutalist border */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-1 bg-black" />
          <div className="absolute top-4 right-8 w-32 h-32 border-2 border-black opacity-10 rotate-6" />
          <div className="absolute top-8 right-24 w-16 h-16 border-2 border-black opacity-10 -rotate-3" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-black opacity-20" />
        </div>

        <div className="relative flex items-end justify-between">
          <div>
            <p className="text-xs font-mono tracking-[0.25em] text-black/40 uppercase mb-2">{today}</p>
            <h1 className="home-greeting" style={{
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.03em',
              color: '#111',
            }}>
              {greeting},<br />
              <span style={{ fontStyle: 'italic', color: '#8B5C2A' }}>creator.</span>
            </h1>
            <p className="mt-4 text-sm text-black/50 font-mono tracking-wide">
              Your studio awaits — drop a photo, pick a look, make it yours.
            </p>
          </div>

          {/* Quick actions — big editorial style CTA buttons */}
          <div className="flex flex-col gap-3 shrink-0">
            <button
              onClick={handleOpenImage}
              className="home-cta-primary"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Open Photo
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className="home-cta-secondary"
            >
              Browse Templates
            </button>
          </div>
        </div>
      </div>

      <div className="px-12 pb-16 space-y-14">

        {/* ── Recent Projects ── */}
        <section>
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h2 className="home-section-title">Recent edits</h2>
              <div className="home-section-rule" />
            </div>
            {projects.length > 0 && (
              <span className="text-xs font-mono text-black/40">{projects.length} saved</span>
            )}
          </div>

          {isLoading && (
            <div className="flex gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="home-project-skeleton" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          )}

          {!isLoading && projects.length === 0 && (
            <button onClick={handleOpenImage} className="home-empty-state">
              <div className="home-empty-state-inner">
                <div className="text-4xl mb-3">⬚</div>
                <p className="text-sm font-semibold" style={{ fontFamily: 'Georgia, serif' }}>Start your first edit</p>
                <p className="text-xs text-black/40 mt-1 font-mono">Saved projects appear here</p>
              </div>
            </button>
          )}

          {!isLoading && projects.length > 0 && (
            <div className="home-projects-grid">
              {/* New edit button — always first */}
              <button onClick={handleOpenImage} className="home-new-card">
                <div className="home-new-card-inner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 mb-2 opacity-40">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className="text-xs font-mono text-black/40">New edit</span>
                </div>
              </button>

              {projects.slice(0, 7).map((project) => (
                <ProjectCard key={project.path} project={project} onClick={() => handleOpenProject(project)} />
              ))}
            </div>
          )}
        </section>

        {/* ── Filter/Preset Strip Bento ── */}
        <section>
          <div className="mb-6">
            <h2 className="home-section-title">Filters & Looks</h2>
            <div className="home-section-rule" />
          </div>

          {presets.length === 0 ? (
            <div className="home-coming-soon-banner">
              <span className="font-mono text-xs">Add .json presets to assets/presets/ to see them here</span>
            </div>
          ) : (
            <div className="home-filters-grid">
              {presets.map((preset, i) => (
                <button
                  key={preset.id}
                  onClick={handleOpenImage}
                  className="home-filter-card"
                  style={{ '--filter-idx': i } as React.CSSProperties}
                >
                  <div className="home-filter-swatch" style={{ background: CATEGORY_COLORS[preset.category] ?? '#DDD8CE' }} />
                  <div className="home-filter-info">
                    <p className="text-xs font-bold leading-tight" style={{ fontFamily: 'Georgia, serif' }}>{preset.name}</p>
                    <p className="text-[10px] font-mono text-black/40 uppercase mt-0.5">{preset.category.replace('-', ' ')}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── What's Coming Bento ── */}
        <section>
          <div className="mb-6">
            <h2 className="home-section-title">Coming soon</h2>
            <div className="home-section-rule" />
          </div>
          <div className="home-bento-grid">
            <BentoCard
              label="Templates"
              sublabel="Editorial layouts, film strips, poster comps"
              icon="◫"
              size="large"
              accent="#E8D5B0"
            />
            <BentoCard
              label="Text & Graphics"
              sublabel="Film credits, Y2K chrome, handwritten captions"
              icon="Aa"
              size="medium"
              accent="#D6C9B8"
            />
            <BentoCard
              label="AI Upscale"
              sublabel="4× resolution recovery"
              icon="⬡"
              size="small"
              accent="#C8BFAF"
            />
            <BentoCard
              label="Canvas"
              sublabel="Infinite moodboard workspace"
              icon="∞"
              size="small"
              accent="#BDAF9F"
            />
            <BentoCard
              label="AI Captions"
              sublabel="Claude-powered, 5 tone options"
              icon="✦"
              size="medium"
              accent="#D0C5B5"
            />
          </div>
        </section>

      </div>
    </div>
  )
}

// ─── Preset category accent colors ────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'film-stock': '#E8C89A',
  'mood': '#CCDAD1',
  'era': '#D8C5AF',
  'cinematic': '#BFB8C8',
  'editorial': '#D4D0C8',
  'aesthetic': '#DCCABF',
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, onClick }: { project: ProjectMeta; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="home-project-card"
    >
      {/* Thumbnail */}
      <div className="home-project-thumb">
        {project.previewDataURL ? (
          <img
            src={project.previewDataURL}
            alt={project.name}
            className="w-full h-full object-cover transition-transform duration-500"
            style={{ transform: hovered ? 'scale(1.04)' : 'scale(1)' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: '#DDD8CE' }}>
            <span className="text-2xl opacity-30">⬚</span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="home-project-overlay" style={{ opacity: hovered ? 1 : 0 }}>
          <span className="text-white text-xs font-mono">Open →</span>
        </div>
      </div>
      <div className="home-project-meta">
        <p className="text-xs font-bold truncate text-black/80" style={{ fontFamily: 'Georgia, serif' }}>
          {project.name}
        </p>
        <p className="text-[10px] font-mono text-black/40 mt-0.5">
          {project.presetId ?? 'No preset'} · {new Date(project.savedAt).toLocaleDateString()}
        </p>
      </div>
    </button>
  )
}

// ─── Bento Card ────────────────────────────────────────────────────────────────

function BentoCard({ label, sublabel, icon, size, accent }: {
  label: string; sublabel: string; icon: string
  size: 'large' | 'medium' | 'small'; accent: string
}) {
  return (
    <div
      className={`home-bento-card home-bento-${size}`}
      style={{ background: accent }}
    >
      <div className="home-bento-icon">{icon}</div>
      <div className="mt-auto">
        <p className="font-bold text-sm" style={{ fontFamily: 'Georgia, serif' }}>{label}</p>
        <p className="text-[10px] font-mono text-black/50 mt-1">{sublabel}</p>
        <div className="home-bento-badge">v0.3</div>
      </div>
    </div>
  )
}
