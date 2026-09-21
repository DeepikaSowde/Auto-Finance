// src/components/Toaster.jsx

import { CheckCircle2, XCircle, Info, X } from "lucide-react";

import { useToast } from "../context/ToastContext";

const TONES = {
  success: { icon: CheckCircle2, bg: "#0B6B43", ring: "#EAF5EF" },
  error: { icon: XCircle, bg: "#D92D3A", ring: "#FDE2E2" },
  info: { icon: Info, bg: "#4779D8", ring: "#E1ECFD" },
};

const Toaster = () => {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => {
        const tone = TONES[toast.type] || TONES.success;
        const Icon = tone.icon;

        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-lg"
            style={{ boxShadow: `0 4px 20px -6px ${tone.bg}55` }}
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{ background: tone.ring }}
            >
              <Icon size={14} strokeWidth={2.2} style={{ color: tone.bg }} />
            </span>

            <p className="min-w-0 flex-1 text-[12.5px] font-medium leading-snug text-[#17221D]">
              {toast.message}
            </p>

            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="shrink-0 rounded-md p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Toaster;
