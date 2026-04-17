import { Plus } from "lucide-react";

function pageLabel(page) {
  if (!page?.items?.length) return "Empty page";
  if (page.items.some((item) => item.kind === "cover")) return "Cover";
  const sectionTitles = page.items
    .filter((item) => item.kind === "section")
    .map((item) => item.title)
    .filter(Boolean);
  if (sectionTitles.length === 0) return "Content blocks";
  const first = sectionTitles[0];
  return sectionTitles.length > 1 ? `${first} +${sectionTitles.length - 1}` : first;
}

export default function ReportEditSidebar({
  toolItems,
  activeSectionId,
  onInsertBlock,
  sections,
  onSelectSection,
  onAddSection,
  pages,
  activePageIndex,
  onScrollToPage,
}) {
  return (
    <aside className="w-[260px] shrink-0 border-r border-slate-800 bg-[#0d1218]">
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
              <button
                key={section.section_id}
                type="button"
                onClick={() => onSelectSection(section.section_id)}
                className={`w-full rounded-md border px-2.5 py-2 text-left transition ${
                  activeSectionId === section.section_id
                    ? "border-cyan-500 bg-cyan-500/15 text-cyan-100"
                    : "border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Section</p>
                <p className="mt-0.5 truncate text-xs font-semibold">{section.title || "Untitled Section"}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Pages</p>
          <div className="space-y-1.5">
            {pages.map((page) => (
              <button
                key={page.pageIndex}
                type="button"
                onClick={() => onScrollToPage(page.pageIndex)}
                className={`w-full rounded-md border px-2.5 py-2 text-left transition ${
                  activePageIndex === page.pageIndex
                    ? "border-cyan-500 bg-cyan-500/15 text-cyan-100"
                    : "border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
                }`}
              >
                <p className="text-[11px] font-semibold">Page {page.pageIndex + 1}</p>
                <p className="mt-0.5 truncate text-xs text-slate-400">{pageLabel(page)}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
