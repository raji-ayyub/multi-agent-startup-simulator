import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, Clock3, Send } from "lucide-react";
import { toast } from "sonner";

import { createAgentRequest, listActiveAgents, listAgentCatalog, listAgentRequests } from "../services/agentService";
import { useAuthStore } from "../store/authStore";

const defaultDraft = {
  workspace_mode: "simulation",
  agent_type: "",
  title: "",
  notes: "",
};

export default function AgentHub() {
  const { user } = useAuthStore();
  const [catalog, setCatalog] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeAgents, setActiveAgents] = useState([]);
  const [draft, setDraft] = useState(defaultDraft);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedAgent = useMemo(
    () => catalog.find((item) => item.agent_type === draft.agent_type) || null,
    [catalog, draft.agent_type]
  );

  const load = async () => {
    setIsLoading(true);
    try {
      const [catalogData, requestData, activeAgentData] = await Promise.all([
        listAgentCatalog(),
        listAgentRequests(),
        listActiveAgents(),
      ]);
      setCatalog(catalogData);
      setRequests(requestData);
      setActiveAgents(activeAgentData);
      if (!draft.agent_type && catalogData[0]) {
        setDraft((current) => ({
          ...current,
          agent_type: catalogData[0].agent_type,
          workspace_mode: catalogData[0].workspace_mode,
          title: `${catalogData[0].display_name} request`,
        }));
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAgentSelect = (agent) => {
    setDraft((current) => ({
      ...current,
      agent_type: agent.agent_type,
      workspace_mode: agent.workspace_mode,
      title: current.title?.trim() ? current.title : `${agent.display_name} request`,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await createAgentRequest(draft);
      setRequests((current) => [created, ...current]);
      setDraft((current) => ({ ...defaultDraft, agent_type: current.agent_type, workspace_mode: current.workspace_mode }));
      toast.success("Agent request submitted for admin review.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="app-view h-full">
      <div className="mx-auto flex max-w-[1220px] flex-col gap-5">
        <header className="app-banner rounded-2xl border px-6 py-5">
          <p className="app-badge inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
            Approved Agent Access
          </p>
          <h1 className="app-heading mt-3 text-4xl font-semibold">Agent Hub</h1>
          <p className="app-copy mt-2 max-w-3xl text-sm">
            Request governed access to startup-specific copilots. {user?.role === "OPERATOR"
              ? "Operator workflows default to planning and execution support."
              : "Founder workflows default to simulation and market support."}
          </p>
        </header>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="app-card rounded-2xl border p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="app-heading text-lg font-semibold">Available Agents</h2>
              <span className="app-muted text-xs">{catalog.length} listed</span>
            </div>
            {isLoading ? (
              <p className="app-muted text-sm">Loading agent catalog...</p>
            ) : (
              <div className="grid gap-3">
                {catalog.map((agent) => (
                  <button
                    key={agent.agent_type}
                    type="button"
                    onClick={() => handleAgentSelect(agent)}
                    className={`rounded-xl border p-4 text-left transition ${
                      draft.agent_type === agent.agent_type ? "app-badge" : "app-card-subtle hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Bot size={15} />
                      <p className="text-sm font-semibold">{agent.display_name}</p>
                    </div>
                    <p className="app-muted mt-2 text-xs uppercase tracking-[0.18em]">{agent.workspace_mode}</p>
                    <p className="app-copy mt-2 text-sm">{agent.description}</p>
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="app-card-alt rounded-2xl border p-5">
            <h2 className="app-heading text-lg font-semibold">Request Access</h2>
            <p className="app-copy mt-2 text-sm">
              Requests are saved for governance review. Approval is required before the agent can become an active workspace tool.
            </p>
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="app-copy mb-2 block text-xs">Request Title</label>
                <input
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  className="theme-input w-full rounded-lg border px-3 py-2.5"
                  placeholder={selectedAgent ? `${selectedAgent.display_name} request` : "Agent request"}
                  required
                />
              </div>
              <div>
                <label className="app-copy mb-2 block text-xs">Workspace Mode</label>
                <input value={draft.workspace_mode} readOnly className="theme-input w-full rounded-lg border px-3 py-2.5 opacity-75" />
              </div>
              <div>
                <label className="app-copy mb-2 block text-xs">Why do you need this agent?</label>
                <textarea
                  value={draft.notes}
                  onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                  className="theme-input min-h-32 w-full rounded-lg border px-3 py-2.5"
                  placeholder="Describe the startup context, decision pressure, or execution workflow this agent should support."
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !draft.agent_type}
                className="app-primary-btn inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition"
              >
                <Send size={15} />
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          </article>
        </section>

        <article className="app-card rounded-2xl border p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="app-heading text-lg font-semibold">Your Requests</h2>
            <button type="button" onClick={load} className="app-ghost-btn rounded-full border px-3 py-1 text-xs font-semibold">
              Refresh
            </button>
          </div>
          {requests.length === 0 ? (
            <p className="app-muted text-sm">No agent requests yet.</p>
          ) : (
            <div className="grid gap-3">
              {requests.map((request) => (
                <div key={request.request_id} className="app-card-subtle rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{request.title}</p>
                      <p className="app-muted text-xs uppercase tracking-[0.18em]">
                        {request.agent_type} | {request.workspace_mode}
                      </p>
                    </div>
                    <StatusChip status={request.status} />
                  </div>
                  <p className="app-copy mt-3 text-sm">{request.notes || "No notes provided."}</p>
                  {request.admin_notes ? <p className="mt-3 text-xs text-amber-300">Admin note: {request.admin_notes}</p> : null}
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="app-card rounded-2xl border p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="app-heading text-lg font-semibold">Approved Active Agents</h2>
            <span className="app-muted text-xs">{activeAgents.length} active</span>
          </div>
          {activeAgents.length === 0 ? (
            <p className="app-muted text-sm">No approved agents yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {activeAgents.map((agent) => (
                <article key={agent.request_id} className="app-card-subtle rounded-xl border p-4">
                  <p className="text-sm font-semibold">{agent.title}</p>
                  <p className="app-muted mt-1 text-xs uppercase tracking-[0.18em]">
                    {agent.workspace_mode} | {agent.agent_type}
                  </p>
                  <p className="app-copy mt-3 text-sm">{agent.admin_notes || agent.notes || "Approved for use."}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

function StatusChip({ status }) {
  const normalized = String(status || "PENDING").toUpperCase();
  const classes =
    normalized === "APPROVED"
      ? "app-status-success"
      : normalized === "REJECTED"
      ? "app-status-danger"
      : "app-badge";
  const Icon = normalized === "APPROVED" ? CheckCircle2 : Clock3;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${classes}`}>
      <Icon size={12} />
      {normalized}
    </span>
  );
}
