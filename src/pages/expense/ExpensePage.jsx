// src/pages/expense/ExpensePage.jsx
//
// Tabbed shell for the Expense section: the existing expense register plus
// Referral Commissions.

import { useState } from "react";

import ExpenseControl from "./ExpenseControl";
import ReferralCommissions from "./ReferralCommissions";

const TABS = [
  { id: "all", label: "All Expenses" },
  { id: "referral", label: "Referral Commissions" },
];

const ExpensePage = () => {
  const [tab, setTab] = useState("all");

  return (
    <div className="min-h-screen w-full bg-[#F8FAF9]">
      <nav className="flex gap-6 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`-mb-px border-b-2 py-3 text-sm font-bold ${
              tab === item.id
                ? "border-[#0B5D3B] text-[#0B5D3B]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "all" ? (
        <ExpenseControl />
      ) : (
        <div className="pt-5">
          <ReferralCommissions />
        </div>
      )}
    </div>
  );
};

export default ExpensePage;
