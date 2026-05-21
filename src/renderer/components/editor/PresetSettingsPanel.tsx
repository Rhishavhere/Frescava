import { useState, useEffect } from 'react'
import { useEditStore } from '../../store/editStore'
import { useSessionStore } from '../../store/tabStore'
import { usePresetStore } from '../../store/presetStore'
import { useAuthStore } from '../../store/authStore'
import { Slider } from '../ui'
import type {
  PresetCategory,
  PresetDef,
  PresetEffectState,
  FadeParams,
  VignetteParams,
  HalationParams,
  CaParams,
  BloomParams,
  LensDistortionParams,
  LightLeakParams,
  DustScratchesParams,
  BorderParams,
} from '@shared/types'

const EFFECT_ORDER: (keyof PresetEffectState)[] = [
  'grain',
  'vignette',
  'fade',
  'halation',
  'bloom',
  'chromaticAberration',
  'lightLeak',
  'dustScratches',
  'lensDistortion',
  'blur',
  'border',
]

const EFFECT_LABEL: Record<keyof PresetEffectState, string> = {
  fade: 'Fade',
  grain: 'Grain',
  vignette: 'Vignette',
  halation: 'Halation',
  chromaticAberration: 'Chrom. Ab.',
  bloom: 'Bloom',
  lensDistortion: 'Lens',
  lightLeak: 'Light Leak',
  dustScratches: 'Dust',
  border: 'Border',
  blur: 'Blur',
}

type PresetFilters = NonNullable<ReturnType<typeof useEditStore.getState>['params']>['presetFilters']

const DEFAULT_EDIT_STATE: Record<keyof PresetEffectState, any> = {
  fade: { enabled: false, blackLift: 0.05, whiteCeiling: 0.97 },
  grain: { enabled: false, type: 'fine' as const, intensity: 0.3, size: 1.0, roughness: 0.5, luminosityMode: true, highlightReduction: 0.4 },
  vignette: { enabled: false, shape: 'oval' as const, strength: 0.5, feather: 0.5, midpoint: 0.7, exposure: 0 },
  halation: { enabled: false, color: '#FF4422', radius: 40, threshold: 0.75, intensity: 0.4, blendMode: 'screen' as const },
  chromaticAberration: { enabled: false, amount: 3, radialFalloff: true },
  bloom: { enabled: false, threshold: 0.75, intensity: 0.3, radius: 15, character: 'soft' as const },
  lensDistortion: { enabled: false, amount: 0 },
  lightLeak: { enabled: false, textureFile: null as string | null, color: '#FFA050', colorStrength: 0.5, position: [0, 0] as [number, number], opacity: 0.5, blendMode: 'screen' as const },
  dustScratches: { enabled: false, textureFile: null as string | null, opacity: 0.3, blendMode: 'screen' as const },
  border: { enabled: false, type: null as string | null, textureFile: null as string | null, color: '#FFFFFF', width: 0.04, bottomWeight: 1, cornerRadius: 0, expandCanvas: false },
  blur: { enabled: false, type: 'gaussian' as const, radius: 20 },
}

function sortedPresetFilterKeys(fp: PresetEffectState): (keyof PresetEffectState)[] {
  const present = (Object.keys(fp) as (keyof PresetEffectState)[]).filter(k => fp[k] != null)
  return present.sort(
    (a, b) => EFFECT_ORDER.indexOf(a) - EFFECT_ORDER.indexOf(b) || String(a).localeCompare(String(b))
  )
}

function formatPresetEffectValue(
  key: keyof PresetEffectState,
  block: PresetEffectState[keyof PresetEffectState] | null | undefined
): string {
  if (!block || typeof block !== 'object') return '—'
  if (!(block as { enabled?: boolean }).enabled) return 'off'

  const pct = (n: number) => `${Math.round(n * 100)}%`
  const pct1 = (n: number) => `${Math.round(n * 1000) / 10}%`

  switch (key) {
    case 'fade': {
      const f = block as FadeParams
      return `${Math.round((f.blackLift ?? 0) * 100)}% · ${Math.round((f.whiteCeiling ?? 1) * 100)}%`
    }
    case 'grain': {
      const g = block as any
      if (g.textureFile) return `texture · ${pct1(g.opacity ?? 0)}`
      return `shader · ${pct(g.intensity ?? 0)}`
    }
    case 'vignette': {
      const v = block as VignetteParams
      return pct(v.strength ?? 0)
    }
    case 'halation': {
      const h = block as HalationParams
      return pct(h.intensity ?? 0)
    }
    case 'bloom': {
      const b = block as BloomParams
      return pct(b.intensity ?? 0)
    }
    case 'chromaticAberration': {
      const c = block as CaParams
      return `${Math.round(c.amount ?? 0)}`
    }
    case 'lensDistortion': {
      const l = block as LensDistortionParams
      const a = l.amount ?? 0
      return `${a >= 0 ? '+' : ''}${Math.round(a * 100)}%`
    }
    case 'lightLeak': {
      const ll = block as LightLeakParams
      return pct1(ll.opacity ?? 0)
    }
    case 'dustScratches': {
      const d = block as DustScratchesParams
      return pct1(d.opacity ?? 0)
    }
    case 'border': {
      const br = block as BorderParams
      if (br.type) return br.type
      return br.textureFile ? 'texture' : `${Math.round((br.width ?? 0) * 100)}% w`
    }
    case 'blur': {
      const bl = block as any
      return `${bl.type || 'gaussian'} · ${Math.round(bl.radius ?? 0)}%`
    }
    default:
      return '—'
  }
}

