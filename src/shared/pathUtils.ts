/**
 * Cross-platform path helpers (renderer + any code that deals with file paths as strings).
 * Prefer these over `split('/')` so Windows backslashes are handled.
 */
export function fileBaseName(path: string): string {
  const trimmed = path.replace(/[/\\]+$/, '')
  return trimmed.split(/[/\\]/).pop() ?? ''
}

/** Filename without its last extension (e.g. `holiday_01.jpg` → `holiday_01`). */
export function fileStem(path: string): string {
  const base = fileBaseName(path)
  return base.replace(/\.[^.]+$/, '')
}
