import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Plus, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";

import { listActiveAgents } from "../services/agentService";
import { listManagementWorkspaces } from "../services/managementService";
import {
  createCalendarEvent,
  listCalendarEvents,
  suggestCalendarEvents,
  updateCalendarEvent,
} from "../services/platformService";
import { listSimulations } from "../services/simulationService";
import { useAuthStore } from "../store/authStore";

const initialDraft = {
  workspace_id: "",
  simulation_id: "",
  title: "",
  description: "",
  event_type: "TASK",
  priority: "MEDIUM",
  starts_at: "",
  ends_at: "",
};

export default function CalendarPage() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [approvedAgents, setApprovedAgents] = useState([]);
  const [draft, setDraft] = useState(initialDraft);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const pendingEvents = useMemo(
    () => events.filter((item) => item.permission_status === "PENDING"),
    [events]
  );
  const upcomingEvents = useMemo(
    () =>
      [...events]
        .filter((item) => item.permission_status !== "REJECTED")
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [events]
  );

  const load = async () => {
    setIsLoading(true);
    try {
      const [workspaceData, simulationData, eventData, activeAgents] = await Promise.all([
        listManagementWorkspaces(user?.email),
        listSimulations(),
        listCalendarEvents({ limit: 100 }),
        listActiveAgents(),
      ]);
      setWorkspaces(workspaceData);
      setSimulations(simulationData);
      setEvents(eventData);
      setApprovedAgents(activeAgents.filter((item) => item.workspace_mode === "management"));
      setDraft((current) => ({
        ...current,
        workspace_id: current.workspace_id || workspaceData[0]?.workspace_id || "",
        simulation_id: current.simulation_id || simulationData[0]?.simulation_id || "",
      }));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!draft.title || !draft.starts_at) {
      toast.error("Title and start time are required.");
      return;
    }
    setIsSaving(true);
    try {
      const created = await createCalendarEvent({
        ...draft,
        workspace_id: draft.workspace_id || null,
        simulation_id: draft.simulation_id || null,
        starts_at: new Date(draft.starts_at).toISOString(),
        ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null,
      });
      setEvents((current) => [created, ...current]);
      setDraft((current) => ({ ...initialDraft, workspace_id: current.workspace_id, simulation_id: current.simulation_id }));
      toast.success("Calendar item created.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAgentSuggest = async () => {
    if (!draft.workspace_id) {
      toast.error("Select a workspace for agent scheduling.");
      return;
    }
    setIsSuggesting(true);
    try {
      const created = await suggestCalendarEvents({
        workspace_id: draft.workspace_id,
        simulation_id: draft.simulation_id || null,
        prompt: "Suggest the next most important management checkpoints that require user approval before being added.",
      });
      setEvents((current) => [...created, ...current]);
      toast.success("Agent suggestions created. Approve the ones you want to keep.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSuggesting(false);
    }
  };

  const updatePermission = async (eventId, permissionStatus) => {
    try {
      const updated = await updateCalendarEvent(eventId, { permission_status: permissionStatus });
      setEvents((current) => current.map((item) => (item.event_id === eventId ? updated : item)));
      toast.success(`Event ${permissionStatus.toLowerCase()}.`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <section className="app-view h-full">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-5">
        <header className="app-banner rounded-2xl border px-6 py-5">
          <p className="app-badge inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
            Managed Calendar
          </p>
          <h1 className="app-heading mt-3 text-4xl font-semibold">Execution Calendar</h1>
          <p className="app-copy mt-2 max-w-3xl text-sm">
            Create tasks and important events directly, or let approved management agents suggest them first for permission-based approval.
          </p>
        </header>

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="app-card rounded-2xl border p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="app-heading text-lg font-semibold">Add Event</h2>
              <button
                type="button"
                onClick={load}
                className="app-ghost-btn rounded-full border px-3 py-1 text-xs font-semibold"
              >
                Refresh
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <Field label="Workspace">
                <select
                  value={draft.workspace_id}
                  onChange={(event) => setDraft((current) => ({ ...current, workspace_id: event.target.value }))}
                  className="theme-input w-full rounded-lg border px-3 py-2.5"
                >
                  <option value="">Select workspace</option>
                  {workspaces.map((workspace) => (
                    <option key={workspace.workspace_id} value={workspace.workspace_id}>
                      {workspace.workspace_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Related Simulation">
                <select
                  value={draft.simulation_id}
                  onChange={(event) => setDraft((current) => ({ ...current, simulation_id: event.target.value }))}
                  className="theme-input w-full rounded-lg border px-3 py-2.5"
                >
                  <option value="">No linked simulation</option>
                  {simulations.map((simulation) => (
                    <option key={simulation.simulation_id} value={simulation.simulation_id}>
                      {simulation.startup_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Title">
                <input
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  className="theme-input w-full rounded-lg border px-3 py-2.5"
                />
              </Field>
              <Field label="Description">
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  className="theme-input w-full rounded-lg border px-3 py-2.5"
                />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Event Type">
                  <select
                    value={draft.event_type}
                    onChange={(event) => setDraft((current) => ({ ...current, event_type: event.target.value }))}
                    className="theme-input w-full rounded-lg border px-3 py-2.5"
                  >
                    <option value="TASK">Task</option>
                    <option value="MEETING">Meeting</option>
                    <option value="REVIEW">Review</option>
                    <option value="MILESTONE">Milestone</option>
                  </select>
                </Field>
                <Field label="Priority">
                  <select
                    value={draft.priority}
                    onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}
                    className="theme-input w-full rounded-lg border px-3 py-2.5"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </Field>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Starts At">
                  <input
                    type="datetime-local"
                    value={draft.starts_at}
                    onChange={(event) => setDraft((current) => ({ ...current, starts_at: event.target.value }))}
                    className="theme-input w-full rounded-lg border px-3 py-2.5"
                  />
                </Field>
                <Field label="Ends At">
                  <input
                    type="datetime-local"
                    value={draft.ends_at}
                    onChange={(event) => setDraft((current) => ({ ...current, ends_at: event.target.value }))}
                    className="theme-input w-full rounded-lg border px-3 py-2.5"
                  />
                </Field>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="app-primary-btn inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
                >
                  <Plus size={15} />
                  {isSaving ? "Saving..." : "Add Calendar Item"}
                </button>
                <button
                  type="button"
                  onClick={handleAgentSuggest}
                  disabled={isSuggesting}
                  className="app-ghost-btn inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold"
                >
                  <Sparkles size={15} />
                  {isSuggesting ? "Suggesting..." : "Ask Agent Permission First"}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <p className="app-muted text-xs uppercase tracking-[0.16em]">Approved Scheduling Agents</p>
              <div className="mt-3 space-y-2">
                {approvedAgents.length === 0 ? (
                  <p className="app-muted text-sm">No approved management agents for scheduling yet.</p>
                ) : (
                  approvedAgents.map((agent) => (
                    <div key={agent.request_id} className="app-card-subtle rounded-xl border px-3 py-3">
                      <p className="text-sm font-semibold">{agent.title}</p>
                      <p className="app-copy mt-1 text-sm">{agent.admin_notes || agent.notes}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </article>

          <div className="space-y-5">
            <article className="app-card rounded-2xl border p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="app-heading text-lg font-semibold">Permission Queue</h2>
                <span className="app-muted text-xs">{pendingEvents.length} pending</span>
              </div>
              {pendingEvents.length === 0 ? (
                <p className="app-muted text-sm">No pending agent suggestions.</p>
              ) : (
                <div className="space-y-3">
                  {pendingEvents.map((item) => (
                    <article key={item.event_id} className="app-card-subtle rounded-xl border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p className="app-muted text-xs uppercase tracking-[0.16em]">{item.event_type} | {item.priority}</p>
                        </div>
                        <span className="app-badge rounded-full border px-2.5 py-1 text-[11px] font-semibold">{item.source}</span>
                      </div>
                      <p className="app-copy mt-3 text-sm">{item.description}</p>
                      <p className="app-muted mt-2 text-xs">{new Date(item.starts_at).toLocaleString()}</p>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => updatePermission(item.event_id, "APPROVED")}
                          className="app-success-btn inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
                        >
                          <CheckCircle2 size={13} />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => updatePermission(item.event_id, "REJECTED")}
                          className="app-status-danger inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
                        >
                          <XCircle size={13} />
                          Reject
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <article className="app-card rounded-2xl border p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="app-heading text-lg font-semibold">Upcoming Schedule</h2>
                <div className="app-card-subtle inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                  <CalendarDays size={13} />
                  {upcomingEvents.length} items
                </div>
              </div>
              {isLoading ? (
                <p className="app-muted text-sm">Loading calendar...</p>
              ) : upcomingEvents.length === 0 ? (
                <p className="app-muted text-sm">No approved or pending items yet.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((item) => (
                    <article key={item.event_id} className="app-card-subtle rounded-xl border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p className="app-muted text-xs uppercase tracking-[0.16em]">
                            {item.event_type} | {item.priority} | {item.permission_status}
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px]">
                          <Clock3 size={12} />
                          {new Date(item.starts_at).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="app-copy mt-3 text-sm">{item.description || "No description."}</p>
                      <p className="app-muted mt-2 text-xs">
                        {new Date(item.starts_at).toLocaleString()}
                        {item.ends_at ? ` to ${new Date(item.ends_at).toLocaleString()}` : ""}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </div>
        </section>
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="app-copy mb-2 block text-xs">{label}</span>
      {children}
    </label>
  );
}
