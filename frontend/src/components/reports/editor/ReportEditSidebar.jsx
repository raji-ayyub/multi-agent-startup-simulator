import { Plus } from "lucide-react";

export default function ReportEditSidebar({
  toolItems,
  activeSectionId,
  activeBlockId,
  onInsertBlock,
  sections,
  onSelectSection,
  onSelectBlock,
  onAddSection,
}) {
  return (
    <aside className="w-[280px] shrink-0 border-r border-slate-800 bg-[#0d1218]">
      <div className="h-full overflow-y-auto px-3 py-3">
        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Tools</p>
          <div className="space-y-1.5">
            {toolItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onInsertBlock(item.key)}
                disabled={!activeSectionId}
                className="flex w-full items-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-2.5 py-2 text-left text-xs font-semibold transition hover:border-cyan-500/80 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Sections</p>
            <button
              type="button"
              onClick={onAddSection}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-1.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-cyan-500/80 hover:text-cyan-200"
            >
              <Plus size={11} />
              Add
            </button>
          </div>
          <div className="space-y-1.5">
            {sections.map((section) => (
              <div key={section.section_id} className="rounded-md border border-slate-800 bg-slate-950/30 p-1.5">
                <button
                  type="button"
                  onClick={() => onSelectSection(section.section_id)}
                  className={`w-full rounded px-2 py-1.5 text-left transition ${
                    activeSectionId === section.section_id && !activeBlockId
                      ? "bg-cyan-500/15 text-cyan-100"
                      : "text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Section</p>
                  <p className="mt-0.5 truncate text-xs font-semibold">{section.title || "Untitled Section"}</p>
                </button>
                {activeSectionId === section.section_id && Array.isArray(section.blocks) && section.blocks.length > 0 ? (
                  <div className="mt-1 space-y-1 border-t border-slate-800 pt-1">
                    {section.blocks.map((block) => (
                      <button
                        key={block.block_id}
                        type="button"
                        onClick={() => onSelectBlock(section.section_id, block.block_id)}
                        className={`w-full rounded px-2 py-1.5 text-left text-xs transition ${
                          activeBlockId === block.block_id
                            ? "bg-cyan-500/15 text-cyan-100"
                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        }`}
                      >
                        <span className="uppercase tracking-wide">{String(block.type || "block").replaceAll("_", " ")}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
