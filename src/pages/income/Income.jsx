// src/pages/income/Income.jsx
//
// Manual, non-loan income (referrals, misc revenue, etc). Parallel to
// ExpenseControl.jsx but intentionally lean — a focused CRUD list rather
// than a full clone of that page's scope.

import { useEffect, useMemo, useState } from "react";
import { CircleDollarSign, Plus, Search, Trash2, Pencil, X, Wallet } from "lucide-react";

import { getIncomes, addIncome, updateIncome, deleteIncome } from "../../services/incomeStorage";
import { getCategories, addCategory } from "../../services/categoryStorage";
import { can } from "../../config/permissions";
import { useToast } from "../../context/ToastContext";

const PAYMENT_MODES = ["Cash", "Bank", "UPI", "Cheque"];

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  amount: "",
  category: "",
  incomeDate: todayISO(),
  paymentMode: "Cash",
  receivedFrom: "",
  description: "",
  remarks: "",
});

/* =========================================================
   MODAL SHELL
========================================================= */

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 p-3">
    <section className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-extrabold text-[#17221D]">{title}</h2>

        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50">
          <X size={17} />
        </button>
      </header>

      <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
    </section>
  </div>
);

/* =========================================================
   INCOME FORM
========================================================= */

const IncomeForm = ({ initial, categories, onAddCategory, onSubmit, onCancel, saving }) => {
  const [form, setForm] = useState(initial);
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleAddCategory = async () => {
    const name = newCategory.trim();

    if (!name) return;

    setAddingCategory(true);

    try {
      await onAddCategory(name);
      update("category", name);
      setNewCategory("");
    } finally {
      setAddingCategory(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-bold text-slate-600">
          Amount
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={form.amount}
            onChange={(event) => update("amount", event.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#9CCEB1]"
          />
        </label>

        <label className="text-xs font-bold text-slate-600">
          Date
          <input
            type="date"
            required
            value={form.incomeDate}
            onChange={(event) => update("incomeDate", event.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#9CCEB1]"
          />
        </label>
      </div>

      <label className="block text-xs font-bold text-slate-600">
        Category
        <select
          required
          value={form.category}
          onChange={(event) => update("category", event.target.value)}
          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#9CCEB1]"
        >
          <option value="">Select category</option>

          {categories.map((category) => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-2">
        <input
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
          placeholder="Add a new category..."
          className="h-8 flex-1 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-[#9CCEB1]"
        />

        <button
          type="button"
          onClick={handleAddCategory}
          disabled={addingCategory || !newCategory.trim()}
          className="h-8 shrink-0 rounded-lg bg-[#EAF5EF] px-3 text-[11px] font-bold text-[#0B5D3B] disabled:opacity-50"
        >
          + Add
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-bold text-slate-600">
          Payment Mode
          <select
            value={form.paymentMode}
            onChange={(event) => update("paymentMode", event.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#9CCEB1]"
          >
            {PAYMENT_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-bold text-slate-600">
          Received From
          <input
            value={form.receivedFrom}
            onChange={(event) => update("receivedFrom", event.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#9CCEB1]"
          />
        </label>
      </div>

      <label className="block text-xs font-bold text-slate-600">
        Description
        <input
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
          className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#9CCEB1]"
        />
      </label>

      <label className="block text-xs font-bold text-slate-600">
        Remarks
        <textarea
          value={form.remarks}
          onChange={(event) => update("remarks", event.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#9CCEB1]"
        />
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#0B5D3B] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Income"}
        </button>
      </div>
    </form>
  );
};

/* =========================================================
   MAIN PAGE
========================================================= */

const Income = () => {
  const toast = useToast();

  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);

    const [incomeRows, categoryRows] = await Promise.all([
      getIncomes(),
      getCategories("income"),
    ]);

    setIncomes(incomeRows);
    setCategories(categoryRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return incomes;

    return incomes.filter((income) =>
      [income.category, income.description, income.receivedFrom, income.reference]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(query))
    );
  }, [incomes, search]);

  const totals = useMemo(() => {
    const now = new Date();

    const total = incomes.reduce((sum, income) => sum + Number(income.amount || 0), 0);

    const thisMonth = incomes
      .filter((income) => {
        const date = new Date(income.incomeDate || income.date);

        return (
          !Number.isNaN(date.getTime()) &&
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth()
        );
      })
      .reduce((sum, income) => sum + Number(income.amount || 0), 0);

    return { total, thisMonth, count: incomes.length };
  }, [incomes]);

  const handleAddCategory = async (name) => {
    try {
      const category = await addCategory("income", name);

      setCategories((current) =>
        current.some((existing) => existing.name === category.name)
          ? current
          : [...current, category].sort((a, b) => a.name.localeCompare(b.name))
      );

      toast.success(`Category "${name}" added.`);
    } catch (error) {
      toast.error(error.message || "Couldn't add category.");
    }
  };

  const handleSubmit = async (form) => {
    setSaving(true);

    try {
      if (editing) {
        await updateIncome(editing.id, form);
        toast.success("Income updated.");
      } else {
        await addIncome(form);
        toast.success("Income recorded.");
      }

      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (error) {
      toast.error(error.message || "Couldn't save this income record.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;

    try {
      await deleteIncome(deleting.id);
      toast.success("Income deleted.");
      setDeleting(null);
      await load();
    } catch (error) {
      toast.error(error.message || "Couldn't delete this income record.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAF9] px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#0B6B43]">
            Operations & Accounts
          </p>

          <h1 className="mt-1 text-2xl font-extrabold text-[#17221D]">Income</h1>

          <p className="mt-1 text-xs text-slate-500">
            Log non-loan income — referrals, misc revenue and anything outside loan collections.
          </p>
        </div>

{can("income", "add") && (
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 self-start rounded-lg bg-[#0B5D3B] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#084A30]"
        >
          <Plus size={14} /> Add Income
        </button>
)}
      </header>

      <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF5EF]">
              <CircleDollarSign size={16} className="text-[#0B5D3B]" />
            </span>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total Income</p>
          </div>
          <p className="mt-2 text-xl font-extrabold text-[#0B6B43]">{money(totals.total)}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF5EF]">
              <Wallet size={16} className="text-[#0B5D3B]" />
            </span>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">This Month</p>
          </div>
          <p className="mt-2 text-xl font-extrabold text-[#17221D]">{money(totals.thisMonth)}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Records</p>
          <p className="mt-2 text-xl font-extrabold text-[#17221D]">{totals.count}</p>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[15px] font-extrabold text-[#17221D]">Income Records</h2>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search category, source, description..."
              className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-[#9CCEB1] sm:w-72"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-bold text-[#17221D]">No income records yet</p>
            <p className="mt-1 text-xs text-slate-400">Add your first non-loan income above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                <tr>
                  {["Date", "Category", "Description", "Received From", "Payment Mode", "Amount", ""].map(
                    (header) => (
                      <th key={header} className="whitespace-nowrap px-4 py-2.5">
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {filtered.map((income) => (
                  <tr key={income.id} className="border-b border-slate-100 hover:bg-[#F7FBF8]">
                    <td className="whitespace-nowrap px-4 py-3 text-[10px] text-slate-500">
                      {income.incomeDate ? new Date(income.incomeDate).toLocaleDateString("en-IN") : "—"}
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">
                        {income.category || "—"}
                      </span>
                    </td>

                    <td className="max-w-48 truncate px-4 py-3 text-[10px] text-slate-500">
                      {income.description || "—"}
                    </td>

                    <td className="px-4 py-3 text-[10px] text-slate-500">{income.receivedFrom || "—"}</td>

                    <td className="px-4 py-3 text-[10px] text-slate-500">{income.paymentMode || "—"}</td>

                    <td className="px-4 py-3 text-xs font-bold text-[#0B6B43]">{money(income.amount)}</td>

                    <td className="whitespace-nowrap px-4 py-3 text-right">
{can("income", "edit") && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(income);
                          setModalOpen(true);
                        }}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#0B5D3B]"
                        aria-label="Edit"
                      >
                        <Pencil size={13} />
                      </button>
)}

{can("income", "delete") && (
                      <button
                        type="button"
                        onClick={() => setDeleting(income)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && (
        <Modal
          title={editing ? "Edit Income" : "Add Income"}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        >
          <IncomeForm
            initial={
              editing
                ? {
                    amount: editing.amount ?? "",
                    category: editing.category || "",
                    incomeDate: (editing.incomeDate || editing.date || todayISO()).slice(0, 10),
                    paymentMode: editing.paymentMode || "Cash",
                    receivedFrom: editing.receivedFrom || "",
                    description: editing.description || "",
                    remarks: editing.remarks || "",
                  }
                : emptyForm()
            }
            categories={categories}
            onAddCategory={handleAddCategory}
            onSubmit={handleSubmit}
            onCancel={() => {
              setModalOpen(false);
              setEditing(null);
            }}
            saving={saving}
          />
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete Income" onClose={() => setDeleting(null)}>
          <p className="text-sm text-slate-600">
            Delete the {money(deleting.amount)} income record from{" "}
            {deleting.incomeDate ? new Date(deleting.incomeDate).toLocaleDateString("en-IN") : "this date"}? This
            can't be undone.
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Income;
