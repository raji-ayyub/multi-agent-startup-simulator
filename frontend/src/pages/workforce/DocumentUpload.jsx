import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useWorkforceStore from "../../store/workforceStore";
import { generateFakeAnalysis } from "../../utils/fakeAnalyzer";

export default function DocumentUpload() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState(""); // AI message text
  const navigate = useNavigate();
  const setAnalysis = useWorkforceStore((s) => s.setAnalysis);

  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (!allowedTypes.includes(selected.type)) {
      setError("Only PDF, DOC, DOCX, or TXT files are allowed.");
      setFile(null);
      return;
    }

    setError("");
    setFile(selected);
  };

  const simulateTyping = (message, callback) => {
    let index = 0;
    setAiMessage("");
    const interval = setInterval(() => {
      setAiMessage((prev) => prev + message[index]);
      index++;
      if (index === message.length) {
        clearInterval(interval);
        if (callback) callback();
      }
    }, 50); // 50ms per character
  };

  const handleAnalyze = () => {
    if (!file) {
      setError("Please upload a valid document.");
      return;
    }

    setError("");
    setLoading(true);

    // Simulate AI analysis delay with typing
    const fakeResult = generateFakeAnalysis(file.name);

    simulateTyping(
      "Analyzing document… evaluating skills, leadership, and promotion readiness.",
      () => {
        // After typing completes, wait 1s then store result and navigate
        setTimeout(() => {
          setAnalysis(fakeResult);
          navigate("/workforce/dashboard");
        }, 1000);
      }
    );
  };

  return (
    <div className="p-10 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Upload Employee Document</h2>

      <input
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleFileChange}
        className="mb-4"
        disabled={loading}
      />

      {file && <p className="text-green-600 mb-4">Selected: {file.name}</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <button
        onClick={handleAnalyze}
        className="bg-blue-600 text-white px-6 py-2 rounded flex items-center justify-center"
        disabled={loading || !file}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <TypingDots />
            AI is analyzing…
          </span>
        ) : (
          "Analyze Document"
        )}
      </button>

      {/* AI Message Preview */}
      {aiMessage && (
        <div className="mt-6 p-4 bg-slate-800 rounded text-slate-200">
          {aiMessage}
        </div>
      )}
    </div>
  );
}

// Typing dots animation
function TypingDots() {
  return (
    <span className="flex gap-1">
      <span className="animate-bounce">.</span>
      <span className="animate-bounce animation-delay-150">.</span>
      <span className="animate-bounce animation-delay-300">.</span>
    </span>
  );
}
