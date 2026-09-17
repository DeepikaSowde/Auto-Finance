import {
  X,
  ChevronDown,
  CalendarDays,
  ShieldCheck,
  CarFront,
  UserRound,
  ReceiptText,
  FileText,
  Activity,
  CalendarRange,
  List,
  Maximize2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import LoanOverview from "./LoanOverview";
import LoanCustomerSection from "./LoanCustomerSection";
import LoanVehicleSection from "./LoanVehicleSection";
import LoanRepaymentProgress from "./LoanRepaymentProgress";
import LoanRepaymentSchedule from "./LoanRepaymentSchedule";
import LoanDocuments from "./LoanDocuments";
import LoanActivityTimeline from "./LoanActivityTimeline";
import LoanRepaymentCalendar from "./LoanRepaymentCalendar";

/* =========================================================
   HELPERS
========================================================= */

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getStatusClass = (status) => {
  const normalized = normalize(status);

  if (normalized === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "overdue") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    normalized === "closed" ||
    normalized === "paid" ||
    normalized === "settled"
  ) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (normalized === "foreclosed") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

/* =========================================================
   MAIN
========================================================= */

const LoanDetailsDrawer = ({
  loan,
  onClose,
}) => {
  const [
    openSection,
    setOpenSection,
  ] = useState("overview");

  const [
    listViewOpen,
    setListViewOpen,
  ] = useState(false);

  const [
    calendarViewOpen,
    setCalendarViewOpen,
  ] = useState(false);

  /* =======================================================
     BODY LOCK
  ====================================================== */

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, []);

  /* =======================================================
     ESCAPE
  ====================================================== */

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (calendarViewOpen) {
        setCalendarViewOpen(false);
        return;
      }

      if (listViewOpen) {
        setListViewOpen(false);
        return;
      }

      onClose?.();
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    onClose,
    calendarViewOpen,
    listViewOpen,
  ]);

  /* =======================================================
     VALUES
  ====================================================== */

  const loanNumber =
    loan?.loanNumber ||
    "Loan Details";

  const customerName =
    loan?.customerName ||
    loan?.customer?.personal?.name ||
    loan?.customer?.name ||
    "Customer";

  const customerId =
    loan?.customerId ||
    loan?.customer?.id ||
    loan?.customer?.customerId ||
    "—";

  const status =
    loan?.status ||
    loan?.loanStatus ||
    "Active";

  const installmentCount =
    Array.isArray(
      loan?.repaymentSchedule
    )
      ? loan.repaymentSchedule.length
      : 0;

  const repaymentMethod =
    loan?.repayment?.method ||
    loan?.repaymentMethod ||
    loan?.calculation?.repaymentMethod ||
    "—";

  /* =======================================================
     TOGGLE
  ====================================================== */

  const toggleSection = (section) => {
    setOpenSection((current) =>
      current === section
        ? null
        : section
    );
  };

  return (
    <>
      {/* =====================================================
          BACKDROP
      ====================================================== */}

      <div
        className="
          fixed
          inset-0
          z-[160]
          bg-slate-950/45
          backdrop-blur-[2px]
        "
        onClick={onClose}
      >
        {/* =================================================
            DRAWER
        ================================================== */}

        <aside
          className="
            absolute
            inset-y-0
            right-0

            flex
            w-full
            min-w-0
            max-w-[820px]
            flex-col

            overflow-hidden

            border-l
            border-slate-200
            bg-[#F7FAF8]

            shadow-[-20px_0_60px_rgba(15,23,42,0.16)]

            sm:max-w-[760px]
            lg:max-w-[820px]
          "
          onClick={(event) =>
            event.stopPropagation()
          }
        >
          {/* =================================================
              HEADER
          ================================================== */}

          <div
            className="
              flex
              shrink-0
              items-center
              justify-between
              gap-3

              border-b
              border-slate-200
              bg-white

              px-3
              py-2.5

              sm:px-4
              sm:py-3
            "
          >
            {/* LEFT HEADER */}

            <div
              className="
                flex
                min-w-0
                flex-1
                items-center
                gap-2.5
                overflow-hidden
              "
            >
              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  bg-[#EAF5EF]
                  text-[#0B6B43]

                  sm:h-10
                  sm:w-10
                  sm:rounded-xl
                "
              >
                <ReceiptText
                  size={16}
                  className="sm:hidden"
                />

                <ReceiptText
                  size={18}
                  className="hidden sm:block"
                />
              </div>

              <div
                className="
                  min-w-0
                  flex-1
                  overflow-hidden
                "
              >
                <div
                  className="
                    flex
                    min-w-0
                    flex-wrap
                    items-center
                    gap-1.5
                    sm:gap-2
                  "
                >
                  <h2
                    className="
                      min-w-0
                      max-w-full
                      truncate
                      text-[14px]
                      font-extrabold
                      text-[#17221D]

                      sm:text-[16px]
                    "
                  >
                    {loanNumber}
                  </h2>

                  <span
                    className={`
                      inline-flex
                      shrink-0
                      rounded-full
                      border
                      px-1.5
                      py-0.5

                      text-[7px]
                      font-extrabold

                      sm:px-2
                      sm:py-1
                      sm:text-[8px]

                      ${getStatusClass(
                        status
                      )}
                    `}
                  >
                    {status}
                  </span>
                </div>

                <p
                  className="
                    mt-0.5
                    max-w-full
                    truncate
                    text-[8px]
                    font-medium
                    text-slate-400

                    sm:text-[9px]
                  "
                >
                  {customerName}
                  {" • "}
                  {customerId}
                </p>
              </div>
            </div>

            {/* CLOSE */}

            <button
              type="button"
              onClick={onClose}
              className="
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-lg
                border
                border-slate-200
                bg-white
                text-slate-400
                transition
                hover:bg-slate-50
                hover:text-slate-700

                sm:h-9
                sm:w-9
              "
              aria-label="Close loan details"
            >
              <X size={16} />
            </button>
          </div>

          {/* =================================================
              RESPONSIVE SCROLL AREA
          ================================================== */}

          <div
            className="
              min-h-0
              min-w-0
              flex-1
              overflow-y-auto
              overflow-x-hidden
              overscroll-contain

              px-2.5
              py-2.5

              sm:px-3.5
              sm:py-3.5

              lg:px-4
              lg:py-4

              [scrollbar-width:thin]
            "
          >
            <div
              className="
                mx-auto
                w-full
                min-w-0
                max-w-[760px]

                space-y-2.5

                sm:space-y-3
              "
            >
              {/* =================================================
                  OVERVIEW
              ================================================== */}

              <AccordionSection
                icon={ReceiptText}
                title="Loan Overview"
                subtitle="Loan amount, status and financial summary"
                open={
                  openSection ===
                  "overview"
                }
                onClick={() =>
                  toggleSection(
                    "overview"
                  )
                }
                accent="green"
              >
                <LoanOverview
                  loan={loan}
                />
              </AccordionSection>

              {/* =================================================
                  CUSTOMER
              ================================================== */}

              <AccordionSection
                icon={UserRound}
                title="Customer"
                subtitle="Customer identity and information"
                open={
                  openSection ===
                  "customer"
                }
                onClick={() =>
                  toggleSection(
                    "customer"
                  )
                }
                accent="blue"
              >
                <LoanCustomerSection
                  loan={loan}
                />
              </AccordionSection>

              {/* =================================================
                  VEHICLE
              ================================================== */}

              <AccordionSection
                icon={CarFront}
                title="Vehicle"
                subtitle="Vehicle and collateral information"
                open={
                  openSection ===
                  "vehicle"
                }
                onClick={() =>
                  toggleSection(
                    "vehicle"
                  )
                }
                accent="amber"
              >
                <LoanVehicleSection
                  loan={loan}
                />
              </AccordionSection>

              {/* =================================================
                  REPAYMENT
              ================================================== */}

              <AccordionSection
                icon={ShieldCheck}
                title="Repayment"
                subtitle="Repayment progress and current collection state"
                open={
                  openSection ===
                  "repayment"
                }
                onClick={() =>
                  toggleSection(
                    "repayment"
                  )
                }
                accent="purple"
              >
                <LoanRepaymentProgress
                  loan={loan}
                />
              </AccordionSection>

              {/* =================================================
                  REPAYMENT SCHEDULE
              ================================================== */}

              <RepaymentScheduleCard
                installmentCount={
                  installmentCount
                }
                repaymentMethod={
                  repaymentMethod
                }
                onCalendar={() =>
                  setCalendarViewOpen(
                    true
                  )
                }
                onList={() =>
                  setListViewOpen(
                    true
                  )
                }
              />

              {/* =================================================
                  DOCUMENTS
              ================================================== */}

              <AccordionSection
                icon={FileText}
                title="Documents"
                subtitle="Loan and customer documents"
                open={
                  openSection ===
                  "documents"
                }
                onClick={() =>
                  toggleSection(
                    "documents"
                  )
                }
                accent="slate"
              >
                <LoanDocuments
                  loan={loan}
                />
              </AccordionSection>

              {/* =================================================
                  ACTIVITY
              ================================================== */}

              <AccordionSection
                icon={Activity}
                title="Activity"
                subtitle="Recent loan activity and history"
                open={
                  openSection ===
                  "activity"
                }
                onClick={() =>
                  toggleSection(
                    "activity"
                  )
                }
                accent="rose"
              >
                <LoanActivityTimeline
                  loan={loan}
                />
              </AccordionSection>

              <div className="h-2 sm:h-3" />
            </div>
          </div>
        </aside>
      </div>

      {/* =====================================================
          CALENDAR MODAL
      ====================================================== */}

      {calendarViewOpen && (
        <LoanRepaymentCalendar
          loan={loan}
          onClose={() =>
            setCalendarViewOpen(
              false
            )
          }
        />
      )}

      {/* =====================================================
          LIST MODAL
      ====================================================== */}

      {listViewOpen && (
        <RepaymentSchedulePopup
          loan={loan}
          onClose={() =>
            setListViewOpen(false)
          }
        />
      )}
    </>
  );
};

/* =========================================================
   ACCORDION SECTION
========================================================= */

const AccordionSection = ({
  icon: Icon,
  title,
  subtitle,
  open,
  onClick,
  children,
  accent = "slate",
}) => {
  const styles = {
    green: {
      border:
        open
          ? "border-[#B9DCC6]"
          : "border-[#CFE8D9]",
      background:
        "bg-gradient-to-br from-[#F0FAF4] via-[#FBFEFC] to-white",
      iconBg:
        "bg-[#EAF5EF]",
      iconText:
        "text-[#0B6B43]",
      content:
        "bg-[#FCFFFD]",
    },

    blue: {
      border:
        open
          ? "border-blue-200"
          : "border-blue-100",
      background:
        "bg-gradient-to-br from-[#F2F7FF] via-[#FBFDFF] to-white",
      iconBg:
        "bg-blue-50",
      iconText:
        "text-blue-600",
      content:
        "bg-[#FCFDFF]",
    },

    amber: {
      border:
        open
          ? "border-amber-200"
          : "border-amber-100",
      background:
        "bg-gradient-to-br from-[#FFF9EC] via-[#FFFDFC] to-white",
      iconBg:
        "bg-amber-50",
      iconText:
        "text-amber-600",
      content:
        "bg-[#FFFDFC]",
    },

    purple: {
      border:
        open
          ? "border-violet-200"
          : "border-violet-100",
      background:
        "bg-gradient-to-br from-[#F5F1FF] via-[#FCFAFF] to-white",
      iconBg:
        "bg-violet-50",
      iconText:
        "text-violet-600",
      content:
        "bg-[#FDFBFF]",
    },

    rose: {
      border:
        open
          ? "border-rose-200"
          : "border-rose-100",
      background:
        "bg-gradient-to-br from-[#FFF4F6] via-[#FFFCFC] to-white",
      iconBg:
        "bg-rose-50",
      iconText:
        "text-rose-600",
      content:
        "bg-[#FFFCFD]",
    },

    slate: {
      border:
        open
          ? "border-slate-300"
          : "border-slate-200",
      background:
        "bg-gradient-to-br from-[#F7F9FB] via-[#FCFDFE] to-white",
      iconBg:
        "bg-slate-100",
      iconText:
        "text-slate-600",
      content:
        "bg-[#FCFDFC]",
    },
  };

  const current =
    styles[accent] ||
    styles.slate;

  return (
    <section
      className={`
        w-full
        min-w-0
        overflow-hidden
        rounded-2xl
        border
        shadow-sm
        ${current.border}
        ${current.background}
      `}
    >
      {/* HEADER */}

      <button
        type="button"
        onClick={onClick}
        className="
          flex
          w-full
          min-w-0
          items-center
          gap-2.5
          px-3
          py-3
          text-left
          transition
          hover:bg-white/70

          sm:gap-3
          sm:px-4
          sm:py-3.5
        "
        aria-expanded={open}
      >
        <div
          className={`
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg

            sm:h-10
            sm:w-10
            sm:rounded-xl

            ${current.iconBg}
            ${current.iconText}
          `}
        >
          <Icon
            size={15}
            className="sm:hidden"
          />

          <Icon
            size={17}
            className="hidden sm:block"
          />
        </div>

        <div
          className="
            min-w-0
            flex-1
            overflow-hidden
          "
        >
          <h3
            className="
              truncate
              text-[11px]
              font-extrabold
              text-[#17221D]

              sm:text-[12px]
            "
          >
            {title}
          </h3>

          <p
            className="
              mt-0.5
              truncate
              text-[7px]
              font-medium
              text-slate-400

              sm:text-[8px]
            "
          >
            {subtitle}
          </p>
        </div>

        <ChevronDown
          size={15}
          className={`
            shrink-0
            text-slate-400
            transition-transform
            duration-200

            sm:h-4
            sm:w-4

            ${
              open
                ? "rotate-180"
                : ""
            }
          `}
        />
      </button>

      {/* CONTENT */}

      {open && (
        <div
          className={`
            w-full
            min-w-0
            overflow-hidden
            border-t
            border-black/5
            p-2.5

            sm:p-3.5

            ${current.content}
          `}
        >
          <div className="w-full min-w-0">
            {children}
          </div>
        </div>
      )}
    </section>
  );
};

/* =========================================================
   REPAYMENT SCHEDULE CARD
========================================================= */

const RepaymentScheduleCard = ({
  installmentCount,
  repaymentMethod,
  onCalendar,
  onList,
}) => {
  return (
    <section
      className="
        w-full
        min-w-0
        overflow-hidden
        rounded-2xl
        border
        border-[#DCD2FF]

        bg-gradient-to-br
        from-[#F5F1FF]
        via-[#FAF8FF]
        to-white

        shadow-sm
      "
    >
      {/* HEADER */}

      <div
        className="
          flex
          w-full
          min-w-0
          items-start
          gap-2.5
          px-3
          py-3

          sm:items-center
          sm:gap-3
          sm:px-4
          sm:py-3.5
        "
      >
        {/* ICON */}

        <div
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-[#EEEAFE]
            text-[#6D4AFF]

            sm:h-10
            sm:w-10
            sm:rounded-xl
          "
        >
          <CalendarRange
            size={16}
            className="sm:hidden"
          />

          <CalendarRange
            size={17}
            className="hidden sm:block"
          />
        </div>

        {/* TITLE */}

        <div
          className="
            min-w-0
            flex-1
            overflow-hidden
          "
        >
          <h3
            className="
              truncate
              text-[11px]
              font-extrabold
              text-[#243253]

              sm:text-[12px]
            "
          >
            Repayment Schedule
          </h3>

          <p
            className="
              mt-0.5
              truncate
              text-[7px]
              font-medium
              text-[#8792AA]

              sm:text-[8px]
            "
          >
            View repayment dues by date or list
          </p>
        </div>

        {/* DESKTOP METADATA */}

        <div
          className="
            hidden
            max-w-[46%]
            shrink-0
            flex-wrap
            justify-end
            gap-1.5

            md:flex
          "
        >
          <ScheduleBadge
            label="Repayment Method"
            value={
              repaymentMethod
            }
          />

          <ScheduleBadge
            label="Installments"
            value={
              installmentCount ||
              "—"
            }
          />
        </div>
      </div>

      {/* MOBILE METADATA */}

      <div
        className="
          flex
          min-w-0
          flex-wrap
          gap-1.5
          border-t
          border-[#E9E2FF]
          px-3
          py-2

          md:hidden
        "
      >
        <ScheduleBadge
          label="Repayment Method"
          value={
            repaymentMethod
          }
        />

        <ScheduleBadge
          label="Installments"
          value={
            installmentCount ||
            "—"
          }
        />
      </div>

      {/* ACTIONS */}

      <div
        className="
          grid
          grid-cols-1
          gap-2
          border-t
          border-[#E9E2FF]
          bg-white/70
          p-2.5

          sm:grid-cols-2
          sm:p-3
        "
      >
        <ScheduleViewButton
          icon={CalendarDays}
          title="Calendar View"
          subtitle="View repayment dues by date"
          onClick={onCalendar}
          tone="purple"
        />

        <ScheduleViewButton
          icon={List}
          title="List View"
          subtitle="View complete repayment table"
          onClick={onList}
          tone="green"
        />
      </div>
    </section>
  );
};

/* =========================================================
   BADGE
========================================================= */

const ScheduleBadge = ({
  label,
  value,
}) => {
  return (
    <div
      className="
        min-w-0
        max-w-full
        rounded-lg
        border
        border-[#E7E0FF]
        bg-white/90
        px-2
        py-1.5

        sm:px-2.5
      "
    >
      <p
        className="
          truncate
          text-[6px]
          font-bold
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </p>

      <p
        className="
          mt-0.5
          max-w-[120px]
          truncate
          text-[7px]
          font-extrabold
          text-[#243253]

          sm:max-w-[140px]
          sm:text-[8px]
        "
      >
        {value}
      </p>
    </div>
  );
};

/* =========================================================
   VIEW BUTTON
========================================================= */

const ScheduleViewButton = ({
  icon: Icon,
  title,
  subtitle,
  onClick,
  tone,
}) => {
  const styles =
    tone === "purple"
      ? {
          wrapper:
            "border-[#DDD5FF] bg-[#FAF8FF] hover:border-[#C9BEFF] hover:bg-[#F5F1FF]",
          icon:
            "bg-[#EEEAFE] text-[#6D4AFF]",
          action:
            "text-[#6D4AFF]",
        }
      : {
          wrapper:
            "border-[#CFE8D9] bg-[#F8FCF9] hover:border-[#A8D0BD] hover:bg-[#F0FAF4]",
          icon:
            "bg-[#EAF5EF] text-[#0B6B43]",
          action:
            "text-[#0B6B43]",
        };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group
        flex
        min-w-0
        items-center
        gap-2
        rounded-xl
        border
        px-2.5
        py-2.5
        text-left
        transition

        sm:gap-2.5
        sm:px-3
        sm:py-2.5

        ${styles.wrapper}
      `}
    >
      <span
        className={`
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-lg

          sm:h-9
          sm:w-9

          ${styles.icon}
        `}
      >
        <Icon size={14} />
      </span>

      <span
        className="
          min-w-0
          flex-1
          overflow-hidden
        "
      >
        <span
          className="
            block
            truncate
            text-[8px]
            font-extrabold
            text-[#17221D]

            sm:text-[9px]
          "
        >
          {title}
        </span>

        <span
          className="
            mt-0.5
            block
            truncate
            text-[6px]
            font-medium
            text-slate-400

            sm:text-[7px]
          "
        >
          {subtitle}
        </span>
      </span>

      <Maximize2
        size={11}
        className={`
          shrink-0
          transition-transform
          group-hover:scale-110

          sm:h-3
          sm:w-3

          ${styles.action}
        `}
      />
    </button>
  );
};

/* =========================================================
   REPAYMENT SCHEDULE POPUP
========================================================= */

const RepaymentSchedulePopup = ({
  loan,
  onClose,
}) => {
  const scheduleCount =
    Array.isArray(
      loan?.repaymentSchedule
    )
      ? loan.repaymentSchedule.length
      : 0;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose]);

  return (
    <div
      className="
        fixed
        inset-0
        z-[230]
        flex
        items-center
        justify-center
        bg-slate-950/55
        p-2.5
        backdrop-blur-[3px]

        sm:p-4
      "
      onClick={onClose}
    >
      <div
        className="
          flex
          h-[94vh]
          w-full
          min-w-0
          max-w-[1150px]
          flex-col
          overflow-hidden
          rounded-xl
          border
          border-slate-200
          bg-[#F7FAF8]
          shadow-[0_30px_100px_rgba(15,23,42,0.3)]

          sm:h-[92vh]
          sm:rounded-2xl
        "
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        {/* HEADER */}

        <div
          className="
            flex
            shrink-0
            items-center
            gap-2
            border-b
            border-slate-200
            bg-white
            px-3
            py-3

            sm:gap-3
            sm:px-5
            sm:py-3.5
          "
        >
          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              bg-[#EAF5EF]
              text-[#0B6B43]

              sm:h-10
              sm:w-10
              sm:rounded-xl
            "
          >
            <List size={16} />
          </div>

          <div
            className="
              min-w-0
              flex-1
              overflow-hidden
            "
          >
            <h2
              className="
                truncate
                text-[13px]
                font-extrabold
                text-[#17221D]

                sm:text-[17px]
              "
            >
              Repayment Schedule
            </h2>

            <p
              className="
                mt-0.5
                truncate
                text-[7px]
                font-medium
                text-slate-400

                sm:text-[9px]
              "
            >
              {loan?.loanNumber ||
                "Loan"}{" "}
              •{" "}
              {loan?.customerName ||
                "Customer"}

              {scheduleCount > 0
                ? ` • ${scheduleCount} installments`
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              border
              border-slate-200
              bg-white
              text-slate-400

              sm:h-9
              sm:w-9
            "
          >
            <X size={15} />
          </button>
        </div>

        {/* CONTENT */}

        <div
          className="
            min-h-0
            min-w-0
            flex-1
            overflow-auto
            p-2.5

            sm:p-4
            lg:p-5
          "
        >
          <div
            className="
              w-full
              min-w-0
              overflow-hidden
              rounded-xl
              border
              border-slate-200
              bg-white
              shadow-sm

              sm:rounded-2xl
            "
          >
            <LoanRepaymentSchedule
              loan={loan}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanDetailsDrawer;