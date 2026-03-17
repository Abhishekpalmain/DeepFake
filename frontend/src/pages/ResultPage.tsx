import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, FileText, Download } from 'lucide-react'
import { pollResult, type DetectionResponse } from '../api'
import ConfidenceMeter from '../components/ConfidenceMeter'
import FlaggedRegions from '../components/FlaggedRegions'

function formatDate(d: string) {
  return new Date(d).toLocaleString(undefined, {
    dateStyle: 'medium', timeStyle: 'short',
  })
}

function MetaTable({ meta }: { meta: Record<string, unknown> }) {
  const entries = Object.entries(meta).filter(([k]) => k !== 'processing_time')
  if (!entries.length) return null
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Metric</th><th>Value</th></tr>
        </thead>
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {k.replace(/_/g, ' ')}
              </td>
              <td>{String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function downloadJSON(data: DetectionResponse) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `deepfake-report-${data.request_id.slice(0, 8)}.json`
  a.click(); URL.revokeObjectURL(url)
}

export default function ResultPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [result, setResult] = useState<DetectionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    pollResult(id)
      .then(setResult)
      .catch((e: Error) => setError(e.message))
  }, [id])

  if (error) {
    return (
      <main className="page">
        <div className="container">
          <div className="alert error">
            <span>⚠</span>
            <span>{error}</span>
          </div>
          <button className="btn btn--secondary" style={{ marginTop: 16 }} onClick={() => nav('/')}>
            <ArrowLeft size={16} /> Back to Detect
          </button>
        </div>
      </main>
    )
  }

  if (!result) {
    return (
      <main className="page">
        <div className="container">
          <div className="loading-center">
            <div className="spinner" />
            <span>Analysing your file…</span>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', maxWidth: 280, textAlign: 'center' }}>
              This may take up to 30 seconds. Please keep this tab open.
            </p>
          </div>
        </div>
      </main>
    )
  }

  const label = (result.confidence_label || 'uncertain') as 'authentic' | 'uncertain' | 'fake'
  const conf = result.confidence ?? 0

  return (
    <main className="page">
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <button className="btn btn--secondary" onClick={() => nav('/')}>
            <ArrowLeft size={16} /> Back
          </button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="tag">{result.file_type?.toUpperCase() || 'FILE'}</span>
            <button className="btn btn--secondary" onClick={() => downloadJSON(result)}>
              <Download size={15} /> Download Report
            </button>
          </div>
        </div>

        {/* Failed state */}
        {result.status === 'failed' && (
          <div className="card">
            <div className="alert error">
              <span>⚠</span>
              <div><strong>Analysis failed:</strong> {result.message}</div>
            </div>
          </div>
        )}

        {/* Completed */}
        {result.status === 'completed' && (
          <>
            <div className="grid-2">
              {/* Confidence meter */}
              <ConfidenceMeter confidence={conf} label={label} />

              {/* Summary card */}
              <div className="card">
                <div className="card__label">Analysis Summary</div>

                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Row label="Verdict">
                    <span className={`verdict ${label}`}>
                      {label === 'authentic' ? '✓ Authentic' : label === 'fake' ? '✕ Deepfake Detected' : '~ Uncertain'}
                    </span>
                  </Row>
                  <Row label="Confidence">{(conf * 100).toFixed(1)}%</Row>
                  <Row label="File Type">{result.file_type || '—'}</Row>
                  {result.processing_time && (
                    <Row label="Processing Time">
                      <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
                      {result.processing_time.toFixed(2)}s
                    </Row>
                  )}
                  <Row label="Analysed At">{formatDate(result.created_at)}</Row>
                  <Row label="Request ID">
                    <code style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      {result.request_id}
                    </code>
                  </Row>
                </div>

                {/* What does this mean */}
                <div className="alert info" style={{ marginTop: 20 }}>
                  <span>ℹ</span>
                  <span>
                    {label === 'authentic' && 'No significant AI manipulation was detected in this file.'}
                    {label === 'fake' && 'High probability of AI-generated or manipulated content detected.'}
                    {label === 'uncertain' && 'Some anomalies detected. Manual review is recommended.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Flagged regions (images/video) */}
            {result.file_type !== 'audio' && (
              <div style={{ marginTop: 20 }}>
                <FlaggedRegions regions={result.flagged_regions || []} />
              </div>
            )}

            {/* Audio metadata */}
            {result.file_type === 'audio' && result.metadata && (
              <div style={{ marginTop: 20 }} className="card">
                <div className="card__label">
                  <FileText size={14} style={{ display: 'inline', marginRight: 6 }} />
                  Audio Analysis Metadata
                </div>
                <div style={{ marginTop: 12 }}>
                  <MetaTable meta={result.metadata as Record<string, unknown>} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 12,
      paddingBottom: 14,
      borderBottom: '1px solid var(--color-border)',
    }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.9rem', fontWeight: 500, textAlign: 'right' }}>{children}</span>
    </div>
  )
}
