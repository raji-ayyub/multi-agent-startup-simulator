import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import useSimulationStore from "../../store/simulationStore";

export default function IdeaForm() {
  const navigate = useNavigate();
  const {
    startupIdea,
    updateField,
    startSimulation,
    isRunning,
    addAdditionalField,
    updateAdditionalField,
    removeAdditionalField,
  } = useSimulationStore();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!startupIdea.name || !startupIdea.problem) {
      toast.error("Startup Name and Problem Statement are required.");
      return;
    }

    await startSimulation();
    navigate("/simulation/run");
  };

  return (
    <div className="app-view mx-auto max-w-5xl space-y-10 px-4 py-10">
      <div>
        <h1 className="app-heading text-3xl font-bold">New Startup Simulation</h1>
        <p className="app-copy mt-2">
          Define your startup strategy to begin multi-agent analysis.
        </p>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="app-card space-y-8 rounded-2xl border p-10 shadow-xl"
      >
        <InputField
          label="Startup Name"
          required
          value={startupIdea.name}
          onChange={(value) => updateField("name", value)}
        />

        <TextAreaField
          label="Problem Statement"
          required
          value={startupIdea.problem}
          onChange={(value) => updateField("problem", value)}
        />

        <TextAreaField
          label="Target Market"
          value={startupIdea.targetMarket}
          onChange={(value) => updateField("targetMarket", value)}
        />

        <InputField
          label="Revenue Model"
          value={startupIdea.revenueModel}
          onChange={(value) => updateField("revenueModel", value)}
        />

        <TextAreaField
          label="Competitive Advantage"
          value={startupIdea.competitiveAdvantage}
          onChange={(value) => updateField("competitiveAdvantage", value)}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="app-heading text-lg font-semibold">Additional Details (Optional)</h3>
            <button
              type="button"
              onClick={addAdditionalField}
              className="app-ghost-btn rounded-lg border px-3 py-1 text-sm transition"
            >
              + Add Field
            </button>
          </div>

          {startupIdea.additionalInfo?.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className="app-card-subtle grid grid-cols-1 items-center gap-4 rounded-xl border p-4 md:grid-cols-2"
            >
              <input
                placeholder="Label (e.g., Timeline)"
                value={item.label}
                onChange={(event) => updateAdditionalField(index, "label", event.target.value)}
                className="theme-input rounded-lg border px-3 py-2 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex gap-2">
                <input
                  placeholder="Value"
                  value={item.value}
                  onChange={(event) => updateAdditionalField(index, "value", event.target.value)}
                  className="theme-input flex-1 rounded-lg border px-3 py-2 focus:outline-none focus:border-indigo-500"
                />

                <button
                  type="button"
                  onClick={() => removeAdditionalField(index)}
                  className="app-danger-btn rounded-lg px-3 py-2 text-sm font-semibold transition"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={isRunning}
          className="app-primary-btn w-full rounded-xl py-3 font-semibold transition-all"
        >
          {isRunning ? "Initializing Agents..." : "Run Multi-Agent Simulation"}
        </button>
      </motion.form>
    </div>
  );
}

function InputField({ label, value, onChange, required }) {
  return (
    <div>
      <label className="app-copy mb-2 block text-sm">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="theme-input w-full rounded-xl border px-4 py-3 transition focus:outline-none focus:border-indigo-500"
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange, required }) {
  return (
    <div>
      <label className="app-copy mb-2 block text-sm">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="theme-input w-full resize-none rounded-xl border px-4 py-3 transition focus:outline-none focus:border-indigo-500"
      />
    </div>
  );
}
