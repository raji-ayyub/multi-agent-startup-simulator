import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { decideAgentRequest, getAdminOverview, listUsers } from "../../services/agentService";
import { updateAdminUser } from "../../services/platformService";

const roleOptions = ["FOUNDER", "OPERATOR", "ADMIN"];

export default function AdminDashboard() {
  const [searchParams] = useSearchParams();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const activeTab = searchParams.get("tab") || "overview";

  const load = async () => {
    setIsLoading(true);
    try {
      const [overviewData, userData] = await Promise.all([getAdminOverview(), listUsers()]);
      setOverview(overviewData);
      setUsers(userData);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDecision = async (requestId, status) => {
    try {
      await decideAgentRequest(requestId, {
        status,
        admin_notes: status === "APPROVED" ? "Approved for governed startup workspace access." : "Request needs tighter scope before approval.",
      });
      toast.success(`Request ${status.toLowerCase()}.`);
      load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleUserAccessUpdate = async (userId, payload) => {
    try {
      await updateAdminUser(userId, payload);
      toast.success("User access updated.");
      load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const counts = overview?.counts || {};
  const statCards = [
    { key: "total_users", label: "Accounts" },
    { key: "simulations", label: "Simulations" },
    { key: "workspaces", label: "Management Workspaces" },
    { key: "pending_agent_requests", label: "Pending Requests" },
    { key: "approved_agents", label: "Approved Agents" },
    { key: "reports", label: "Reports" },
    { key: "calendar_items", label: "Calendar Items" },
  ];
  const recentRequests = overview?.recent_agent_requests || [];

  return (
    <div className="space-y-5">
      {activeTab === "overview" ? (
      <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => (
          <article key={item.key} className="app-card rounded-2xl border p-5">
            <p className="app-muted text-xs uppercase tracking-[0.18em]">{item.label}</p>
            <p className="app-heading mt-3 text-4xl font-semibold">{isLoading ? "--" : counts[item.key] ?? 0}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="app-card rounded-2xl border p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="app-heading text-lg font-semibold">Approval Snapshot</h2>
            <Link to="/admin/dashboard?tab=approvals" className="app-ghost-btn rounded-full border px-3 py-1 text-xs font-semibold">
              Open Queue
            </Link>
          </div>
          {recentRequests.length ? (
            <div className="space-y-3">
              {recentRequests.slice(0, 4).map((request) => (
                <article key={request.request_id} className="app-card-subtle rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{request.title}</p>
                      <p className="app-muted text-xs">
                        Requested by {request.requester_name || request.requester_email}
                      </p>
                      <p className="app-muted text-xs">
                        {request.requester_email} | {request.requester_role} | {request.workspace_mode}
                      </p>
                    </div>
                    <span className="app-badge rounded-full border px-2.5 py-1 text-[11px] font-semibold">
                      {request.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="app-muted text-sm">No recent requests found.</p>
          )}
        </article>

        <article className="app-card rounded-2xl border p-5">
          <h2 className="app-heading text-lg font-semibold">Access Snapshot</h2>
          <p className="app-copy mt-2 text-sm">Quick visibility into current user inventory and governance load.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <SummaryPill label="Founders" value={counts.founders ?? 0} />
            <SummaryPill label="Operators" value={counts.operators ?? 0} />
            <SummaryPill label="Admins" value={counts.admins ?? 0} />
            <SummaryPill label="Pending Requests" value={counts.pending_agent_requests ?? 0} tone="warning" />
          </div>
        </article>
      </section>
      </>
      ) : null}

      {activeTab === "approvals" ? (
      <section className="app-card rounded-2xl border p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="app-heading text-lg font-semibold">Agent Approval Queue</h2>
          <div className="flex gap-2">
            <button type="button" onClick={load} className="app-ghost-btn rounded-full border px-3 py-1 text-xs font-semibold">
              Refresh
            </button>
          </div>
        </div>
          {recentRequests.length ? (
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <article key={request.request_id} className="app-card-subtle rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{request.title}</p>
                      <p className="app-muted text-xs">
                        Requested by {request.requester_name || request.requester_email}
                      </p>
                      <p className="app-muted text-xs">
                        {request.requester_email} | {request.requester_role} | {request.workspace_mode}
                      </p>
                    </div>
                    <span className="app-badge rounded-full border px-2.5 py-1 text-[11px] font-semibold">
                      {request.status}
                    </span>
                  </div>
                  <p className="app-copy mt-3 text-sm">{request.notes || "No notes provided."}</p>
                  {request.status === "PENDING" ? (
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDecision(request.request_id, "APPROVED")}
                        className="app-success-btn rounded-lg px-3 py-2 text-xs font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision(request.request_id, "REJECTED")}
                        className="app-status-danger rounded-lg border px-3 py-2 text-xs font-semibold"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-400">
                      {request.admin_notes || "No admin note recorded."}
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="app-muted text-sm">No agent requests found.</p>
          )}
      </section>
      ) : null}

      {activeTab === "users" ? (
      <section className="app-card rounded-2xl border p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="app-heading text-lg font-semibold">Account Directory</h2>
          <button type="button" onClick={load} className="app-ghost-btn rounded-full border px-3 py-1 text-xs font-semibold">
            Refresh
          </button>
        </div>
          <p className="app-copy mt-2 text-sm">Founder and operator workspaces now roll into one governance view for approval and oversight.</p>
          <div className="mt-4 space-y-2">
            {users.slice(0, 12).map((user) => (
              <div key={user.id} className="app-card-subtle rounded-xl border px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{user.full_name}</p>
                    <p className="app-muted text-xs">{user.email}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${user.is_active ? "app-status-success" : "app-status-danger"}`}>
                    {user.is_active ? "ACTIVE" : "DISABLED"}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-[0.9fr_1.1fr_auto]">
                  <select
                    value={user.role}
                    onChange={(event) => handleUserAccessUpdate(user.id, { role: event.target.value })}
                    className="theme-input rounded-lg border px-3 py-2 text-sm"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <input
                    defaultValue={user.title || ""}
                    onBlur={(event) => {
                      if (event.target.value !== (user.title || "")) {
                        handleUserAccessUpdate(user.id, { title: event.target.value });
                      }
                    }}
                    placeholder="Job title"
                    className="theme-input rounded-lg border px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleUserAccessUpdate(user.id, { is_active: !user.is_active })}
                    className="app-ghost-btn rounded-lg border px-3 py-2 text-xs font-semibold"
                  >
                    {user.is_active ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            ))}
          </div>
      </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <QuickLinkCard
          title="Settings"
          body="Account, title, theme, and security controls."
          path="/settings"
        />
        <QuickLinkCard
          title="Notifications"
          body="Role-based operational alerts and approval outcomes."
          path="/notifications"
        />
        <QuickLinkCard
          title="Agent Hub"
          body="Inspect approved agents outside the approval queue."
          path="/agents"
        />
      </section>
    </div>
  );
}

function SummaryPill({ label, value, tone = "default" }) {
  const toneClass = tone === "warning" ? "app-badge" : "app-card-subtle";
  return (
    <div className={`${toneClass} rounded-xl border px-4 py-4`}>
      <p className="app-muted text-xs uppercase tracking-[0.16em]">{label}</p>
      <p className="app-heading mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function QuickLinkCard({ title, body, path }) {
  return (
    <Link to={path} className="app-card rounded-2xl border p-5 transition hover:border-slate-500">
      <p className="app-heading text-lg font-semibold">{title}</p>
      <p className="app-copy mt-2 text-sm">{body}</p>
    </Link>
  );
}
