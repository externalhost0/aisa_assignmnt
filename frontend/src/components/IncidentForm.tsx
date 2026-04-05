import { useState } from 'react'
import {
  Textarea, Button, Group, Stack, Paper, Text, TextInput,
  Select, Alert, Loader, Badge,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { AlertTriangle, Sparkles } from 'lucide-react'
import { api } from '../api/client'
import { PriorityBadge } from './PriorityBadge'
import type { ClassifyResponse, Priority, IncidentType } from '../types/incident'

const TYPE_OPTIONS = [
  { value: 'medical', label: 'Medical' },
  { value: 'noise', label: 'Noise' },
  { value: 'security', label: 'Security' },
  { value: 'fire', label: 'Fire' },
  { value: 'other', label: 'Other' },
]

const PRIORITY_OPTIONS = [
  { value: '1', label: 'High — Critical' },
  { value: '2', label: 'Medium — Moderate' },
  { value: '3', label: 'Low' },
]

interface Props {
  campusId: number
  onSaved: () => void
}

export function IncidentForm({ campusId, onSaved }: Props) {
  const [description, setDescription] = useState('')
  const [classifying, setClassifying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<ClassifyResponse | null>(null)

  // Editable fields after classification
  const [editType, setEditType] = useState<string>('')
  const [editPriority, setEditPriority] = useState<string>('')
  const [editLocation, setEditLocation] = useState('')
  const [editPeople, setEditPeople] = useState('')

  const handleAnalyze = async () => {
    if (description.trim().length < 5) return
    setClassifying(true)
    try {
      const result = await api.classify(description.trim(), campusId)
      setPreview(result)
      setEditType(result.type)
      setEditPriority(String(result.priority))
      setEditLocation(result.location ?? '')
      setEditPeople(result.people_involved ?? '')
    } catch {
      notifications.show({
        color: 'red',
        title: 'Classification failed',
        message: 'Could not reach the AI service. Check that the backend is running.',
      })
    } finally {
      setClassifying(false)
    }
  }

  const handleSave = async () => {
    if (!preview) return
    setSaving(true)
    try {
      await api.createIncident({
        campus_id: campusId,
        raw_description: description.trim(),
        type: editType as IncidentType,
        priority: parseInt(editPriority) as Priority,
        priority_reason: preview.priority_reason,
        location: editLocation || null,
        people_involved: editPeople || null,
        status: 'open',
        pattern_flag: preview.pattern_flag,
        ai_classification_raw: preview as unknown as Record<string, unknown>,
      })
      notifications.show({
        color: 'green',
        title: 'Incident saved',
        message: `${editType} incident logged as ${editPriority === '1' ? 'High' : editPriority === '2' ? 'Medium' : 'Low'} priority`,
      })
      // Reset form
      setDescription('')
      setPreview(null)
      setEditType('')
      setEditPriority('')
      setEditLocation('')
      setEditPeople('')
      onSaved()
    } catch {
      notifications.show({
        color: 'red',
        title: 'Save failed',
        message: 'Could not save the incident. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack gap="md">
      <Textarea
        label="Incident Description"
        description="Describe what's happening in plain language. AI will classify and prioritize it."
        placeholder="e.g. Student collapsed outside the library, unresponsive, EMS called"
        minRows={4}
        value={description}
        onChange={e => setDescription(e.currentTarget.value)}
        disabled={classifying || saving}
      />

      {!preview && (
        <Group>
          <Button
            leftSection={classifying ? <Loader size={14} color="white" /> : <Sparkles size={14} />}
            onClick={handleAnalyze}
            disabled={description.trim().length < 5 || classifying}
            loading={classifying}
          >
            Analyze Report
          </Button>
        </Group>
      )}

      {preview && (
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={600} size="sm">AI Classification — review and edit before saving</Text>
              <PriorityBadge priority={parseInt(editPriority) as Priority} />
            </Group>

            <Text size="xs" c="dimmed" fs="italic">"{preview.priority_reason}"</Text>

            {preview.pattern_flag && (
              <Alert icon={<AlertTriangle size={16} />} color="yellow" variant="light" p="xs">
                <Text size="xs">{preview.pattern_flag}</Text>
              </Alert>
            )}

            <Group grow>
              <Select
                label="Type"
                data={TYPE_OPTIONS}
                value={editType}
                onChange={v => setEditType(v ?? editType)}
              />
              <Select
                label="Priority"
                data={PRIORITY_OPTIONS}
                value={editPriority}
                onChange={v => setEditPriority(v ?? editPriority)}
              />
            </Group>

            <Group grow>
              <TextInput
                label="Location"
                placeholder="Building / area"
                value={editLocation}
                onChange={e => setEditLocation(e.currentTarget.value)}
              />
              <TextInput
                label="People Involved"
                placeholder="Description of people"
                value={editPeople}
                onChange={e => setEditPeople(e.currentTarget.value)}
              />
            </Group>

            <Group mt="xs">
              <Button onClick={handleSave} loading={saving} disabled={saving}>
                Save Incident
              </Button>
              <Button variant="subtle" color="gray" onClick={() => setPreview(null)} disabled={saving}>
                Re-analyze
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}
    </Stack>
  )
}
