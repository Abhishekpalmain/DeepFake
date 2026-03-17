import { useState, useRef, type DragEvent, type ChangeEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, ImageIcon, Film, Music, X } from 'lucide-react'
import { api } from '../api'

type Mode = 'image' | 'video' | 'audio'

const ACCEPT: Record<Mode, string> = {
  image: 'image/jpeg,image/png,image/webp',
  video: 'video/mp4,video/avi,video/quicktime,video/x-msvideo',
  audio: 'audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/mp4',
}

const ICON: Record<Mode, ReactNode> = {
  image: <ImageIcon size={28} />,
  video: <Film size={28} />,
  audio: <Music size={28} />,
}

const HINTS: Record<Mode, string> = {
  image: 'JPG, PNG or WEBP — max 100 MB',
  video: 'MP4, AVI, MOV — max 100 MB',
  audio: 'MP3, WAV, OGG, FLAC — max 100 MB',
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export default function UploadPage() {
  const [mode, setMode] = useState<Mode>('image')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const nav = useNavigate()

  const pick = (f: File) => { setFile(f); setError(null) }
  const clear = () => setFile(null)

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) pick(f)
  }

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) pick(f)
  }

  const submit = async () => {
    if (!file) return
    setLoading(true); setError(null)
    try {
      const detectors = { image: api.detectImage, video: api.detectVideo, audio: api.detectAudio }
      const res = await detectors[mode](file)
      nav(`/results/${res.request_id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <div className="container">
        <div className="page__header">
          <h1 className="page__title">Deepfake Detection</h1>
          <p className="page__subtitle">
            Upload an image, video, or audio file to scan for AI-generated synthetic media.
          </p>
        </div>

        {/* Mode tabs */}
        <div className="tabs">
          {(['image', 'video', 'audio'] as Mode[]).map(m => (
            <button
              key={m}
              className={`tab${mode === m ? ' active' : ''}`}
              onClick={() => { setMode(m); setFile(null); setError(null) }}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <div className="card">
          {/* Drop zone */}
          <div
            className={`upload-zone${dragging ? ' dragover' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <div className="upload-zone__icon">
              {ICON[mode]}
            </div>
            <p className="upload-zone__title">
              {dragging ? 'Drop it here' : `Drop your ${mode} here`}
            </p>
            <p className="upload-zone__subtitle">
              or click to browse — {HINTS[mode]}
            </p>
            <div className="upload-zone__types">
              {ACCEPT[mode].split(',').map(t => (
                <span key={t} className="tag">{t.split('/')[1].toUpperCase()}</span>
              ))}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT[mode]}
              style={{ display: 'none' }}
              onChange={onInput}
            />
          </div>

          {/* File chip */}
          {file && (
            <div className="file-chip">
              {ICON[mode]}
              <span className="file-chip__name">{file.name}</span>
              <span className="file-chip__size">{formatBytes(file.size)}</span>
              <button
                onClick={e => { e.stopPropagation(); clear() }}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="alert error" style={{ marginTop: 16 }}>
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button
              className="btn btn--primary btn--lg"
              disabled={!file || loading}
              onClick={submit}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Analyse {mode}
                </>
              )}
            </button>
            {file && (
              <button className="btn btn--secondary btn--lg" onClick={clear}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Info box */}
        <div className="alert info" style={{ marginTop: 20 }}>
          <span>ℹ</span>
          <div>
            <strong>How it works:</strong> Files are analysed using a combination of computer vision
            (facial inconsistency detection) and audio spectral analysis. Results include a confidence
            score and identified facial regions. Files are deleted immediately after analysis.
          </div>
        </div>
      </div>
    </main>
  )
}
