// src/components/customers/CustomerPhotoViewer.jsx

import { useState } from "react";
import { X } from "lucide-react";

const CustomerPhotoViewer = ({ photo, name = "Customer" }) => {
  const [open, setOpen] = useState(false);

  if (!photo) return null;

  return (
    <>
      {/* Small Customer Photo */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative h-40 w-40 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
      >
        <img
          src={photo}
          alt={name}
          className="h-full w-full object-cover"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
          <span className="text-[10px] font-semibold text-white">
            VIEW
          </span>
        </div>
      </button>

      {/* Large Photo */}
      {open && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white"
            >
              <X size={18} />
            </button>

            <img
              src={photo}
              alt={name}
              className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default CustomerPhotoViewer;
