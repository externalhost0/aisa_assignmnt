import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Stack, Group, Paper, Text, Button, Loader, Center,
  List, ThemeIcon, Skeleton,
  useMantineTheme,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { BarChart } from '@mantine/charts'
import { MapPin, Zap } from 'lucide-react'
import { api } from '../api/client'
import type { HotspotEntry, HeatmapCell } from '../types/incident'


interface Props {
  campusId: number
}

export function AnalyticsPanel({ campusId }: Props) {
  const [hotspots, setHotspots] = useState<HotspotEntry[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [digest, setDigest] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingDigest, setLoadingDigest] = useState(false);
  const theme = useMantineTheme();

  useEffect(() => {
    setLoadingData(true)
    Promise.all([
      api.hotspots(campusId, 7),
      api.heatmap(campusId, 30),
    ]).then(([h, hm]) => {
      setHotspots(h)
      setHeatmap(hm)
    }).catch(() => {
      notifications.show({ color: 'red', message: 'Failed to load analytics' })
    }).finally(() => setLoadingData(false))
  }, [campusId])

  const handleDigest = async () => {
    setLoadingDigest(true)
    try {
      const { text } = await api.digest(campusId, 12)
      setDigest(text)
    } catch {
      notifications.show({ color: 'red', message: 'Failed to generate digest' })
    } finally {
      setLoadingDigest(false)
    }
  }

  // Build hour-of-day bar chart data (sum across all days)
  const hourData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h.toString().padStart(2, '0')}:00`,
    incidents: heatmap.filter(c => c.hour === h).reduce((s, c) => s + c.count, 0),
  }))

  return (
    <Stack gap="lg">
      <Group align="flex-start" gap="lg">
        {/* Hotspots */}
        <Paper withBorder p="md" radius="md" flex={1}>
          <Text fw={600} mb="sm">Hot Spots (last 7 days)</Text>
          {loadingData ? (
            <Stack gap="xs">{Array(4).fill(0).map((_, i) => <Skeleton key={i} h={20} />)}</Stack>
          ) : hotspots.length === 0 ? (
            <Text c="dimmed" size="sm">No location data yet.</Text>
          ) : (
            <List spacing="xs">
              {hotspots.map(h => (
                <List.Item
                  key={h.location}
                  icon={<ThemeIcon color="red" variant="light" size={20}><MapPin size={12} /></ThemeIcon>}
                >
                  <Group justify="space-between">
                    <Text size="sm">{h.location}</Text>
                    <Text size="sm" fw={600} c="red">{h.count}</Text>
                  </Group>
                </List.Item>
              ))}
            </List>
          )}
        </Paper>

        {/* AI Shift Digest */}
        <Paper withBorder p="md" radius="md" flex={1}>
          <Group justify="space-between" mb="sm">
            <Text fw={600}>Shift Digest (AI)</Text>
            <Button
              size="xs"
              variant="light"
              color="violet"
              leftSection={loadingDigest ? <Loader size={12} /> : <Zap size={12} />}
              onClick={handleDigest}
              disabled={loadingDigest}
            >
              {digest ? 'Regenerate' : 'Generate'}
            </Button>
          </Group>
          {loadingDigest ? (
            <Stack gap="xs">{Array(5).fill(0).map((_, i) => <Skeleton key={i} h={16} />)}</Stack>
          ) : digest ? (
            <div style={{ fontSize: 'var(--mantine-font-size-sm)', lineHeight: 1.6 }}>
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <Text fw={700} size="md" mb={4}>{children}</Text>,
                  h2: ({ children }) => <Text fw={700} size="sm" mb={4} mt={8}>{children}</Text>,
                  h3: ({ children }) => <Text fw={600} size="sm" mb={4} mt={6}>{children}</Text>,
                  p: ({ children }) => <Text size="sm" mb={6}>{children}</Text>,
                  strong: ({ children }) => <Text component="span" fw={600}>{children}</Text>,
                  li: ({ children }) => <Text component="li" size="sm" mb={2} style={{ marginLeft: 16 }}>{children}</Text>,
                }}
              >
                {digest}
              </ReactMarkdown>
            </div>
          ) : (
            <Text c="dimmed" size="sm">Click Generate to get an AI summary of the last 12 hours.</Text>
          )}
        </Paper>
      </Group>

      {/* Hourly Heatmap */}
      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="md">Incidents by Hour of Day (last 30 days)</Text>
        {loadingData ? (
          <Center h={180}><Loader /></Center>
        ) : (
          <div style={{ minWidth: 0 }}>
            <BarChart
              h={180}
              data={hourData}
              dataKey="hour"
              series={[{ name: 'incidents', color: theme.primaryColor }]}
              tickLine="none"
              gridAxis="y"
              barProps={{ radius: 2 }}
            />
          </div>
        )}
      </Paper>
    </Stack>
  )
}
