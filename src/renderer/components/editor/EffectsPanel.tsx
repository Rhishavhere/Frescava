import { useState } from 'react'
import { useEditStore } from '../../store/editStore'
import { Toggle, Slider, PanelSection } from '../ui'

export default function EffectsPanel() {
  const { params, setNestedParam, pushHistory } = useEditStore()

  return (
    <div className="flex flex-col divide-y divide-border panel-slide-right">
      <GrainSection
        grain={params.grain}
        onChange={(key, v) => setNestedParam('grain', key, v)}
        onChangeEnd={pushHistory}
      />
      <VignetteSection
        vignette={params.vignette}
        onChange={(key, v) => setNestedParam('vignette', key, v)}
        onChangeEnd={pushHistory}
      />
      <HalationSection
        halation={params.halation}
        onChange={(key, v) => setNestedParam('halation', key, v)}
        onChangeEnd={pushHistory}
      />
      <CaSection
        ca={params.chromaticAberration}
        onChange={(key, v) => setNestedParam('chromaticAberration', key, v)}
        onChangeEnd={pushHistory}
      />
      <LensDistSection
        lens={params.lensDistortion}
        onChange={(key, v) => setNestedParam('lensDistortion', key, v)}
        onChangeEnd={pushHistory}
      />
    </div>
  )
}

