import { useState } from "react";

export default function DocumentUpload() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
    "application/rtf",
    "text/rtf",
  ];

  const handleFileChange = (event) => {
    const selected = event.target.files[0];
    if (!selected) return;

    if (!allowedTypes.includes(selected.type)) {
      setError("Only PDF, DOC, DOCX, TXT, MD, or RTF files are allowed.");
      setFile(null);
      return;
    }

    setError("");
    setFile(selected);
  };

  const handleAnalyze = () => {
    if (!file) {
      setError("Please upload a valid document.");
      return;
    }
    setError("Workforce document analysis is not connected to a production analysis service yet.");
  };

  return (
    <div className="app-view mx-auto max-w-xl p-10">
      <div className="app-card space-y-6 rounded-2xl border p-8">
        <h2 className="app-heading mb-6 text-2xl font-bold">Upload Employee Document</h2>

        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md,.rtf"
          onChange={handleFileChange}
          className="theme-input w-full rounded-xl border px-4 py-3"
        />

        {file ? <p className="app-status-success rounded-lg px-3 py-2 text-sm">Selected: {file.name}</p> : null}
        {error ? <p className="app-status-danger rounded-lg px-3 py-2 text-sm">{error}</p> : null}

        <button
          type="button"
          onClick={handleAnalyze}
          className="app-primary-btn flex items-center justify-center rounded px-6 py-2"
          disabled={!file}
        >
          Analyze Document
        </button>
      </div>
    </div>
  );
}
