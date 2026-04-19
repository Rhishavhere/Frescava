import { useCallback } from 'react'
import { useEditStore } from '../../store/editStore'
import { useUIStore } from '../../store/uiStore'

export default function DropZone() {
  const { loadImage } = useEditStore()
  const { setIsLoadingImage } = useUIStore()

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setIsLoadingImage(true)
    
    try {
      // In Electron, File objects have a 'path' property
      const filePath = (file as any).path
      if (filePath) {
        const result = await window.frame.file.load(filePath)
        loadImage(result.path, result.width, result.height, result.dataURL)
      } else {
        console.error('File path not available')
      }
    } catch (e) {
      console.error('Failed to load dropped file:', e)
    } finally {
      setIsLoadingImage(false)
    }
  }, [loadImage, setIsLoadingImage])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
    e.currentTarget.classList.remove('bg-accent-light', 'border-accent')
  }, [handleFile])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('bg-accent-light', 'border-accent')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-accent-light', 'border-accent')
  }

  const handleClick = async () => {
    const result = await window.frame.file.open()
    if (!result) return
    setIsLoadingImage(true)
    loadImage(result.path, result.width, result.height, result.dataURL)
    setIsLoadingImage(false)
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center cursor-pointer transition-colors duration-150"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <div className="text-center pointer-events-none select-none max-w-xs">
        {/* Icon */}
        <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-surface-100 border border-dashed border-surface-400 flex items-center justify-center">
          <svg className="w-7 h-7 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
        </div>

        <p className="text-sm font-semibold text-text-primary mb-1">
          Drop a photo here
        </p>
        <p className="text-xs text-text-muted mb-4">
          or click to browse — JPEG, PNG supported
        </p>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-text-primary text-white text-xs font-medium">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Open Photo
        </div>
      </div>
    </div>
  )
}
