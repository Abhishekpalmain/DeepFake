import { MapPin } from 'lucide-react'

interface Region {
  x: number; y: number; width: number; height: number; label: string
}

export default function FlaggedRegions({ regions }: { regions: Region[] }) {
  if (!regions || regions.length === 0) {
    return (
      <div className="card card--flat" style={{ border: '1px solid var(--color-border)' }}>
        <div className="card__label">Flagged Regions</div>
        <div className="empty-state" style={{ padding: '20px 0' }}>
          <MapPin size={24} />
          <span>No facial regions detected</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card card--flat" style={{ border: '1px solid var(--color-border)' }}>
      <div className="card__label">Flagged Regions ({regions.length})</div>
      <div className="regions-grid" style={{ marginTop: 12 }}>
        {regions.map((r, i) => (
          <div key={i} className="region-item">
            <span className="region-item__label">
              <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />
              {r.label} #{i + 1}
            </span>
            <span className="region-item__coords">
              x:{(r.x * 100).toFixed(1)}% y:{(r.y * 100).toFixed(1)}%
              &nbsp;{(r.width * 100).toFixed(1)}×{(r.height * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 12 }}>
        Coordinates are relative to image dimensions.
      </p>
    </div>
  )
}
