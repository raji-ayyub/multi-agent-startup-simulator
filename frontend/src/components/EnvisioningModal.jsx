import { useEffect, useMemo, useRef, useState } from "react";
import {
  Paperclip,
  Bot,
  CheckCircle2,
  CircleAlert,
  Copy,
  Cpu,
  Lightbulb,
  ListChecks,
  Loader2,
  Monitor,
  Rocket,
  Save,
  Send,
  User,
  X,
} from "lucide-react";
import useSimulationStore from "../store/simulationStore";
import { getSimulationRequirements } from "../services/simulationService";

const DEFAULT_FORM = {
  startupName: "",
  elevatorPitch: "",
  problemStatement: "",
  targetAudience: "",
  problemUrgency: "",
  primaryTargetSegment: "",
  geography: "",
  marketSizeEstimate: "",
  customerBehaviorPainPoints: "",
  competitorPatterns: "",
  monthlyBurn: "",
  estimatedCac: "",
  currentCashInHand: "",
  marketingStrategy: "",
};

const URGENCY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNKNOWN"];
const SIMULATION_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const SIMULATION_UPLOAD_ACCEPT =
  ".pdf,.doc,.docx,.txt,.md,.csv,.json,.log,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain,text/markdown,text/csv,application/json,text/rtf";
const INTRO_MESSAGE =
  "Hi. Tell me the startup idea you want to test, or say you do not have one yet and we can brainstorm together.";
const INTRO_REPLIES = ["I have an idea to test", "I do not have an idea yet", "Help me brainstorm one"];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function intakeFieldsToForm(fields = {}) {
  return {
    ...fields,
    startupName: fields.startupName || fields.startup_name || "",
    elevatorPitch: fields.elevatorPitch || fields.elevator_pitch || "",
    problemStatement: fields.problemStatement || fields.problem_statement || "",
    targetAudience: fields.targetAudience || fields.target_audience || "",
    problemUrgency: fields.problemUrgency || fields.problem_urgency || "",
    primaryTargetSegment: fields.primaryTargetSegment || fields.primary_target_segment || "",
    marketSizeEstimate: fields.marketSizeEstimate || fields.market_size_estimate || "",
    customerBehaviorPainPoints: fields.customerBehaviorPainPoints || fields.customer_behavior_pain_points || "",
    competitorPatterns: fields.competitorPatterns || fields.competitor_patterns || "",
    monthlyBurn: fields.monthlyBurn || fields.monthly_burn || "",
    estimatedCac: fields.estimatedCac || fields.estimated_cac || "",
    currentCashInHand: fields.currentCashInHand || fields.current_cash_in_hand || "",
    marketingStrategy: fields.marketingStrategy || fields.marketing_strategy || "",
  };
}

function displayText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(displayText).filter(Boolean).join(", ");
  if (typeof value === "object") return Object.values(value).map(displayText).filter(Boolean).join(", ");
  return String(value);
}

function formatAssistantMessage(value) {
  const text = displayText(value).trim();
  let lines = text.split(/\r?\n/);
  const splitLongParagraph = lines.length === 1 && text.length > 220;
  if (splitLongParagraph) {
    lines = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
  }

  const blocks = [];
  let paragraph = [];
  let list = [];
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join(" ").trim() });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: "list", items: list });
    list = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      return;
    }
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
      return;
    }
    flushList();
    const heading = line.match(/^#{1,3}\s+(.+)$|^\*\*(.+)\*\*$/);
    if (heading) {
      flushParagraph();
      blocks.push({ type: "heading", text: heading[1] || heading[2] });
      return;
    }
    paragraph.push(line);
    if (splitLongParagraph) flushParagraph();
  });
  flushParagraph();
  flushList();

  const renderInline = (line) => line.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={index} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>
      : part
  );

  return blocks.map((block, index) => {
    if (block.type === "heading") {
      return <p key={index} className="mb-1 font-semibold text-slate-100">{renderInline(block.text)}</p>;
    }
    if (block.type === "list") {
      return (
        <ul key={index} className="my-2 list-disc space-y-1 pl-5 marker:text-blue-300">
          {block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}
        </ul>
      );
    }
    return <p key={index}>{renderInline(block.text)}</p>;
  });
}

