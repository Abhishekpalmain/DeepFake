import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { ShieldCheck, ShieldX, Activity, Clock, ArrowRight } from 'lucide-react'
import { api, type AnalyticsSummary, type RecentDetection } from '../api'



function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon: ReactNode }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="card__label">{label}</div>
          <div className="card__value">{value}</div>
          {sub && <div className="card__desc">{sub}</div>}
        </div>
        <div style={{ color: 'var(--color-accent)', opacity: 0.7 }}>{icon}</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [recent, setRecent] = useState<RecentDetection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const nav = useNavigate()

  useEffect(() => {
    Promise.all([api.getAnalytics(), api.getRecent(10)])
      .then(([s, r]) => { setSummary(s); setRecent(r) })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <main className="page">
        <div className="container">
          <div className="loading-center">
            <div className="spinner" />
            <span>Loading analytics…</span>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="page">
        <div className="container">
          <div className="alert error"><span>⚠</span><span>{error}</span></div>
        </div>
      </main>
    )
  }

  const s = summary!

  // Pie data
  const pieData = [
    { name: 'Deepfakes', value: s.deepfake_count, color: '#dc2626' },
    { name: 'Authentic', value: s.authentic_count, color: '#16a34a' },
    { name: 'Uncertain', value: s.total_detections - s.deepfake_count - s.authentic_count, color: '#d97706' },
  ].filter(d => d.value > 0)

  // Bar chart — by type
  const byType = Object.entries(s.detections_by_type).map(([type, count]) => ({ type, count }))

  return (
    <main className="page">
      <div className="container">
        <div className="page__header">
          <h1 className="page__title">Analytics Dashboard</h1>
          <p className="page__subtitle">Real-time statistics across all detection requests.</p>
        </div>

        {/* Stat cards */}
        <div className="stat-grid" style={{ marginBottom: 28 }}>
          <StatCard label="Total Scans" value={s.total_detections} icon={<Activity size={22} />} />
          <StatCard label="Deepfakes Found" value={s.deepfake_count}
            sub={s.total_detections ? `${((s.deepfake_count / s.total_detections) * 100).toFixed(1)}% of scans` : '—'}
            icon={<ShieldX size={22} />} />
          <StatCard label="Avg. Confidence" value={`${(s.average_confidence * 100).toFixed(1)}%`}
            icon={<ShieldCheck size={22} />} />
          <StatCard label="Avg. Process Time" value={`${s.average_processing_time.toFixed(2)}s`}
            icon={<Clock size={22} />} />
        </div>

        {/* Charts */}
        {s.total_detections > 0 && (
          <div className="grid-2" style={{ marginBottom: 28 }}>
            {/* Pie */}
            <div className="card">
              <div className="section-title">Verdict Distribution</div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(((percent ?? 0)) * 100).toFixed(0)}%`}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar */}
            {byType.length > 0 && (
              <div className="card">
                <div className="section-title">Scans by File Type</div>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byType} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent table */}
        <div className="card">
          <div className="section-title">Recent Detections</div>
          {recent.length === 0 ? (
            <div className="empty-state">
              <ShieldCheck size={28} />
              <span>No detections yet — upload a file to get started.</span>
              <button className="btn btn--primary" style={{ marginTop: 8 }} onClick={() => nav('/')}>
                Go to Detect <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Verdict</th>
                    <th>Confidence</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(r => (
                    <tr key={r.request_id} style={{ cursor: 'pointer' }} onClick={() => nav(`/results/${r.request_id}`)}>
                      <td>
                        <code style={{ fontSize: '0.78rem' }}>{r.request_id.slice(0, 8)}…</code>
                      </td>
                      <td><span className="tag">{r.file_type}</span></td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className={`status-dot ${r.status} ${r.confidence_label || ''}`} />
                          {r.status}
                        </span>
                      </td>
                      <td>
                        {r.confidence_label ? (
                          <span className={`verdict ${r.confidence_label}`} style={{ fontSize: '0.78rem', padding: '3px 10px' }}>
                            {r.confidence_label}
                          </span>
                        ) : '—'}
                      </td>
                      <td>{r.confidence !== undefined ? `${(r.confidence * 100).toFixed(1)}%` : '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <ArrowRight size={14} color="var(--color-text-muted)" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
