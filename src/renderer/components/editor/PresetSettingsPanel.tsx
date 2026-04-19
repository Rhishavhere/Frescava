import { useEditStore } from '../../store/editStore'
import { useSessionStore } from '../../store/tabStore'
import { usePresetStore } from '../../store/presetStore'
import { Slider } from '../ui'

// ─── Tiny toggle component ────────────────────────────────────────────────────

function Toggle({ value, onChange, accent }: { value: boolean; onChange: () => void; accent: string }) {
  return (
    <button
      onClick={onChange}
      title={value ? 'Disable' : 'Enable'}
      style={{
        width: 26, height: 15, borderRadius: 8, border: 'none', cursor: 'pointer', padding: 0,
        background: value ? accent : '#D0D0D0',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2.5, left: value ? 13 : 2.5,
        width: 10, height: 10, borderRadius: '50%', background: '#fff',
        transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      }} />
    </button>
  )
}

// ─── Effect row: labelled toggle + optional intensity slider ──────────────────

function EffectRow({
  label,
  enabled,
  onToggle,
  accent,
  children,
}: {
  label: string
  enabled: boolean
  onToggle: () => void
  accent: string
  children?: React.ReactNode
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-[11px] font-medium text-text-primary">{label}</span>
        <Toggle value={enabled} onChange={onToggle} accent={accent} />
      </div>
      {enabled && children && (
        <div className="px-3 pb-3 flex flex-col gap-2 bg-surface-50">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function PresetSettingsPanel() {
  const { params, setNestedParam, setPresetIntensity } = useEditStore()
  const { markActiveImageDirty } = useSessionStore()
  const { getPresetById } = usePresetStore()

  const preset = params.presetId ? getPresetById(params.presetId) : null

  // Return nothing if no preset is active
  if (!preset) return null

  const accent = preset.ui.accentColor ?? '#555'
  const d = preset.defaults  // shorthand

  const set = (effectKey: keyof typeof params, subKey: string, value: unknown) => {
    setNestedParam(effectKey, subKey, value)
    markActiveImageDirty()
  }

  const toggle = (effectKey: keyof typeof params) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = (params as any)[effectKey]?.enabled ?? false
    set(effectKey, 'enabled', !current)
  }

  return (
    <div className="flex flex-col border-t-2 border-border mt-1">

      {/* ── Section header ── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-50 border-b border-border sticky top-0 z-10">
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: accent }}
        />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          Preset Effects
        </span>
        <span className="ml-auto text-[9px] text-text-muted font-mono truncate max-w-[96px]">
          {preset.name}
        </span>
      </div>

      {/* ── Preset Intensity ── always shown ── */}
      <div className="px-3 py-3 border-b border-border">
        <Slider
          label="Overall Intensity"
          value={Math.round(params.presetIntensity * 100)}
          min={Math.round((preset.ui.intensityMin ?? 0) * 100)}
          max={100}
          onChange={v => {
            setPresetIntensity(v / 100)
            markActiveImageDirty()
          }}
          unit="%"
        />
      </div>

      {/*
        ── Effect rows ──────────────────────────────────────────────────────────
        Each block ONLY renders if preset.defaults has that effect.
        Controls are INTENSITY-ONLY — no structural params (no type, shape, color,
        blendMode, radius, threshold — those are preset-defined and read-only).
      */}

      {/* Fade */}
      {d.fade && (
        <EffectRow label="Fade / Matte" enabled={params.fade.enabled} onToggle={() => toggle('fade')} accent={accent}>
          <Slider label="Black Lift" value={Math.round(params.fade.blackLift * 100)} min={0} max={30}
            onChange={v => set('fade', 'blackLift', v / 100)} unit="%" />
          <Slider label="White Ceiling" value={Math.round(params.fade.whiteCeiling * 100)} min={70} max={100}
            onChange={v => set('fade', 'whiteCeiling', v / 100)} unit="%" />
        </EffectRow>
      )}

      {/* Grain — intensity + size only */}
      {d.grain && (
        <EffectRow label="Grain" enabled={params.grain.enabled} onToggle={() => toggle('grain')} accent={accent}>
          <Slider label="Intensity" value={Math.round(params.grain.intensity * 100)} min={0} max={100}
            onChange={v => set('grain', 'intensity', v / 100)} unit="%" />
          <Slider label="Size" value={Math.round(params.grain.size * 100)} min={50} max={200}
            onChange={v => set('grain', 'size', v / 100)} />
        </EffectRow>
      )}

      {/* Vignette — strength only */}
      {d.vignette && (
        <EffectRow label="Vignette" enabled={params.vignette.enabled} onToggle={() => toggle('vignette')} accent={accent}>
          <Slider label="Strength" value={Math.round(params.vignette.strength * 100)} min={0} max={100}
            onChange={v => set('vignette', 'strength', v / 100)} unit="%" />
        </EffectRow>
      )}

      {/* Halation — intensity only */}
      {d.halation && (
        <EffectRow label="Halation" enabled={params.halation.enabled} onToggle={() => toggle('halation')} accent={accent}>
          <Slider label="Intensity" value={Math.round(params.halation.intensity * 100)} min={0} max={100}
            onChange={v => set('halation', 'intensity', v / 100)} unit="%" />
        </EffectRow>
      )}

      {/* Chromatic Aberration — amount only */}
      {d.chromaticAberration && (
        <EffectRow label="Chromatic Aberration" enabled={params.chromaticAberration.enabled}
          onToggle={() => toggle('chromaticAberration')} accent={accent}>
          <Slider label="Amount" value={Math.round(params.chromaticAberration.amount)} min={0} max={20}
            onChange={v => set('chromaticAberration', 'amount', v)} />
        </EffectRow>
      )}

      {/* Bloom — intensity only */}
      {d.bloom && (
        <EffectRow label="Bloom" enabled={params.bloom.enabled} onToggle={() => toggle('bloom')} accent={accent}>
          <Slider label="Intensity" value={Math.round(params.bloom.intensity * 100)} min={0} max={100}
            onChange={v => set('bloom', 'intensity', v / 100)} unit="%" />
        </EffectRow>
      )}

      {/* Lens Distortion — amount only */}
      {d.lensDistortion && (
        <EffectRow label="Lens Distortion" enabled={params.lensDistortion.enabled}
          onToggle={() => toggle('lensDistortion')} accent={accent}>
          <Slider label="Amount" value={Math.round(params.lensDistortion.amount * 100)} min={-100} max={100}
            onChange={v => set('lensDistortion', 'amount', v / 100)} />
        </EffectRow>
      )}

      {/* Light Leak — opacity only */}
      {d.lightLeak && (
        <EffectRow label="Light Leak" enabled={params.lightLeak.enabled} onToggle={() => toggle('lightLeak')} accent={accent}>
          {params.lightLeak.textureFile ? (
            <p className="text-[10px] font-mono text-text-muted bg-surface-100 px-2 py-0.5 rounded truncate">
              {params.lightLeak.textureFile}
            </p>
          ) : (
            <p className="text-[10px] text-text-muted italic">No texture file in preset folder</p>
          )}
          <Slider label="Opacity" value={Math.round(params.lightLeak.opacity * 100)} min={0} max={100}
            onChange={v => set('lightLeak', 'opacity', v / 100)} unit="%" />
        </EffectRow>
      )}

      {/* Dust & Scratches — opacity only */}
      {d.dustScratches && (
        <EffectRow label="Dust & Scratches" enabled={params.dustScratches?.enabled ?? false}
          onToggle={() => toggle('dustScratches')} accent={accent}>
          {params.dustScratches?.textureFile ? (
            <p className="text-[10px] font-mono text-text-muted bg-surface-100 px-2 py-0.5 rounded truncate">
              {params.dustScratches.textureFile}
            </p>
          ) : (
            <p className="text-[10px] text-text-muted italic">No texture file in preset folder</p>
          )}
          <Slider label="Opacity" value={Math.round((params.dustScratches?.opacity ?? 0) * 100)} min={0} max={100}
            onChange={v => set('dustScratches', 'opacity', v / 100)} unit="%" />
        </EffectRow>
      )}

      {/* Border — just on/off (structural params are preset-defined) */}
      {d.border && (
        <EffectRow label="Border" enabled={params.border.enabled} onToggle={() => toggle('border')} accent={accent}>
          <Slider label="Width" value={Math.round((params.border.width ?? 0.04) * 200)} min={0} max={60}
            onChange={v => set('border', 'width', v / 200)} />
        </EffectRow>
      )}

      {/* Best-for tags from preset UI metadata */}
      {preset.ui.bestFor && preset.ui.bestFor.length > 0 && (
        <div className="px-3 py-2.5 border-t border-border">
          <p className="text-[9px] uppercase tracking-wider text-text-muted mb-1.5">Best for</p>
          <div className="flex flex-wrap gap-1">
            {preset.ui.bestFor.map(tag => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-sm bg-surface-50 border border-border text-text-muted">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