function PresetEffectCard({
  label,
  enabled,
  valueText,
  onToggle,
  onHeaderClick,
  isExpanded,
  isAdmin,
}: {
  label: string
  enabled: boolean
  valueText: string
  onToggle: () => void
  onHeaderClick?: () => void
  isExpanded?: boolean
  isAdmin?: boolean
}) {
  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center rounded-md border transition-colors ${
          enabled
            ? 'bg-surface-100 border-border dark:bg-zinc-800/60 dark:border-zinc-700/80'
            : 'bg-surface-50/90 border-border dark:bg-zinc-900/40 dark:border-zinc-800/80'
        }`}
      >
        <button
          type="button"
          onClick={isAdmin ? onHeaderClick : onToggle}
          className="flex-1 text-left pl-3 pr-2 py-1.5 min-h-[2.35rem] sm:min-h-[2.5rem] flex flex-col justify-center"
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[12px] font-medium leading-tight block ${
                enabled ? 'text-text-primary dark:text-zinc-100' : 'text-text-muted dark:text-zinc-500'
              }`}
            >
              {label}
            </span>
            {isAdmin && (
              <svg
                className={`w-3.5 h-3.5 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
          <span
            className={`mt-0.5 block text-[9px] font-mono leading-none tracking-tight truncate ${
              enabled ? 'text-text-secondary dark:text-zinc-400' : 'text-text-muted dark:text-zinc-600'
            }`}
            title={valueText}
          >
            {valueText}
          </span>
        </button>

        {isAdmin ? (
          <button
            type="button"
            onClick={onToggle}
            className="px-3 border-l border-border dark:border-zinc-700/50 self-stretch flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 rounded-r-md transition-colors"
          >
            <div
              className={`h-3 w-3 rounded-full flex items-center justify-center transition-all ${
                enabled
                  ? 'bg-text-primary dark:bg-[color:var(--editor-accent-mid)] scale-110'
                  : 'border border-surface-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'
              }`}
            />
          </button>
        ) : (
          <div className="pr-3 pointer-events-none">
            <div
              className={`h-1.5 w-1.5 rounded-full ${
                enabled ? 'bg-text-primary dark:bg-[color:var(--editor-accent-mid)]' : 'border border-surface-300 dark:border-zinc-600'
              }`}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default function PresetSettingsPanel() {
  const { params, setPresetFilterParam, setPresetIntensity, applyPreset, selectPreset: selectEditPreset, pushHistory } = useEditStore()
  const { markActiveImageDirty } = useSessionStore()
  const { getPresetById, updatePresetInMemory, loadPresets, selectPreset } = usePresetStore()
  const { profile } = useAuthStore()

  const isAdmin = profile?.role === 'admin' || import.meta.env.DEV

  const preset = params.presetId ? getPresetById(params.presetId) : null

  const [lutFiles, setLutFiles] = useState<string[]>([])
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false)
  const [expandedEffect, setExpandedEffect] = useState<keyof PresetEffectState | null>(null)
  
  // Local metadata editing state
  const [metadata, setMetadata] = useState({
    id: '',
    name: '',
    category: 'film-stock' as PresetCategory,
    pack: 'free' as 'free' | 'pro' | 'community',
    tags: '',
    accentColor: '#888888',
    thumbnailCropHint: 0.5,
    pairsWith: '',
    moodTags: '',
    bestFor: '',
  })

  const [newPresetSlug, setNewPresetSlug] = useState('')
  const [showSaveAsNewInline, setShowSaveAsNewInline] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Load LUT list
  useEffect(() => {
    let active = true
    window.frame.assets.listLUTFiles().then(files => {
      if (active) {
        setLutFiles(files)
      }
    })
    return () => {
      active = false
    }
  }, [])

  // Sync local metadata state on preset load/change
  useEffect(() => {
    if (preset) {
      setMetadata({
        id: preset.id,
        name: preset.name,
        category: preset.category,
        pack: preset.pack ?? 'free',
        tags: (preset.tags || []).join(', '),
        accentColor: preset.ui?.accentColor || '#888888',
        thumbnailCropHint: preset.ui?.thumbnailCropHint ?? 0.5,
        pairsWith: (preset.ui?.pairsWith || []).join(', '),
        moodTags: (preset.ui?.moodTags || []).join(', '),
        bestFor: (preset.ui?.bestFor || []).join(', '),
      })
      setShowSaveAsNewInline(false)
      setSaveStatus(null)
    }
  }, [preset?.id])

  if (!preset) {
    if (isAdmin) {
      return (
        <div className="flex flex-col pt-2.5 px-4 pb-2 gap-3 mb-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-text-muted dark:text-zinc-500 uppercase tracking-wider">
              Preset settings
            </span>
          </div>
          <div className="h-px w-full bg-border dark:bg-zinc-800/80" />
          <button
            type="button"
            onClick={() => {
              // Create temporary template preset in store
              updatePresetInMemory('new-preset', {
                id: 'new-preset',
                name: 'New Preset',
                category: 'film-stock',
                pack: 'free',
                tags: [],
                folderName: 'new-preset',
                lutFile: null,
                lutIntensity: 1.0,
                thumbnailFile: null,
                defaults: {},
                ui: {
                  accentColor: '#888888',
                  thumbnailCropHint: 0.5,
                  intensityDefault: 1.0,
                  intensityMin: 0.0,
                  intensityMax: 1.0,
                  pairsWith: [],
                  moodTags: [],
                  bestFor: [],
                }
              })
              // Set edit params to point to it
              applyPreset('new-preset', {})
              markActiveImageDirty()
            }}
            className="w-full py-2.5 px-4 text-xs font-medium rounded-md border border-dashed border-border dark:border-zinc-700/80 text-text-secondary hover:text-text-primary hover:border-text-muted dark:hover:border-zinc-500 transition-all duration-150 flex items-center justify-center gap-1.5 bg-surface-50/50 dark:bg-zinc-900/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Preset
          </button>
        </div>
      )
    }
    return null
  }

  const filterParams = params.presetFilters as PresetFilters
  const keys = isAdmin ? EFFECT_ORDER : sortedPresetFilterKeys(filterParams)
  const intensityPct = params.presetIntensity * 100

  const setEnabled = (effectKey: keyof PresetEffectState, value: boolean) => {
    setPresetFilterParam(effectKey, 'enabled', value)
    markActiveImageDirty()
  }

  const handleMetadataChange = (key: keyof typeof metadata, val: any) => {
    setMetadata(prev => {
      const updated = { ...prev, [key]: val }
      
      // Keep store sync'd so preview/tabs read updated info
      updatePresetInMemory(preset.id, {
        name: key === 'name' ? val : preset.name,
        category: key === 'category' ? val : preset.category,
        pack: key === 'pack' ? val : preset.pack,
        tags: key === 'tags' ? val.split(',').map((t: string) => t.trim()).filter(Boolean) : preset.tags,
        ui: {
          ...preset.ui,
          accentColor: key === 'accentColor' ? val : preset.ui?.accentColor,
          thumbnailCropHint: key === 'thumbnailCropHint' ? val : preset.ui?.thumbnailCropHint,
          pairsWith: key === 'pairsWith' ? val.split(',').map((t: string) => t.trim()).filter(Boolean) : preset.ui?.pairsWith || [],
          moodTags: key === 'moodTags' ? val.split(',').map((t: string) => t.trim()).filter(Boolean) : preset.ui?.moodTags || [],
          bestFor: key === 'bestFor' ? val.split(',').map((t: string) => t.trim()).filter(Boolean) : preset.ui?.bestFor || [],
        }
      })
      return updated
    })
  }

  const getSavePresetDef = (saveId: string): PresetDef => {
    const effects: any = {}
    const EFFECT_KEYS = [
      'fade', 'grain', 'vignette', 'halation', 'chromaticAberration',
      'bloom', 'lensDistortion', 'lightLeak', 'dustScratches', 'border', 'blur'
    ] as const

    for (const key of EFFECT_KEYS) {
      const val = filterParams[key]
      if (val && (val as any).enabled) {
        effects[key] = { ...val }
      } else {
        effects[key] = val ? { ...val, enabled: false } : { enabled: false }
      }
    }

    return {
      id: saveId,
      name: metadata.name || 'New Preset',
      category: metadata.category,
      pack: metadata.pack,
      tags: metadata.tags.split(',').map(t => t.trim()).filter(Boolean),
      lut: {
        file: preset.lutFile,
        intensity: preset.lutIntensity
      },
      ...effects,
      ui: {
        accentColor: metadata.accentColor,
        thumbnailCropHint: metadata.thumbnailCropHint,
        intensityDefault: preset.ui?.intensityDefault ?? 1.0,
        intensityMin: preset.ui?.intensityMin ?? 0.0,
        intensityMax: preset.ui?.intensityMax ?? 1.0,
        pairsWith: metadata.pairsWith.split(',').map(t => t.trim()).filter(Boolean),
        moodTags: metadata.moodTags.split(',').map(t => t.trim()).filter(Boolean),
        bestFor: metadata.bestFor.split(',').map(t => t.trim()).filter(Boolean)
      }
    }
  }

  const handleSave = async (slugToUse: string, isNew: boolean) => {
    const slug = slugToUse.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
    if (!slug) {
      setSaveStatus({ type: 'error', message: 'Preset ID slug is required' })
      return
    }

    setIsSaving(true)
    setSaveStatus(null)

    try {
      const presetDef = getSavePresetDef(slug)
      const res = await window.frame.assets.savePreset(presetDef)
      
      if (res.success) {
        setSaveStatus({ type: 'success', message: 'Preset saved successfully!' })
        
        // Reload all presets in the library
        await loadPresets()
        
        // Update edit state selection
        selectPreset(slug)
        selectEditPreset(slug, presetDef as any)

        // Clear temporary store template
        if (isNew && slug !== 'new-preset') {
          usePresetStore.setState(state => ({
            presets: state.presets.filter(p => p.id !== 'new-preset')
          }))
        }
        
        setShowSaveAsNewInline(false)
        setNewPresetSlug('')
        
        // Auto fade out status
        setTimeout(() => setSaveStatus(null), 3000)
      } else {
        setSaveStatus({ type: 'error', message: 'Failed to save preset.' })
      }
    } catch (e: any) {
      setSaveStatus({ type: 'error', message: e.message || 'Error saving preset' })
    } finally {
      setIsSaving(false)
    }
  }

  const renderEffectDrawer = (key: keyof PresetEffectState) => {
    const block = filterParams[key]
    const data = block || DEFAULT_EDIT_STATE[key]
    
    const setVal = (paramKey: string, val: any) => {
      setPresetFilterParam(key, paramKey, val)
      markActiveImageDirty()
    }
    
    const setValEnd = () => {
      pushHistory()
    }

    switch (key) {
      case 'fade': {
        const f = data as FadeParams
        return (
          <div className="flex flex-col gap-3 p-3 bg-surface-50 dark:bg-zinc-900/40 rounded-b-md border-x border-b border-border dark:border-zinc-800/80 -mt-1.5 mb-2 text-xs">
            <Slider
              label="Black Lift"
              value={f.blackLift ?? 0.0}
              min={0}
              max={0.3}
              step={0.01}
              onChange={v => setVal('blackLift', v)}
              onChangeEnd={setValEnd}
            />
            <Slider
              label="White Ceiling"
              value={f.whiteCeiling ?? 1.0}
              min={0.7}
              max={1.0}
              step={0.01}
              onChange={v => setVal('whiteCeiling', v)}
              onChangeEnd={setValEnd}
            />
          </div>
        )
      }
      case 'grain': {
        const g = data as any
        const isProcedural = !g.textureFile
        return (
          <div className="flex flex-col gap-3 p-3 bg-surface-50 dark:bg-zinc-900/40 rounded-b-md border-x border-b border-border dark:border-zinc-800/80 -mt-1.5 mb-2 text-xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-medium text-text-secondary dark:text-zinc-400">Mode</span>
              <div className="flex bg-surface-200 dark:bg-zinc-800 rounded p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setVal('textureFile', null)
                    setVal('enabled', true)
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] ${isProcedural ? 'bg-white dark:bg-zinc-700 shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
                >
                  Shader
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVal('textureFile', 'presets/kodak-portra-400/grain.png')
                    setVal('enabled', true)
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] ${!isProcedural ? 'bg-white dark:bg-zinc-700 shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
                >
                  Texture
                </button>
              </div>
            </div>
            {isProcedural ? (
              <>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium text-text-secondary dark:text-zinc-400">Type</span>
                  <select
                    value={g.type || 'medium'}
                    onChange={e => setVal('type', e.target.value)}
                    className="text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1.5 py-0.5 focus:outline-none"
                  >
                    <option value="fine">Fine</option>
                    <option value="medium">Medium</option>
                    <option value="coarse">Coarse</option>
                  </select>
                </div>
                <Slider
                  label="Intensity"
                  value={g.intensity ?? 0.3}
                  min={0}
                  max={1.0}
                  step={0.01}
                  onChange={v => setVal('intensity', v)}
                  onChangeEnd={setValEnd}
                />
                <Slider
                  label="Size"
                  value={g.size ?? 1.0}
                  min={0.1}
                  max={3.0}
                  step={0.05}
                  onChange={v => setVal('size', v)}
                  onChangeEnd={setValEnd}
                />
                <Slider
                  label="Roughness"
                  value={g.roughness ?? 0.5}
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  onChange={v => setVal('roughness', v)}
                  onChangeEnd={setValEnd}
                />
                <div className="flex items-center justify-between py-1">
                  <span className="font-medium text-text-secondary dark:text-zinc-400">Luminosity Mask</span>
                  <input
                    type="checkbox"
                    checked={g.luminosityMode ?? false}
                    onChange={e => setVal('luminosityMode', e.target.checked)}
                    className="rounded border-border dark:border-zinc-700 text-text-primary focus:ring-text-primary h-3.5 w-3.5"
                  />
                </div>
                <Slider
                  label="Highlight Reduction"
                  value={g.highlightReduction ?? 0.5}
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  onChange={v => setVal('highlightReduction', v)}
                  onChangeEnd={setValEnd}
                />
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1 mb-1">
                  <span className="font-medium text-text-secondary dark:text-zinc-400">Texture File</span>
                  <input
                    type="text"
                    value={g.textureFile || ''}
                    onChange={e => setVal('textureFile', e.target.value)}
                    placeholder="e.g. presets/kodak-portra-400/grain.png"
                    className="w-full text-[11px] bg-white dark:bg-zinc-850 border border-border dark:border-zinc-700 rounded px-2 py-1 focus:outline-none focus:border-text-primary"
                  />
                </div>
                <Slider
                  label="Opacity"
                  value={g.opacity ?? 0.3}
                  min={0}
                  max={1.0}
                  step={0.01}
                  onChange={v => setVal('opacity', v)}
                  onChangeEnd={setValEnd}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-text-secondary dark:text-zinc-400">Blend Mode</span>
                  <select
                    value={g.blendMode || 'overlay'}
                    onChange={e => setVal('blendMode', e.target.value)}
                    className="text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1.5 py-0.5 focus:outline-none"
                  >
                    <option value="overlay">Overlay</option>
                    <option value="screen">Screen</option>
                    <option value="soft-light">Soft Light</option>
                    <option value="hard-light">Hard Light</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )
      }
      case 'vignette': {
        const v = data as VignetteParams
        return (
          <div className="flex flex-col gap-3 p-3 bg-surface-50 dark:bg-zinc-900/40 rounded-b-md border-x border-b border-border dark:border-zinc-800/80 -mt-1.5 mb-2 text-xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-medium text-text-secondary dark:text-zinc-400">Shape</span>
              <select
                value={v.shape || 'oval'}
                onChange={e => setVal('shape', e.target.value)}
                className="text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1.5 py-0.5 focus:outline-none"
              >
                <option value="oval">Oval</option>
                <option value="rect">Rectangular</option>
              </select>
            </div>
            <Slider
              label="Strength"
              value={v.strength ?? 0.4}
              min={0}
              max={1.0}
              step={0.01}
              onChange={v => setVal('strength', v)}
              onChangeEnd={setValEnd}
            />
            <Slider
              label="Feather"
              value={v.feather ?? 0.7}
              min={0}
              max={1.0}
              step={0.01}
              onChange={v => setVal('feather', v)}
              onChangeEnd={setValEnd}
            />
            <Slider
              label="Midpoint"
              value={v.midpoint ?? 0.5}
              min={0.3}
              max={1.0}
              step={0.01}
              onChange={v => setVal('midpoint', v)}
              onChangeEnd={setValEnd}
            />
            <Slider
              label="Exposure Offset"
              value={v.exposure ?? 0}
              min={-1.0}
              max={0.0}
              step={0.05}
              onChange={v => setVal('exposure', v)}
              onChangeEnd={setValEnd}
            />
          </div>
        )
      }
      case 'halation': {
        const h = data as HalationParams
        return (
          <div className="flex flex-col gap-3 p-3 bg-surface-50 dark:bg-zinc-900/40 rounded-b-md border-x border-b border-border dark:border-zinc-800/80 -mt-1.5 mb-2 text-xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-medium text-text-secondary dark:text-zinc-400">Color</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={h.color || '#FF4422'}
                  onChange={e => setVal('color', e.target.value)}
                  className="w-5 h-5 border border-border rounded cursor-pointer p-0 bg-transparent"
                />
                <input
                  type="text"
                  value={h.color || '#FF4422'}
                  onChange={e => setVal('color', e.target.value)}
                  className="w-16 text-[10px] text-center bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded py-0.5 focus:outline-none"
                />
              </div>
            </div>
            <Slider
              label="Radius (px)"
              value={h.radius ?? 30}
              min={5}
              max={100}
              step={1}
              onChange={v => setVal('radius', v)}
              onChangeEnd={setValEnd}
            />
            <Slider
              label="Threshold"
              value={h.threshold ?? 0.75}
              min={0.0}
              max={1.0}
              step={0.01}
              onChange={v => setVal('threshold', v)}
              onChangeEnd={setValEnd}
            />
            <Slider
              label="Intensity"
              value={h.intensity ?? 0.3}
              min={0.0}
              max={1.0}
              step={0.01}
              onChange={v => setVal('intensity', v)}
              onChangeEnd={setValEnd}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-text-secondary dark:text-zinc-400">Blend Mode</span>
              <select
                value={h.blendMode || 'screen'}
                onChange={e => setVal('blendMode', e.target.value)}
                className="text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1.5 py-0.5 focus:outline-none"
              >
                <option value="screen">Screen</option>
                <option value="add">Add</option>
                <option value="lighten">Lighten</option>
                <option value="overlay">Overlay</option>
              </select>
            </div>
          </div>
        )
      }
      case 'chromaticAberration': {
        const c = data as CaParams
        return (
          <div className="flex flex-col gap-3 p-3 bg-surface-50 dark:bg-zinc-900/40 rounded-b-md border-x border-b border-border dark:border-zinc-800/80 -mt-1.5 mb-2 text-xs">
            <Slider
              label="Amount (px)"
              value={c.amount ?? 3}
              min={0}
              max={20}
              step={0.5}
              onChange={v => setVal('amount', v)}
              onChangeEnd={setValEnd}
            />
            <div className="flex items-center justify-between py-1">
              <span className="font-medium text-text-secondary dark:text-zinc-400">Radial Falloff</span>
              <input
                type="checkbox"
                checked={c.radialFalloff ?? true}
                onChange={e => setVal('radialFalloff', e.target.checked)}
                className="rounded border-border dark:border-zinc-700 text-text-primary focus:ring-text-primary h-3.5 w-3.5"
              />
            </div>
          </div>
        )
      }
      case 'bloom': {
        const b = data as BloomParams
        return (
          <div className="flex flex-col gap-3 p-3 bg-surface-50 dark:bg-zinc-900/40 rounded-b-md border-x border-b border-border dark:border-zinc-800/80 -mt-1.5 mb-2 text-xs">
            <Slider
              label="Threshold"
              value={b.threshold ?? 0.75}
              min={0.0}
              max={1.0}
              step={0.01}
              onChange={v => setVal('threshold', v)}
              onChangeEnd={setValEnd}
            />
            <Slider
              label="Intensity"
              value={b.intensity ?? 0.3}
              min={0.0}
              max={1.0}
              step={0.01}
              onChange={v => setVal('intensity', v)}
              onChangeEnd={setValEnd}
            />
            <Slider
              label="Radius (px)"
              value={b.radius ?? 15}
              min={5}
              max={50}
              step={1}
              onChange={v => setVal('radius', v)}
              onChangeEnd={setValEnd}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-text-secondary dark:text-zinc-400">Character</span>
              <select
                value={b.character || 'soft'}
                onChange={e => setVal('character', e.target.value)}
                className="text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1.5 py-0.5 focus:outline-none"
              >
                <option value="soft">Soft</option>
                <option value="misty">Misty</option>
                <option value="dreamy">Dreamy</option>
              </select>
            </div>
          </div>
        )
      }
      case 'lensDistortion': {
        const l = data as LensDistortionParams
        return (
          <div className="flex flex-col gap-3 p-3 bg-surface-50 dark:bg-zinc-900/40 rounded-b-md border-x border-b border-border dark:border-zinc-800/80 -mt-1.5 mb-2 text-xs">
            <Slider
              label="Amount"
              value={l.amount ?? 0}
              min={-1.0}
              max={1.0}
              step={0.01}
              onChange={v => setVal('amount', v)}
              onChangeEnd={setValEnd}
            />
          </div>
        )
      }
      case 'lightLeak': {
        const ll = data as LightLeakParams
        const posX = ll.position?.[0] ?? 0.0
        const posY = ll.position?.[1] ?? 0.0
        return (
          <div className="flex flex-col gap-3 p-3 bg-surface-50 dark:bg-zinc-900/40 rounded-b-md border-x border-b border-border dark:border-zinc-800/80 -mt-1.5 mb-2 text-xs">
            <div className="flex flex-col gap-1 mb-1">
              <span className="font-medium text-text-secondary dark:text-zinc-400">Texture File</span>
              <input
                type="text"
                value={ll.textureFile || ''}
                onChange={e => setVal('textureFile', e.target.value || null)}
                placeholder="e.g. presets/kodak-portra-400/leak.png"
                className="w-full text-[11px] bg-white dark:bg-zinc-850 border border-border dark:border-zinc-700 rounded px-2 py-1 focus:outline-none focus:border-text-primary"
              />
            </div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-medium text-text-secondary dark:text-zinc-400">Leak Color</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={ll.color || '#FFA050'}
                  onChange={e => setVal('color', e.target.value)}
                  className="w-5 h-5 border border-border rounded cursor-pointer p-0 bg-transparent"
                />
                <input
                  type="text"
                  value={ll.color || '#FFA050'}
                  onChange={e => setVal('color', e.target.value)}
                  className="w-16 text-[10px] text-center bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded py-0.5 focus:outline-none"
                />
              </div>
            </div>
            <Slider
              label="Color Strength"
              value={ll.colorStrength ?? 0.5}
              min={0.0}
              max={1.0}
              step={0.02}
              onChange={v => setVal('colorStrength', v)}
              onChangeEnd={setValEnd}
            />
            <Slider
              label="Position X"
              value={posX}
              min={-1.0}
              max={1.0}
              step={0.02}
              onChange={v => setVal('position', [v, posY])}
              onChangeEnd={setValEnd}
            />
            <Slider
              label="Position Y"
              value={posY}
              min={-1.0}
              max={1.0}
              step={0.02}
              onChange={v => setVal('position', [posX, v])}
              onChangeEnd={setValEnd}
            />
            <Slider
              label="Opacity"
              value={ll.opacity ?? 0.5}
              min={0.0}
              max={1.0}
              step={0.01}
              onChange={v => setVal('opacity', v)}
              onChangeEnd={setValEnd}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-text-secondary dark:text-zinc-400">Blend Mode</span>
              <select
                value={ll.blendMode || 'screen'}
                onChange={e => setVal('blendMode', e.target.value)}
                className="text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1.5 py-0.5 focus:outline-none"
              >
                <option value="screen">Screen</option>
                <option value="add">Add</option>
                <option value="overlay">Overlay</option>
              </select>
            </div>
          </div>
        )
      }
      case 'dustScratches': {
        const d = data as DustScratchesParams
        return (
          <div className="flex flex-col gap-3 p-3 bg-surface-50 dark:bg-zinc-900/40 rounded-b-md border-x border-b border-border dark:border-zinc-800/80 -mt-1.5 mb-2 text-xs">
            <div className="flex flex-col gap-1 mb-1">
              <span className="font-medium text-text-secondary dark:text-zinc-400">Texture File</span>
              <input
                type="text"
                value={d.textureFile || ''}
                onChange={e => setVal('textureFile', e.target.value || null)}
                placeholder="e.g. presets/kodak-portra-400/dust.png"
                className="w-full text-[11px] bg-white dark:bg-zinc-850 border border-border dark:border-zinc-700 rounded px-2 py-1 focus:outline-none focus:border-text-primary"
              />
            </div>
            <Slider
              label="Opacity"
              value={d.opacity ?? 0.3}
              min={0.0}
              max={1.0}
              step={0.01}
              onChange={v => setVal('opacity', v)}
              onChangeEnd={setValEnd}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-text-secondary dark:text-zinc-400">Blend Mode</span>
              <select
                value={d.blendMode || 'screen'}
                onChange={e => setVal('blendMode', e.target.value)}
                className="text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1.5 py-0.5 focus:outline-none"
              >
                <option value="screen">Screen</option>
                <option value="overlay">Overlay</option>
                <option value="soft-light">Soft Light</option>
              </select>
            </div>
          </div>
        )
      }
      case 'border': {
        const br = data as BorderParams
        return (
          <div className="flex flex-col gap-3 p-3 bg-surface-50 dark:bg-zinc-900/40 rounded-b-md border-x border-b border-border dark:border-zinc-800/80 -mt-1.5 mb-2 text-xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-medium text-text-secondary dark:text-zinc-400">Type</span>
              <select
                value={br.type || ''}
                onChange={e => setVal('type', e.target.value || null)}
                className="text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1.5 py-0.5 focus:outline-none"
              >
                <option value="">Solid Color</option>
                <option value="texture">Texture</option>
              </select>
            </div>
            {br.type === 'texture' && (
              <div className="flex flex-col gap-1 mb-1">
                <span className="font-medium text-text-secondary dark:text-zinc-400">Texture File</span>
                <input
                  type="text"
                  value={br.textureFile || ''}
                  onChange={e => setVal('textureFile', e.target.value || null)}
                  placeholder="e.g. presets/kodak-portra-400/border.png"
                  className="w-full text-[11px] bg-white dark:bg-zinc-850 border border-border dark:border-zinc-700 rounded px-2 py-1 focus:outline-none focus:border-text-primary"
                />
              </div>
            )}
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-medium text-text-secondary dark:text-zinc-400">Border Color</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={br.color || '#FFFFFF'}
                  onChange={e => setVal('color', e.target.value)}
                  className="w-5 h-5 border border-border rounded cursor-pointer p-0 bg-transparent"
                />
                <input
                  type="text"
                  value={br.color || '#FFFFFF'}
                  onChange={e => setVal('color', e.target.value)}
                  className="w-16 text-[10px] text-center bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded py-0.5 focus:outline-none"
                />
              </div>
            </div>
            <Slider
              label="Width"
              value={br.width ?? 0.04}
              min={0.0}
              max={0.2}
              step={0.005}
              onChange={v => setVal('width', v)}
              onChangeEnd={setValEnd}
            />
            <Slider
              label="Bottom Weight"
              value={br.bottomWeight ?? 1.0}
              min={1.0}
              max={2.0}
              step={0.02}
              onChange={v => setVal('bottomWeight', v)}
              onChangeEnd={setValEnd}
            />
            <Slider
              label="Corner Radius"
              value={br.cornerRadius ?? 0.0}
              min={0.0}
              max={0.1}
              step={0.005}
              onChange={v => setVal('cornerRadius', v)}
              onChangeEnd={setValEnd}
            />
            <div className="flex items-center justify-between py-1">
              <span className="font-medium text-text-secondary dark:text-zinc-400">Expand Canvas</span>
              <input
                type="checkbox"
                checked={br.expandCanvas ?? false}
                onChange={e => setVal('expandCanvas', e.target.checked)}
                className="rounded border-border dark:border-zinc-700 text-text-primary focus:ring-text-primary h-3.5 w-3.5"
              />
            </div>
          </div>
        )
      }
      case 'blur': {
        const bl = data as any
        return (
          <div className="flex flex-col gap-3 p-3 bg-surface-50 dark:bg-zinc-900/40 rounded-b-md border-x border-b border-border dark:border-zinc-800/80 -mt-1.5 mb-2 text-xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-medium text-text-secondary dark:text-zinc-400">Blur Type</span>
              <select
                value={bl.type || 'gaussian'}
                onChange={e => setVal('type', e.target.value)}
                className="text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-1.5 py-0.5 focus:outline-none"
              >
                <option value="gaussian">Gaussian</option>
                <option value="lens">Lens Blur</option>
                <option value="zoom">Zoom Blur</option>
              </select>
            </div>
            <Slider
              label="Radius"
              value={bl.radius ?? 20}
              min={0}
              max={100}
              step={1}
              onChange={v => setVal('radius', v)}
              onChangeEnd={setValEnd}
            />
          </div>
        )
      }
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col pt-2.5 px-4 pb-4 gap-3 mb-2 max-h-[85vh] overflow-y-auto">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-text-muted dark:text-zinc-500 uppercase tracking-wider">
          {isAdmin ? 'Preset Editor' : 'Preset Effects'}
        </span>
        {isAdmin && preset.id === 'new-preset' && (
          <span className="text-[9px] bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
            NEW PRESET
          </span>
        )}
      </div>
      <div className="h-px w-full bg-border dark:bg-zinc-800/80" />

      {/* Admin Metadata Panel */}
      {isAdmin && (
        <div className="border border-border dark:border-zinc-800/80 rounded-md overflow-hidden bg-surface-50/50 dark:bg-zinc-900/10">
          <button
            type="button"
            onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-text-secondary dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <span>Preset Metadata</span>
            <svg
              className={`w-3.5 h-3.5 text-text-muted transition-transform duration-150 ${isMetadataExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isMetadataExpanded && (
            <div className="p-3 border-t border-border dark:border-zinc-800/80 flex flex-col gap-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-text-secondary dark:text-zinc-400">Preset ID Slug</span>
                <input
                  type="text"
                  disabled={preset.id !== 'new-preset'}
                  value={metadata.id}
                  onChange={e => handleMetadataChange('id', e.target.value)}
                  placeholder="e.g. kodak-gold-200"
                  className="w-full text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 disabled:opacity-55 disabled:cursor-not-allowed rounded px-2.5 py-1.5 focus:outline-none focus:border-text-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-medium text-text-secondary dark:text-zinc-400">Name</span>
                <input
                  type="text"
                  value={metadata.name}
                  onChange={e => handleMetadataChange('name', e.target.value)}
                  placeholder="e.g. Kodak Gold 200"
                  className="w-full text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-text-secondary dark:text-zinc-400">Category</span>
                  <select
                    value={metadata.category}
                    onChange={e => handleMetadataChange('category', e.target.value as PresetCategory)}
                    className="w-full text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-2 py-1.5 focus:outline-none"
                  >
                    <option value="film-stock">Film Stock</option>
                    <option value="mood">Mood</option>
                    <option value="era">Era</option>
                    <option value="cinematic">Cinematic</option>
                    <option value="editorial">Editorial</option>
                    <option value="aesthetic">Aesthetic</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-medium text-text-secondary dark:text-zinc-400">Pack</span>
                  <select
                    value={metadata.pack}
                    onChange={e => handleMetadataChange('pack', e.target.value)}
                    className="w-full text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-2 py-1.5 focus:outline-none"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="community">Community</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-medium text-text-secondary dark:text-zinc-400">Accent Color (Hex)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={metadata.accentColor}
                    onChange={e => handleMetadataChange('accentColor', e.target.value)}
                    className="w-6 h-6 border border-border rounded cursor-pointer p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={metadata.accentColor}
                    onChange={e => handleMetadataChange('accentColor', e.target.value)}
                    className="w-full text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-text-primary"
                  />
                </div>
              </div>

              <Slider
                label="Thumb Crop Hint"
                value={metadata.thumbnailCropHint}
                min={0}
                max={1.0}
                step={0.05}
                onChange={v => handleMetadataChange('thumbnailCropHint', v)}
              />

              <div className="flex flex-col gap-1">
                <span className="font-medium text-text-secondary dark:text-zinc-400">Tags (comma separated)</span>
                <input
                  type="text"
                  value={metadata.tags}
                  onChange={e => handleMetadataChange('tags', e.target.value)}
                  placeholder="e.g. film, gold, warm"
                  className="w-full text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-2.5 py-1.5 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-medium text-text-secondary dark:text-zinc-400">Pairs With (preset IDs)</span>
                <input
                  type="text"
                  value={metadata.pairsWith}
                  onChange={e => handleMetadataChange('pairsWith', e.target.value)}
                  placeholder="e.g. teal-orange"
                  className="w-full text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-2.5 py-1.5 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-medium text-text-secondary dark:text-zinc-400">Mood Tags</span>
                <input
                  type="text"
                  value={metadata.moodTags}
                  onChange={e => handleMetadataChange('moodTags', e.target.value)}
                  placeholder="e.g. vintage, nostalgia"
                  className="w-full text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-2.5 py-1.5 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-medium text-text-secondary dark:text-zinc-400">Best For</span>
                <input
                  type="text"
                  value={metadata.bestFor}
                  onChange={e => handleMetadataChange('bestFor', e.target.value)}
                  placeholder="e.g. portrait, sunset"
                  className="w-full text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-2.5 py-1.5 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* LUT selection dropdown */}
      {isAdmin && (
        <div className="flex flex-col gap-3 p-3 border border-border dark:border-zinc-800/80 rounded-md bg-surface-50/50 dark:bg-zinc-900/10 text-xs">
          <div className="flex flex-col gap-1">
            <span className="font-medium text-text-secondary dark:text-zinc-400">LUT File</span>
            <select
              value={preset.lutFile || ''}
              onChange={e => {
                const file = e.target.value || null
                updatePresetInMemory(preset.id, { lutFile: file })
                markActiveImageDirty()
              }}
              className="w-full text-[11.5px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-text-primary"
            >
              <option value="">None (No LUT)</option>
              {lutFiles.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <Slider
            label="LUT Baked Intensity"
            value={Math.round((preset.lutIntensity ?? 1.0) * 100)}
            min={0}
            max={100}
            unit="%"
            onChange={v => {
              updatePresetInMemory(preset.id, { lutIntensity: v / 100 })
              markActiveImageDirty()
            }}
          />
        </div>
      )}

      {/* Normal user Intensity slider */}
      <Slider
        label="Preset Intensity"
        value={Math.round(intensityPct * 10) / 10}
        min={0}
        max={100}
        step={0.1}
        unit=""
        onChange={v => {
          setPresetIntensity(v / 100)
          markActiveImageDirty()
        }}
        onChangeEnd={() => {
          pushHistory()
        }}
      />

      {/* Effects list */}
      {keys.length > 0 && (
        <div className="flex flex-col gap-1.5 sm:gap-2">
          {keys.map((key) => {
            const block = filterParams[key]
            const enabled = !!(block as any)?.enabled
            const isExpanded = expandedEffect === key
            
            return (
              <div key={String(key)} className="flex flex-col">
                <PresetEffectCard
                  label={EFFECT_LABEL[key]}
                  enabled={enabled}
                  valueText={formatPresetEffectValue(key, block)}
                  onToggle={() => setEnabled(key, !enabled)}
                  onHeaderClick={() => setExpandedEffect(isExpanded ? null : key)}
                  isExpanded={isExpanded}
                  isAdmin={isAdmin}
                />
                {isAdmin && isExpanded && renderEffectDrawer(key)}
              </div>
            )
          })}
        </div>
      )}

      {/* Save Action Buttons (Admins only) */}
      {isAdmin && (
        <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-border dark:border-zinc-800/80">
          {saveStatus && (
            <div
              className={`p-2.5 rounded text-xs text-center border font-medium ${
                saveStatus.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:text-emerald-400'
                  : 'bg-red-500/10 text-red-500 border-red-500/20 dark:text-red-400'
              }`}
            >
              {saveStatus.message}
            </div>
          )}

          {preset.id === 'new-preset' ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isSaving || !metadata.id}
                onClick={() => handleSave(metadata.id, true)}
                className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-text-primary dark:bg-zinc-100 dark:text-zinc-900 rounded hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isSaving ? 'Saving...' : 'Save Preset'}
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  selectEditPreset('', { presetId: null })
                  selectPreset(null)
                  markActiveImageDirty()
                }}
                className="py-2 px-3 text-xs font-medium border border-border dark:border-zinc-700/85 rounded hover:bg-black/5 dark:hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSave(preset.id, false)}
                  className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-text-primary dark:bg-zinc-100 dark:text-zinc-900 rounded hover:opacity-85 disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {isSaving ? 'Saving...' : 'Save (Overwrite)'}
                </button>
                <button
                  type="button"
                  disabled={isSaving || showSaveAsNewInline}
                  onClick={() => setShowSaveAsNewInline(true)}
                  className="py-2 px-3 text-xs font-medium border border-border dark:border-zinc-700/85 rounded hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Save As New
                </button>
              </div>

              {showSaveAsNewInline && (
                <div className="flex flex-col gap-2 p-2.5 border border-border dark:border-zinc-800 rounded bg-surface-50/50 dark:bg-zinc-900/10 mt-1">
                  <span className="text-[10px] font-semibold text-text-secondary dark:text-zinc-400">New Preset ID Slug</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPresetSlug}
                      onChange={e => setNewPresetSlug(e.target.value)}
                      placeholder="e.g. warm-portrait"
                      className="flex-1 text-[11px] bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded px-2 py-1 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={isSaving || !newPresetSlug.trim()}
                      onClick={() => handleSave(newPresetSlug, true)}
                      className="py-1 px-2.5 text-[11px] font-semibold text-white bg-text-primary dark:bg-zinc-100 dark:text-zinc-900 rounded disabled:opacity-40"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSaveAsNewInline(false)
                        setNewPresetSlug('')
                      }}
                      className="py-1 px-2 text-[11px] font-medium border border-border dark:border-zinc-700 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
