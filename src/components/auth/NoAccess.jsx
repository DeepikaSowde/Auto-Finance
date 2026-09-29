// src/components/auth/NoAccess.jsx
//
// Shown to a staff member whose account has no module switched on yet.

import { LogOut, ShieldOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { logout } from "../../services/authStorage";

const NoAccess = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-[#F6F8F7] px-4 py-10">
      <div className="w-full max-w-[380px] rounded-2xl border border-[#D8E9DF] bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <ShieldOff size={20} />
        </div>

        <h1 className="mt-3 text-[15px] font-extrabold text-[#17221D]">No access yet</h1>

        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
          Your account doesn't have any modules switched on. Ask an admin to set your
          permissions in User Management, then sign in again.
        </p>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-4 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
        >
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </div>
  );
};

export default NoAccess;