function hasCoreIntakeFields(fields = {}) {
  return Boolean(
    String(fields.startupName || "").trim() &&
      String(fields.problemStatement || "").trim() &&
      String(fields.targetAudience || "").trim()
  );
}

export default function EnvisioningModal({ onClose, onSimulationLaunched }) {
  const {
    isRunning,
    saveDraft,
    loadDraft,
    clearDraft,
    launchSimulationFromBrief,
    patchIdeaFields,
    runIntakeTurn,
    uploadIntakeFile,
    simulationError,
    runningActivity,
  } = useSimulationStore();

  const bootDraft = loadDraft();
  const [form, setForm] = useState({ ...DEFAULT_FORM, ...(bootDraft || {}) });
  const [documentIds, setDocumentIds] = useState(() =>
    Array.isArray(bootDraft?.documentIds) ? bootDraft.documentIds : []
  );
  const [documentNames, setDocumentNames] = useState(() =>
    Array.isArray(bootDraft?.documentNames) ? bootDraft.documentNames : []
  );
  const [messages, setMessages] = useState(() => {
    const savedIds = Array.isArray(bootDraft?.documentIds) ? bootDraft.documentIds : [];
    const savedNames = Array.isArray(bootDraft?.documentNames) ? bootDraft.documentNames : [];
    const savedAttachments = savedIds.map((documentId, index) => ({
      id: `saved-upload-${documentId}`,
      documentId,
      role: "system",
      kind: "upload",
      status: "uploaded",
      content: `Previously uploaded: ${savedNames[index] || "document"}`,
    }));
    const welcomeMessage = savedIds.length
      ? "Your saved document is attached. Send a message when you want me to review it or continue the intake."
      : hasCoreIntakeFields(bootDraft || {})
        ? "Your saved startup details are loaded. Tell me what you would like to update or review."
        : INTRO_MESSAGE;
    return [
      ...savedAttachments,
      { role: "assistant", content: welcomeMessage, suggestedReplies: savedIds.length ? [] : INTRO_REPLIES },
    ];
  });
  const [chatInput, setChatInput] = useState("");
  const [isIntakeLoading, setIsIntakeLoading] = useState(false);
  const [intakeReady, setIntakeReady] = useState(false);
  const [completion, setCompletion] = useState(0);
  const [missingFields, setMissingFields] = useState([]);
  const [bannerMessage, setBannerMessage] = useState("");
  const [simulationStage, setSimulationStage] = useState(false);
  const [visibleLogCount, setVisibleLogCount] = useState(0);
  const [isSimulationComplete, setIsSimulationComplete] = useState(false);
  const [runtimeLogs, setRuntimeLogs] = useState([]);
  const [runtimeSynthesis, setRuntimeSynthesis] = useState("");
  const [runtimeRecommendations, setRuntimeRecommendations] = useState([]);
  const [runtimeAgents, setRuntimeAgents] = useState([]);
  const [isUploadLoading, setIsUploadLoading] = useState(false);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [requirementsLoading, setRequirementsLoading] = useState(false);
  const [requirements, setRequirements] = useState(null);
  const [requirementsError, setRequirementsError] = useState("");
  const [requirementsCopied, setRequirementsCopied] = useState(false);
  const messagesAnchorRef = useRef(null);
  const fileInputRef = useRef(null);

  const collectedPreview = useMemo(
    () => [
      { label: "Startup", value: form.startupName || "Pending" },
      { label: "Problem", value: form.problemStatement || "Pending" },
      { label: "Audience", value: form.targetAudience || "Pending" },
      {
        label: "Segment",
        value: form.primaryTargetSegment && form.geography
          ? `${form.primaryTargetSegment} | ${form.geography}`
          : "Pending",
      },
      {
        label: "Economics",
        value:
          form.monthlyBurn || form.currentCashInHand
            ? `Burn ${form.monthlyBurn || "N/A"} | Cash ${form.currentCashInHand || "N/A"}`
            : "Pending",
      },
    ],
    [form]
  );

  useEffect(() => {
    messagesAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const launchSimulation = async (launchForm, { overrideMissing = false } = {}) => {
    setSimulationStage(true);
    setVisibleLogCount(1);
    setIsSimulationComplete(false);
    setBannerMessage("");
    setRuntimeLogs([]);
    setRuntimeSynthesis("");
    setRuntimeRecommendations([]);
    setRuntimeAgents([]);

    try {
      const result = await launchSimulationFromBrief(launchForm, { overrideMissing });
      const resultLogs = Array.isArray(result?.logs) ? result.logs : [];
      setRuntimeLogs(resultLogs);
      setRuntimeSynthesis(result?.synthesis || "");
      setRuntimeRecommendations(result?.recommendations || []);
      setRuntimeAgents(result?.agents || []);

      for (let index = 2; index <= resultLogs.length; index += 1) {
        await wait(450);
        setVisibleLogCount(index);
      }

      patchIdeaFields(launchForm);
      clearDraft();
      setIsSimulationComplete(true);
    } catch (error) {
      setSimulationStage(false);
      setBannerMessage(error?.message || simulationError || "Unable to launch simulation. Please try again.");
    }
  };

  const processIntakeTurn = async (
    content,
    attachedDocumentIds = documentIds,
    { includeUserMessage = true } = {}
  ) => {
    if ((includeUserMessage && (!content || isUploadLoading)) || isIntakeLoading || simulationStage) return false;

    const nextMessages = includeUserMessage ? [...messages, { role: "user", content }] : messages;
    if (includeUserMessage) setMessages(nextMessages);
    setIsIntakeLoading(true);
    setBannerMessage("");

    try {
      const response = await runIntakeTurn({
        draft: form,
        userMessage: content,
        history: nextMessages
          .filter((item) => item.role === "assistant" || item.role === "user")
          .map((item) => ({ role: item.role, content: item.content })),
        documentIds: attachedDocumentIds,
      });

      const mergedForm = { ...form, ...intakeFieldsToForm(response?.collected_fields || {}) };
      setForm(mergedForm);
      patchIdeaFields(intakeFieldsToForm(response?.collected_fields || {}));
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response?.assistant_message || "Noted. Continue.",
          suggestedReplies: Array.isArray(response?.suggested_replies) ? response.suggested_replies : [],
        },
      ]);
      setIntakeReady(Boolean(response?.ready_to_run));
      setCompletion(Number(response?.completion_percent || 0));
      setMissingFields(Array.isArray(response?.missing_fields) ? response.missing_fields : []);

      const shouldLaunch = Boolean(response?.ready_to_run);
      if (includeUserMessage && shouldLaunch && !simulationStage && !isRunning) {
        await launchSimulation(mergedForm, { overrideMissing: Boolean(response?.run_override) });
      }
      return true;
    } catch (error) {
      setBannerMessage(error?.message || simulationError || "Unable to process your message. Try again.");
      return false;
    } finally {
      setIsIntakeLoading(false);
    }
  };

  const submitMessage = (content, attachedDocumentIds = documentIds) =>
    processIntakeTurn(content, attachedDocumentIds);

  const handleSend = async () => {
    if (isUploadLoading || isIntakeLoading) return;
    const content = chatInput.trim();
    if (!content) return;
    setChatInput("");
    await submitMessage(content);
  };

  const handlePickFile = () => {
    if (isIntakeLoading || simulationStage || isUploadLoading) return;
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (simulationStage || isIntakeLoading) return;

    setIsUploadLoading(true);
    setBannerMessage("");
    try {
      const maxBytes = SIMULATION_UPLOAD_MAX_BYTES;
      if (file.size > maxBytes) {
        setBannerMessage("File too large. Please upload files up to 10MB.");
        return;
      }

      const uploadStatusId = `upload-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: uploadStatusId,
          role: "system",
          kind: "upload",
          status: "uploading",
          content: `Uploading ${file.name}...`,
        },
      ]);

      const upload = await uploadIntakeFile(file);
      if (!upload?.document_id) {
        setBannerMessage("The file was uploaded but could not be saved for intake processing.");
        setMessages((prev) => prev.map((item) => item.id === uploadStatusId
          ? { ...item, status: "error", content: "The document could not be saved for intake." }
          : item));
        return;
      }

      const nextDocumentIds = [...new Set([...documentIds, upload.document_id])];
      const nextDocumentNames = [...documentNames, upload.file_name || file.name];
      setDocumentIds(nextDocumentIds);
      setDocumentNames(nextDocumentNames);
      saveDraft({ ...form, documentIds: nextDocumentIds, documentNames: nextDocumentNames });
      setMessages((prev) => prev.map((item) => item.id === uploadStatusId
        ? {
            ...item,
            documentId: upload.document_id,
            status: "uploaded",
            content: `Document uploaded: ${upload.file_name || file.name}`,
          }
        : item));
      setIsUploadLoading(false);
      const analyzed = await processIntakeTurn("", nextDocumentIds, { includeUserMessage: false });
      if (!analyzed) {
        setMessages((prev) => prev.map((item) => item.id === uploadStatusId
          ? { ...item, status: "error", content: `Document uploaded, but analysis failed. You can ask the agent to review ${upload.file_name || file.name} again.` }
          : item));
      }
    } catch (error) {
      setBannerMessage(error?.message || simulationError || "Unable to read that file. Try a PDF, Word, or text document.");
      setMessages((prev) => prev.map((item) => item.id?.startsWith("upload-") && item.status === "uploading"
        ? { ...item, status: "error", content: error?.message || "Document upload failed." }
        : item));
    } finally {
      setIsUploadLoading(false);
    }
  };

  const handleRemoveDocument = (documentId) => {
    const documentIndex = documentIds.indexOf(documentId);
    if (documentIndex < 0) return;
    const nextDocumentIds = documentIds.filter((id) => id !== documentId);
    const nextDocumentNames = documentNames.filter((_, index) => index !== documentIndex);
    setDocumentIds(nextDocumentIds);
    setDocumentNames(nextDocumentNames);
    setMessages((prev) => prev.filter((item) => item.documentId !== documentId));
    saveDraft({ ...form, documentIds: nextDocumentIds, documentNames: nextDocumentNames });
  };

  const handleSaveDraft = () => {
    saveDraft({ ...form, documentIds, documentNames });
    patchIdeaFields(form);
    setBannerMessage("Draft saved.");
  };

  const handleOpenRequirements = async () => {
    setRequirementsOpen(true);
    if (requirements || requirementsLoading) return;
    setRequirementsLoading(true);
    setRequirementsError("");
    try {
      setRequirements(await getSimulationRequirements());
    } catch (error) {
      setRequirementsError(error?.message || "Unable to load simulation requirements.");
    } finally {
      setRequirementsLoading(false);
    }
  };

  const handleCopyRequirements = async () => {
    if (!requirements) return;
    const formatFields = (fields) => fields
      .map((field) => `- ${field.label}${field.description ? `: ${field.description}` : ""}`)
      .join("\n");
    const checklist = [
      "Startup simulation planning checklist",
      "",
      "Important information to provide:",
      formatFields(requirements.required),
      ...(requirements.additional_context.length
        ? ["", "Additional context:", formatFields(requirements.additional_context)]
        : []),
      "",
      "If you want to proceed before providing everything, explicitly ask to run with the information available.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(checklist);
      setRequirementsCopied(true);
      window.setTimeout(() => setRequirementsCopied(false), 1800);
    } catch {
      setRequirementsError("Could not copy automatically. Check clipboard permissions and try again.");
    }
  };

  const handleLaunch = async () => {
    if (!intakeReady) {
      setBannerMessage("Complete required answers first.");
      return;
    }
    await launchSimulation(form);
  };

  const handleConfirmClose = () => {
    if (isSimulationComplete && typeof onSimulationLaunched === "function") {
      onSimulationLaunched();
      return;
    }
    onClose();
  };

  const visibleLogs = runtimeLogs.slice(0, visibleLogCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-backdrop absolute inset-0 backdrop-blur-sm" onClick={onClose} />

      <section className="theme-modal relative z-10 flex max-h-[90dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border md:max-h-[94vh]">
        <header className="app-modal-section border-b px-6 py-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="app-copy flex items-center gap-2 text-sm">
              <img src="/images/Icon.svg" alt="Logo" className="landing-logo-badge h-8 w-8 rounded-lg p-1" />
              <span className="font-medium app-heading">PentraAI <span className="app-muted mx-1">/</span> {simulationStage ? "Simulation" : "Intake"}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="app-ghost-btn rounded-full border p-2 transition"
            >
              <X size={15} />
            </button>
          </div>

          <div className="mb-2 flex items-end justify-between gap-3">
            <h2 className="app-heading text-xl font-semibold">
              {simulationStage ? "Loading Agents.." : "Describe your startup in chat"}
            </h2>
            <p className="app-muted text-xs uppercase tracking-[0.2em]">
              {simulationStage ? "Agentic Runtime" : `${completion}% complete`}
            </p>
          </div>

          <div className="app-progress-track h-1.5 rounded-full">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${simulationStage ? 100 : completion}%` }}
            />
          </div>
        </header>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[1.45fr_1fr]">
          <div className="app-modal-section min-h-0 border-r p-4 sm:p-6">
            {simulationStage ? (
              <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 overflow-hidden py-3 text-center">
                <div className={`simulation-orbit relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full ${isSimulationComplete ? "simulation-orbit-complete" : ""}`}>
                  <div className="simulation-orbit-ring absolute inset-0 rounded-full" />
                  {!isSimulationComplete ? <span className="simulation-orbit-bob absolute left-1/2 top-1/2" aria-hidden="true" /> : null}
                  <Monitor size={44} strokeWidth={1.7} className={`simulation-desktop-icon ${isSimulationComplete ? "simulation-desktop-icon-complete" : ""}`} />
                </div>

                <div
                  className="app-card-subtle flex min-h-[7.5rem] min-w-0 w-full max-w-[560px] flex-1 flex-col overflow-hidden rounded-xl border p-4 text-left sm:p-5"
                >
                  <div className="mb-4 flex items-center gap-2 text-blue-300">
                    {isSimulationComplete ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Cpu size={16} className="animate-pulse" />
                    )}
                    <span className="text-sm font-medium">
                      {isSimulationComplete ? "Simulation completed." : "Running agent orchestration..."}
                    </span>
                  </div>

                  <div
                    className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2"
                    style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(148,163,184,0.55) transparent" }}
                  >
                    {visibleLogs.length === 0 && !isSimulationComplete ? (
                      <article className="flex gap-2.5">
                        <Cpu size={14} className="mt-0.5 text-blue-300" />
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-blue-300">
                            {String(runningActivity?.phase || "backend_simulation").replaceAll("_", " ")}
                          </p>
                          <p className="app-copy text-sm">
                            {runningActivity?.message || "Backend simulation request is active."}
                          </p>
                        </div>
                      </article>
                    ) : null}
                    {visibleLogs.map((log, index) => {
                      const isLatest = index === visibleLogs.length - 1 && !isSimulationComplete;
                      return (
                        <article key={`${log.role}-${index}`} className="flex gap-2.5">
                          <Cpu size={14} className={`mt-0.5 ${isLatest ? "text-blue-300" : "text-slate-500"}`} />
                          <div>
                            <p className={`text-[11px] uppercase tracking-[0.16em] ${isLatest ? "text-blue-300" : "text-slate-500"}`}>
                              {log.role}
                              {log.phase ? <span className="app-muted normal-case tracking-normal"> / {String(log.phase).replaceAll("_", " ")}</span> : null}
                            </p>
                            <p className="app-copy text-sm">{log.message}</p>
                            {log.metadata?.assessment_confidence || log.metadata?.retrieved_items != null ? (
                              <p className="app-muted mt-1 text-[11px]">
                                {log.metadata?.assessment_confidence ? `Assessment confidence ${log.metadata.assessment_confidence}/100` : ""}
                                {log.metadata?.retrieved_items != null ? `Evidence items ${log.metadata.retrieved_items}` : ""}
                              </p>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-col">
                <div className="app-chat-surface min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border p-4">
                  {messages.map((item, index) => item.kind === "upload" ? (
                    <div
                      key={item.id || `upload-${index}`}
                      role="status"
                      className={`mx-auto flex w-fit max-w-[90%] items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                        item.status === "error" ? "app-status-info" : "app-card-subtle app-copy"
                      }`}
                    >
                      {item.status === "uploading" ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : item.status === "error" ? (
                        <CircleAlert size={13} />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                      <span>{item.content}</span>
                      {item.documentId ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(item.documentId)}
                          className="ml-1 underline underline-offset-2"
                          aria-label={`Remove ${item.content}`}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <article
                      key={`${item.role}-${index}`}
                      className={`flex gap-2 ${item.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {item.role === "assistant" ? (
                        <div className="mt-0.5 rounded-full border border-blue-500/40 bg-blue-500/10 h-[2rem] w-[2rem] flex items-center justify-center p-1.5 text-blue-300">
                          <Bot size={13} />
                        </div>
                      ) : null}
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                          item.role === "assistant"
                            ? "app-card-subtle border text-slate-200"
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {item.role === "assistant" ? formatAssistantMessage(item.content) : displayText(item.content)}
                      </div>
                      {item.role === "user" ? (
                        <div className="app-card-subtle app-copy mt-0.5 flex h-[2rem] w-[2rem] items-center justify-center rounded-full border p-1.5">
                          <User size={13} />
                        </div>
                      ) : null}
                    </article>
                  ))}
                  {isIntakeLoading ? (
                    <article className="flex items-center gap-2" role="status" aria-label="Agent is typing">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-blue-500/40 bg-blue-500/10 text-blue-300">
                        <Bot size={13} />
                      </div>
                      <div className="app-card-subtle flex items-center rounded-xl border px-4 py-3">
                        <span className="intake-typing-dots" aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </span>
                      </div>
                    </article>
                  ) : null}
                  <div ref={messagesAnchorRef} />
                </div>

                <div className="mt-3 shrink-0 flex items-end gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept={SIMULATION_UPLOAD_ACCEPT}
                  />
                  <textarea
                    rows={2}
                    value={chatInput}
                    disabled={isUploadLoading}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Reply with details about your startup..."
                    className="theme-input w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handlePickFile}
                    disabled={isIntakeLoading || simulationStage || isUploadLoading}
                    className="app-ghost-btn inline-flex h-10 w-10 items-center justify-center rounded-full border transition"
                    title="Upload supporting file"
                  >
                    {isUploadLoading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={isIntakeLoading || !chatInput.trim()}
                    className="app-primary-btn inline-flex h-10 w-10 items-center justify-center rounded-full transition"
                  >
                    <Send size={14} />
                  </button>
                </div>

              </div>
            )}
          </div>

          <aside className="app-card-alt min-h-0 overflow-y-auto border-l p-4 sm:p-6">
            <div className="mb-6 flex items-start gap-3">
              <div className="app-card-subtle app-copy mt-0.5 rounded-full border p-2">
                {simulationStage ? <Rocket size={16} /> : <Bot size={16} />}
              </div>
              <div>
                <p className="app-muted mb-1 text-[11px] uppercase tracking-[0.18em]">
                  {simulationStage ? "Agentic Runtime" : "Intake Guidance"}
                </p>
                <p className="app-copy text-xs">
                  {simulationStage
                    ? "Watch each board advisor evaluate your strategy."
                    : "Answer naturally. The system extracts fields and asks the next needed question."}
                </p>
              </div>
            </div>

            {simulationStage && isSimulationComplete && runtimeAgents.length > 0 ? (
              <div className="space-y-3 h-[10rem] overflow-auto">
                {runtimeAgents.map((agent) => (
                  <p key={agent.perspective} className="app-copy flex gap-2 text-xs">
                    <Lightbulb size={13} className="mt-0.5 shrink-0 text-yellow-300/80" />
                    <span>
                      <span className="text-slate-200">{agent.perspective}:</span> {agent.summary}
                    </span>
                  </p>
                ))}
              </div>
            ) : (
              <div className="space-y-3 h-[10rem] overflow-auto">
                {collectedPreview.map((item) => (
                  <article key={item.label} className="app-card-subtle rounded-lg border px-3 py-2.5">
                    <p className="app-muted text-[10px] uppercase tracking-[0.18em]">{item.label}</p>
                    <p className="app-copy mt-1 text-xs">{item.value}</p>
                  </article>
                ))}
              </div>
            )}

            <div className="app-card-subtle mt-4 rounded-xl border p-4">
              <p className="app-muted text-[10px] uppercase tracking-[0.18em]">Simulation Status</p>
              <div className="app-copy mt-2 flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                <span>
                  {simulationStage
                    ? isSimulationComplete
                      ? "completed"
                      : "running simulation"
                    : intakeReady
                    ? "ready to run"
                    : "collecting required fields"}
                </span>
              </div>
              {!simulationStage && missingFields.length > 0 ? (
                <p className="app-muted mt-2 text-xs">Missing: {missingFields.map(displayText).filter(Boolean).join(", ")}</p>
              ) : null}
            </div>

            {simulationStage && isSimulationComplete && runtimeSynthesis ? (
              <div className="app-card-subtle mt-4 rounded-xl border p-4">
                <p className="app-muted text-[10px] uppercase tracking-[0.18em]">Board Synthesis</p>
                <p className="app-copy mt-2 text-xs">{runtimeSynthesis}</p>
              </div>
            ) : null}

            {simulationStage && isSimulationComplete && runtimeRecommendations.length > 0 ? (
              <div className="app-card-subtle mt-4 rounded-xl border p-4">
                <p className="app-muted text-[10px] uppercase tracking-[0.18em]">Recommended Next Steps</p>
                <div className="mt-2 space-y-1.5">
                  {runtimeRecommendations.map((item) => (
                    <p key={item} className="app-copy text-xs">- {item}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {simulationStage && isSimulationComplete ? (
              <div className="app-status-success mt-4 rounded-lg border px-3 py-2 text-xs">
                Simulation complete. Review outputs and confirm to close.
              </div>
            ) : null}

            {bannerMessage && (
              <div className="app-status-info mt-4 rounded-lg border px-3 py-2 text-xs">
                {bannerMessage}
              </div>
            )}
          </aside>
        </div>

        <footer className="app-modal-section flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
          {simulationStage ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="app-ghost-btn rounded-full border px-4 py-2 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isSimulationComplete}
                onClick={handleConfirmClose}
                className="app-success-btn rounded-full px-5 py-2 text-xs font-semibold transition"
              >
                Confirm & Close
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="app-ghost-btn rounded-full border px-4 py-2 text-xs font-semibold transition"
              >
                Back to Dashboard
              </button>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleOpenRequirements}
                  className="app-ghost-btn inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition"
                >
                  <ListChecks size={13} />
                  Requirements
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="app-ghost-btn inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition"
                >
                  <Save size={13} />
                  Save Draft
                </button>
                <button
                  type="button"
                  disabled={isRunning || !intakeReady}
                  onClick={handleLaunch}
                  className="app-primary-btn inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition"
                >
                  {isRunning ? "Launching..." : "Run Simulation"}
                  <Rocket size={13} />
                </button>
              </div>
            </>
          )}
        </footer>
      </section>
      {requirementsOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setRequirementsOpen(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="simulation-requirements-title" className="theme-modal w-full max-w-xl overflow-hidden rounded-2xl border shadow-2xl">
            <header className="app-modal-section flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 id="simulation-requirements-title" className="app-heading text-base font-semibold">Simulation requirements</h3>
                <p className="app-muted mt-1 text-xs">The agent will work through every field. You can explicitly ask it to run with any details still missing.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyRequirements}
                  disabled={!requirements || requirementsLoading}
                  className="app-ghost-btn inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {requirementsCopied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                  {requirementsCopied ? "Copied" : "Copy list"}
                </button>
                <button type="button" onClick={() => setRequirementsOpen(false)} aria-label="Close requirements" className="app-ghost-btn rounded-full border p-2">
                  <X size={14} />
                </button>
              </div>
            </header>
            <div className="app-modal-section max-h-[65vh] space-y-5 overflow-y-auto p-5">
              {requirementsLoading ? <p className="app-copy text-sm">Loading requirements...</p> : null}
              {requirementsError ? <p className="app-status-info rounded-lg border p-3 text-sm">{requirementsError}</p> : null}
              {requirements ? (
                <>
                  <div>
                    <h4 className="app-heading mb-2 text-sm font-semibold">Important for a complete simulation</h4>
                    <ul className="space-y-3">
                      {requirements.required.map((field) => (
                        <li key={field.key} className="app-card-subtle rounded-lg border p-3">
                          <p className="app-heading text-sm font-medium">{field.label}</p>
                          {field.description ? <p className="app-copy mt-1 text-xs">{field.description}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {requirements.additional_context.length ? (
                    <div>
                      <h4 className="app-heading mb-2 text-sm font-semibold">Additional context</h4>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {requirements.additional_context.map((field) => (
                          <li key={field.key} className="app-card-subtle rounded-lg border px-3 py-2">
                            <p className="app-copy text-xs">{field.label}</p>
                            {field.description ? <p className="app-muted mt-1 text-[11px]">{field.description}</p> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
