// src/pages/users/UserManagement.jsx
//
// Admin-only. Adds admin / staff accounts and sets, per staff member, which
// actions they may take in each module. The backend enforces the same
// permissions on every API call.

import { useEffect, useMemo, useState } from "react";

import {
  KeyRound,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserCog,
  UserRound,
  X,
} from "lucide-react";

import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from "../../services/userStorage";
import { getSession } from "../../services/authStorage";
import { useToast } from "../../context/ToastContext";
import {
  DEFAULT_STAFF_PERMISSIONS,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
} from "../../config/permissions";

const EMPTY_FORM = {
  name: "",
  username: "",
  password: "",
  role: "staff",
  permissions: DEFAULT_STAFF_PERMISSIONS,
};

/* =========================================================
   PERMISSION HELPERS
========================================================= */

const isOn = (permissions, module, action) => permissions?.[module]?.[action] === true;

const withoutModule = (permissions, module) =>
  Object.fromEntries(Object.entries(permissions || {}).filter(([key]) => key !== module));

/*
 * Turning an action on also turns on View (you can't add a customer
 * without seeing the Customers page). Turning View off clears the module.
 */
const togglePermission = (permissions, module, action) => {
  const current = { ...(permissions?.[module] || {}) };
  const next = !current[action];

  if (action === "view" && !next) {
    return withoutModule(permissions, module);
  }

  current[action] = next;

  if (next) {
    current.view = true;
  }

  return { ...(permissions || {}), [module]: current };
};

const setModuleAll = (permissions, moduleConfig, enabled) => {
  if (!enabled) {
    return withoutModule(permissions, moduleConfig.key);
  }

  return {
    ...(permissions || {}),
    [moduleConfig.key]: Object.fromEntries(moduleConfig.actions.map((action) => [action, true])),
  };
};

const countGranted = (permissions) =>
  PERMISSION_MODULES.filter((module) => isOn(permissions, module.key, "view")).length;

/* =========================================================
   MAIN
========================================================= */

