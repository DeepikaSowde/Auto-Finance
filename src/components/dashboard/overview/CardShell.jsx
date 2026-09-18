// src/components/dashboard/overview/CardShell.jsx
//
// Shared card frame for the redesigned dashboard's chart/stat cards, so
// every card shares the same header layout, padding and border treatment.

const CardShell = ({ icon: Icon, iconBg = "#EAF5EF", iconColor = "#0B5D3B", title, subtitle, right, children, className = "" }) => {
  return (
    <section
      className={`flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-4 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: iconBg }}
            >
              <Icon size={16} strokeWidth={2} style={{ color: iconColor }} />
            </div>
          )}

          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-[#17221D]">{title}</h3>

            {subtitle && <p className="text-[9px] text-slate-400">{subtitle}</p>}
          </div>
        </div>

        {right && <div className="shrink-0">{right}</div>}
      </div>

      <div className="mt-3 min-h-0 flex-1">{children}</div>
    </section>
  );
};

export default CardShell;
