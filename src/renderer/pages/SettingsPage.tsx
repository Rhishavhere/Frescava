/**
 * App-wide settings (Home window only). Sections will grow: theme, window, profiles, cloud, user.
 *
 * **Persistence (later):** Use `electron-store` in the main process with thin IPC
 * (get/set) from preload, so preferences survive restarts. For values that must apply in
 * all windows (e.g. theme), main can broadcast to every `BrowserWindow` or use
 * `localStorage` if both windows share the same origin; verify with the packaged
 * `file://` URL. Alternatively post `webContents.send` to all windows when a setting
 * changes so the Editor updates without reload.
 */
export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full w-full p-8 bg-white text-text-primary">
      <h1 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-1">
        Settings
      </h1>
      <p className="text-xs text-text-muted max-w-md leading-relaxed mb-8">
        Theme, window behavior, advanced options, and account—coming in upcoming releases.
      </p>
      <div className="rounded-lg border border-border border-dashed bg-surface-50 px-4 py-8 text-center text-xs text-text-muted">
        Preference panels will be added here.
      </div>
    </div>
  )
}
