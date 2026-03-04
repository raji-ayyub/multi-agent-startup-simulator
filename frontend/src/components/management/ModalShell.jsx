import { X } from "lucide-react";

export default function ModalShell({ title, subtitle = "", onClose, children, maxWidth = "max-w-3xl" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <section
        className={`relative z-10 flex max-h-[92vh] w-full ${maxWidth} flex-col overflow-hidden rounded-3xl border border-slate-700 bg-[#0b1322] shadow-2xl`}
      >
        <header className="border-b border-slate-800 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-white">{title}</h3>
              {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-700 p-2 text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
            >
              <X size={14} />
            </button>
          </div>
        </header>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </section>
    </div>
  );
}
