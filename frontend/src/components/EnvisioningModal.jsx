import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Lightbulb,
  Loader2,
  Monitor,
  Rocket,
  Save,
  Target,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import useSimulationStore from "../store/simulationStore";

const STEP_META = [
  {
    id: "core",
    title: "01. What are you building?",
    subtitle: "Define the Core Problem",
    icon: Target,
    tipTitle: "Pro-Tip: Precision",
    tips: [
      "Avoid broad claims. State the exact operational pain point.",
      "Quantify impact where possible with time, cost, or conversion loss.",
    ],
    fields: ["startupName", "elevatorPitch", "problemStatement", "targetAudience"],
  },
  {
    id: "market",
    title: "02. Defining your reach?",
    subtitle: "Market Analysis",
    icon: TrendingUp,
    tipTitle: "Pro-Tip: Segment First",
    tips: [
      "Clear segment and geography reduce noisy assumptions in simulation.",
      "Call out current alternatives your audience uses today.",
    ],
    fields: ["primaryTargetSegment", "geography", "marketSizeEstimate", "customerBehaviorPainPoints"],
  },
  {
    id: "cost",
    title: "03. The math of survival",
    subtitle: "Estimated Cost",
    icon: Wallet,
    tipTitle: "Pro-Tip: Runway Logic",
    tips: [
      "Monthly burn and current cash define realistic runway constraints.",
      "Customer acquisition cost should reflect your first 90 days.",
    ],
    fields: ["monthlyBurn", "estimatedCac", "currentCashInHand", "marketingStrategy"],
  },
  {
    id: "review",
    title: "04. Review & Launch Simulation",
    subtitle: "Ready to Launch",
    icon: Rocket,
    tipTitle: "Pro-Tip: Launch With Intent",
    tips: [
      "Run with focused assumptions, then iterate each weak metric.",
      "Use one simulation per strategy variant for cleaner comparisons.",
    ],
    fields: [],
  },
];

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

