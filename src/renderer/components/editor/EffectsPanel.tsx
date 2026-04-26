import { useState } from 'react'
import { useEditStore } from '../../store/editStore'
import { Toggle, Slider, PanelSection } from '../ui'

export default function EffectsPanel() {
  const { params, setNestedParam, pushHistory } = useEditStore()

  return (
    <div className="flex flex-col divide-y divide-border dark:divide-zinc-800/80 panel-slide-right">
      <FadeSection
        fade={params.fade}
        onChange={(key, v) => setNestedParam('fade', key, v)}
        onChangeEnd={pushHistory}
      />
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
      <BloomSection
        bloom={params.bloom}
        onChange={(key, v) => setNestedParam('bloom', key, v)}
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

// ─── Fade (matte / film rolloff) ─────────────────────────────────────────────
function FadeSection({
  fade, onChange, onChangeEnd
}: { fade: typeof useEditStore['prototype']['params']['fade']; onChange: (k: string, v: unknown) => void; onChangeEnd: () => void }) {
  return (
    <PanelSection>
      <EffectHeader
        label="Fade"
        enabled={fade.enabled}
        onToggle={v => onChange('enabled', v)}
      />
      {fade.enabled && (
        <div className="flex flex-col gap-4 mt-3 panel-slide-right">
          <Slider
            label="Black lift"
            value={Math.round(fade.blackLift * 1000) / 10}
            min={0}
            max={30}
            step={0.5}
            onChange={v => onChange('blackLift', v / 100)}
            onChangeEnd={onChangeEnd}
            unit="%"
          />
          <Slider
            label="White ceiling"
            value={Math.round(fade.whiteCeiling * 1000) / 10}
            min={70}
            max={100}
            step={0.1}
            onChange={v => onChange('whiteCeiling', v / 100)}
            onChangeEnd={onChangeEnd}
            unit="%"
          />
        </div>
      )}
    </PanelSection>
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
            <span className="text-[11px] text-text-muted dark:text-zinc-500 mb-1.5 block">Type</span>
            <div className="flex gap-1.5">
              {(['fine', 'medium', 'coarse', 'film'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => onChange('type', t)}
                  className={`flex-1 py-1 rounded-md text-[10px] font-medium capitalize transition-colors ${
                    grain.type === t
                      ? 'bg-text-primary text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-surface-100 text-text-muted hover:bg-surface-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:bg-zinc-800'
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
                  vignette.shape === s ? 'bg-text-primary text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-surface-100 text-text-muted hover:bg-surface-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:bg-zinc-800'
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
            <span className="text-xs text-text-secondary dark:text-zinc-400 flex-1">Color</span>
            <input
              type="color"
              value={halation.color}
              onChange={e => onChange('color', e.target.value)}
              className="w-8 h-6 rounded border border-border dark:border-zinc-600 cursor-pointer"
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

// ─── Bloom ────────────────────────────────────────────────────────────────────
function BloomSection({
  bloom, onChange, onChangeEnd
}: { bloom: typeof useEditStore['prototype']['params']['bloom']; onChange: (k: string, v: unknown) => void; onChangeEnd: () => void }) {
  return (
    <PanelSection>
      <EffectHeader
        label="Bloom"
        enabled={bloom.enabled}
        onToggle={v => onChange('enabled', v)}
      />
      {bloom.enabled && (
        <div className="flex flex-col gap-4 mt-3 panel-slide-right">
          <div>
            <span className="text-[11px] text-text-muted dark:text-zinc-500 mb-1.5 block">Character</span>
            <div className="flex gap-1.5">
              {(['soft', 'hard'] as const).map(character => (
                <button
                  key={character}
                  onClick={() => onChange('character', character)}
                  className={`flex-1 py-1 rounded-md text-[10px] font-medium capitalize transition-colors ${
                    bloom.character === character
                      ? 'bg-text-primary text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-surface-100 text-text-muted hover:bg-surface-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                >
                  {character}
                </button>
              ))}
            </div>
          </div>
          <Slider label="Intensity" value={Math.round(bloom.intensity * 100)} min={0} max={100}
            onChange={v => onChange('intensity', v / 100)} onChangeEnd={onChangeEnd} unit="%" />
          <Slider label="Radius" value={bloom.radius} min={5} max={80}
            onChange={v => onChange('radius', v)} onChangeEnd={onChangeEnd} />
          <Slider label="Threshold" value={Math.round(bloom.threshold * 100)} min={40} max={100}
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
          <p className="text-[10px] text-text-muted dark:text-zinc-500 mt-1">−  barrel  |  + pincushion</p>
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
      <span className={`text-xs font-semibold transition-colors ${enabled ? 'text-text-primary dark:text-zinc-100' : 'text-text-muted dark:text-zinc-500'}`}>
        {label}
      </span>
      <Toggle checked={enabled} onChange={onToggle} />
    </div>
  )
}
