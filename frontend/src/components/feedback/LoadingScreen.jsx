import { Loader2 } from "lucide-react";

export default function LoadingScreen({
  message = "Loading...",
  mode = "page",
  className = "",
}) {
  const isFullPage = mode === "full";
  const baseClass = isFullPage
    ? "flex min-h-[100dvh] items-center justify-center"
    : "flex min-h-[280px] items-center justify-center rounded-2xl border app-card";

  return (
    <div className={`${baseClass} ${className}`.trim()}>
      <p className="app-muted inline-flex items-center gap-2 text-sm">
        <Loader2 size={16} className="animate-spin" />
        {message}
      </p>
    </div>
  );
}

