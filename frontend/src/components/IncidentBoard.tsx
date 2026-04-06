import { useState } from "react";
import {
	Stack,
	Group,
	Select,
	Text,
	Alert,
	Button,
	Badge,
	Table,
	ActionIcon,
	Tooltip,
	Loader,
	Center,
	Switch,
	Modal,
	Textarea,
	TextInput,
} from "@mantine/core";
import { Search, X } from "lucide-react";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { AlertOctagon, Download, CheckCircle, Forward, MessageSquare, Pin, PinOff } from "lucide-react";
import { api } from "../api/client";
import { PriorityBadge } from "./PriorityBadge";
import type { Incident, Status, IncidentType } from "../types/incident";

const TYPE_LABELS: Record<IncidentType, string> = {
	medical: "Medical",
	noise: "Noise",
	security: "Security",
	fire: "Fire",
	other: "Other",
};

const STATUS_NEXT: Record<Status, Status | null> = {
	open: "dispatched",
	dispatched: "resolved",
	resolved: null,
};

const STATUS_COLOR: Record<Status, string> = {
	open: "red",
	dispatched: "blue",
	resolved: "gray",
};

interface Props {
	incidents: Incident[];
	loading: boolean;
	campusId: number;
	onRefresh: () => void;
}

export function IncidentBoard({ incidents, loading, campusId, onRefresh }: Props) {
	const [filterStatus, setFilterStatus] = useState<string | null>(null);
	const [filterType, setFilterType] = useState<string | null>(null);
	const [filterPriority, setFilterPriority] = useState<string | null>(null);
	const [showResolved, setShowResolved] = useState(false);
	const [search, setSearch] = useState("");
	const [updatingId, setUpdatingId] = useState<number | null>(null);
	const [pinningId, setPinningId] = useState<number | null>(null);
	const [pendingResolve, setPendingResolve] = useState<Incident | null>(null);
	const [opened, { open, close }] = useDisclosure(false);
	const [notesTarget, setNotesTarget] = useState<Incident | null>(null);
	const [notesText, setNotesText] = useState("");
	const [savingNotes, setSavingNotes] = useState(false);
	const [notesOpened, { open: openNotes, close: closeNotes }] = useDisclosure(false);

	// Stale P1 alert: open P1 incidents older than 30 min
	const staleP1 = incidents.filter(
		(i) =>
			i.priority === 1 &&
			i.status === "open" &&
			Date.now() - new Date(i.created_at).getTime() > 30 * 60 * 1000,
	);

	const searchLower = search.trim().toLowerCase();
	const filtered = incidents.filter((i) => {
		if (!showResolved && i.status === "resolved") return false;
		if (filterStatus && i.status !== filterStatus) return false;
		if (filterType && i.type !== filterType) return false;
		if (filterPriority && String(i.priority) !== filterPriority) return false;
		if (searchLower) {
			const inLocation = (i.location ?? "").toLowerCase().includes(searchLower);
			const inDescription = i.raw_description.toLowerCase().includes(searchLower);
			if (!inLocation && !inDescription) return false;
		}
		return true;
	});

	const handleTogglePin = async (incident: Incident) => {
		setPinningId(incident.id);
		try {
			await api.updateIncident(incident.id, { pinned: !incident.pinned_at });
			onRefresh();
		} catch {
			notifications.show({ color: "red", message: "Failed to update pin" });
		} finally {
			setPinningId(null);
		}
	};

	const handleAdvanceStatus = async (incident: Incident) => {
		const next = STATUS_NEXT[incident.status];
		if (!next) return;
		if (next === "resolved") {
			setPendingResolve(incident);
			open();
			return;
		}
		setUpdatingId(incident.id);
		try {
			await api.updateIncident(incident.id, { status: next });
			onRefresh();
		} catch {
			notifications.show({ color: "red", message: "Failed to update status" });
		} finally {
			setUpdatingId(null);
		}
	};

	const handleConfirmResolve = async () => {
		if (!pendingResolve) return;
		setUpdatingId(pendingResolve.id);
		try {
			await api.updateIncident(pendingResolve.id, { status: "resolved" });
			onRefresh();
			close();
			setPendingResolve(null);
		} catch {
			notifications.show({ color: "red", message: "Failed to update status" });
			close();
		} finally {
			setUpdatingId(null);
		}
	};

	const handleOpenNotes = (incident: Incident) => {
		setNotesTarget(incident);
		setNotesText(incident.notes ?? "");
		openNotes();
	};

	const handleSaveNotes = async () => {
		if (!notesTarget) return;
		setSavingNotes(true);
		try {
			await api.updateIncident(notesTarget.id, { notes: notesText });
			onRefresh();
			closeNotes();
		} catch {
			notifications.show({ color: "red", message: "Failed to save notes" });
		} finally {
			setSavingNotes(false);
		}
	};

	const rows = filtered.map((inc) => (
		<Table.Tr
			key={inc.id}
			style={{
				opacity: inc.status === "resolved" ? 0.2 : 1,
				background: inc.pinned_at ? "var(--mantine-color-orange-light)" : undefined,
			}}
		>
			<Table.Td>
				<PriorityBadge priority={inc.priority} />
			</Table.Td>
			<Table.Td>
				<Badge
					variant="dot"
					color={STATUS_COLOR[inc.status]}
					size="sm"
					className={inc.status === "open" ? "badge-open-ping" : undefined}
				>
					{inc.status}
				</Badge>
			</Table.Td>
			<Table.Td>{TYPE_LABELS[inc.type]}</Table.Td>
			<Table.Td maw={300}>
				<Text size="sm" lineClamp={2}>
					{inc.raw_description}
				</Text>
				{inc.pattern_flag && (
					<Text size="xs" c="yellow.7" mt={2}>
						⚠ {inc.pattern_flag}
					</Text>
				)}
			</Table.Td>
			<Table.Td>{inc.location ?? "—"}</Table.Td>
			<Table.Td>
				<Text size="xs" c="dimmed">
					{new Date(inc.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
				</Text>
			</Table.Td>
			<Table.Td style={{ textAlign: "center" }}>
				<Group gap={4} justify="center">
					<Group gap={0} justify='space-evenly'>
						<Tooltip label={inc.pinned_at ? "Unpin" : "Pin to top"}>
							<ActionIcon
								variant={inc.pinned_at ? "filled" : "subtle"}
								size="md"
								color="red.6"
								loading={pinningId === inc.id}
								onClick={() => handleTogglePin(inc)}
							>
								{inc.pinned_at ? <PinOff size={15} /> : <Pin size={15} />}
							</ActionIcon>
						</Tooltip>
						<Tooltip label={inc.notes ? "Edit notes" : "Add notes"}>
							<ActionIcon
								variant={inc.notes ? "filled" : "subtle"}
								size="md"
								color="gray"
								onClick={() => handleOpenNotes(inc)}
							>
								<MessageSquare size={15} />
							</ActionIcon>
						</Tooltip>
					</Group>
					{STATUS_NEXT[inc.status] && (
						<Tooltip label={`Mark as ${STATUS_NEXT[inc.status]}`}>
							<ActionIcon
								variant="light"
								size="md"
								color={STATUS_NEXT[inc.status] === "dispatched" ? "blue" : "green"}
								onClick={() => handleAdvanceStatus(inc)}
								loading={updatingId === inc.id}
							>
								{STATUS_NEXT[inc.status] === "dispatched" ? <Forward size={15} /> : <CheckCircle size={15} />}
							</ActionIcon>
						</Tooltip>
					)}
				</Group>
			</Table.Td>
		</Table.Tr>
	));

	return (
		<Stack gap="md">
			<Modal
				opened={opened}
				onClose={close}
				title={<Text fw={700}>Resolve incident?</Text>}
				size="sm"
				centered
			>
				<Text size="sm">
					Mark this {pendingResolve ? TYPE_LABELS[pendingResolve.type] : ""} incident
					{pendingResolve?.location ? ` at ${pendingResolve.location}` : ""} as resolved?{" "}
					<i>This cannot be undone.</i>
				</Text>
				<Group justify="flex-end" mt="md">
					<Button variant="subtle" color="gray" onClick={close}>
						Cancel
					</Button>
					<Button
						color="green"
						loading={pendingResolve ? updatingId === pendingResolve.id : false}
						onClick={handleConfirmResolve}
					>
						Resolve
					</Button>
				</Group>
			</Modal>

			<Modal
				opened={notesOpened}
				onClose={closeNotes}
				title={
					<Text fw={700}>
						Notes -{" "}
						<Text span>
							{notesTarget ? TYPE_LABELS[notesTarget.type] : ""}
							{notesTarget?.location ? ` @ ${notesTarget.location}` : ""}
						</Text>
					</Text>
				}
				size="md"
				centered
			>
				<Textarea
					placeholder="Add dispatcher notes, follow-up actions, or outcomes…"
					minRows={5}
					autosize
					value={notesText}
					onChange={(e) => setNotesText(e.currentTarget.value)}
				/>
				<Group justify="flex-end" mt="md">
					<Button variant="subtle" color="gray" onClick={closeNotes}>
						Cancel
					</Button>
					<Button loading={savingNotes} onClick={handleSaveNotes}>
						Save
					</Button>
				</Group>
			</Modal>

			{staleP1.length > 0 && (
				<Alert
					icon={<AlertOctagon size={16} />}
					color="red"
					title={`${staleP1.length} High priority incident${staleP1.length > 1 ? "s" : ""} open for 30+ minutes`}
				>
					Immediate attention required.
				</Alert>
			)}

			<Group justify="space-between">
				<Group gap="sm">
					<TextInput
						placeholder="Search location or description…"
						size="xs"
						leftSection={<Search size={13} />}
						rightSection={
							search ? (
								<ActionIcon size="xs" variant="subtle" onClick={() => setSearch("")}>
									<X size={12} />
								</ActionIcon>
							) : null
						}
						value={search}
						onChange={(e) => setSearch(e.currentTarget.value)}
						w={220}
					/>
					<Select
						placeholder="All statuses"
						size="xs"
						clearable
						data={["open", "dispatched", "resolved"]}
						value={filterStatus}
						onChange={setFilterStatus}
						w={140}
					/>
					<Select
						placeholder="All types"
						size="xs"
						clearable
						data={Object.entries(TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
						value={filterType}
						onChange={setFilterType}
						w={130}
					/>
					<Select
						placeholder="All priorities"
						size="xs"
						clearable
						data={[
							{ value: "1", label: "High" },
							{ value: "2", label: "Medium" },
							{ value: "3", label: "Low" },
						]}
						value={filterPriority}
						onChange={setFilterPriority}
						w={110}
					/>
					<Switch
						size="xs"
						label="Show resolved"
						checked={showResolved}
						onChange={(e) => setShowResolved(e.currentTarget.checked)}
					/>
				</Group>
				<Group gap="sm">
					<Text size="xs" c="dimmed">
						{filtered.length} incident{filtered.length !== 1 ? "s" : ""}
					</Text>
					<Button
						size="xs"
						variant="light"
						leftSection={<Download size={12} />}
						onClick={() => api.exportIncidents({ campus_id: campusId })}
					>
						Export CSV
					</Button>
				</Group>
			</Group>

			{loading ? (
				<Center h={200}>
					<Loader />
				</Center>
			) : filtered.length === 0 ? (
				<Center h={200}>
					<Text c="dimmed">No incidents match the current filters.</Text>
				</Center>
			) : (
				<Table striped highlightOnHover withTableBorder withColumnBorders>
					<Table.Thead>
						<Table.Tr>
							<Table.Th>Priority</Table.Th>
							<Table.Th>Status</Table.Th>
							<Table.Th>Type</Table.Th>
							<Table.Th>Description</Table.Th>
							<Table.Th>Location</Table.Th>
							<Table.Th>Time</Table.Th>
							<Table.Th style={{ textAlign: "center", width: "1%", whiteSpace: "nowrap" }}>Actions</Table.Th>
						</Table.Tr>
					</Table.Thead>
					<Table.Tbody>{rows}</Table.Tbody>
				</Table>
			)}
		</Stack>
	);
}
