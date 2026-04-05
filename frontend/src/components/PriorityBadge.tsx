import { Badge } from '@mantine/core'
import type { Priority } from '../types/incident'

const config: Record<Priority, { color: string; label: string }> = {
  1: { color: 'red', label: 'High' },
  2: { color: 'yellow', label: 'Medium' },
  3: { color: 'green', label: 'Low' },
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { color, label } = config[priority]
  return (
    <Badge color={color} variant="light" size="sm" fw={600}>
      {label}
    </Badge>
  )
}
