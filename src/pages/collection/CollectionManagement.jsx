// src/pages/collection/CollectionManagement.jsx

import {
  CheckCircle2,
  Clock3,
  Eye,
  IndianRupee,
  Search,
  XCircle,
  LogOut,
  X,
  AlertTriangle,
  ShieldCheck,
  RotateCcw,
  ArrowDown,
  CalendarDays,
  Filter,
  BarChart3,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCollections,
  approveCollection,
  rejectCollection,
  COLLECTION_STATUS,
  getCollectionHistory,
  getCollectionHistorySummary,
} from "../../services/collectionStorage";

import {
  logout,
} from "../../services/authStorage";

import {
  useNavigate,
} from "react-router-dom";

/* =========================================================
   MAIN
========================================================= */

const EMPTY_HISTORY_SUMMARY = {
  startDate: "",
  endDate: "",
  recordCount: 0,
  totalRecords: 0,
  totalAmount: 0,
  approvedCount: 0,
  approvedAmount: 0,
  pendingCount: 0,
  pendingAmount: 0,
  rejectedCount: 0,
  rejectedAmount: 0,
  totalDue: 0,
  totalPenalty: 0,
  byCustomer: [],
};

const CollectionManagement = () => {
  const navigate =
    useNavigate();

  /* =======================================================
     STATE
  ======================================================= */

  const [
    collections,
    setCollections,
  ] = useState([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("All");

  const [
    selectedCollection,
    setSelectedCollection,
  ] = useState(null);

  const [
    rejectRemarks,
    setRejectRemarks,
  ] = useState("");

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    actionError,
    setActionError,
  ] = useState("");

  /* =======================================================
     COLLECTION HISTORY VIEW
  ======================================================= */

  const [
    historyOpen,
    setHistoryOpen,
  ] = useState(false);

  const [
    historyPeriod,
    setHistoryPeriod,
  ] = useState("This Month");

  const [
    historyStartDate,
    setHistoryStartDate,
  ] = useState("");

  const [
    historyEndDate,
    setHistoryEndDate,
  ] = useState("");

  const [
    historyCustomerSearch,
    setHistoryCustomerSearch,
  ] = useState("");

  /* =======================================================
     SYNC
  ======================================================= */

  useEffect(() => {
    const reload = async () => {
      setCollections(
        await safeGetCollections()
      );
    };

    reload();

    window.addEventListener(
      "auto-finance:data-updated",
      reload
    );

    window.addEventListener(
      "fleetopz:data-updated",
      reload
    );

    window.addEventListener(
      "storage",
      reload
    );

    return () => {
      window.removeEventListener(
        "auto-finance:data-updated",
        reload
      );

      window.removeEventListener(
        "fleetopz:data-updated",
        reload
      );

      window.removeEventListener(
        "storage",
        reload
      );
    };
  }, []);

  /* =======================================================
     METRICS
  ======================================================= */

  const pendingCollections =
    useMemo(() => {
      return collections.filter(
        (item) =>
          normalize(
            item?.status
          ) === "pending"
      );
    }, [collections]);

  const approvedCollections =
    useMemo(() => {
      return collections.filter(
        (item) =>
          normalize(
            item?.status
          ) === "approved"
      );
    }, [collections]);

  const rejectedCollections =
    useMemo(() => {
      return collections.filter(
        (item) =>
          normalize(
            item?.status
          ) === "rejected"
      );
    }, [collections]);

  const reversedCollections =
    useMemo(() => {
      return collections.filter(
        (item) =>
          normalize(
            item?.status
          ) === "reversed"
      );
    }, [collections]);

  const pendingAmount =
    pendingCollections.reduce(
      (sum, item) =>
        sum +
        toNumber(
          item?.amount
        ),
      0
    );

  const approvedAmount =
    approvedCollections.reduce(
      (sum, item) =>
        sum +
        toNumber(
          item?.amount
        ),
      0
    );

  const rejectedAmount =
    rejectedCollections.reduce(
      (sum, item) =>
        sum +
        toNumber(
          item?.amount
        ),
      0
    );

  const reversedAmount =
    reversedCollections.reduce(
      (sum, item) =>
        sum +
        toNumber(
          item?.amount
        ),
      0
    );

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredCollections =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return [...collections]
        .filter(
          (item) => {
            const searchable =
              [
                item?.id,
                item?.staffName,
                item?.customerName,
                item?.customerId,
                item?.loanId,
                item?.loanNumber,
                item?.paymentMode,
                item?.paymentType,
                item?.location,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
              !query ||
              searchable.includes(
                query
              );

            const normalizedStatus =
              normalize(
                item?.status
              );

            const matchesStatus =
              statusFilter ===
                "All" ||
              normalizedStatus ===
                statusFilter.toLowerCase();

            return (
              matchesSearch &&
              matchesStatus
            );
          }
        )
        .sort(
          (a, b) => {
            const aDate =
              new Date(
                a?.submittedAt ||
                  a?.createdAt ||
                  0
              ).getTime();

            const bDate =
              new Date(
                b?.submittedAt ||
                  b?.createdAt ||
                  0
              ).getTime();

            return (
              bDate - aDate
            );
          }
        );
    }, [
      collections,
      search,
      statusFilter,
    ]);

  /* =======================================================
     APPROVE
  ======================================================= */

  const handleApprove = async (
    collection
  ) => {
    if (
      !collection ||
      processing
    ) {
      return;
    }

    setProcessing(true);
    setActionError("");

    try {
      const result =
        await approveCollection(
          collection.id
        );

      if (
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            "Unable to approve this collection."
        );
      }

      /*
       * Repayment failed.
       */
      if (
        normalize(
          result?.collection?.repaymentProcessingStatus
        ) === "failed"
      ) {
        throw new Error(
          result?.collection?.repaymentError ||
            "Repayment processing failed."
        );
      }

      /*
       * Refresh storage.
       */
      const latest =
        await safeGetCollections();

      setCollections(
        latest
      );

      /*
       * Update modal state from
       * the latest record if needed.
       */
      const latestCollection =
        latest.find(
          (item) =>
            String(
              item?.id
            ) ===
            String(
              collection?.id
            )
        );

      setSelectedCollection(
        latestCollection ||
          null
      );

      setRejectRemarks("");
    } catch (error) {
      console.error(
        "Failed to approve collection:",
        error
      );

      setActionError(
        error?.message ||
          "Unable to approve collection."
      );

      setCollections(
        await safeGetCollections()
      );
    } finally {
      setProcessing(false);
    }
  };

  /* =======================================================
     REJECT
  ======================================================= */

  const handleReject = async (
    collection
  ) => {
    if (
      !collection ||
      processing
    ) {
      return;
    }

    setProcessing(true);
    setActionError("");

    try {
      const result =
        await rejectCollection(
          collection.id,
          rejectRemarks
        );

      if (
        !result?.success
      ) {
        throw new Error(
          "Unable to reject this collection."
        );
      }

      setCollections(
        await safeGetCollections()
      );

      setSelectedCollection(
        null
      );

      setRejectRemarks("");
    } catch (error) {
      console.error(
        "Failed to reject collection:",
        error
      );

      setActionError(
        error?.message ||
          "Unable to reject collection."
      );
    } finally {
      setProcessing(false);
    }
  };

  /* =======================================================
     HISTORY RANGE
  ======================================================= */

  const historyRange =
    useMemo(() => {
      const today = new Date();

      if (
        historyPeriod ===
        "This Month"
      ) {
        const start =
          new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          );

        const end =
          new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0
          );

        return {
          startDate:
            formatDateInput(start),
          endDate:
            formatDateInput(end),
        };
      }

      if (
        historyPeriod ===
        "Last Month"
      ) {
        const start =
          new Date(
            today.getFullYear(),
            today.getMonth() - 1,
            1
          );

        const end =
          new Date(
            today.getFullYear(),
            today.getMonth(),
            0
          );

        return {
          startDate:
            formatDateInput(start),
          endDate:
            formatDateInput(end),
        };
      }

      if (
        historyPeriod ===
        "Last 30 Days"
      ) {
        const start =
          new Date(today);

        start.setDate(
          start.getDate() - 29
        );

        return {
          startDate:
            formatDateInput(start),
          endDate:
            formatDateInput(today),
        };
      }

      if (
        historyPeriod ===
        "Custom"
      ) {
        return {
          startDate:
            historyStartDate,
          endDate:
            historyEndDate,
        };
      }

      return {
        startDate: "",
        endDate: "",
      };
    }, [
      historyPeriod,
      historyStartDate,
      historyEndDate,
    ]);

  const [historyRecords, setHistoryRecords] =
    useState([]);

  /*
   * Seeded with an empty summary so the panel renders before the first
   * fetch resolves.
   */
  const [historySummary, setHistorySummary] =
    useState(EMPTY_HISTORY_SUMMARY);

  useEffect(() => {
    let cancelled = false;

    const query = {
      startDate:
        historyRange.startDate,
      endDate:
        historyRange.endDate,
      status:
        COLLECTION_STATUS.APPROVED,
      customerName:
        historyCustomerSearch,
    };

    Promise.all([
      getCollectionHistory(query),
      getCollectionHistorySummary(query),
    ]).then(([records, summary]) => {
      if (cancelled) {
        return;
      }

      setHistoryRecords(records);
      setHistorySummary(summary);
    });

    return () => {
      cancelled = true;
    };
  }, [
      historyRange,
      historyCustomerSearch,
    ]);

  /* =======================================================
     OPEN
  ======================================================= */

  const openCollection = (
    collection
  ) => {
    setActionError("");
    setRejectRemarks("");

    setSelectedCollection(
      collection
    );
  };

  /* =======================================================
     CLOSE
  ======================================================= */

  const closeCollection = () => {
    if (
      processing
    ) {
      return;
    }

    setSelectedCollection(
      null
    );

    setRejectRemarks("");
    setActionError("");
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {
    logout();

    navigate(
      "/login",
      {
        replace: true,
      }
    );
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="
        min-h-full
        bg-[#F6F8F7]
        px-3
        py-3
        sm:px-4
        lg:px-5
      "
    >
      {/* ===================================================
          HEADER
      =================================================== */}

      <div
        className="
          flex
          flex-col
          gap-3
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div>
          <p
            className="
              text-[9px]
              font-bold
              uppercase
              tracking-wide
              text-[#0B6B43]
            "
          >
            Auto Finance
          </p>

          <h1
            className="
              mt-0.5
              text-[21px]
              font-extrabold
              text-[#17221D]
            "
          >
            Collection Management
          </h1>

          <p
            className="
              mt-1
              text-[10px]
              text-slate-400
            "
          >
            Review and approve
            staff-submitted
            collections
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setHistoryOpen(
                (previous) =>
                  !previous
              )
            }
            className="
              inline-flex
              h-9
              items-center
              justify-center
              gap-1.5
              rounded-lg
              border
              border-[#D8E9DF]
              bg-[#F6FBF8]
              px-3
              text-[9px]
              font-bold
              text-[#0B5D3B]
              transition
              hover:bg-[#EAF5EF]
            "
          >
            <BarChart3
              size={13}
            />
            {historyOpen
              ? "Hide Collection Data"
              : "View Collection Data"}
          </button>

          <button
            type="button"
            onClick={
              handleLogout
            }
            className="
              inline-flex
              h-9
              items-center
              justify-center
              gap-1.5
              self-start
              rounded-lg
              border
              border-slate-200
              bg-white
              px-3
              text-[9px]
              font-bold
              text-slate-500
              transition
              hover:bg-slate-50
              sm:self-auto
            "
          >
            <LogOut
              size={13}
            />
            Logout
          </button>
        </div>
      </div>

      {/* ===================================================
          ACTION ERROR
      =================================================== */}

      {actionError && (
        <div
          className="
            mt-3
            flex
            items-start
            gap-2
            rounded-lg
            border
            border-red-200
            bg-red-50
            px-3
            py-2.5
          "
        >
          <AlertTriangle
            size={14}
            className="
              mt-0.5
              shrink-0
              text-red-600
            "
          />

          <p
            className="
              text-[9px]
              font-semibold
              text-red-600
            "
          >
            {actionError}
          </p>

          <button
            type="button"
            onClick={() =>
              setActionError("")
            }
            className="
              ml-auto
              shrink-0
              rounded
              p-1
              text-red-400
              hover:bg-red-100
            "
          >
            <X
              size={12}
            />
          </button>
        </div>
      )}

      {/* ===================================================
          COLLECTION HISTORY / VIEW DATA
      =================================================== */}

      {historyOpen && (
        <section
          className="
            mt-4
            overflow-hidden
            rounded-2xl
            border
            border-[#D8E9DF]
            bg-white
            shadow-sm
          "
        >
          <div
            className="
              border-b
              border-slate-100
              bg-[#F6FBF8]
              px-4
              py-3.5
            "
          >
            <div
              className="
                flex
                flex-col
                gap-3
                lg:flex-row
                lg:items-center
                lg:justify-between
              "
            >
              <div>
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <div
                    className="
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-lg
                      bg-[#EAF5EF]
                      text-[#0B5D3B]
                    "
                  >
                    <BarChart3
                      size={14}
                    />
                  </div>

                  <div>
                    <h2
                      className="
                        text-[12px]
                        font-extrabold
                        text-[#17221D]
                      "
                    >
                      View Collection Data
                    </h2>

                    <p
                      className="
                        mt-0.5
                        text-[8px]
                        text-slate-400
                      "
                    >
                      Historical approved collections across
                      any selected date range.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-2
                "
              >
                {[
                  "This Month",
                  "Last Month",
                  "Last 30 Days",
                  "All Time",
                  "Custom",
                ].map(
                  (option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setHistoryPeriod(
                          option
                        )
                      }
                      className={`
                        inline-flex
                        h-8
                        items-center
                        gap-1
                        rounded-lg
                        px-2.5
                        text-[8px]
                        font-bold
                        transition
                        ${
                          historyPeriod ===
                          option
                            ? "bg-[#0B5D3B] text-white"
                            : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        }
                      `}
                    >
                      {option}
                    </button>
                  )
                )}
              </div>
            </div>

            <div
              className="
                mt-3
                grid
                grid-cols-1
                gap-2
                md:grid-cols-3
              "
            >
              <div
                className="
                  relative
                  md:col-span-1
                "
              >
                <Search
                  size={12}
                  className="
                    pointer-events-none
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />

                <input
                  value={
                    historyCustomerSearch
                  }
                  onChange={(event) =>
                    setHistoryCustomerSearch(
                      event.target.value
                    )
                  }
                  placeholder="Filter by customer name"
                  className="
                    h-9
                    w-full
                    rounded-lg
                    border
                    border-slate-200
                    bg-white
                    pl-8
                    pr-3
                    text-[9px]
                    font-semibold
                    text-[#17221D]
                    outline-none
                    focus:border-[#9CCEB1]
                    focus:ring-1
                    focus:ring-[#DCEFE4]
                  "
                />
              </div>

              {historyPeriod ===
                "Custom" && (
                <>
                  <label className="block">
                    <span
                      className="
                        mb-1
                        block
                        text-[7px]
                        font-bold
                        uppercase
                        tracking-wide
                        text-slate-400
                      "
                    >
                      From
                    </span>

                    <div className="relative">
                      <CalendarDays
                        size={12}
                        className="
                          pointer-events-none
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          text-slate-400
                        "
                      />

                      <input
                        type="date"
                        value={
                          historyStartDate
                        }
                        onChange={(event) =>
                          setHistoryStartDate(
                            event.target.value
                          )
                        }
                        className="
                          h-9
                          w-full
                          rounded-lg
                          border
                          border-slate-200
                          bg-white
                          pl-8
                          pr-3
                          text-[9px]
                          font-semibold
                          text-[#17221D]
                          outline-none
                          focus:border-[#9CCEB1]
                        "
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span
                      className="
                        mb-1
                        block
                        text-[7px]
                        font-bold
                        uppercase
                        tracking-wide
                        text-slate-400
                      "
                    >
                      To
                    </span>

                    <div className="relative">
                      <CalendarDays
                        size={12}
                        className="
                          pointer-events-none
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          text-slate-400
                        "
                      />

                      <input
                        type="date"
                        value={
                          historyEndDate
                        }
                        onChange={(event) =>
                          setHistoryEndDate(
                            event.target.value
                          )
                        }
                        className="
                          h-9
                          w-full
                          rounded-lg
                          border
                          border-slate-200
                          bg-white
                          pl-8
                          pr-3
                          text-[9px]
                          font-semibold
                          text-[#17221D]
                          outline-none
                          focus:border-[#9CCEB1]
                        "
                      />
                    </div>
                  </label>
                </>
              )}
            </div>
          </div>

          <div
            className="
              grid
              grid-cols-1
              gap-2
              p-3
              sm:grid-cols-3
            "
          >
            <CollectionHistoryMetric
              label="Total Collection"
              value={formatMoney(
                historySummary.totalAmount
              )}
              note={`${historySummary.totalRecords} approved records`}
              tone="green"
            />

            <CollectionHistoryMetric
              label="Total Due Component"
              value={formatMoney(
                historySummary.totalDue
              )}
              note="Due amount stored on collections"
              tone="blue"
            />

            <CollectionHistoryMetric
              label="Penalty Collected"
              value={formatMoney(
                historySummary.totalPenalty
              )}
              note="Approved penalty component"
              tone="amber"
            />
          </div>

          <div
            className="
              grid
              grid-cols-1
              gap-3
              px-3
              pb-3
              lg:grid-cols-2
            "
          >
            <div
              className="
                overflow-hidden
                rounded-xl
                border
                border-slate-200
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                  border-b
                  border-slate-100
                  bg-slate-50
                  px-3
                  py-2.5
                "
              >
                <div>
                  <p
                    className="
                      text-[9px]
                      font-extrabold
                      text-[#17221D]
                    "
                  >
                    Customer-wise Collection
                  </p>

                  <p
                    className="
                      mt-0.5
                      text-[7px]
                      text-slate-400
                    "
                  >
                    Total approved collection per customer
                  </p>
                </div>

                <Filter
                  size={12}
                  className="text-slate-400"
                />
              </div>

              {historySummary.byCustomer.length ===
              0 ? (
                <div
                  className="
                    px-3
                    py-8
                    text-center
                  "
                >
                  <p className="text-[8px] text-slate-400">
                    No collection data for this range.
                  </p>
                </div>
              ) : (
                <div className="max-h-[280px] overflow-y-auto">
                  {historySummary.byCustomer.map(
                    (customer) => (
                      <div
                        key={`${customer.customerId}-${customer.customerName}`}
                        className="
                          flex
                          items-center
                          justify-between
                          gap-3
                          border-b
                          border-slate-100
                          px-3
                          py-2.5
                          last:border-b-0
                        "
                      >
                        <div className="min-w-0">
                          <p
                            className="
                              truncate
                              text-[9px]
                              font-bold
                              text-[#253252]
                            "
                          >
                            {customer.customerName}
                          </p>

                          <p
                            className="
                              mt-0.5
                              text-[7px]
                              text-slate-400
                            "
                          >
                            {customer.customerId ||
                              "No Customer ID"}{" "}
                            •{" "}
                            {customer.count} collection
                            {customer.count === 1
                              ? ""
                              : "s"}
                          </p>
                        </div>

                        <p
                          className="
                            shrink-0
                            text-[10px]
                            font-extrabold
                            text-[#0B5D3B]
                          "
                        >
                          {formatMoney(
                            customer.amount
                          )}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <div
              className="
                overflow-hidden
                rounded-xl
                border
                border-slate-200
              "
            >
              <div
                className="
                  border-b
                  border-slate-100
                  bg-slate-50
                  px-3
                  py-2.5
                "
              >
                <p
                  className="
                    text-[9px]
                    font-extrabold
                    text-[#17221D]
                  "
                >
                  Collection History
                </p>

                <p
                  className="
                    mt-0.5
                    text-[7px]
                    text-slate-400
                  "
                >
                  Historical approved records from the selected
                  range.
                </p>
              </div>

              {historyRecords.length ===
              0 ? (
                <div
                  className="
                    px-3
                    py-8
                    text-center
                  "
                >
                  <p className="text-[8px] text-slate-400">
                    No approved collections found.
                  </p>
                </div>
              ) : (
                <div className="max-h-[280px] overflow-y-auto">
                  {historyRecords.map(
                    (collection) => (
                      <div
                        key={collection.id}
                        className="
                          border-b
                          border-slate-100
                          px-3
                          py-2.5
                          last:border-b-0
                        "
                      >
                        <div
                          className="
                            flex
                            items-start
                            justify-between
                            gap-3
                          "
                        >
                          <div className="min-w-0">
                            <p
                              className="
                                truncate
                                text-[9px]
                                font-bold
                                text-[#253252]
                              "
                            >
                              {collection.customerName ||
                                "Customer"}
                            </p>

                            <p
                              className="
                                mt-0.5
                                text-[7px]
                                text-slate-400
                              "
                            >
                              {collection.loanNumber ||
                                "—"}{" "}
                              •{" "}
                              {formatDateTime(
                                collection.approvedAt ||
                                  collection.collectedDate ||
                                  collection.createdAt
                              )}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p
                              className="
                                text-[10px]
                                font-extrabold
                                text-[#0B5D3B]
                              "
                            >
                              {formatMoney(
                                collection.amount
                              )}
                            </p>

                            <p
                              className="
                                mt-0.5
                                text-[7px]
                                text-slate-400
                              "
                            >
                              Approved
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===================================================
          KPI
      =================================================== */}

      <div
        className="
          mt-4
          grid
          grid-cols-1
          gap-2.5
          sm:grid-cols-2
          lg:grid-cols-4
        "
      >
        <CollectionMetric
          icon={
            Clock3
          }
          label="Pending Approval"
          count={
            pendingCollections.length
          }
          amount={
            pendingAmount
          }
          tone="amber"
        />

        <CollectionMetric
          icon={
            CheckCircle2
          }
          label="Approved"
          count={
            approvedCollections.length
          }
          amount={
            approvedAmount
          }
          tone="green"
        />

        <CollectionMetric
          icon={
            XCircle
          }
          label="Rejected"
          count={
            rejectedCollections.length
          }
          amount={
            rejectedAmount
          }
          tone="red"
        />

        <CollectionMetric
          icon={
            RotateCcw
          }
          label="Reversed"
          count={
            reversedCollections.length
          }
          amount={
            reversedAmount
          }
          tone="blue"
        />
      </div>

      {/* ===================================================
          FILTER
      =================================================== */}

      <div
        className="
          mt-3
          rounded-xl
          border
          border-slate-200
          bg-white
          p-2.5
        "
      >
        <div
          className="
            flex
            flex-col
            gap-2
            lg:flex-row
            lg:items-center
          "
        >
          <div
            className="
              relative
              min-w-0
              flex-1
            "
          >
            <Search
              size={13}
              className="
                pointer-events-none
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />

            <input
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search collection, staff, customer, loan..."
              className="
                h-9
                w-full
                rounded-lg
                border
                border-slate-200
                bg-white
                pl-8
                pr-3
                text-[10px]
                font-semibold
                text-[#17221D]
                outline-none
                focus:border-[#9CCEB1]
                focus:ring-1
                focus:ring-[#DCEFE4]
              "
            />
          </div>

          <select
            value={
              statusFilter
            }
            onChange={(
              event
            ) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="
              h-9
              rounded-lg
              border
              border-slate-200
              bg-white
              px-3
              text-[9px]
              font-bold
              text-slate-600
              outline-none
            "
          >
            <option>
              All
            </option>

            <option>
              Pending
            </option>

            <option>
              Approved
            </option>

            <option>
              Rejected
            </option>

            <option>
              Reversed
            </option>
          </select>
        </div>
      </div>

      {/* ===================================================
          TABLE
      =================================================== */}

      <div
        className="
          mt-3
          overflow-hidden
          rounded-xl
          border
          border-slate-200
          bg-white
          shadow-sm
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-slate-100
            px-4
            py-3
          "
        >
          <div>
            <h2
              className="
                text-[12px]
                font-extrabold
                text-[#17221D]
              "
            >
              Collections
            </h2>

            <p
              className="
                mt-0.5
                text-[8px]
                text-slate-400
              "
            >
              {
                filteredCollections.length
              }{" "}
              records
            </p>
          </div>

          <span
            className="
              rounded-full
              bg-[#EAF5EF]
              px-2.5
              py-1
              text-[8px]
              font-bold
              text-[#0B5D3B]
            "
          >
            Approved ₹
            {money(
              approvedAmount
            )}
          </span>
        </div>

        {filteredCollections.length ===
        0 ? (
          <EmptyCollections />
        ) : (
          <div className="overflow-x-auto">
            <table
              className="
                w-full
                min-w-[1180px]
                border-collapse
              "
            >
              <thead
                className="bg-[#F8FAF9]"
              >
                <tr>
                  <TableHead>
                    Collection
                  </TableHead>

                  <TableHead>
                    Staff
                  </TableHead>

                  <TableHead>
                    Customer
                  </TableHead>

                  <TableHead>
                    Loan
                  </TableHead>

                  <TableHead>
                    Amount
                  </TableHead>

                  <TableHead>
                    Payment Type
                  </TableHead>

                  <TableHead>
                    Payment
                  </TableHead>

                  <TableHead>
                    Status
                  </TableHead>

                  <TableHead>
                    Action
                  </TableHead>
                </tr>
              </thead>

              <tbody>
                {filteredCollections.map(
                  (
                    collection
                  ) => (
                    <tr
                      key={
                        collection.id
                      }
                      className="
                        border-b
                        border-slate-100
                        transition
                        hover:bg-[#FAFCFB]
                      "
                    >
                      {/* COLLECTION */}

                      <td className="px-4 py-3">
                        <p
                          className="
                            text-[9px]
                            font-bold
                            text-[#0B6B43]
                          "
                        >
                          {
                            collection.id
                          }
                        </p>

                        <p
                          className="
                            mt-0.5
                            text-[7px]
                            text-slate-400
                          "
                        >
                          {formatDate(
                            collection.submittedAt ||
                              collection.createdAt
                          )}
                        </p>
                      </td>

                      {/* STAFF */}

                      <td className="px-4 py-3">
                        <p
                          className="
                            text-[9px]
                            font-bold
                            text-[#253252]
                          "
                        >
                          {
                            collection.staffName ||
                            "—"
                          }
                        </p>
                      </td>

                      {/* CUSTOMER */}

                      <td className="px-4 py-3">
                        <p
                          className="
                            text-[9px]
                            font-bold
                            text-[#253252]
                          "
                        >
                          {
                            collection.customerName ||
                            "—"
                          }
                        </p>

                        <p
                          className="
                            mt-0.5
                            text-[7px]
                            text-slate-400
                          "
                        >
                          {
                            collection.customerId ||
                            "—"
                          }
                        </p>
                      </td>

                      {/* LOAN */}

                      <td className="px-4 py-3">
                        <p
                          className="
                            text-[9px]
                            font-bold
                            text-[#253252]
                          "
                        >
                          {
                            collection.loanNumber ||
                            "—"
                          }
                        </p>

                        <p
                          className="
                            mt-0.5
                            text-[7px]
                            text-slate-400
                          "
                        >
                          {
                            collection.loanId ||
                            ""
                          }
                        </p>
                      </td>

                      {/* AMOUNT */}

                      <td className="px-4 py-3">
                        <p
                          className="
                            text-[11px]
                            font-extrabold
                            text-[#17221D]
                          "
                        >
                          ₹
                          {money(
                            collection.amount
                          )}
                        </p>

                        <p
                          className="
                            mt-0.5
                            text-[7px]
                            text-slate-400
                          "
                        >
                          Due ₹
                          {money(
                            collection.dueAmount
                          )}
                        </p>

                        {toNumber(
                          collection.penaltyAmount
                        ) > 0 && (
                          <p
                            className="
                              mt-0.5
                              text-[7px]
                              font-semibold
                              text-orange-600
                            "
                          >
                            Penalty ₹
                            {money(
                              collection.penaltyAmount
                            )}
                          </p>
                        )}
                      </td>

                      {/* PAYMENT TYPE */}

                      <td className="px-4 py-3">
                        <PaymentTypeBadge
                          collection={
                            collection
                          }
                        />
                      </td>

                      {/* PAYMENT */}

                      <td className="px-4 py-3">
                        <p
                          className="
                            text-[9px]
                            font-semibold
                            text-[#253252]
                          "
                        >
                          {
                            collection.paymentMode ||
                            "—"
                          }
                        </p>

                        <p
                          className="
                            mt-0.5
                            text-[7px]
                            text-slate-400
                          "
                        >
                          {
                            collection.location ||
                            "No location"
                          }
                        </p>
                      </td>

                      {/* STATUS */}

                      <td className="px-4 py-3">
                        <CollectionStatus
                          status={
                            collection.status
                          }
                          processingStatus={
                            collection.repaymentProcessingStatus
                          }
                        />
                      </td>

                      {/* ACTION */}

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            openCollection(
                              collection
                            )
                          }
                          className="
                            inline-flex
                            items-center
                            gap-1
                            rounded-lg
                            border
                            border-slate-200
                            bg-white
                            px-2.5
                            py-1.5
                            text-[8px]
                            font-bold
                            text-slate-600
                            transition
                            hover:bg-slate-50
                            hover:text-[#0B6B43]
                          "
                        >
                          <Eye
                            size={11}
                          />

                          View
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===================================================
          DETAILS MODAL
      =================================================== */}

      {selectedCollection && (
        <CollectionDetailsModal
          collection={
            selectedCollection
          }
          rejectRemarks={
            rejectRemarks
          }
          setRejectRemarks={
            setRejectRemarks
          }
          processing={
            processing
          }
          actionError={
            actionError
          }
          onApprove={
            handleApprove
          }
          onReject={
            handleReject
          }
          onClose={
            closeCollection
          }
          clearError={() =>
            setActionError("")
          }
        />
      )}
    </div>
  );
};

/* =========================================================
   COLLECTION DETAILS MODAL
========================================================= */

const CollectionDetailsModal = ({
  collection,
  rejectRemarks,
  setRejectRemarks,
  processing,
  actionError,
  onApprove,
  onReject,
  onClose,
  clearError,
}) => {
  const status =
    normalize(
      collection?.status
    );

  const isPending =
    status ===
    "pending";

  const isApproved =
    status ===
    "approved";

  const isRejected =
    status ===
    "rejected";

  const isReversed =
    status ===
    "reversed";

  const amount =
    toNumber(
      collection?.amount
    );

  const dueAmount =
    toNumber(
      collection?.dueAmount
    );

  const penalty =
    toNumber(
      collection?.penaltyAmount
    );

  const totalPayable =
    toNumber(
      collection?.totalPayable
    ) ||
    dueAmount +
      penalty;

  const allocation =
    collection?.allocation ||
    {};

  const allocationItems =
    Array.isArray(
      allocation?.items
    )
      ? allocation.items
      : [];

  /*
   * IMPORTANT:
   *
   * The collection service stores
   * amountTowardDue as:
   *
   * overdue + currentDue
   *
   * So display them separately by
   * reading the actual allocation object.
   */

  const overdueAllocation =
    toNumber(
      allocation?.overdue
    );

  const currentDueAllocation =
    toNumber(
      allocation?.currentDue
    );

  const advance =
    toNumber(
      collection?.amountTowardAdvance
    ) ||
    toNumber(
      allocation?.advance
    );

  const principal =
    toNumber(
      collection?.amountTowardPrincipal
    ) ||
    toNumber(
      allocation?.principal
    );

  const excess =
    toNumber(
      collection?.amountExcess
    ) ||
    toNumber(
      allocation?.excess
    );

  const penaltyAllocated =
    toNumber(
      collection?.amountTowardPenalty
    ) ||
    toNumber(
      allocation?.penalty
    );

  return (
    <div
      className="
        fixed
        inset-0
        z-[700]
        flex
        items-center
        justify-center
        bg-slate-950/45
        p-4
        backdrop-blur-[3px]
      "
      onClick={
        onClose
      }
    >
      <div
        className="
          max-h-[92vh]
          w-full
          max-w-[700px]
          overflow-y-auto
          overflow-x-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-[0_30px_100px_rgba(15,23,42,0.30)]
        "
        onClick={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        {/* =================================================
            HEADER
        ================================================== */}

        <div
          className="
            sticky
            top-0
            z-10
            flex
            items-center
            justify-between
            border-b
            border-slate-100
            bg-white
            px-5
            py-3.5
          "
        >
          <div
            className="
              flex
              min-w-0
              items-center
              gap-3
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
                text-[#0B5D3B]
              "
            >
              <IndianRupee
                size={16}
              />
            </div>

            <div className="min-w-0">
              <p
                className="
                  text-[8px]
                  font-bold
                  uppercase
                  tracking-wide
                  text-slate-400
                "
              >
                Collection
              </p>

              <h2
                className="
                  mt-0.5
                  truncate
                  text-[16px]
                  font-extrabold
                  text-[#17221D]
                "
              >
                {
                  collection?.id
                }
              </h2>
            </div>
          </div>

          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <CollectionStatus
              status={
                collection?.status
              }
              processingStatus={
                collection?.repaymentProcessingStatus
              }
            />

            <button
              type="button"
              onClick={
                onClose
              }
              disabled={
                processing
              }
              className="
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-lg
                text-slate-400
                transition
                hover:bg-slate-50
                hover:text-slate-700
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <X
                size={16}
              />
            </button>
          </div>
        </div>

        <div
          className="
            space-y-4
            p-5
          "
        >
          {/* =================================================
              ERROR
          ================================================== */}

          {actionError && (
            <div
              className="
                flex
                items-start
                gap-2
                rounded-lg
                border
                border-red-200
                bg-red-50
                px-3
                py-2.5
              "
            >
              <AlertTriangle
                size={14}
                className="
                  mt-0.5
                  shrink-0
                  text-red-600
                "
              />

              <p
                className="
                  text-[9px]
                  font-semibold
                  text-red-600
                "
              >
                {actionError}
              </p>

              <button
                type="button"
                onClick={
                  clearError
                }
                className="
                  ml-auto
                  shrink-0
                  rounded
                  p-1
                  text-red-400
                  hover:bg-red-100
                "
              >
                <X
                  size={12}
                />
              </button>
            </div>
          )}

          {/* =================================================
              CUSTOMER / LOAN
          ================================================== */}

          <div
            className="
              rounded-xl
              bg-[#F7FAF8]
              px-4
              py-3
            "
          >
            <div
              className="
                grid
                grid-cols-2
                gap-4
                sm:grid-cols-4
              "
            >
              <Info
                label="Customer"
                value={
                  collection?.customerName
                }
              />

              <Info
                label="Customer ID"
                value={
                  collection?.customerId
                }
              />

              <Info
                label="Loan"
                value={
                  collection?.loanNumber
                }
              />

              <Info
                label="Staff"
                value={
                  collection?.staffName
                }
              />
            </div>
          </div>

          {/* =================================================
              RECEIVED
          ================================================== */}

          <div
            className="
              rounded-xl
              bg-[#F2FAF5]
              px-4
              py-4
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                gap-4
              "
            >
              <div>
                <p
                  className="
                    text-[8px]
                    font-bold
                    uppercase
                    tracking-wide
                    text-[#0B6B43]
                  "
                >
                  Amount Received
                </p>

                <p
                  className="
                    mt-1
                    text-2xl
                    font-extrabold
                    tracking-tight
                    text-[#0B6B43]
                  "
                >
                  ₹
                  {money(
                    amount
                  )}
                </p>
              </div>

              <div
                className="
                  text-right
                "
              >
                <p
                  className="
                    text-[8px]
                    font-semibold
                    text-slate-400
                  "
                >
                  Payment Type
                </p>

                <div className="mt-1">
                  <PaymentTypeBadge
                    collection={
                      collection
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              REPAYMENT ALLOCATION
          ================================================== */}

          <section>
            <div
              className="
                mb-2.5
                flex
                items-center
                gap-2
              "
            >
              <ShieldCheck
                size={14}
                className="
                  text-[#0B6B43]
                "
              />

              <div>
                <h3
                  className="
                    text-[11px]
                    font-extrabold
                    text-[#17221D]
                  "
                >
                  Repayment Allocation
                </h3>

                <p
                  className="
                    mt-0.5
                    text-[8px]
                    text-slate-400
                  "
                >
                  How the approved payment
                  is applied to the loan
                </p>
              </div>
            </div>

            <div
              className="
                grid
                grid-cols-2
                gap-2
                sm:grid-cols-3
              "
            >
              <AllocationCard
                label="Penalty"
                value={
                  penaltyAllocated
                }
                tone="orange"
              />

              <AllocationCard
                label="Overdue"
                value={
                  overdueAllocation
                }
                tone="red"
              />

              <AllocationCard
                label="Current Due"
                value={
                  currentDueAllocation
                }
                tone="green"
              />

              <AllocationCard
                label="Advance"
                value={
                  advance
                }
                tone="blue"
              />

              <AllocationCard
                label="Principal"
                value={
                  principal
                }
                tone="purple"
              />

              <AllocationCard
                label="Excess"
                value={
                  excess
                }
                tone="slate"
              />
            </div>

            {/* ALLOCATION TOTAL */}

            <div
              className="
                mt-2
                flex
                items-center
                justify-between
                rounded-lg
                border
                border-slate-100
                bg-slate-50
                px-3
                py-2.5
              "
            >
              <span
                className="
                  text-[8px]
                  font-bold
                  text-slate-500
                "
              >
                Total Allocated
              </span>

              <span
                className="
                  text-[10px]
                  font-extrabold
                  text-[#17221D]
                "
              >
                ₹
                {money(
                  allocation?.allocated ??
                    amount -
                      excess
                )}
              </span>
            </div>
          </section>

          {/* =================================================
              PAYMENT INFORMATION
          ================================================== */}

          <section
            className="
              rounded-xl
              border
              border-slate-100
              bg-white
            "
          >
            <div
              className="
                border-b
                border-slate-100
                px-4
                py-3
              "
            >
              <h3
                className="
                  text-[11px]
                  font-extrabold
                  text-[#17221D]
                "
              >
                Payment Information
              </h3>
            </div>

            <div
              className="
                grid
                grid-cols-2
                gap-4
                px-4
                py-3
                sm:grid-cols-4
              "
            >
              <Info
                label="Due Amount"
                value={`₹${money(
                  dueAmount
                )}`}
              />

              <Info
                label="Penalty"
                value={`₹${money(
                  penalty
                )}`}
              />

              <Info
                label="Total Payable"
                value={`₹${money(
                  totalPayable
                )}`}
              />

              <Info
                label="Payment Mode"
                value={
                  collection?.paymentMode
                }
              />

              <Info
                label="Due Date"
                value={formatDate(
                  collection?.dueDate
                )}
              />

              <Info
                label="Collected"
                value={formatDate(
                  collection?.collectedDate
                )}
              />

              <Info
                label="Submitted"
                value={formatDateTime(
                  collection?.submittedAt
                )}
              />

              <Info
                label="Approved"
                value={formatDateTime(
                  collection?.approvedAt
                )}
              />
            </div>
          </section>

          {/* =================================================
              OVERDUE / PENALTY DETAIL
          ================================================== */}

          {(
            penalty > 0 ||
            toNumber(
              collection?.overdueDays
            ) > 0
          ) && (
            <section
              className="
                rounded-xl
                border
                border-orange-100
                bg-orange-50/60
                px-4
                py-3
              "
            >
              <div
                className="
                  flex
                  items-start
                  gap-2
                "
              >
                <AlertTriangle
                  size={14}
                  className="
                    mt-0.5
                    shrink-0
                    text-orange-600
                  "
                />

                <div className="min-w-0">
                  <p
                    className="
                      text-[9px]
                      font-extrabold
                      text-orange-700
                    "
                  >
                    Overdue & Penalty Details
                  </p>

                  <div
                    className="
                      mt-2
                      grid
                      grid-cols-2
                      gap-3
                      sm:grid-cols-4
                    "
                  >
                    <Info
                      label="Overdue Days"
                      value={`${toNumber(
                        collection?.overdueDays
                      )} days`}
                    />

                    <Info
                      label="Grace Days"
                      value={`${toNumber(
                        collection?.graceDays
                      )} days`}
                    />

                    <Info
                      label="Penalty Days"
                      value={`${toNumber(
                        collection?.penaltyDays
                      )} days`}
                    />

                    <Info
                      label="Penalty Type"
                      value={
                        collection?.penaltyType ||
                        "Fixed"
                      }
                    />
                  </div>

                  <p
                    className="
                      mt-3
                      text-[8px]
                      leading-relaxed
                      text-orange-700/80
                    "
                  >
                    Penalty amount ₹
                    {money(
                      penalty
                    )}{" "}
                    is calculated according
                    to the loan's configured
                    grace-period and penalty
                    rule.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* =================================================
              ALLOCATION ITEMS
          ================================================== */}

          {allocationItems.length >
            0 && (
            <section>
              <div
                className="
                  mb-2.5
                  flex
                  items-center
                  gap-2
                "
              >
                <ArrowDown
                  size={14}
                  className="
                    text-slate-500
                  "
                />

                <div>
                  <h3
                    className="
                      text-[11px]
                      font-extrabold
                      text-[#17221D]
                    "
                  >
                    Allocation Details
                  </h3>

                  <p
                    className="
                      mt-0.5
                      text-[8px]
                      text-slate-400
                    "
                  >
                    Individual installment
                    allocation records
                  </p>
                </div>
              </div>

              <div
                className="
                  overflow-hidden
                  rounded-xl
                  border
                  border-slate-100
                "
              >
                {allocationItems.map(
                  (
                    item,
                    index
                  ) => (
                    <AllocationItemRow
                      key={`${item?.scheduleId || index}-${item?.installment || index}-${item?.type || "allocation"}`}
                      item={
                        item
                      }
                      index={
                        index
                      }
                    />
                  )
                )}
              </div>
            </section>
          )}

          {/* =================================================
              PROCESSING
          ================================================== */}

          {collection?.repaymentProcessingStatus && (
            <section
              className={`
                rounded-lg
                border
                px-4
                py-3
                ${
                  normalize(
                    collection?.repaymentProcessingStatus
                  ) ===
                  "failed"
                    ? "border-red-100 bg-red-50"
                    : "border-slate-100 bg-slate-50"
                }
              `}
            >
              <div
                className="
                  flex
                  items-start
                  justify-between
                  gap-3
                "
              >
                <div>
                  <p
                    className="
                      text-[8px]
                      font-bold
                      uppercase
                      tracking-wide
                      text-slate-400
                    "
                  >
                    Repayment Processing
                  </p>

                  <p
                    className={`
                      mt-1
                      text-[10px]
                      font-extrabold
                      ${
                        normalize(
                          collection?.repaymentProcessingStatus
                        ) ===
                        "failed"
                          ? "text-red-600"
                          : "text-[#253252]"
                      }
                    `}
                  >
                    {
                      collection.repaymentProcessingStatus
                    }
                  </p>
                </div>

                {collection?.repaymentError && (
                  <p
                    className="
                      max-w-[60%]
                      text-right
                      text-[8px]
                      font-semibold
                      text-red-600
                    "
                  >
                    {
                      collection.repaymentError
                    }
                  </p>
                )}
              </div>
            </section>
          )}

          {/* =================================================
              LOCATION / REMARKS
          ================================================== */}

          <section
            className="
              grid
              grid-cols-1
              gap-4
              sm:grid-cols-2
            "
          >
            <Info
              label="Location"
              value={
                collection?.location
              }
            />

            <Info
              label="Remarks"
              value={
                collection?.remarks
              }
            />
          </section>

          {/* =================================================
              REJECTION
          ================================================== */}

          {isRejected && (
            <section
              className="
                rounded-lg
                border
                border-red-100
                bg-red-50
                px-4
                py-3
              "
            >
              <p
                className="
                  text-[8px]
                  font-bold
                  uppercase
                  tracking-wide
                  text-red-500
                "
              >
                Rejection Reason
              </p>

              <p
                className="
                  mt-1
                  text-[9px]
                  font-semibold
                  text-red-700
                "
              >
                {
                  collection?.rejectionRemarks ||
                  "No reason provided."
                }
              </p>
            </section>
          )}

          {/* =================================================
              REVERSAL
          ================================================== */}

          {isReversed && (
            <section
              className="
                rounded-lg
                border
                border-blue-100
                bg-blue-50
                px-4
                py-3
              "
            >
              <p
                className="
                  text-[8px]
                  font-bold
                  uppercase
                  tracking-wide
                  text-blue-500
                "
              >
                Reversal
              </p>

              <p
                className="
                  mt-1
                  text-[9px]
                  font-semibold
                  text-blue-700
                "
              >
                Reversed by{" "}
                {
                  collection?.reversedBy ||
                  "Admin"
                }
              </p>

              <p
                className="
                  mt-0.5
                  text-[8px]
                  text-blue-600
                "
              >
                {
                  collection?.reversalReason ||
                  "No reversal reason provided."
                }
              </p>

              <p
                className="
                  mt-1
                  text-[7px]
                  text-blue-500
                "
              >
                {
                  collection?.reversedAt
                    ? formatDateTime(
                        collection.reversedAt
                      )
                    : "—"
                }
              </p>
            </section>
          )}

          {/* =================================================
              APPROVAL ACTIONS
          ================================================== */}

          {isPending && (
            <>
              <textarea
                value={
                  rejectRemarks
                }
                onChange={(
                  event
                ) =>
                  setRejectRemarks(
                    event.target.value
                  )
                }
                rows={3}
                disabled={
                  processing
                }
                className="
                  w-full
                  resize-none
                  rounded-lg
                  border
                  border-slate-200
                  px-3
                  py-2
                  text-[10px]
                  font-medium
                  text-[#253252]
                  outline-none
                  transition
                  focus:border-red-300
                  disabled:cursor-not-allowed
                  disabled:bg-slate-50
                "
                placeholder="Optional rejection remarks"
              />

              <div
                className="
                  flex
                  gap-2
                  border-t
                  border-slate-100
                  pt-4
                "
              >
                <button
                  type="button"
                  disabled={
                    processing
                  }
                  onClick={() =>
                    onReject(
                      collection
                    )
                  }
                  className="
                    flex
                    h-10
                    flex-1
                    items-center
                    justify-center
                    gap-1.5
                    rounded-lg
                    bg-red-50
                    text-[9px]
                    font-bold
                    text-red-600
                    transition
                    hover:bg-red-100
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <XCircle
                    size={13}
                  />

                  {processing
                    ? "Processing..."
                    : "Reject"}
                </button>

                <button
                  type="button"
                  disabled={
                    processing
                  }
                  onClick={() =>
                    onApprove(
                      collection
                    )
                  }
                  className="
                    flex
                    h-10
                    flex-1
                    items-center
                    justify-center
                    gap-1.5
                    rounded-lg
                    bg-[#0B6B43]
                    text-[9px]
                    font-bold
                    text-white
                    transition
                    hover:bg-[#095B3B]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <CheckCircle2
                    size={13}
                  />

                  {processing
                    ? "Processing..."
                    : "Approve & Post"}
                </button>
              </div>
            </>
          )}

          {/* =================================================
              APPROVED
          ================================================== */}

          {isApproved && (
            <div
              className="
                flex
                items-start
                gap-2
                rounded-lg
                border
                border-[#CFE8D9]
                bg-[#F0FAF4]
                px-3
                py-2.5
              "
            >
              <CheckCircle2
                size={14}
                className="
                  mt-0.5
                  shrink-0
                  text-[#0B6B43]
                "
              />

              <div>
                <p
                  className="
                    text-[9px]
                    font-semibold
                    text-[#0B6B43]
                  "
                >
                  Collection approved
                  and repayment posted.
                </p>

                <p
                  className="
                    mt-0.5
                    text-[8px]
                    text-[#0B6B43]/70
                  "
                >
                  Loan schedule,
                  payment history and
                  loan status were updated.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   ALLOCATION ITEM ROW
========================================================= */

const AllocationItemRow = ({
  item,
  index,
}) => {
  const type =
    item?.type ||
    "Allocation";

  const amount =
    toNumber(
      item?.amount
    );

  const label =
    type ===
    "Penalty"
      ? "Penalty"
      : type ===
        "Overdue"
      ? "Overdue Installment"
      : type ===
        "Current Due"
      ? "Current Due"
      : type ===
        "Advance"
      ? "Advance Installment"
      : type ===
        "Principal"
      ? "Principal"
      : type ===
        "Excess"
      ? "Excess"
      : type;

  const toneClass =
    type ===
    "Penalty"
      ? "text-orange-600"
      : type ===
        "Overdue"
      ? "text-red-600"
      : type ===
        "Current Due"
      ? "text-[#0B6B43]"
      : type ===
        "Advance"
      ? "text-blue-600"
      : type ===
        "Principal"
      ? "text-purple-600"
      : type ===
        "Excess"
      ? "text-slate-600"
      : "text-[#253252]";

  return (
    <div
      className="
        border-b
        border-slate-100
        px-4
        py-3
        last:border-b-0
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <div className="min-w-0">
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <span
              className="
                flex
                h-5
                w-5
                shrink-0
                items-center
                justify-center
                rounded
                bg-slate-100
                text-[7px]
                font-bold
                text-slate-500
              "
            >
              {index + 1}
            </span>

            <p
              className="
                text-[9px]
                font-extrabold
                text-[#253252]
              "
            >
              {label}
            </p>
          </div>

          {item?.installment && (
            <p
              className="
                mt-1
                text-[7px]
                text-slate-400
              "
            >
              Installment #
              {
                item.installment
              }

              {item?.dueDate
                ? ` · ${formatDate(
                    item.dueDate
                  )}`
                : ""}
            </p>
          )}

          {item?.previousRemaining !==
            undefined && (
            <p
              className="
                mt-1
                text-[7px]
                text-slate-400
              "
            >
              Before ₹
              {money(
                item.previousRemaining
              )}
              {" → "}
              After ₹
              {money(
                item.newRemaining
              )}
            </p>
          )}
        </div>

        <div
          className="
            shrink-0
            text-right
          "
        >
          <p
            className={`
              text-[10px]
              font-extrabold
              ${toneClass}
            `}
          >
            ₹
            {money(
              amount
            )}
          </p>

          {item?.newPaid !==
            undefined && (
            <p
              className="
                mt-0.5
                text-[7px]
                text-slate-400
              "
            >
              Paid ₹
              {money(
                item.newPaid
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   COLLECTION METRIC
========================================================= */

const CollectionMetric = ({
  icon: Icon,
  label,
  count,
  amount,
  tone,
}) => {
  const tones = {
    green: {
      bg: "bg-[#F1FAF4]",
      icon:
        "bg-[#DDF1E5] text-[#0B6B43]",
      text:
        "text-[#0B6B43]",
    },

    amber: {
      bg: "bg-[#FFF8ED]",
      icon:
        "bg-[#FFF0CE] text-[#D88B12]",
      text:
        "text-[#B86D00]",
    },

    red: {
      bg: "bg-[#FFF4F4]",
      icon:
        "bg-[#FDE2E2] text-[#D92D3A]",
      text:
        "text-[#D92D3A]",
    },

    blue: {
      bg: "bg-[#F1F6FE]",
      icon:
        "bg-[#E1ECFD] text-[#4779D8]",
      text:
        "text-[#4779D8]",
    },
  };

  const current =
    tones[tone] ||
    tones.green;

  return (
    <div
      className={`
        rounded-xl
        border
        border-slate-200
        ${current.bg}
        px-3.5
        py-3
      `}
    >
      <div
        className="
          flex
          items-start
          justify-between
          gap-2
        "
      >
        <div>
          <p
            className="
              text-[8px]
              font-bold
              uppercase
              tracking-wide
              text-slate-400
            "
          >
            {label}
          </p>

          <p
            className={`
              mt-1
              text-[20px]
              font-extrabold
              ${current.text}
            `}
          >
            {count}
          </p>

          <p
            className={`
              mt-1
              text-[11px]
              font-bold
              ${current.text}
            `}
          >
            ₹
            {money(
              amount
            )}
          </p>
        </div>

        <div
          className={`
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-lg
            ${current.icon}
          `}
        >
          <Icon
            size={15}
          />
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   PAYMENT TYPE BADGE
========================================================= */

const PaymentTypeBadge = ({
  collection,
}) => {
  const explicit =
    collection?.paymentType ||
    "";

  if (
    explicit
  ) {
    return (
      <span
        className="
          inline-flex
          max-w-[220px]
          rounded-full
          bg-[#EEF6F1]
          px-2
          py-1
          text-[7px]
          font-extrabold
          text-[#0B5D3B]
        "
      >
        {explicit}
      </span>
    );
  }

  const penalty =
    toNumber(
      collection?.amountTowardPenalty
    );

  const overdue =
    toNumber(
      collection?.allocation
        ?.overdue
    );

  const currentDue =
    toNumber(
      collection?.allocation
        ?.currentDue
    );

  const advance =
    toNumber(
      collection?.amountTowardAdvance
    ) ||
    toNumber(
      collection?.allocation
        ?.advance
    );

  const principal =
    toNumber(
      collection?.amountTowardPrincipal
    ) ||
    toNumber(
      collection?.allocation
        ?.principal
    );

  if (
    overdue > 0 &&
    currentDue > 0 &&
    advance > 0
  ) {
    return (
      <TypeBadge
        text="Overdue + Due + Advance"
        className="
          bg-purple-50
          text-purple-600
        "
      />
    );
  }

  if (
    overdue > 0 &&
    advance > 0
  ) {
    return (
      <TypeBadge
        text="Overdue + Advance"
        className="
          bg-blue-50
          text-blue-600
        "
      />
    );
  }

  if (
    currentDue > 0 &&
    advance > 0
  ) {
    return (
      <TypeBadge
        text="Due + Advance"
        className="
          bg-blue-50
          text-blue-600
        "
      />
    );
  }

  if (
    penalty > 0 &&
    overdue > 0
  ) {
    return (
      <TypeBadge
        text="Penalty + Overdue"
        className="
          bg-orange-50
          text-orange-700
        "
      />
    );
  }

  if (
    penalty > 0 &&
    currentDue > 0
  ) {
    return (
      <TypeBadge
        text="Penalty + Due"
        className="
          bg-orange-50
          text-orange-700
        "
      />
    );
  }

  if (
    principal > 0
  ) {
    return (
      <TypeBadge
        text="Principal Payment"
        className="
          bg-purple-50
          text-purple-600
        "
      />
    );
  }

  if (
    overdue > 0
  ) {
    return (
      <TypeBadge
        text="Overdue Payment"
        className="
          bg-red-50
          text-red-600
        "
      />
    );
  }

  if (
    currentDue > 0
  ) {
    return (
      <TypeBadge
        text="Due Payment"
        className="
          bg-[#EAF5EF]
          text-[#0B6B43]
        "
      />
    );
  }

  if (
    advance > 0
  ) {
    return (
      <TypeBadge
        text="Advance Payment"
        className="
          bg-blue-50
          text-blue-600
        "
      />
    );
  }

  return (
    <TypeBadge
      text="Payment"
      className="
        bg-slate-100
        text-slate-600
      "
    />
  );
};

/* =========================================================
   TYPE BADGE
========================================================= */

const TypeBadge = ({
  text,
  className,
}) => {
  return (
    <span
      className={`
        inline-flex
        max-w-[220px]
        rounded-full
        px-2
        py-1
        text-[7px]
        font-extrabold
        ${className}
      `}
    >
      {text}
    </span>
  );
};

/* =========================================================
   ALLOCATION CARD
========================================================= */

const AllocationCard = ({
  label,
  value,
  tone,
}) => {
  const styles = {
    orange: {
      bg:
        "bg-orange-50",
      text:
        "text-orange-700",
    },

    red: {
      bg:
        "bg-red-50",
      text:
        "text-red-700",
    },

    green: {
      bg:
        "bg-[#EAF5EF]",
      text:
        "text-[#0B6B43]",
    },

    blue: {
      bg:
        "bg-blue-50",
      text:
        "text-blue-700",
    },

    purple: {
      bg:
        "bg-purple-50",
      text:
        "text-purple-700",
    },

    slate: {
      bg:
        "bg-slate-50",
      text:
        "text-slate-700",
    },
  };

  const current =
    styles[tone] ||
    styles.slate;

  return (
    <div
      className={`
        rounded-lg
        ${current.bg}
        px-3
        py-2.5
      `}
    >
      <p
        className="
          text-[7px]
          font-bold
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </p>

      <p
        className={`
          mt-1
          text-[13px]
          font-extrabold
          ${current.text}
        `}
      >
        ₹
        {money(
          value
        )}
      </p>
    </div>
  );
};

/* =========================================================
   COLLECTION STATUS
========================================================= */

const CollectionStatus = ({
  status,
  processingStatus,
}) => {
  const normalized =
    normalize(
      status
    );

  let classes =
    "bg-slate-100 text-slate-600";

  if (
    normalized ===
    "approved"
  ) {
    classes =
      "bg-[#EAF5EF] text-[#0B6B43]";
  } else if (
    normalized ===
    "rejected"
  ) {
    classes =
      "bg-red-50 text-red-600";
  } else if (
    normalized ===
    "reversed"
  ) {
    classes =
      "bg-blue-50 text-blue-600";
  } else if (
    normalized ===
    "pending"
  ) {
    classes =
      processingStatus &&
      normalize(
        processingStatus
      ) === "failed"
        ? "bg-red-50 text-red-600"
        : "bg-[#FFF4DE] text-[#B86D00]";
  }

  return (
    <span
      className={`
        inline-flex
        items-center
        gap-1
        rounded-full
        px-2
        py-1
        text-[7px]
        font-extrabold
        ${classes}
      `}
    >
      {processingStatus &&
        normalize(
          processingStatus
        ) ===
          "failed" && (
          <AlertTriangle
            size={9}
          />
        )}

      {status ||
        "Unknown"}
    </span>
  );
};

/* =========================================================
   TABLE HEAD
========================================================= */

const TableHead = ({
  children,
}) => (
  <th
    className="
      whitespace-nowrap
      px-4
      py-2.5
      text-left
      text-[8px]
      font-bold
      uppercase
      tracking-wide
      text-slate-400
    "
  >
    {children}
  </th>
);

/* =========================================================
   INFO
========================================================= */

const Info = ({
  label,
  value,
}) => (
  <div className="min-w-0">
    <p
      className="
        text-[8px]
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
        mt-1
        break-words
        text-[10px]
        font-bold
        leading-tight
        text-[#253252]
      "
    >
      {value ||
        "—"}
    </p>
  </div>
);

/* =========================================================
   EMPTY
========================================================= */

const EmptyCollections = () => {
  return (
    <div
      className="
        px-5
        py-14
        text-center
      "
    >
      <div
        className="
          mx-auto
          flex
          h-12
          w-12
          items-center
          justify-center
          rounded-xl
          bg-[#EAF5EF]
          text-[#0B6B43]
        "
      >
        <CheckCircle2
          size={20}
        />
      </div>

      <p
        className="
          mt-3
          text-[12px]
          font-extrabold
          text-[#17221D]
        "
      >
        No collections found
      </p>

      <p
        className="
          mt-1
          text-[9px]
          text-slate-400
        "
      >
        Staff-submitted
        collections will appear
        here.
      </p>
    </div>
  );
};

/* =========================================================
   NORMALIZE
========================================================= */

const normalize = (
  value
) =>
  String(
    value || ""
  )
    .trim()
    .toLowerCase();

/* =========================================================
   NUMBER
========================================================= */

const toNumber = (
  value
) => {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
};

/* =========================================================
   MONEY
========================================================= */

const money = (
  value
) =>
  Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  );

/* =========================================================
   FORMAT MONEY
========================================================= */

const formatMoney = (value) => {
  return `₹${toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

/* =========================================================
   DATE
========================================================= */

const parseDate = (
  value
) => {
  if (!value) {
    return null;
  }

  const raw =
    String(value);

  const match =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (match) {
    const [
      ,
      year,
      month,
      day,
    ] = match;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
};

const formatDate = (
  value
) => {
  const date =
    parseDate(
      value
    );

  if (!date) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const formatDateTime = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};

/* =========================================================
   SAFE STORAGE
========================================================= */

const safeGetCollections =
  async () => {
    try {
      const result =
        await getCollections();

      return Array.isArray(
        result
      )
        ? result
        : [];
    } catch (error) {
      console.error(
        "Failed to load collections:",
        error
      );

      return [];
    }
  };

/* =========================================================
   COLLECTION HISTORY METRIC
========================================================= */

const CollectionHistoryMetric = ({
  label,
  value,
  note,
  tone = "green",
}) => {
  const styles = {
    green: "bg-[#F1FAF4] text-[#0B6B43]",
    blue: "bg-[#F1F6FE] text-blue-600",
    amber: "bg-[#FFF8E8] text-amber-700",
  };

  return (
    <div
      className="
        rounded-xl
        border
        border-slate-200
        bg-white
        px-3
        py-3
      "
    >
      <p
        className="
          text-[7px]
          font-bold
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </p>

      <p
        className={`
          mt-1
          inline-block
          rounded-md
          px-2
          py-1
          text-[14px]
          font-extrabold
          ${styles[tone] || styles.green}
        `}
      >
        {value}
      </p>

      <p
        className="
          mt-1
          text-[7px]
          font-medium
          text-slate-400
        "
      >
        {note}
      </p>
    </div>
  );
};

/* =========================================================
   DATE INPUT
========================================================= */

const formatDateInput = (
  value
) => {
  if (
    !value ||
    Number.isNaN(
      value.getTime()
    )
  ) {
    return "";
  }

  return [
    value.getFullYear(),
    String(
      value.getMonth() + 1
    ).padStart(2, "0"),
    String(
      value.getDate()
    ).padStart(2, "0"),
  ].join("-");
};

/* =========================================================
   DEFAULT
========================================================= */

export default CollectionManagement;