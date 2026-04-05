import axios from 'axios'
import type {
  Campus,
  Incident,
  ClassifyResponse,
  HotspotEntry,
  HeatmapCell,
} from '../types/incident'

const http = axios.create({ baseURL: '/api' })

export const api = {
  // Campuses
  listCampuses: () =>
    http.get<Campus[]>('/campuses').then(r => r.data),

  // Incidents
  listIncidents: (params?: Record<string, string | number>) =>
    http.get<Incident[]>('/incidents', { params }).then(r => r.data),

  getIncident: (id: number) =>
    http.get<Incident>(`/incidents/${id}`).then(r => r.data),

  createIncident: (body: Omit<Incident, 'id' | 'created_at' | 'updated_at'>) =>
    http.post<Incident>('/incidents', body).then(r => r.data),

  updateIncident: (id: number, patch: Partial<Pick<Incident, 'status' | 'priority' | 'location' | 'type' | 'people_involved' | 'notes'>> & { pinned?: boolean }) =>
    http.patch<Incident>(`/incidents/${id}`, patch).then(r => r.data),

  exportIncidents: (params: Record<string, string | number>) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    window.open(`/api/incidents/export?${qs}`, '_blank')
  },

  // AI
  classify: (description: string, campus_id: number) =>
    http.post<ClassifyResponse>('/classify', { description, campus_id }).then(r => r.data),

  digest: (campus_id: number, hours = 12) =>
    http.post<{ text: string }>('/digest', { campus_id, hours }).then(r => r.data),

  // Analytics
  hotspots: (campus_id: number, days = 7) =>
    http.get<HotspotEntry[]>('/analytics/hotspots', { params: { campus_id, days } }).then(r => r.data),

  heatmap: (campus_id: number, days = 30) =>
    http.get<HeatmapCell[]>('/analytics/heatmap', { params: { campus_id, days } }).then(r => r.data),
}
