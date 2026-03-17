const API_BASE = import.meta.env.VITE_API_URL || '/api'

export interface DetectionResponse {
  request_id: string
  status: 'processing' | 'completed' | 'failed'
  message: string
  confidence?: number
  confidence_label?: 'authentic' | 'uncertain' | 'fake'
  is_deepfake?: boolean
  processing_time?: number
  file_type?: string
  flagged_regions?: Array<{ x: number; y: number; width: number; height: number; label: string }>
  created_at: string
  metadata?: Record<string, unknown>
}

export interface AnalyticsSummary {
  total_detections: number
  successful_detections: number
  failed_detections: number
  average_confidence: number
  deepfake_count: number
  authentic_count: number
  average_processing_time: number
  detections_by_type: Record<string, number>
}

export interface RecentDetection {
  request_id: string
  file_type: string
  confidence?: number
  confidence_label?: string
  is_deepfake?: boolean
  status: string
  created_at: string
}

async function post(path: string, body: FormData): Promise<DetectionResponse> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', body })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  detectImage: (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return post('/v1/detect/image', fd)
  },
  detectVideo: (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return post('/v1/detect/video', fd)
  },
  detectAudio: (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return post('/v1/detect/audio', fd)
  },
  getResult: (id: string) => get<DetectionResponse>(`/v1/results/${id}`),
  getAnalytics: () => get<AnalyticsSummary>('/v1/analytics/summary'),
  getRecent: (limit = 10) => get<RecentDetection[]>(`/v1/recent?limit=${limit}`),
}

/** Poll until status is no longer 'processing', or timeout */
export async function pollResult(id: string, intervalMs = 1500, timeoutMs = 90000): Promise<DetectionResponse> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const result = await api.getResult(id)
    if (result.status !== 'processing') return result
    await new Promise(r => setTimeout(r, intervalMs))
  }
  throw new Error('Detection timed out — please try again.')
}
