import { useEffect, useMemo, useState } from "react";
import { Archive, Building2, Pencil, Sparkles, Trash2, TrendingUp, UserPlus, Users2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import useManagementStore from "../../store/managementStore";
import ActivityPlanModal from "../../components/management/ActivityPlanModal";
import TeamMemberModal from "../../components/management/TeamMemberModal";
import WorkspaceProfileModal from "../../components/management/WorkspaceProfileModal";
import WorkspaceSetupModal from "../../components/management/WorkspaceSetupModal";

const parseQualifications = (input) => String(input || "").split(",").map((item) => item.trim()).filter(Boolean);
const defaultTeamDraft = {
  name: "",
  role: "",
  cvFileName: "",
  qualifications: [],
  qualification_notes: "",
  additional_notes: "",
  cvError: "",
};

export default function ManagementDashboard() {
  const location = useLocation();
  const { user } = useAuthStore();
  const {
    workspaces,
    activeWorkspace,
    isLoading,
    isSaving,
    isPlanning,
    error,
    fetchWorkspaces,
    createWorkspace,
    selectWorkspace,
    updateActiveWorkspace,
    createPlan,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    latestPlan,
    planHistory,
    agentEvents,
  } = useManagementStore();

  const [objective, setObjective] = useState("");
  const [timeHorizonWeeks, setTimeHorizonWeeks] = useState(4);
  const [profileDraft, setProfileDraft] = useState(null);
  const [qualificationInput, setQualificationInput] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [teamDraft, setTeamDraft] = useState(defaultTeamDraft);
  const activeTab = useMemo(() => {
    if (location.pathname.startsWith("/management/planner")) return "PLANNER";
    if (location.pathname.startsWith("/management/signals")) return "SIGNALS";
    return "HOME";
  }, [location.pathname]);

  useEffect(() => {
    if (user?.email) {
      fetchWorkspaces(user.email);
    }
  }, [fetchWorkspaces, user?.email]);

  useEffect(() => {
    if (!activeWorkspace) {
      setProfileDraft(null);
      setQualificationInput("");
      return;
    }
    setProfileDraft({
      workspace_name: activeWorkspace.workspace_name || "",
      description: activeWorkspace.description || "",
      industry: activeWorkspace.industry || "",
      stage: activeWorkspace.stage || "",
      annual_revenue: activeWorkspace.annual_revenue || "",
      employee_count: activeWorkspace.employee_count || 0,
      qualifications: activeWorkspace.qualifications || [],
    });
    setQualificationInput((activeWorkspace.qualifications || []).join(", "));
  }, [activeWorkspace]);

  const growthVelocity = useMemo(() => {
    if (!latestPlan?.activities?.length) return 0;
    const highPriority = latestPlan.activities.filter((item) => item.priority === "HIGH").length;
    return Math.min(100, highPriority * 28 + 12);
  }, [latestPlan]);

  const executionCalendar = useMemo(() => {
    const plans = Array.isArray(planHistory) ? planHistory : [];
    const items = plans.slice(0, 8).flatMap((plan) => {
      const baseDate = new Date(plan.created_at || Date.now());
      const activities = Array.isArray(plan.activities) ? plan.activities : [];
      return activities.map((activity, index) => {
        const dueDate = new Date(baseDate);
        dueDate.setDate(baseDate.getDate() + Math.max(0, (Number(activity.week_target || 1) - 1) * 7));
        return {
          id: `${plan.plan_id || "plan"}-${index}-${activity.title}`,
          title: activity.title,
          owner: activity.owner || "Unassigned",
          dueDate,
          priority: activity.priority || "MEDIUM",
        };
      });
    });
    return items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).slice(0, 12);
  }, [planHistory]);

  const handleCreateWorkspace = async (payload) => {
    if (!user?.email) return;
    try {
      const result = await createWorkspace({
        owner_email: user.email,
        company_name: payload.company_name,
        workspace_name: payload.workspace_name,
        description: payload.description || "",
        industry: payload.industry || "",
        stage: payload.stage || "",
        annual_revenue: payload.annual_revenue || "",
        employee_count: Number(payload.employee_count || 0),
        qualifications: Array.isArray(payload.qualifications) ? payload.qualifications : [],
        team_members: Array.isArray(payload.team_members) ? payload.team_members : [],
      });
      toast.success("Management workspace created.");
      return result;
    } catch (error) {
      toast.error(error?.message || "Unable to create workspace.");
      throw error;
    }
  };

  const handleUpdateWorkspace = async (event) => {
    event.preventDefault();
    if (!profileDraft) return;
    try {
      await updateActiveWorkspace({
        workspace_name: profileDraft.workspace_name,
        description: profileDraft.description,
        industry: profileDraft.industry,
        stage: profileDraft.stage,
        annual_revenue: profileDraft.annual_revenue,
        employee_count: Number(profileDraft.employee_count || 0),
        qualifications: parseQualifications(qualificationInput),
      });
      setShowEditModal(false);
      toast.success("Workspace updated.");
    } catch (error) {
      toast.error(error?.message || "Unable to update workspace.");
    }
  };

  const handleGeneratePlan = async (event) => {
    event.preventDefault();
    if (!objective.trim()) return;
    try {
      await createPlan({
        objective: objective.trim(),
        time_horizon_weeks: Number(timeHorizonWeeks || 4),
      });
      setShowPlanModal(false);
      toast.success("Activity plan generated.");
    } catch (error) {
      toast.error(error?.message || "Unable to generate plan.");
    }
  };

  const openEditModal = () => {
    if (!activeWorkspace) return;
    setProfileDraft({
      workspace_name: activeWorkspace.workspace_name || "",
      description: activeWorkspace.description || "",
      industry: activeWorkspace.industry || "",
      stage: activeWorkspace.stage || "",
      annual_revenue: activeWorkspace.annual_revenue || "",
      employee_count: activeWorkspace.employee_count || 0,
      qualifications: activeWorkspace.qualifications || [],
    });
    setQualificationInput((activeWorkspace.qualifications || []).join(", "));
    setShowEditModal(true);
  };

  const openCreateTeamModal = () => {
    setEditingMemberId(null);
    setTeamDraft(defaultTeamDraft);
    setShowTeamModal(true);
  };

  const openEditTeamModal = (member) => {
    setEditingMemberId(member.member_id);
    setTeamDraft({
      name: member.name || "",
      role: member.role || "",
      cvFileName: "",
      qualifications: member.qualifications || [],
      qualification_notes: member.qualification_notes || "",
      additional_notes: "",
      cvError: "",
    });
    setShowTeamModal(true);
  };

  const handleSaveTeamMember = async (event) => {
    event.preventDefault();
    const notes = [teamDraft.qualification_notes, teamDraft.additional_notes.trim()].filter(Boolean).join("\n\n");
    const payload = {
      name: teamDraft.name.trim(),
      role: teamDraft.role.trim(),
      qualifications: teamDraft.qualifications || [],
      qualification_notes: notes.slice(0, 20000),
    };
    if (!payload.name) return;
    try {
      if (editingMemberId) {
        await updateTeamMember(editingMemberId, payload);
        toast.success("Team member updated.");
      } else {
        await addTeamMember(payload);
        toast.success("Team member added.");
      }
      setShowTeamModal(false);
      setEditingMemberId(null);
      setTeamDraft(defaultTeamDraft);
    } catch (error) {
      toast.error(error?.message || "Unable to save team member.");
    }
  };

  const handleDeleteTeamMember = async (memberId) => {
    try {
      await deleteTeamMember(memberId);
      toast.success("Team member removed.");
    } catch (error) {
      toast.error(error?.message || "Unable to remove team member.");
    }
  };

  return (
    <section className="management-shell app-view h-full">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-5">
        <header className="app-banner rounded-2xl border px-6 py-5">
          <p className="app-badge inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em]">Active Archive</p>
          <h1 className="app-heading mt-3 text-4xl font-semibold">Startup Management Vault</h1>
          <p className="app-copy mt-2 max-w-3xl text-sm">
            Build management workspaces and run agentic execution plans using company revenue, team size, and
            qualifications.
          </p>
          <p className="app-badge mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold">
            Active View: {activeTab}
          </p>
        </header>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <article className="app-card rounded-2xl border p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="app-heading flex items-center gap-2 text-lg font-semibold">
                  <Building2 size={18} />
                  Company Workspaces
                </h2>
                <div className="flex items-center gap-2">
                  <span className="app-muted text-xs">{workspaces.length} total</span>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="app-primary-btn rounded-full px-3 py-1 text-xs font-semibold transition"
                  >
                    + New
                  </button>
                </div>
              </div>
              <p className="app-copy text-sm">
                Workspace and company information are now filled via modal forms to keep the dashboard clean.
              </p>
            </article>

            <article className="app-card rounded-2xl border p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="app-heading text-base font-semibold">Workspace Profiles</h3>
                {isLoading ? <span className="app-muted text-xs">Loading...</span> : null}
              </div>
              {workspaces.length === 0 ? (
                <p className="app-muted text-sm">No management workspace yet. Create your first one above.</p>
              ) : (
                <div className="grid gap-2">
                  {workspaces.map((workspace) => (
                    <button
                      key={workspace.workspace_id}
                      type="button"
                      onClick={() => selectWorkspace(workspace.workspace_id)}
                      className={`rounded-lg border px-3 py-2 text-left transition ${
                        activeWorkspace?.workspace_id === workspace.workspace_id
                          ? "app-badge"
                          : "app-card-subtle hover:border-slate-500"
                      }`}
                    >
                      <p className="app-heading text-sm font-semibold">{workspace.workspace_name}</p>
                      <p className="app-copy text-xs">
                        {workspace.company_name} | Revenue: {workspace.annual_revenue || "N/A"} | Team:{" "}
                        {workspace.employee_count || 0}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </article>
          </div>

          <div className="space-y-5">
            <article className="app-card-alt rounded-2xl border p-5">
              <div className="flex items-center justify-between">
                <h2 className="app-heading flex items-center gap-2 text-lg font-semibold">
                  <Archive size={18} />
                  Growth Planner
                </h2>
                <button
                  type="button"
                  onClick={openEditModal}
                  disabled={!activeWorkspace}
                  className="app-primary-btn rounded-full px-3 py-1 text-xs font-semibold transition"
                >
                  Edit Profile
                </button>
              </div>
              {!activeWorkspace ? (
                <p className="app-muted mt-4 text-sm">Select a workspace to edit profile and plan activities.</p>
              ) : (
                <div className="app-card-subtle mt-4 grid gap-2 rounded-xl border p-4 text-sm">
                  <p className="app-copy"><span className="app-muted">Workspace:</span> {activeWorkspace.workspace_name}</p>
                  <p className="app-copy"><span className="app-muted">Revenue:</span> {activeWorkspace.annual_revenue || "N/A"}</p>
                  <p className="app-copy"><span className="app-muted">Employees:</span> {activeWorkspace.employee_count || 0}</p>
                  <p className="app-copy"><span className="app-muted">Stage:</span> {activeWorkspace.stage || "N/A"}</p>
                </div>
              )}
            </article>

            <article className="app-card-alt rounded-2xl border p-5">
              <div className="flex items-center justify-between">
                <h3 className="app-heading flex items-center gap-2 text-base font-semibold">
                  <Sparkles size={16} />
                  Agentic Activity Planner
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPlanModal(true)}
                  disabled={!activeWorkspace}
                  className="app-success-btn rounded-full px-3 py-1 text-xs font-semibold transition"
                >
                  New Plan
                </button>
              </div>
              <p className="app-copy mt-3 text-sm">
                Planning input is captured through a modal and added to the tactical board after generation.
              </p>
            </article>
          </div>
        </div>

        {activeTab !== "SIGNALS" ? (
        <section className="grid gap-5 lg:grid-cols-[1fr_0.34fr]">
          <article className="app-card rounded-2xl border p-5">
            <h3 className="app-heading mb-4 text-base font-semibold">Current Tasks</h3>
            {!latestPlan?.activities?.length ? (
              <p className="app-muted text-sm">Generate a plan to populate tactical tasks.</p>
            ) : (
              <div className="space-y-2">
                {latestPlan.activities.map((task) => (
                  <div
                    key={`${task.title}-${task.week_target}`}
                    className="app-card-subtle grid gap-2 rounded-lg border px-3 py-2 md:grid-cols-[1fr_auto_auto_auto]"
                  >
                    <div>
                      <p className="app-heading text-sm font-semibold">{task.title}</p>
                      <p className="app-muted text-xs">{task.rationale}</p>
                    </div>
                    <p className="app-copy text-xs">{task.owner}</p>
                    <p
                      className={`text-xs font-semibold ${
                        task.priority === "HIGH"
                          ? "text-rose-400"
                          : task.priority === "MEDIUM"
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {task.priority}
                    </p>
                    <p className="text-xs text-blue-300">Week {task.week_target}</p>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="app-card rounded-2xl border p-5">
            <h3 className="app-heading text-sm font-semibold">Growth Velocity</h3>
            <p className="mt-3 text-4xl font-semibold text-blue-300">{growthVelocity}%</p>
            <p className="app-muted mt-1 text-xs">Current execution momentum signal.</p>
            <div className="mt-4 flex gap-1.5">
              {[0, 1, 2, 3, 4].map((index) => (
                <div
                  key={index}
                  className={`h-6 flex-1 rounded-sm ${index * 20 < growthVelocity ? "bg-blue-500" : "bg-slate-700"}`}
                />
              ))}
            </div>
          </article>
        </section>
        ) : null}

        {activeTab !== "PLANNER" ? (
        <section className="grid gap-5 lg:grid-cols-2">
          <article className="app-card rounded-2xl border p-5">
            <h4 className="app-heading mb-3 flex items-center gap-2 text-sm font-semibold">
              <Users2 size={15} />
              Team Capability Snapshot
            </h4>
            {!activeWorkspace ? (
              <p className="app-muted text-sm">Select a workspace to manage team members.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="app-copy text-xs">
                    {(activeWorkspace.team_members || []).length} member(s) with persisted roles and qualifications.
                  </p>
                  <button
                    type="button"
                    onClick={openCreateTeamModal}
                    className="app-primary-btn inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition"
                  >
                    <UserPlus size={12} />
                    Add Member
                  </button>
                </div>
                {(activeWorkspace.team_members || []).length === 0 ? (
                  <p className="app-muted text-sm">No team members added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(activeWorkspace.team_members || []).map((member) => (
                      <article key={member.member_id} className="app-card-subtle rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="app-heading text-sm font-semibold">{member.name}</p>
                            <p className="app-copy text-xs">{member.role || "Role pending"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditTeamModal(member)}
                              className="app-ghost-btn rounded-md border px-2 py-1 text-xs"
                            >
                              <span className="inline-flex items-center gap-1">
                                <Pencil size={12} />
                                Edit
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTeamMember(member.member_id)}
                              className="app-status-danger rounded-md border border-rose-500/60 px-2 py-1 text-xs"
                            >
                              <span className="inline-flex items-center gap-1">
                                <Trash2 size={12} />
                                Delete
                              </span>
                            </button>
                          </div>
                        </div>
                        {member.qualifications?.length ? (
                          <p className="app-copy mt-2 text-xs">{member.qualifications.join(", ")}</p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </article>

          <article className="app-card rounded-2xl border p-5">
            <h4 className="app-heading mb-3 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp size={15} />
              Plan History
            </h4>
            {planHistory.length === 0 ? (
              <p className="app-muted text-sm">No plan runs yet.</p>
            ) : (
              <div className="space-y-2">
                {planHistory.slice(0, 6).map((item) => (
                  <div key={item.plan_id} className="app-card-subtle rounded-lg border px-3 py-2">
                    <p className="app-heading text-sm font-semibold">{item.objective}</p>
                    <p className="app-muted text-xs">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
        ) : null}

        {activeTab !== "HOME" ? (
        <section className="grid gap-5 lg:grid-cols-2">
          <article className="app-card rounded-2xl border p-5">
            <h4 className="app-heading mb-3 text-sm font-semibold">Execution Calendar</h4>
            {executionCalendar.length === 0 ? (
              <p className="app-muted text-sm">Generate a plan to populate the execution calendar.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {executionCalendar.map((item) => (
                  <div key={item.id} className="app-card-subtle rounded-lg border px-3 py-2">
                    <p className="app-heading text-sm font-semibold">{item.title}</p>
                    <p className="app-copy text-xs">Owner: {item.owner}</p>
                    <p className="app-muted text-xs">Due: {item.dueDate.toLocaleDateString()}</p>
                    <p
                      className={`mt-1 text-xs font-semibold ${
                        item.priority === "HIGH"
                          ? "text-rose-400"
                          : item.priority === "MEDIUM"
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {item.priority}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </article>
          <article className="app-card rounded-2xl border p-5">
            <h4 className="app-heading mb-3 text-sm font-semibold">Agent Activity Stream</h4>
            {agentEvents.length === 0 ? (
              <p className="app-muted text-sm">No agent events yet. Trigger an action to start streaming.</p>
            ) : (
              <div className="space-y-2">
                {agentEvents.slice(0, 12).map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24, delay: index * 0.02 }}
                    className="app-card-subtle rounded-lg border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <motion.span
                        animate={event.status === "RUNNING" ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                        transition={event.status === "RUNNING" ? { duration: 1.2, repeat: Infinity } : { duration: 0 }}
                        className={`h-2 w-2 rounded-full ${
                          event.status === "DONE"
                            ? "bg-emerald-400"
                            : event.status === "ERROR"
                            ? "bg-rose-400"
                            : "bg-blue-400"
                        }`}
                      />
                      <p className="app-heading text-xs font-semibold">{event.phase}</p>
                      <p className="app-muted text-[11px]">{new Date(event.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <p className="app-copy mt-1 text-xs">{event.message}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </article>
        </section>
        ) : null}

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </div>

      {showCreateModal ? (
        <WorkspaceSetupModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateWorkspace}
          isSaving={isSaving}
        />
      ) : null}

      {showEditModal && profileDraft ? (
        <WorkspaceProfileModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          draft={profileDraft}
          setDraft={setProfileDraft}
          qualificationInput={qualificationInput}
          setQualificationInput={setQualificationInput}
          onSave={handleUpdateWorkspace}
          isSaving={isSaving}
        />
      ) : null}

      {showPlanModal ? (
        <ActivityPlanModal
          open={showPlanModal}
          onClose={() => setShowPlanModal(false)}
          objective={objective}
          setObjective={setObjective}
          timeHorizonWeeks={timeHorizonWeeks}
          setTimeHorizonWeeks={setTimeHorizonWeeks}
          onGenerate={handleGeneratePlan}
          isPlanning={isPlanning}
          canRun={Boolean(activeWorkspace)}
        />
      ) : null}

      {showTeamModal ? (
        <TeamMemberModal
          open={showTeamModal}
          onClose={() => {
            setShowTeamModal(false);
            setEditingMemberId(null);
            setTeamDraft(defaultTeamDraft);
          }}
          title={editingMemberId ? "Edit Team Member" : "Add Team Member"}
          draft={teamDraft}
          setDraft={setTeamDraft}
          onSubmit={handleSaveTeamMember}
          isSaving={isSaving}
        />
      ) : null}
    </section>
  );
}
