import { useEffect, useMemo, useRef, useState } from "react";
import {
  Paperclip,
  Bot,
  CheckCircle2,
  Cpu,
  Lightbulb,
  Loader2,
  Monitor,
  Rocket,
  Save,
  Send,
  User,
  X,
} from "lucide-react";
import useSimulationStore from "../store/simulationStore";

const DEFAULT_FORM = {
  startupName: "",
  elevatorPitch: "",
  problemStatement: "",
  targetAudience: "",
  problemUrgency: "HIGH",
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

const FALLBACK_LOGS = [
  { role: "IDENTITY DETECTED", message: "All agents on board.." },
  { role: "MARKET ANALYST", message: "Calculating market scenarios..." },
  { role: "CUSTOMER AGENT", message: "Simulating target persona responses..." },
  { role: "INVESTOR AGENT", message: "Scoring growth and runway..." },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function EnvisioningModal({ onClose, onSimulationLaunched }) {
  const {
    isRunning,
    saveDraft,
    loadDraft,
    clearDraft,
    launchSimulationFromBrief,
    patchIdeaFields,
    runIntakeTurn,
    simulationError,
  } = useSimulationStore();

  const bootDraft = loadDraft();
  const [form, setForm] = useState({ ...DEFAULT_FORM, ...(bootDraft || {}) });
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isIntakeLoading, setIsIntakeLoading] = useState(false);
  const [intakeReady, setIntakeReady] = useState(false);
  const [completion, setCompletion] = useState(0);
  const [missingFields, setMissingFields] = useState([]);
  const [bannerMessage, setBannerMessage] = useState("");
  const [simulationStage, setSimulationStage] = useState(false);
  const [visibleLogCount, setVisibleLogCount] = useState(0);
  const [isSimulationComplete, setIsSimulationComplete] = useState(false);
  const [runtimeLogs, setRuntimeLogs] = useState(FALLBACK_LOGS);
  const [runtimeSynthesis, setRuntimeSynthesis] = useState("");
  const [runtimeRecommendations, setRuntimeRecommendations] = useState([]);
  const [runtimeAgents, setRuntimeAgents] = useState([]);
  const [isUploadLoading, setIsUploadLoading] = useState(false);
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

  const showRunDecisionActions = useMemo(() => {
    if (simulationStage || isIntakeLoading || messages.length === 0) return false;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return false;
    const content = String(last.content || "").toLowerCase();
    return (
      content.includes("do you want me to run simulation now") ||
      content.includes("do you want me to run simulation") ||
      content.includes("tell me when to run simulation")
    );
  }, [messages, simulationStage, isIntakeLoading]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setIsIntakeLoading(true);
      try {
        const response = await runIntakeTurn({
          draft: form,
          userMessage: "",
          history: [],
        });
        if (!active) return;
        setForm((prev) => ({ ...prev, ...(response?.collected_fields || {}) }));
        setMessages([
          {
            role: "assistant",
            content:
              response?.assistant_message ||
              "Tell me about your startup idea and I will collect what is needed for simulation.",
          },
        ]);
        setIntakeReady(Boolean(response?.ready_to_run));
        setCompletion(Number(response?.completion_percent || 0));
        setMissingFields(Array.isArray(response?.missing_fields) ? response.missing_fields : []);
      } catch (error) {
        if (!active) return;
        setMessages([
          {
            role: "assistant",
            content: "Tell me about your startup idea and I will collect what is needed for simulation.",
          },
        ]);
      } finally {
        if (active) setIsIntakeLoading(false);
      }
    };

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    messagesAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const launchSimulation = async (launchForm) => {
    setSimulationStage(true);
    setVisibleLogCount(1);
    setIsSimulationComplete(false);
    setBannerMessage("");
    setRuntimeLogs(FALLBACK_LOGS);
    setRuntimeSynthesis("");
    setRuntimeRecommendations([]);
    setRuntimeAgents([]);

    try {
      const result = await launchSimulationFromBrief(launchForm);
      const resultLogs = Array.isArray(result?.logs) && result.logs.length > 0 ? result.logs : FALLBACK_LOGS;
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
      setBannerMessage(simulationError || "Unable to launch simulation. Please try again.");
    }
  };

  const submitMessage = async (content) => {
    if (!content || isIntakeLoading || simulationStage) return;

    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setIsIntakeLoading(true);
    setBannerMessage("");

    try {
      const response = await runIntakeTurn({
        draft: form,
        userMessage: content,
        history: nextMessages.map((item) => ({ role: item.role, content: item.content })),
      });

      const mergedForm = { ...form, ...(response?.collected_fields || {}) };
      setForm(mergedForm);
      patchIdeaFields(response?.collected_fields || {});
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response?.assistant_message || "Noted. Continue." },
      ]);
      setIntakeReady(Boolean(response?.ready_to_run));
      setCompletion(Number(response?.completion_percent || 0));
      setMissingFields(Array.isArray(response?.missing_fields) ? response.missing_fields : []);

      if (response?.ready_to_run && !simulationStage && !isRunning) {
        await launchSimulation(mergedForm);
      }
    } catch (error) {
      setBannerMessage(simulationError || "Unable to process your message. Try again.");
    } finally {
      setIsIntakeLoading(false);
    }
  };

  const handleSend = async () => {
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
      const maxBytes = 2 * 1024 * 1024;
      if (file.size > maxBytes) {
        setBannerMessage("File too large. Please upload files up to 2MB.");
        return;
      }

      const fileText = await file.text();
      const trimmed = fileText.trim();
      if (!trimmed) {
        setBannerMessage("Uploaded file is empty.");
        return;
      }

      const clipped = trimmed.slice(0, 6000);
      const uploadMessage = `Uploaded file: ${file.name}\n\n${clipped}`;
      await submitMessage(uploadMessage);
    } catch (error) {
      setBannerMessage("Unable to read that file. Try a text-based file.");
    } finally {
      setIsUploadLoading(false);
    }
  };

  const handleSaveDraft = () => {
    saveDraft(form);
    patchIdeaFields(form);
    setBannerMessage("Draft saved.");
  };

  const handleQuickRunNow = async () => {
    await submitMessage("Run simulation now.");
  };

  const handleQuickAddMore = async () => {
    await submitMessage("I want to add more details first.");
  };

  const handleLaunch = async () => {
    if (!intakeReady) {
      setBannerMessage("Complete required answers first.");
      return;
    }
    await launchSimulation(form);
  };

  const visibleLogs = runtimeLogs.slice(0, visibleLogCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />

      <section className="relative z-10 flex w-full max-w-6xl max-h-[94vh] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-[#080b11] text-slate-100 shadow-[0_24px_70px_rgba(0,0,0,0.65)]">
        <header className="border-b border-slate-800 px-6 py-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-xs font-bold text-white">
                <img
                  src="/images/Icon.svg"
                  alt="Logo"
                  className="min-w-8 h-8 bg-black p-1 rounded-lg"
                />
              </div>
              <span className="font-medium text-slate-200">
                PentraAI <span className="mx-1 text-slate-600">/</span> {simulationStage ? "Simulation" : "AI Intake"}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-700 p-2 text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
            >
              <X size={15} />
            </button>
          </div>

          <div className="mb-2 flex items-end justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">
              {simulationStage ? "Loading Agents.." : "Describe your startup in chat"}
            </h2>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {simulationStage ? "Agentic Runtime" : `${completion}% complete`}
            </p>
          </div>

          <div className="h-1.5 rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${simulationStage ? 100 : completion}%` }}
            />
          </div>
        </header>

        <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1.45fr_1fr]">
          <div className="border-r border-slate-800 p-6">
            {simulationStage ? (
              <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-blue-500/70 bg-blue-500/5">
                  <div className="absolute -top-1.5 h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.7)]" />
                  <Monitor size={30} className="text-blue-300" />
                </div>

                <div className="w-full max-w-[500px] rounded-xl border border-slate-800 bg-black/40 p-5 text-left">
                  <div className="mb-4 flex items-center gap-2 text-blue-300">
                    {isSimulationComplete ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Loader2 size={16} className="animate-spin" />
                    )}
                    <span className="text-sm font-medium">
                      {isSimulationComplete ? "Simulation completed." : "Running agent orchestration..."}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {visibleLogs.map((log, index) => {
                      const isLatest = index === visibleLogs.length - 1 && !isSimulationComplete;
                      return (
                        <article key={`${log.role}-${index}`} className="flex gap-2.5">
                          <Cpu size={14} className={`mt-0.5 ${isLatest ? "text-blue-300" : "text-slate-500"}`} />
                          <div>
                            <p className={`text-[11px] uppercase tracking-[0.16em] ${isLatest ? "text-blue-300" : "text-slate-500"}`}>
                              {log.role}
                            </p>
                            <p className="text-sm text-slate-300">{log.message}</p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-800 bg-black/35 p-4">
                  {messages.map((item, index) => (
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
                            ? "border border-slate-700 bg-slate-900/80 text-slate-200"
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {item.content}
                      </div>
                      {item.role === "user" ? (
                        <div className="mt-0.5 rounded-full border border-slate-600 bg-slate-800 p-1.5 w-[2rem] h-[2rem] flex items-center justify-center text-slate-300">
                          <User size={13} />
                        </div>
                      ) : null}
                    </article>
                  ))}
                  {isIntakeLoading ? (
                    <p className="text-xs text-slate-500">Assistant is thinking...</p>
                  ) : null}
                  <div ref={messagesAnchorRef} />
                </div>

                <div className="mt-4 flex items-end gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".txt,.md,.csv,.json,.log,text/plain,text/markdown,text/csv,application/json"
                  />
                  <textarea
                    rows={2}
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Reply with details about your startup..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handlePickFile}
                    disabled={isIntakeLoading || simulationStage || isUploadLoading}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition ${
                      isIntakeLoading || simulationStage || isUploadLoading
                        ? "cursor-not-allowed bg-slate-700 text-slate-500"
                        : "bg-slate-700 text-slate-100 hover:bg-slate-600"
                    }`}
                    title="Upload text file"
                  >
                    {isUploadLoading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={isIntakeLoading || !chatInput.trim()}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition ${
                      isIntakeLoading || !chatInput.trim()
                        ? "cursor-not-allowed bg-slate-700 text-slate-500"
                        : "bg-blue-600 text-white hover:bg-blue-500"
                    }`}
                  >
                    <Send size={14} />
                  </button>
                </div>

                {showRunDecisionActions ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleQuickRunNow}
                      disabled={isIntakeLoading || simulationStage}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        isIntakeLoading || simulationStage
                          ? "cursor-not-allowed bg-slate-700 text-slate-500"
                          : "bg-emerald-500 text-black hover:bg-emerald-400"
                      }`}
                    >
                      Run simulation now
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickAddMore}
                      disabled={isIntakeLoading || simulationStage}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        isIntakeLoading || simulationStage
                          ? "cursor-not-allowed bg-slate-700 text-slate-500"
                          : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                      }`}
                    >
                      Add more details
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <aside className="bg-[#0b1018] p-6">
            <div className="mb-6 flex items-start gap-3">
              <div className="mt-0.5 rounded-full border border-slate-600 p-2 text-slate-300">
                {simulationStage ? <Rocket size={16} /> : <Bot size={16} />}
              </div>
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {simulationStage ? "Agentic Runtime" : "Intake Guidance"}
                </p>
                <p className="text-xs text-slate-400">
                  {simulationStage
                    ? "Watch each board advisor evaluate your strategy."
                    : "Answer naturally. The system extracts fields and asks the next needed question."}
                </p>
              </div>
            </div>

            {simulationStage && isSimulationComplete && runtimeAgents.length > 0 ? (
              <div className="space-y-3 h-[10rem] overflow-auto">
                {runtimeAgents.map((agent) => (
                  <p key={agent.perspective} className="flex gap-2 text-xs text-slate-400">
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
                  <article key={item.label} className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                    <p className="mt-1 text-xs text-slate-300">{item.value}</p>
                  </article>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Simulation Status</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
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
                <p className="mt-2 text-xs text-slate-500">Missing: {missingFields.join(", ")}</p>
              ) : null}
            </div>

            {simulationStage && isSimulationComplete && runtimeSynthesis ? (
              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Board Synthesis</p>
                <p className="mt-2 text-xs text-slate-300">{runtimeSynthesis}</p>
              </div>
            ) : null}

            {simulationStage && isSimulationComplete && runtimeRecommendations.length > 0 ? (
              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Recommended Next Steps</p>
                <div className="mt-2 space-y-1.5">
                  {runtimeRecommendations.map((item) => (
                    <p key={item} className="text-xs text-slate-300">- {item}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {simulationStage && isSimulationComplete ? (
              <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                Simulation complete. Review outputs and confirm to close.
              </div>
            ) : null}

            {bannerMessage && (
              <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
                {bannerMessage}
              </div>
            )}
          </aside>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-800 px-6 py-4">
          {simulationStage ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isSimulationComplete}
                onClick={onClose}
                className={`rounded-full border px-5 py-2 text-xs font-semibold transition ${
                  isSimulationComplete
                    ? "border-emerald-500 text-emerald-300 hover:bg-emerald-500/10"
                    : "cursor-not-allowed border-slate-700 text-slate-500"
                }`}
              >
                Confirm & Close
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
              >
                Back to Dashboard
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
                >
                  <Save size={13} />
                  Save Draft
                </button>
                <button
                  type="button"
                  disabled={isRunning || !intakeReady}
                  onClick={handleLaunch}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white transition ${
                    isRunning || !intakeReady ? "cursor-not-allowed bg-slate-700" : "bg-blue-600 hover:bg-blue-500"
                  }`}
                >
                  {isRunning ? "Launching..." : "Run Simulation"}
                  <Rocket size={13} />
                </button>
              </div>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}
