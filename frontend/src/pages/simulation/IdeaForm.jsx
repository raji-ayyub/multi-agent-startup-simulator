// import { useNavigate } from "react-router-dom";
// import { motion } from "framer-motion";
// import useSimulationStore from "../../store/simulationStore";

// export default function IdeaForm() {
//   const navigate = useNavigate();
//   const { startupIdea, updateField, startSimulation } = useSimulationStore();

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     startSimulation();
//     navigate("/simulation/run");
//   };

//   return (
//     <div className="max-w-4xl mx-auto space-y-8">
//       <div>
//         <h1 className="text-3xl font-bold">New Startup Simulation</h1>
//         <p className="text-slate-400 mt-2">
//           Define your startup strategy to begin analysis
//         </p>
//       </div>

//       <motion.form
//         onSubmit={handleSubmit}
//         initial={{ opacity: 0, y: 15 }}
//         animate={{ opacity: 1, y: 0 }}
//         className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6"
//       >
//         <InputField
//           label="Startup Name"
//           value={startupIdea.name}
//           onChange={(val) => updateField("name", val)}
//         />

//         <TextAreaField
//           label="Problem Statement"
//           value={startupIdea.problem}
//           onChange={(val) => updateField("problem", val)}
//         />

//         <TextAreaField
//           label="Target Market"
//           value={startupIdea.targetMarket}
//           onChange={(val) => updateField("targetMarket", val)}
//         />

//         <InputField
//           label="Revenue Model"
//           value={startupIdea.revenueModel}
//           onChange={(val) => updateField("revenueModel", val)}
//         />

//         <TextAreaField
//           label="Competitive Advantage"
//           value={startupIdea.competitiveAdvantage}
//           onChange={(val) => updateField("competitiveAdvantage", val)}
//         />

//         <button
//           type="submit"
//           className="w-full bg-indigo-600 hover:bg-indigo-500 transition py-3 rounded-xl font-semibold"
//         >
//           Run Multi-Agent Simulation
//         </button>
//       </motion.form>
//     </div>
//   );
// }

// function InputField({ label, value, onChange }) {
//   return (
//     <div>
//       <label className="block text-sm text-slate-400 mb-2">{label}</label>
//       <input
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
//       />
//     </div>
//   );
// }

// function TextAreaField({ label, value, onChange }) {
//   return (
//     <div>
//       <label className="block text-sm text-slate-400 mb-2">{label}</label>
//       <textarea
//         rows={4}
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
//       />
//     </div>
//   );
// }




import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!startupIdea.name || !startupIdea.problem) {
      alert("Startup Name and Problem Statement are required.");
      return;
    }

    await startSimulation();
    navigate("/simulation/run");
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          🚀 New Startup Simulation
        </h1>
        <p className="text-slate-400 mt-2">
          Define your startup strategy to begin multi-agent analysis.
        </p>
      </div>

      {/* Form */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-10 space-y-8 shadow-xl"
      >
        <InputField
          label="Startup Name"
          required
          value={startupIdea.name}
          onChange={(val) => updateField("name", val)}
        />

        <TextAreaField
          label="Problem Statement"
          required
          value={startupIdea.problem}
          onChange={(val) => updateField("problem", val)}
        />

        <TextAreaField
          label="Target Market"
          value={startupIdea.targetMarket}
          onChange={(val) => updateField("targetMarket", val)}
        />

        <InputField
          label="Revenue Model"
          value={startupIdea.revenueModel}
          onChange={(val) => updateField("revenueModel", val)}
        />

        <TextAreaField
          label="Competitive Advantage"
          value={startupIdea.competitiveAdvantage}
          onChange={(val) => updateField("competitiveAdvantage", val)}
        />

        {/* ---------- Additional Dynamic Fields ---------- */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              🧩 Additional Details (Optional)
            </h3>

            <button
              type="button"
              onClick={addAdditionalField}
              className="text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg transition"
            >
              + Add Field
            </button>
          </div>

          {startupIdea.additionalInfo?.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-2 gap-4 items-center bg-slate-800 p-4 rounded-xl border border-slate-700"
            >
              <input
                placeholder="Label (e.g., Timeline)"
                value={item.label}
                onChange={(e) =>
                  updateAdditionalField(index, "label", e.target.value)
                }
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex gap-2">
                <input
                  placeholder="Value"
                  value={item.value}
                  onChange={(e) =>
                    updateAdditionalField(index, "value", e.target.value)
                  }
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                />

                <button
                  type="button"
                  onClick={() => removeAdditionalField(index)}
                  className="text-red-500 hover:text-red-400 font-bold"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isRunning}
          className={`w-full py-3 rounded-xl font-semibold transition-all ${
            isRunning
              ? "bg-slate-700 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-500"
          }`}
        >
          {isRunning
            ? "Initializing Agents..."
            : "Run Multi-Agent Simulation"}
        </button>
      </motion.form>
    </div>
  );
}

/* ---------------- Reusable Components ---------------- */

function InputField({ label, value, onChange, required }) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 
        focus:outline-none focus:border-indigo-500 transition"
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange, required }) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 
        focus:outline-none focus:border-indigo-500 transition resize-none"
      />
    </div>
  );
}