// ─── Grain ────────────────────────────────────────────────────────────────────
function GrainSection({
  grain, onChange, onChangeEnd
}: { grain: typeof useEditStore['prototype']['params']['grain']; onChange: (k: string, v: unknown) => void; onChangeEnd: () => void }) {
  return (
    <PanelSection>
      <EffectHeader
        label="Film Grain"
        enabled={grain.enabled}
        onToggle={v => onChange('enabled', v)}
      />
      {grain.enabled && (
        <div className="flex flex-col gap-4 mt-3 panel-slide-right">
          {/* Type radio */}
          <div>
            <span className="text-[11px] text-text-muted mb-1.5 block">Type</span>
            <div className="flex gap-1.5">
              {(['fine', 'medium', 'coarse', 'film'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => onChange('type', t)}
                  className={`flex-1 py-1 rounded-md text-[10px] font-medium capitalize transition-colors ${
                    grain.type === t
                      ? 'bg-text-primary text-white'
                      : 'bg-surface-100 text-text-muted hover:bg-surface-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Slider label="Intensity" value={Math.round(grain.intensity * 100)} min={0} max={100}
            onChange={v => onChange('intensity', v / 100)} onChangeEnd={onChangeEnd} unit="%" />
          <Slider label="Size" value={Math.round(grain.size * 100)} min={0} max={100}
            onChange={v => onChange('size', v / 100)} onChangeEnd={onChangeEnd} unit="%" />
        </div>
      )}
    </PanelSection>
  )
}

// ─── Vignette ─────────────────────────────────────────────────────────────────
function VignetteSection({
  vignette, onChange, onChangeEnd
}: { vignette: typeof useEditStore['prototype']['params']['vignette']; onChange: (k: string, v: unknown) => void; onChangeEnd: () => void }) {
  return (
    <PanelSection>
      <EffectHeader
        label="Vignette"
        enabled={vignette.enabled}
        onToggle={v => onChange('enabled', v)}
      />
      {vignette.enabled && (
        <div className="flex flex-col gap-4 mt-3 panel-slide-right">
          <div className="flex gap-1.5">
            {(['oval', 'rect'] as const).map(s => (
              <button key={s} onClick={() => onChange('shape', s)}
                className={`flex-1 py-1 rounded-md text-[10px] font-medium capitalize transition-colors ${
                  vignette.shape === s ? 'bg-text-primary text-white' : 'bg-surface-100 text-text-muted hover:bg-surface-200'
                }`}
              >{s}</button>
            ))}
          </div>
          <Slider label="Strength" value={Math.round(vignette.strength * 100)} min={0} max={100}
            onChange={v => onChange('strength', v / 100)} onChangeEnd={onChangeEnd} unit="%" />
          <Slider label="Feather" value={Math.round(vignette.feather * 100)} min={0} max={100}
            onChange={v => onChange('feather', v / 100)} onChangeEnd={onChangeEnd} unit="%" />
          <Slider label="Midpoint" value={Math.round(vignette.midpoint * 100)} min={30} max={100}
            onChange={v => onChange('midpoint', v / 100)} onChangeEnd={onChangeEnd} unit="%" />
        </div>
      )}
    </PanelSection>
  )
}

// ─── Halation ─────────────────────────────────────────────────────────────────
function HalationSection({
  halation, onChange, onChangeEnd
}: { halation: typeof useEditStore['prototype']['params']['halation']; onChange: (k: string, v: unknown) => void; onChangeEnd: () => void }) {
  return (
    <PanelSection>
      <EffectHeader
        label="Halation / Glow"
        enabled={halation.enabled}
        onToggle={v => onChange('enabled', v)}
      />
      {halation.enabled && (
        <div className="flex flex-col gap-4 mt-3 panel-slide-right">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary flex-1">Color</span>
            <input
              type="color"
              value={halation.color}
              onChange={e => onChange('color', e.target.value)}
              className="w-8 h-6 rounded border border-border cursor-pointer"
            />
          </div>
          <Slider label="Intensity" value={Math.round(halation.intensity * 100)} min={0} max={100}
            onChange={v => onChange('intensity', v / 100)} onChangeEnd={onChangeEnd} unit="%" />
          <Slider label="Radius" value={halation.radius} min={5} max={120}
            onChange={v => onChange('radius', v)} onChangeEnd={onChangeEnd} />
          <Slider label="Threshold" value={Math.round(halation.threshold * 100)} min={40} max={100}
            onChange={v => onChange('threshold', v / 100)} onChangeEnd={onChangeEnd} unit="%" />
        </div>
      )}
    </PanelSection>
  )
}

// ─── Chromatic Aberration ─────────────────────────────────────────────────────
function CaSection({
  ca, onChange, onChangeEnd
}: { ca: typeof useEditStore['prototype']['params']['chromaticAberration']; onChange: (k: string, v: unknown) => void; onChangeEnd: () => void }) {
  return (
    <PanelSection>
      <EffectHeader
        label="Chromatic Aberration"
        enabled={ca.enabled}
        onToggle={v => onChange('enabled', v)}
      />
      {ca.enabled && (
        <div className="mt-3 panel-slide-right">
          <Slider label="Amount" value={ca.amount} min={0} max={20}
            onChange={v => onChange('amount', v)} onChangeEnd={onChangeEnd} />
        </div>
      )}
    </PanelSection>
  )
}

// ─── Lens Distortion ─────────────────────────────────────────────────────────
function LensDistSection({
  lens, onChange, onChangeEnd
}: { lens: typeof useEditStore['prototype']['params']['lensDistortion']; onChange: (k: string, v: unknown) => void; onChangeEnd: () => void }) {
  return (
    <PanelSection>
      <EffectHeader
        label="Lens Distortion"
        enabled={lens.enabled}
        onToggle={v => onChange('enabled', v)}
      />
      {lens.enabled && (
        <div className="mt-3 panel-slide-right">
          <Slider label="Amount" value={Math.round(lens.amount * 100)} min={-100} max={100}
            onChange={v => onChange('amount', v / 100)} onChangeEnd={onChangeEnd} />
          <p className="text-[10px] text-text-muted mt-1">−  barrel  |  + pincushion</p>
        </div>
      )}
    </PanelSection>
  )
}

// ─── Shared header ────────────────────────────────────────────────────────────
function EffectHeader({
  label, enabled, onToggle
}: { label: string; enabled: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs font-semibold transition-colors ${enabled ? 'text-text-primary' : 'text-text-muted'}`}>
        {label}
      </span>
      <Toggle checked={enabled} onChange={onToggle} />
    </div>
  )
}
