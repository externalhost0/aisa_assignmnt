import { useState, useEffect } from "react";
import {
	AppShell,
	ActionIcon,
	Group,
	Select,
	Tabs,
	Title,
	Container,
	Loader,
	Center,
	Badge,
	useMantineTheme,
	useMantineColorScheme,
	useComputedColorScheme,
} from "@mantine/core";
import { Shield, Sun, Moon } from "lucide-react";
import { api } from "./api/client";
import { useIncidents } from "./hooks/useIncidents";
import { IncidentForm } from "./components/IncidentForm";
import { IncidentBoard } from "./components/IncidentBoard";
import { AnalyticsPanel } from "./components/AnalyticsPanel";
import type { Campus } from "./types/incident";

export default function App() {
	const theme = useMantineTheme();
	const { setColorScheme } = useMantineColorScheme();
	const computedColorScheme = useComputedColorScheme("light");
	const [campuses, setCampuses] = useState<Campus[]>([]);
	const [campusId, setCampusId] = useState<number | null>(null);
	const [activeTab, setActiveTab] = useState<string>("board");

	const { incidents, loading, refetch } = useIncidents(campusId);

	useEffect(() => {
		api.listCampuses().then((data) => {
			setCampuses(data);
			if (data.length > 0) setCampusId(data[0].id);
		});
	}, []);

	const openCount = incidents.filter((i) => i.status === "open").length;

	return (
		<AppShell header={{ height: 56 }} padding="md">
			<AppShell.Header>
				<Group h="100%" px="md" justify="space-between">
					<Group gap="xs">
						<Shield size={20} strokeWidth={2.5} color={theme.colors[theme.primaryColor][6]} />
						<Title order={4} c={theme.primaryColor}>
							Campus Gaurd
						</Title>
					</Group>

					<Group gap="sm">
						{openCount > 0 && (
							<Badge color="red" variant="filled" size="sm">
								{openCount} open
							</Badge>
						)}
						<ActionIcon
							variant="subtle"
							size="sm"
							aria-label="Toggle color scheme"
							onClick={() => setColorScheme(computedColorScheme === "light" ? "dark" : "light")}
						>
							{computedColorScheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
						</ActionIcon>
						<Select
							size="xs"
							placeholder="Select campus"
							data={campuses.map((c) => ({ value: String(c.id), label: c.name }))}
							value={campusId ? String(campusId) : null}
							onChange={(v) => setCampusId(v ? parseInt(v) : null)}
							w={180}
						/>
					</Group>
				</Group>
			</AppShell.Header>

			<AppShell.Main>
				{!campusId ? (
					<Center h="60vh">
						<Loader />
					</Center>
				) : (
					<Container size="xl" py="sm">
						<Tabs value={activeTab} onChange={(v) => setActiveTab(v ?? "board")}>
							<Tabs.List mb="lg">
								<Tabs.Tab value="intake">New Incident</Tabs.Tab>
								<Tabs.Tab value="board">
									Incident Board
									{openCount > 0 && (
										<Badge color="red" size="xs" ml="xs" variant="filled">
											{openCount}
										</Badge>
									)}
								</Tabs.Tab>
								<Tabs.Tab value="analytics">Analytics</Tabs.Tab>
							</Tabs.List>

							<Tabs.Panel value="intake">
								<IncidentForm
									campusId={campusId}
									onSaved={() => {
										refetch();
										setActiveTab("board");
									}}
								/>
							</Tabs.Panel>

							<Tabs.Panel value="board">
								<IncidentBoard
									incidents={incidents}
									loading={loading}
									campusId={campusId}
									onRefresh={refetch}
								/>
							</Tabs.Panel>

							<Tabs.Panel value="analytics">
								<AnalyticsPanel campusId={campusId} />
							</Tabs.Panel>
						</Tabs>
					</Container>
				)}
			</AppShell.Main>
		</AppShell>
	);
}