const UserManagement = () => {
  const toast = useToast();
  const currentUserId = getSession()?.userId;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // null = closed, {mode: "add"} or {mode: "edit", user}
  const [editor, setEditor] = useState(null);

  const load = async () => {
    setUsers(await getUsers());
    setLoading(false);
  };

  useEffect(() => {
    getUsers().then((rows) => {
      setUsers(rows);
      setLoading(false);
    });
  }, []);

  const counts = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((user) => user.role === "admin").length,
      staff: users.filter((user) => user.role === "staff").length,
    }),
    [users]
  );

  const handleDelete = async (user) => {
    if (!window.confirm(`Remove ${user.name}? They will no longer be able to sign in.`)) {
      return;
    }

    try {
      await deleteUser(user.id);
      await load();
      toast.success(`${user.name} removed.`);
    } catch (error) {
      toast.error(error.message || "Couldn't remove this user.");
    }
  };

  const handleSaved = async (message) => {
    setEditor(null);
    await load();
    toast.success(message);
  };

  return (
    <div className="min-h-full bg-[#F6F8F7] px-3 py-3 sm:px-4 lg:px-5">
      {/* HEADER */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#0B6B43]">Admin</p>

          <h1 className="mt-0.5 text-[21px] font-extrabold text-[#17221D]">User Management</h1>

          <p className="mt-1 text-[10px] text-slate-400">
            Add staff and choose what each person can view, add, edit, delete and approve
          </p>
        </div>

        <button
          type="button"
          onClick={() => setEditor({ mode: "add" })}
          className="inline-flex h-9 items-center justify-center gap-1.5 self-start rounded-lg bg-[#0B5D3B] px-3.5 text-[10px] font-bold text-white transition hover:bg-[#084A30] sm:self-auto"
        >
          <Plus size={14} /> Add User
        </button>
      </div>

      {/* SUMMARY */}

      <div className="mt-4 grid grid-cols-3 gap-3">
        <SummaryTile label="Total Users" value={counts.total} />
        <SummaryTile label="Admins" value={counts.admins} />
        <SummaryTile label="Staff" value={counts.staff} />
      </div>

      {/* USER LIST */}

      <section className="mt-4 overflow-hidden rounded-2xl border border-[#D8E9DF] bg-white shadow-sm">
        {loading ? (
          <p className="px-4 py-8 text-center text-[10px] text-slate-400">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="px-4 py-8 text-center text-[10px] text-slate-400">No users yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-[#F6FBF8] text-[9px] font-bold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">Access</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF5EF] text-[#0B5D3B]">
                          {user.role === "admin" ? <ShieldCheck size={15} /> : <UserRound size={15} />}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[#17221D]">
                            {user.name}
                            {user.id === currentUserId && (
                              <span className="ml-1.5 text-[9px] font-semibold text-slate-400">(you)</span>
                            )}
                          </p>

                          <p className="truncate text-[10px] text-slate-400">{user.username}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${
                          user.role === "admin"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {user.role === "admin" ? (
                        <span className="text-[10px] font-semibold text-slate-500">Full access</span>
                      ) : (
                        <PermissionChips permissions={user.permissions} />
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditor({ mode: "edit", user })}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-bold text-[#0B5D3B] hover:bg-[#EAF5EF]"
                        >
                          <Pencil size={12} /> Edit
                        </button>

                        {user.id !== currentUserId && (
                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove ${user.name}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editor && (
        <UserEditor
          key={editor.user?.id || "new"}
          mode={editor.mode}
          user={editor.user}
          isSelf={editor.user?.id === currentUserId}
          onClose={() => setEditor(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

/* =========================================================
   SUMMARY TILE
========================================================= */

const SummaryTile = ({ label, value }) => (
  <div className="rounded-xl border border-[#D8E9DF] bg-white px-4 py-3 shadow-sm">
    <p className="text-[8px] font-extrabold uppercase tracking-[0.06em] text-slate-400">{label}</p>
    <p className="mt-1 text-[18px] font-extrabold text-[#17221D]">{value}</p>
  </div>
);

/* =========================================================
   PERMISSION CHIPS (list view)
========================================================= */

const PermissionChips = ({ permissions }) => {
  const granted = PERMISSION_MODULES.filter((module) => isOn(permissions, module.key, "view"));

  if (granted.length === 0) {
    return <span className="text-[10px] font-semibold text-red-500">No access</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {granted.map((module) => {
        const extra = module.actions.filter(
          (action) => action !== "view" && isOn(permissions, module.key, action)
        );

        return (
          <span
            key={module.key}
            title={["View", ...extra.map((action) => action[0].toUpperCase() + action.slice(1))].join(", ")}
            className="rounded-md bg-[#F0F7F3] px-1.5 py-0.5 text-[9px] font-semibold text-[#0B5D3B]"
          >
            {module.label}
            {extra.length > 0 && <span className="text-[#6D9B82]"> +{extra.length}</span>}
          </span>
        );
      })}
    </div>
  );
};

/* =========================================================
   EDITOR (add / edit)
========================================================= */

const UserEditor = ({ mode, user, isSelf, onClose, onSaved }) => {
  const isEdit = mode === "edit";

  const [form, setForm] = useState(() =>
    isEdit
      ? {
          name: user.name,
          username: user.username,
          password: "",
          role: user.role,
          permissions: user.permissions || {},
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, saving]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.role === "staff" && countGranted(form.permissions) === 0) {
      setError("Turn on at least one module, or this staff member won't be able to open anything.");
      return;
    }

    setSaving(true);

    try {
      if (isEdit) {
        await updateUser(user.id, {
          name: form.name,
          role: form.role,
          permissions: form.permissions,
          ...(form.password ? { password: form.password } : {}),
        });

        await onSaved(`${form.name} updated.`);
      } else {
        await createUser(form);
        await onSaved(`${form.name} added as ${form.role}.`);
      }
    } catch (saveError) {
      setError(saveError.message || "Couldn't save this user.");
      setSaving(false);
    }
  };

  const inputClass =
    "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#9CCEB1] focus:ring-1 focus:ring-[#DCEFE4] disabled:bg-slate-50 disabled:text-slate-400";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-3 py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-full w-full max-w-[860px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.25)]"
      >
        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-[#E4EEE8] bg-[#F6FAF8] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E5F4EB] text-[#0B5D3B]">
              <UserCog size={18} />
            </div>

            <div>
              <h2 className="text-[14px] font-extrabold text-[#173226]">
                {isEdit ? `Edit ${user.name}` : "Add User"}
              </h2>

              <p className="text-[10px] text-slate-400">
                {isEdit ? "Change details, reset the password or adjust access" : "Create a sign-in and choose what they can do"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-[#E6F1EB] hover:text-[#173226]"
          >
            <X size={17} />
          </button>
        </div>

        {/* BODY */}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Full name">
              <input
                required
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Username">
              <input
                required
                disabled={isEdit}
                value={form.username}
                onChange={(event) => update("username", event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label={isEdit ? "New password" : "Password"}>
              <div className="relative">
                <input
                  required={!isEdit}
                  minLength={6}
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                  placeholder={isEdit ? "Leave blank to keep" : "Min. 6 characters"}
                  className={`${inputClass} pr-8`}
                />
                <KeyRound size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
              </div>
            </Field>

            <Field label="Role">
              <select
                value={form.role}
                disabled={isSelf}
                onChange={(event) => update("role", event.target.value)}
                className={inputClass}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
          </div>

          {/* PERMISSIONS */}

          <div className="mt-5">
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <h3 className="text-[12px] font-extrabold text-[#17221D]">Permissions</h3>
                <p className="text-[10px] text-slate-400">
                  {form.role === "admin"
                    ? "Admins can use every module and manage users."
                    : "Switch on what this staff member may do. Any action also turns on View."}
                </p>
              </div>

              {form.role === "staff" && (
                <span className="shrink-0 rounded-full bg-[#EAF5EF] px-2 py-1 text-[9px] font-bold text-[#0B5D3B]">
                  {countGranted(form.permissions)} of {PERMISSION_MODULES.length} modules
                </span>
              )}
            </div>

            {form.role === "admin" ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[11px] font-semibold text-emerald-700">
                <ShieldCheck size={15} /> Full access to everything, including User Management and Settings.
              </div>
            ) : (
              <PermissionMatrix
                permissions={form.permissions}
                onChange={(permissions) => update("permissions", permissions)}
              />
            )}
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-semibold text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* FOOTER */}

        <div className="flex justify-end gap-2 border-t border-[#E4EEE8] bg-[#FAFCFB] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="h-9 rounded-lg bg-[#0B5D3B] px-4 text-[10px] font-bold text-white hover:bg-[#084A30] disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add User"}
          </button>
        </div>
      </form>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-[8px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
    {children}
  </label>
);

/* =========================================================
   PERMISSION MATRIX
========================================================= */

const PermissionMatrix = ({ permissions, onChange }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200">
    <table className="w-full min-w-[620px] text-left">
      <thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-400">
        <tr>
          <th className="px-3 py-2">Module</th>
          <th className="px-2 py-2 text-center">All</th>
          {PERMISSION_ACTIONS.map((action) => (
            <th key={action.key} className="px-2 py-2 text-center">
              {action.label}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {PERMISSION_MODULES.map((module) => {
          const allOn = module.actions.every((action) => isOn(permissions, module.key, action));

          return (
            <tr key={module.key} className="border-t border-slate-100">
              <td className="px-3 py-2">
                <p className="text-[11px] font-bold text-[#17221D]">{module.label}</p>
                {module.hint && <p className="text-[9px] text-slate-400">{module.hint}</p>}
              </td>

              <td className="px-2 py-2 text-center">
                <Switch
                  checked={allOn}
                  label={`All ${module.label} permissions`}
                  onChange={() => onChange(setModuleAll(permissions, module, !allOn))}
                />
              </td>

              {PERMISSION_ACTIONS.map((action) => (
                <td key={action.key} className="px-2 py-2 text-center">
                  {module.actions.includes(action.key) ? (
                    <Switch
                      checked={isOn(permissions, module.key, action.key)}
                      label={`${module.label}: ${action.label}`}
                      onChange={() => onChange(togglePermission(permissions, module.key, action.key))}
                    />
                  ) : (
                    <span className="text-[10px] text-slate-300">—</span>
                  )}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const Switch = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    title={label}
    onClick={onChange}
    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full align-middle transition duration-200 ${
      checked ? "bg-[#0B6B43]" : "bg-slate-300"
    }`}
  >
    <span
      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
        checked ? "left-[18px]" : "left-0.5"
      }`}
    />
  </button>
);

export default UserManagement;
