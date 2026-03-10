import { X } from "lucide-react";

export default function ModalShell({ title, subtitle = "", onClose, children, maxWidth = "max-w-3xl" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-backdrop absolute inset-0 backdrop-blur-sm" onClick={onClose} />
      <section
        className={`theme-modal relative z-10 flex max-h-[92vh] w-full ${maxWidth} flex-col overflow-hidden rounded-3xl border`}
      >
        <header className="app-modal-section border-b px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="app-heading text-xl font-semibold">{title}</h3>
              {subtitle ? <p className="app-copy mt-1 text-sm">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="app-ghost-btn rounded-full border p-2 transition"
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
