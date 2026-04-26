import { useState } from 'react'
import { usePresetStore } from '../../store/presetStore'
import { useEditStore } from '../../store/editStore'
import { useSessionStore } from '../../store/tabStore'
import type { PresetCategory, Preset } from '@shared/types'

const CATEGORY_LABELS: Record<PresetCategory, string> = {
  'film-stock': 'Film Stock',
  'mood': 'Mood',
  'era': 'Era',
  'cinematic': 'Cinematic',
  'editorial': 'Editorial',
  'aesthetic': 'Aesthetic',
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as PresetCategory[]

export default function PresetStrip() {
  const { presets, favorites, selectedPresetId, selectPreset, toggleFavorite, isLoading } = usePresetStore()
  const { params, applyPreset } = useEditStore()
  const { applyPresetToAll, getActiveBatch, markActiveImageDirty } = useSessionStore()
  const isBatch = getActiveBatch().length > 1
  const [activeCategory, setActiveCategory] = useState<PresetCategory | 'all'>('all')
  const [showFavOnly, setShowFavOnly] = useState(false)

  const filteredPresets = presets.filter(p => {
    if (showFavOnly && !favorites.has(p.id)) return false
    if (activeCategory !== 'all' && p.category !== activeCategory) return false
    return true
  })

  const handlePresetClick = (preset: Preset) => {
    selectPreset(preset.id)
    applyPreset(preset.id, preset.defaults ?? {})
    markActiveImageDirty()
    // Apply to ALL images in the batch
    if (isBatch) applyPresetToAll(preset.id, params.presetIntensity)
  }

  const handleClearPreset = () => {
    selectPreset(null)
    applyPreset('', { presetId: null })
    markActiveImageDirty()
    if (isBatch) applyPresetToAll(null, 1)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between shrink-0">
        <span className="text-[11px] font-semibold text-text-muted dark:text-zinc-500 uppercase tracking-wider">Presets</span>
        <button
          onClick={() => setShowFavOnly(v => !v)}
          className={`text-text-muted hover:text-text-primary transition-colors dark:text-zinc-500 dark:hover:text-zinc-200 ${showFavOnly ? 'text-film' : ''}`}
          title="Show favorites"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={showFavOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
        </button>
      </div>

      {/* Category pills */}
      <div className="px-2 pb-2 shrink-0">
        <div className="flex flex-wrap gap-1">
          <CategoryPill
            label="All"
            active={activeCategory === 'all'}
            onClick={() => setActiveCategory('all')}
          />
          {CATEGORIES.map(cat => (
            <CategoryPill
              key={cat}
              label={CATEGORY_LABELS[cat]}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
            />
          ))}
        </div>
      </div>

      <div className="sep mx-3" />

      {/* "None" / clear preset option */}
      <div className="px-2 pt-2 shrink-0">
        <button
          onClick={handleClearPreset}
          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            !params.presetId
              ? 'bg-surface-100 text-text-primary dark:bg-zinc-800/80 dark:text-zinc-100'
              : 'text-text-muted hover:bg-surface-100 hover:text-text-primary dark:text-zinc-500 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'
          }`}
        >
          ✕ No preset
        </button>
      </div>

      {/* Preset list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 pt-1">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-text-muted text-xs">
            Loading presets...
          </div>
        )}

        {!isLoading && filteredPresets.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-xs text-text-muted">
              {presets.length === 0
                ? 'No presets yet.\nAdd .json files to assets/presets/'
                : 'No presets in this category'}
            </p>
          </div>
        )}

        {!isLoading && filteredPresets.map(preset => (
          <PresetCard
            key={preset.id}
            preset={preset}
            isActive={preset.id === params.presetId}
            isFavorite={favorites.has(preset.id)}
            onSelect={() => handlePresetClick(preset)}
            onFavorite={() => toggleFavorite(preset.id)}
          />
        ))}
      </div>
    </div>
  )
}

const TEMPLATE_STUBS = [
  { id: 'editorial', name: 'Editorial', icon: '◫', color: '#E8D8C4' },
  { id: 'filmstrip', name: 'Film Strip', icon: '▤', color: '#D8C8B4' },
  { id: 'polaroid', name: 'Polaroid', icon: '⬜', color: '#E0D8D0' },
  { id: 'poster', name: 'Poster', icon: '▭', color: '#D4CCC4' },
]

// ─── Category Pill ────────────────────────────────────────────────────────────

function CategoryPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-text-primary text-white dark:bg-zinc-100 dark:text-zinc-900'
          : 'bg-surface-100 text-text-muted hover:bg-surface-200 hover:text-text-primary dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
      }`}
    >
      {label}
    </button>
  )
}

// ─── Preset Card ──────────────────────────────────────────────────────────────

function PresetCard({
  preset, isActive, isFavorite, onSelect, onFavorite
}: {
  preset: Preset
  isActive: boolean
  isFavorite: boolean
  onSelect: () => void
  onFavorite: () => void
}) {
  return (
    <div className={`preset-card group mb-1 ${isActive ? 'active' : ''}`}>
      <button
        onClick={onSelect}
        className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors text-left ${
          isActive
            ? 'bg-accent-muted text-text-primary dark:bg-amber-950/40 dark:text-amber-100/90'
            : 'hover:bg-surface-100 text-text-secondary hover:text-text-primary dark:hover:bg-zinc-800/60 dark:text-zinc-400 dark:hover:text-zinc-100'
        }`}
      >
        {/* Thumbnail or placeholder */}
        <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-surface-200 dark:bg-zinc-800 flex items-center justify-center">
          {preset.thumbnailFile ? (
            <img
              src={`../assets/presets/${preset.folderName}/${preset.thumbnailFile}`}
              alt={preset.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-surface-200 to-surface-300 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center">
              <span className="text-[8px] text-text-muted font-mono">LUT</span>
            </div>
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium truncate ${isActive ? 'text-accent' : ''}`}>
            {preset.name}
          </p>
          <p className="text-[10px] text-text-muted capitalize">
            {CATEGORY_LABELS[preset.category] || preset.category}
          </p>
        </div>

        {/* Favorite star */}
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite() }}
          className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isFavorite ? '!opacity-100' : ''}`}
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill={isFavorite ? '#C4873A' : 'none'}
            stroke={isFavorite ? '#C4873A' : 'currentColor'}
            strokeWidth="1.8"
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
        </button>
      </button>
    </div>
  )
}
