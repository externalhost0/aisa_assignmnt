export type IncidentType = 'medical' | 'noise' | 'security' | 'fire' | 'other'
export type Priority = 1 | 2 | 3
export type Status = 'open' | 'dispatched' | 'resolved'

export interface Campus {
  id: number
  name: string
  settings: {
    categories: string[]
    priority_rules: Record<string, string>
  }
  created_at: string
}

export interface Incident {
  id: number
  campus_id: number
  raw_description: string
  type: IncidentType
  priority: Priority
  priority_reason: string
  location: string | null
  people_involved: string | null
  status: Status
  pattern_flag: string | null
  created_at: string
  updated_at: string
}

export interface ClassifyResponse {
  type: IncidentType
  priority: Priority
  priority_reason: string
  location: string | null
  people_involved: string | null
  pattern_flag: string | null
}

export interface HotspotEntry {
  location: string
  count: number
}

export interface HeatmapCell {
  hour: number
  day: number
  count: number
}