const URGENCY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const AGENTIC_LOGS = [
  { role: "IDENTITY DETECTED", message: "All agents on board.." },
  { role: "MARKET ANALYST", message: "Calculating 1,000 market scenarios..." },
  { role: "RISK ANALYSIS", message: "Stress-testing unit economics..." },
  { role: "CUSTOMER AGENT", message: "Simulating target persona responses..." },
  { role: "INVESTOR AGENT", message: "Scoring growth, defensibility, and runway..." },
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
  } = useSimulationStore();

  const bootDraft = loadDraft();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState({ ...DEFAULT_FORM, ...(bootDraft || {}) });
  const [errors, setErrors] = useState({});
  const [bannerMessage, setBannerMessage] = useState("");
  const [simulationStage, setSimulationStage] = useState(false);
  const [visibleLogCount, setVisibleLogCount] = useState(0);
  const [isSimulationComplete, setIsSimulationComplete] = useState(false);

  const step = STEP_META[stepIndex];
  const progress = ((stepIndex + 1) / STEP_META.length) * 100;

  const reviewCards = useMemo(
    () => [
      { label: "Core Problem", value: form.problemStatement || "Not provided" },
      {
        label: "Market Segment",
        value: form.primaryTargetSegment && form.geography
          ? `${form.primaryTargetSegment} | ${form.geography}`
          : "Not provided",
      },
      {
        label: "Cost Baseline",
        value:
          form.monthlyBurn || form.currentCashInHand
            ? `Burn ${form.monthlyBurn || "$0"} | Cash ${form.currentCashInHand || "$0"}`
            : "Not provided",
      },
      { label: "Go-to-Market", value: form.marketingStrategy || "Not provided" },
    ],
    [form]
  );

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateStep = () => {
    const nextErrors = {};

    if (stepIndex === 0) {
      if (!form.startupName.trim()) nextErrors.startupName = "Startup name is required.";
      if (!form.problemStatement.trim()) nextErrors.problemStatement = "Problem statement is required.";
      if (!form.targetAudience.trim()) nextErrors.targetAudience = "Target audience is required.";
    }

    if (stepIndex === 1) {
      if (!form.primaryTargetSegment.trim()) nextErrors.primaryTargetSegment = "Primary target segment is required.";
      if (!form.geography.trim()) nextErrors.geography = "Geography is required.";
      if (!form.customerBehaviorPainPoints.trim()) {
        nextErrors.customerBehaviorPainPoints = "Customer behavior and pain points are required.";
      }
    }

    if (stepIndex === 2) {
      if (!form.monthlyBurn.trim()) nextErrors.monthlyBurn = "Monthly burn is required.";
      if (!form.currentCashInHand.trim()) nextErrors.currentCashInHand = "Current cash in hand is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setStepIndex((prev) => Math.min(prev + 1, STEP_META.length - 1));
  };

  const goBack = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleSaveDraft = () => {
    saveDraft(form);
    patchIdeaFields(form);
    setBannerMessage("Draft saved.");
  };

  const handleLaunch = async () => {
    const requiredFields = [
      "startupName",
      "problemStatement",
      "targetAudience",
      "primaryTargetSegment",
      "geography",
      "monthlyBurn",
      "currentCashInHand",
    ];
    const nextErrors = {};

    requiredFields.forEach((field) => {
      if (!String(form[field] || "").trim()) {
        nextErrors[field] = "Required";
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStepIndex(0);
      setBannerMessage("Complete required fields before launch.");
      return;
    }

    setSimulationStage(true);
    setVisibleLogCount(1);
    setIsSimulationComplete(false);
    setBannerMessage("");

    try {
      const logPlayback = (async () => {
        for (let index = 2; index <= AGENTIC_LOGS.length; index += 1) {
          await wait(850);
          setVisibleLogCount(index);
        }
      })();

      await Promise.all([launchSimulationFromBrief(form), logPlayback]);
      patchIdeaFields(form);
      clearDraft();
      setIsSimulationComplete(true);
      if (onSimulationLaunched) onSimulationLaunched(form);
    } catch (error) {
      setSimulationStage(false);
      setBannerMessage("Unable to launch simulation. Please try again.");
    }
  };

  const StepIcon = (simulationStage ? STEP_META[0].icon : step?.icon) || Rocket;
  const visibleLogs = AGENTIC_LOGS.slice(0, visibleLogCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />

      <section className="relative z-10 flex w-full max-w-6xl max-h-[94vh] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-[#080b11] text-slate-100 shadow-[0_24px_70px_rgba(0,0,0,0.65)]">
        <header className="border-b border-slate-800 px-6 py-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-xs font-bold text-white">
                P
              </div>
              <span className="font-medium text-slate-200">PentraAI <span className="mx-1 text-slate-600">/</span> {simulationStage ? "Simulation" : step.subtitle}</span>
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
            <h2 className="text-xl font-semibold text-white">{simulationStage ? "Loading Agents.." : step.title}</h2>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {simulationStage ? "Agentic Runtime" : `Step ${stepIndex + 1} of ${STEP_META.length}`}
            </p>
          </div>

          <div className="h-1.5 rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${simulationStage ? 100 : progress}%` }}
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
                        <article key={log.role} className="flex gap-2.5">
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
            ) : stepIndex === 0 && (
              <div className="space-y-5">
                <InputField
                  label="Startup Name"
                  value={form.startupName}
                  onChange={(value) => setField("startupName", value)}
                  error={errors.startupName}
                  placeholder="e.g. Lumina Analytics"
                />
                <InputField
                  label="Elevator Pitch"
                  value={form.elevatorPitch}
                  onChange={(value) => setField("elevatorPitch", value)}
                  placeholder="Describe your solution in one sentence..."
                />
                <TextAreaField
                  label="Problem Statement"
                  value={form.problemStatement}
                  onChange={(value) => setField("problemStatement", value)}
                  error={errors.problemStatement}
                  placeholder="What specific pain point are you addressing?"
                />
                <InputField
                  label="Target Audience"
                  value={form.targetAudience}
                  onChange={(value) => setField("targetAudience", value)}
                  error={errors.targetAudience}
                  placeholder="e.g. Growth-stage SaaS founders"
                />
                <div className="space-y-2">
                  <Label>Problem Urgency</Label>
                  <div className="grid grid-cols-4 rounded-xl border border-slate-700 bg-black/40 p-1">
                    {URGENCY_LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setField("problemUrgency", level)}
                        className={`rounded-lg py-2 text-[11px] font-semibold tracking-wide transition ${
                          form.problemUrgency === level
                            ? "border border-blue-500/40 bg-blue-500/10 text-blue-300"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {stepIndex === 1 && (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <InputField
                    label="Primary Target Segment"
                    value={form.primaryTargetSegment}
                    onChange={(value) => setField("primaryTargetSegment", value)}
                    error={errors.primaryTargetSegment}
                    placeholder="e.g. Enterprise SaaS & Logistics"
                  />
                  <InputField
                    label="Geography"
                    value={form.geography}
                    onChange={(value) => setField("geography", value)}
                    error={errors.geography}
                    placeholder="e.g. North America"
                  />
                </div>
                <InputField
                  label="Market Size Estimate (TAM)"
                  value={form.marketSizeEstimate}
                  onChange={(value) => setField("marketSizeEstimate", value)}
                  placeholder="e.g. $2.5B with 10% YoY growth"
                />
                <TextAreaField
                  label="Customer Behavior & Pain Points"
                  value={form.customerBehaviorPainPoints}
                  onChange={(value) => setField("customerBehaviorPainPoints", value)}
                  error={errors.customerBehaviorPainPoints}
                  placeholder="Describe current behaviors and blockers."
                />
                <TextAreaField
                  label="Competitor Patterns"
                  value={form.competitorPatterns}
                  onChange={(value) => setField("competitorPatterns", value)}
                  placeholder="Who is active and where are their gaps?"
                />
              </div>
            )}

            {stepIndex === 2 && (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <InputField
                    label="Monthly Burn"
                    value={form.monthlyBurn}
                    onChange={(value) => setField("monthlyBurn", value)}
                    error={errors.monthlyBurn}
                    placeholder="$25,000"
                  />
                  <InputField
                    label="Estimated CAC"
                    value={form.estimatedCac}
                    onChange={(value) => setField("estimatedCac", value)}
                    placeholder="$200"
                  />
                </div>
                <InputField
                  label="Current Cash In Hand"
                  value={form.currentCashInHand}
                  onChange={(value) => setField("currentCashInHand", value)}
                  error={errors.currentCashInHand}
                  placeholder="$600,000"
                />
                <TextAreaField
                  label="Marketing Strategy"
                  value={form.marketingStrategy}
                  onChange={(value) => setField("marketingStrategy", value)}
                  placeholder="Positioning, channels, and initial GTM motion."
                />
              </div>
            )}

            {stepIndex === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  Verify your key inputs before launching a high-fidelity simulation.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {reviewCards.map((card) => (
                    <article key={card.label} className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
                      <p className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">{card.label}</p>
                      <p className="text-sm text-slate-200">{card.value}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="bg-[#0b1018] p-6">
            <div className="mb-6 flex items-start gap-3">
              <div className="mt-0.5 rounded-full border border-slate-600 p-2 text-slate-300">
                <StepIcon size={16} />
              </div>
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {simulationStage ? STEP_META[0].tipTitle : step.tipTitle}
                </p>
                <p className="text-xs text-slate-400">
                  Better inputs improve simulation signal quality and recommendation confidence.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {(simulationStage ? STEP_META[0].tips : step.tips).map((tip) => (
                <p key={tip} className="flex gap-2 text-xs text-slate-400">
                  <Lightbulb size={13} className="mt-0.5 shrink-0 text-yellow-300/80" />
                  <span>{tip}</span>
                </p>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Simulation Status</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                <span>
                  {simulationStage
                    ? isSimulationComplete
                      ? "completed"
                      : "running simulation"
                    : isRunning
                    ? "launching simulation..."
                    : "waiting for launch input."}
                </span>
              </div>
            </div>

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
                    ? "border-blue-500 text-blue-300 hover:bg-blue-500/10"
                    : "cursor-not-allowed border-slate-700 text-slate-500"
                }`}
              >
                Completed
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={stepIndex === 0 ? onClose : goBack}
                className="inline-flex items-center gap-2 text-xs text-slate-400 transition hover:text-slate-200"
              >
                <ArrowLeft size={13} />
                {stepIndex === 0 ? "Back to Dashboard" : "Back"}
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

                {stepIndex < STEP_META.length - 1 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
                  >
                    Next
                    <ChevronRight size={13} />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isRunning}
                    onClick={handleLaunch}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white transition ${
                      isRunning ? "cursor-not-allowed bg-slate-700" : "bg-blue-600 hover:bg-blue-500"
                    }`}
                  >
                    {isRunning ? "Launching..." : "Launch Simulation"}
                    <Rocket size={13} />
                  </button>
                )}
              </div>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}

function Label({ children }) {
  return <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{children}</label>;
}

function InputField({ label, value, onChange, placeholder, error }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border bg-slate-900/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition ${
          error ? "border-red-500/60" : "border-slate-700 focus:border-blue-500"
        }`}
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder, error }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border bg-slate-900/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition ${
          error ? "border-red-500/60" : "border-slate-700 focus:border-blue-500"
        }`}
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
