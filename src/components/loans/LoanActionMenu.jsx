import {
  Eye,
  CreditCard,
  Pencil,
  FileText,
  CheckCircle2,
} from "lucide-react";

import { can } from "../../config/permissions";

const LoanActionMenu = ({
  onClose,
  onView,
  loan,
  position = {
    top: 0,
    left: 0,
  },
}) => {
  const action = (type) => {
    onClose();

    switch (type) {
      case "view":
        onView();
        break;

      case "payment":
        console.log(
          "Record payment",
          loan
        );
        break;

      case "edit":
        console.log(
          "Edit loan",
          loan
        );
        break;

      case "statement":
        console.log(
          "Download statement",
          loan
        );
        break;

      case "close":
        console.log(
          "Close loan",
          loan
        );
        break;

      default:
        break;
    }
  };

  return (
    <div
      onClick={(event) =>
        event.stopPropagation()
      }
      style={{
        top: position.top,
        left: position.left,
      }}
      className="
        fixed
        z-[9999]
        w-[230px]
        overflow-hidden
        rounded-xl
        border
        border-slate-200
        bg-white
        py-1.5
        shadow-2xl
        ring-1
        ring-black/5
      "
    >

      <Action
        icon={Eye}
        label="View Loan"
        onClick={() =>
          action("view")
        }
      />

      {can("collections", "add") && (
        <Action
          icon={CreditCard}
          label="Record Payment"
          onClick={() =>
            action("payment")
          }
        />
      )}

      {can("loans", "edit") && (
        <Action
          icon={Pencil}
          label="Edit Loan"
          onClick={() =>
            action("edit")
          }
        />
      )}

      <Action
        icon={FileText}
        label="Download Statement"
        onClick={() =>
          action("statement")
        }
      />

      {can("loans", "edit") && (
        <Action
          icon={CheckCircle2}
          label="Close Loan"
          onClick={() =>
            action("close")
          }
        />
      )}

    </div>
  );
};

/* =========================================================
   ACTION ITEM
========================================================= */

const Action = ({
  icon: Icon,
  label,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        flex
        w-full
        items-center
        gap-2.5
        px-3
        py-2.5
        text-left
        text-[10px]
        font-medium
        text-slate-600
        transition
        hover:bg-slate-50
        hover:text-slate-800
      "
    >
      <Icon
        size={14}
        className="shrink-0 text-slate-500"
      />

      <span>
        {label}
      </span>
    </button>
  );
};

export default LoanActionMenu;