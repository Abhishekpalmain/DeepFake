interface ConfidenceMeterProps {
  confidence: number
  label: 'authentic' | 'uncertain' | 'fake'
}

const labels = { authentic: 'Authentic', uncertain: 'Uncertain', fake: 'Fake' }
const icons = { authentic: '✓', uncertain: '~', fake: '✕' }

export default function ConfidenceMeter({ confidence, label }: ConfidenceMeterProps) {
  const pct = Math.round(confidence * 100)

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="meter-label">Confidence Score</div>

      {/* Big SVG arc */}
      <svg viewBox="0 0 120 80" width="200" height="133" style={{ margin: '0 auto', display: 'block' }}>
        {/* grey track */}
        <path
          d="M 15 70 A 55 55 0 0 1 105 70"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* coloured fill */}
        <ArcFill pct={pct} label={label} />
        {/* centre text */}
        <text x="60" y="68" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--color-text-primary)">
          {pct}%
        </text>
      </svg>

      <div style={{ marginTop: 12 }}>
        <span className={`verdict ${label}`}>
          <span>{icons[label]}</span>
          {labels[label]}
        </span>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="progress-bar">
          <div
            className={`progress-bar__fill ${label}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4
        }}>
          <span>0%</span>
          <span>40%</span>
          <span>70%</span>
          <span>100%</span>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2
        }}>
          <span style={{ color: 'var(--color-authentic)', fontWeight: 600 }}>Authentic</span>
          <span style={{ color: 'var(--color-uncertain)', fontWeight: 600 }}>Uncertain</span>
          <span style={{ color: 'var(--color-fake)', fontWeight: 600 }}>Fake</span>
        </div>
      </div>
    </div>
  )
}

function ArcFill({ pct, label }: { pct: number; label: string }) {
  // Arc from 180° to (180 - 180*pct/100)° on a 55px radius semicircle
  const angle = Math.PI * (1 - pct / 100)  // from left (π) to right (0)
  const startX = 60 + 55 * Math.cos(Math.PI)  // 5
  const startY = 70 + 55 * Math.sin(Math.PI)  // 70
  const endX = 60 + 55 * Math.cos(angle)
  const endY = 70 + 55 * Math.sin(angle)
  const largeArc = pct > 50 ? 1 : 0

  const colorMap: Record<string, string> = {
    authentic: '#16a34a',
    uncertain: '#d97706',
    fake: '#dc2626',
  }
  const color = colorMap[label] || '#9ca3af'

  if (pct === 0) return null
  return (
    <path
      d={`M ${startX} ${startY} A 55 55 0 ${largeArc} 1 ${endX} ${endY}`}
      fill="none"
      stroke={color}
      strokeWidth="10"
      strokeLinecap="round"
    />
  )
}
