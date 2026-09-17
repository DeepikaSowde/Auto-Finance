// src/pages/vehicle/ReleasedVehicles.jsx

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import {
  CarFront,
  ChevronLeft,
  ChevronRight,
  FileText,
  MoreVertical,
  ReceiptText,
  RotateCcw,
  Search,
  UserRound,
  WalletCards,
  X,
  CheckCircle2,
} from "lucide-react";

import {
  getCustomers,
  getLoans,
  getOutstandingAmount,
} from "../../services/customerStorage";

import {
  getVehicleSeizures,
} from "../../services/vehicleStorage";

/* =========================================================
   MAIN
========================================================= */

const ReleasedVehicles = () => {
  const navigate = useNavigate();

  const [seizures, setSeizures] = useState([]);
  const [loans, setLoans] = useState([]);

  const [search, setSearch] = useState("");

  const [releaseDateFilter, setReleaseDateFilter] =
    useState("");

  const [releaseReasonFilter, setReleaseReasonFilter] =
    useState("All Reasons");

  const [loanStatusFilter, setLoanStatusFilter] =
    useState("All Loan Status");

  const [releasedByFilter, setReleasedByFilter] =
    useState("All Staff");

  const [currentPage, setCurrentPage] = useState(1);

  const [openActionId, setOpenActionId] = useState(null);

  const [selectedRelease, setSelectedRelease] =
    useState(null);

  const [selectedPaymentDetails, setSelectedPaymentDetails] =
    useState(null);

  const [customers, setCustomers] = useState([]);

  const rowsPerPage = 7;

  /* =======================================================
     LOAD
  ======================================================= */

  const loadData = async () => {
    try {
      const [storedSeizures, storedLoans, storedCustomers] =
        await Promise.all([
          getVehicleSeizures(),
          getLoans(),
          getCustomers(),
        ]);

      setCustomers(
        Array.isArray(storedCustomers)
          ? storedCustomers
          : []
      );

      setSeizures(
        Array.isArray(storedSeizures)
          ? storedSeizures
          : []
      );

      setLoans(
        Array.isArray(storedLoans)
          ? storedLoans
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load released vehicles:",
        error
      );

      setSeizures([]);
      setLoans([]);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener(
      "auto-finance:data-updated",
      handleUpdate
    );

    window.addEventListener(
      "fleetopz:data-updated",
      handleUpdate
    );

    window.addEventListener(
      "storage",
      handleUpdate
    );

    return () => {
      window.removeEventListener(
        "auto-finance:data-updated",
        handleUpdate
      );

      window.removeEventListener(
        "fleetopz:data-updated",
        handleUpdate
      );

      window.removeEventListener(
        "storage",
        handleUpdate
      );
    };
  }, []);

  /* =======================================================
     FIND LOAN
  ======================================================= */

  const findLoanForRelease = (release) => {
    const releaseLoanId =
      release?.loanId || "";

    const releaseLoanNumber =
      release?.loanNumber || "";

    if (
      !releaseLoanId &&
      !releaseLoanNumber
    ) {
      return null;
    }

    return (
      loans.find((loan) => {
        const loanId =
          loan?.id || "";

        const loanNumber =
          loan?.loanNumber || "";

        return (
          (
            releaseLoanId &&
            String(loanId) ===
              String(releaseLoanId)
          ) ||
          (
            releaseLoanNumber &&
            String(loanNumber) ===
              String(releaseLoanNumber)
          )
        );
      }) || null
    );
  };

  /* =======================================================
     FIND CUSTOMER
  ======================================================= */

  const findCustomerForRelease = (release) => {
    const customerId =
      release?.customerId || "";

    if (!customerId) {
      return null;
    }

    return (
      customers.find((record) => {
        const storedCustomerId =
          record?.customer?.id ||
          record?.customerId ||
          record?.id ||
          "";

        return (
          String(storedCustomerId) ===
          String(customerId)
        );
      }) || null
    );
  };

  /* =======================================================
     RECOVERED AMOUNT
  ======================================================= */

  const getRecoveredAmount = (
    release,
    loan
  ) => {
    const releaseData =
      release?.release ||
      {};

    const explicitAmount =
      Number(
        release?.amountRecovered ??
          release?.recoveredAmount ??
          release?.amountPaid ??
          release?.paymentAmount ??
          releaseData?.amountRecovered ??
          releaseData?.recoveredAmount ??
          releaseData?.amountPaid ??
          releaseData?.paymentAmount ??
          0
      );

    if (explicitAmount > 0) {
      return explicitAmount;
    }

    const history = Array.isArray(
      loan?.paymentHistory
    )
      ? loan.paymentHistory
      : [];

    const seizureDate =
      parseLocalDate(
        release?.seizedAt ||
          release?.seizureDate ||
          release?.createdAt
      );

    const releaseDate =
      parseLocalDate(
        release?.releasedAt ||
          releaseData?.releasedAt
      );

    return history.reduce(
      (total, payment) => {
        const paymentDate =
          parseLocalDate(
            payment?.date ||
              payment?.paymentDate ||
              payment?.paidAt
          );

        if (!paymentDate) {
          return total;
        }

        if (
          seizureDate &&
          paymentDate.getTime() <
            seizureDate.getTime()
        ) {
          return total;
        }

        if (
          releaseDate &&
          paymentDate.getTime() >
            releaseDate.getTime()
        ) {
          return total;
        }

        return (
          total +
          Number(
            payment?.amount ||
              payment?.paymentAmount ||
              0
          )
        );
      },
      0
    );
  };

  /* =======================================================
     RECOVERY DAYS
  ======================================================= */

  const getRecoveryDays = (
    seizureDate,
    releaseDate
  ) => {
    const start =
      parseLocalDate(
        seizureDate
      );

    const end =
      parseLocalDate(
        releaseDate
      );

    if (!start || !end) {
      return 0;
    }

    start.setHours(
      0,
      0,
      0,
      0
    );

    end.setHours(
      0,
      0,
      0,
      0
    );

    return Math.max(
      0,
      Math.floor(
        (
          end.getTime() -
          start.getTime()
        ) /
          (
            1000 *
            60 *
            60 *
            24
          )
      )
    );
  };

  /* =======================================================
     NORMALIZED RELEASE RECORDS
  ======================================================= */

  const normalizedReleases = useMemo(() => {
    return seizures
      .filter((seizure) => {
        const status =
          normalize(
            seizure?.status
          );

        const releaseStatus =
          normalize(
            seizure?.release?.releaseStatus
          );

        return (
          status === "released" ||
          releaseStatus === "released"
        );
      })
      .map((release) => {
        const releaseData =
          release?.release ||
          {};

        const loan =
          findLoanForRelease(
            release
          );

        const customer =
          findCustomerForRelease(
            release
          );

        const vehicle =
          release?.vehicle ||
          loan?.vehicle ||
          {};

        const vehicleName =
          release?.vehicleName ||
          [
            vehicle?.brand,
            vehicle?.model,
            vehicle?.variant,
          ]
            .filter(Boolean)
            .join(" ") ||
          "Vehicle";

        const seizureDate =
          release?.seizedAt ||
          release?.seizureDate ||
          release?.createdAt ||
          "";

        const releaseDate =
          release?.releasedAt ||
          releaseData?.releasedAt ||
          "";

        const outstandingBeforeRelease =
          Number(
            release?.outstandingAmount ??
              release?.outstandingBeforeRelease ??
              releaseData?.outstandingAmount ??
              releaseData?.outstandingBeforeRelease ??
              getOutstandingAmount(
                loan
              ) ??
              0
          );

        const recoveredAmount =
          getRecoveredAmount(
            release,
            loan
          );

        const remainingBalance =
          Math.max(
            outstandingBeforeRelease -
              recoveredAmount,
            0
          );

        const releaseReason =
          release?.releaseReason ||
          release?.reason ||
          release?.releaseRemarks ||
          releaseData?.releaseReason ||
          releaseData?.remarks ||
          "—";

        const releasedBy =
          release?.releasedBy ||
          release?.approvedBy ||
          releaseData?.releasedBy ||
          "Admin";

        const releaseLocation =
          release?.releaseLocation ||
          release?.releasedLocation ||
          releaseData?.releaseLocation ||
          "";

        const vehicleType =
          release?.vehicleType ||
          vehicle?.vehicleType ||
          "";

        const loanStatus =
          loan?.status ||
          release?.loanStatus ||
          "Active";

        const overdueDays =
          getLoanOverdueDays(
            loan
          );

        const customerMobile =
          release?.mobileNumber ||
          release?.customerMobile ||
          loan?.mobileNumber ||
          customer?.mobileNumber ||
          customer?.customer
            ?.personal?.mobileNumber ||
          customer?.personal?.mobileNumber ||
          "";

        return {
          ...release,

          recordId:
            release?.id,

          vehicleId:
            release?.vehicleId ||
            vehicle?.id ||
            vehicle?.vehicleId ||
            "—",

          registrationNumber:
            release?.registrationNumber ||
            vehicle?.registrationNumber ||
            loan?.registrationNumber ||
            loan?.rc
              ?.registrationNumber ||
            "—",

          customerId:
            release?.customerId ||
            loan?.customerId ||
            customer?.customer?.id ||
            customer?.customerId ||
            customer?.id ||
            "—",

          customerName:
            release?.customerName ||
            loan?.customerName ||
            customer?.customer
              ?.personal?.name ||
            customer?.personal?.name ||
            "Customer",

          customerMobile,

          loanId:
            release?.loanId ||
            loan?.id ||
            "—",

          loanNumber:
            release?.loanNumber ||
            loan?.loanNumber ||
            "—",

          vehicleName,

          vehicleType,

          loanAmount:
            Number(
              release?.loanAmount ??
                loan?.loanAmount ??
                loan?.vehicleAmount ??
                loan?.calculation
                  ?.loanAmount ??
                0
            ),

          outstandingBeforeRelease,

          recoveredAmount,

          remainingBalance,

          overdueDays,

          seizureDate,

          releaseDate,

          seizedBy:
            release?.seizedBy ||
            release?.createdBy ||
            "—",

          releasedBy,

          seizureLocation:
            release?.location ||
            release?.seizureLocation ||
            "—",

          releaseLocation:
            releaseLocation ||
            "—",

          releaseReason,

          loanStatus,

          attachment:
            release?.attachment ||
            releaseData?.attachment ||
            null,

          loan,

          customer,
        };
      });
  }, [
    seizures,
    loans,
  ]);

  /* =======================================================
     FILTER OPTIONS
  ======================================================= */

  const releaseReasons =
    useMemo(() => {
      return uniqueSorted(
        normalizedReleases.map(
          (item) =>
            item.releaseReason
        )
      );
    }, [
      normalizedReleases,
    ]);

  const loanStatuses =
    useMemo(() => {
      return uniqueSorted(
        normalizedReleases.map(
          (item) =>
            item.loanStatus
        )
      );
    }, [
      normalizedReleases,
    ]);

  const releasedByOptions =
    useMemo(() => {
      return uniqueSorted(
        normalizedReleases.map(
          (item) =>
            item.releasedBy
        )
      );
    }, [
      normalizedReleases,
    ]);

  /* =======================================================
     FILTERED
  ======================================================= */

  const filteredReleases =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return normalizedReleases.filter(
        (item) => {
          const searchable = [
            item.vehicleId,
            item.registrationNumber,
            item.customerName,
            item.customerId,
            item.customerMobile,
            item.loanNumber,
            item.vehicleName,
            item.releaseReason,
            item.releasedBy,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !query ||
            searchable.includes(
              query
            );

          const matchesReleaseDate =
            !releaseDateFilter ||
            getDateKey(
              item.releaseDate
            ) ===
              releaseDateFilter;

          const matchesReason =
            releaseReasonFilter ===
              "All Reasons" ||
            item.releaseReason ===
              releaseReasonFilter;

          const matchesLoanStatus =
            loanStatusFilter ===
              "All Loan Status" ||
            item.loanStatus ===
              loanStatusFilter;

          const matchesReleasedBy =
            releasedByFilter ===
              "All Staff" ||
            item.releasedBy ===
              releasedByFilter;

          return (
            matchesSearch &&
            matchesReleaseDate &&
            matchesReason &&
            matchesLoanStatus &&
            matchesReleasedBy
          );
        }
      );
    }, [
      normalizedReleases,
      search,
      releaseDateFilter,
      releaseReasonFilter,
      loanStatusFilter,
      releasedByFilter,
    ]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredReleases.length /
          rowsPerPage
      )
    );

  useEffect(() => {
    setCurrentPage(1);
    setOpenActionId(null);
  }, [
    search,
    releaseDateFilter,
    releaseReasonFilter,
    loanStatusFilter,
    releasedByFilter,
  ]);

  useEffect(() => {
    setOpenActionId(null);
  }, [
    currentPage,
  ]);

  useEffect(() => {
    if (
      currentPage >
      totalPages
    ) {
      setCurrentPage(
        totalPages
      );
    }
  }, [
    currentPage,
    totalPages,
  ]);

  const startIndex =
    filteredReleases.length ===
    0
      ? 0
      : (
          currentPage -
          1
        ) *
        rowsPerPage;

  const endIndex =
    Math.min(
      startIndex +
        rowsPerPage,
      filteredReleases.length
    );

  const paginatedReleases =
    filteredReleases.slice(
      startIndex,
      endIndex
    );

  /* =======================================================
     KPI
  ======================================================= */

  const stats = useMemo(() => {
    const totalReleased =
      normalizedReleases.length;

    const now =
      new Date();

    const month =
      now.getMonth();

    const year =
      now.getFullYear();

    const releasedThisMonth =
      normalizedReleases.filter(
        (item) => {
          const date =
            parseLocalDate(
              item.releaseDate
            );

          if (!date) {
            return false;
          }

          return (
            date.getMonth() ===
              month &&
            date.getFullYear() ===
              year
          );
        }
      ).length;

    const amountRecovered =
      normalizedReleases.reduce(
        (sum, item) =>
          sum +
          Number(
            item.recoveredAmount ||
              0
          ),
        0
      );

    const recoveryDurations =
      normalizedReleases
        .map((item) =>
          getRecoveryDays(
            item.seizureDate,
            item.releaseDate
          )
        )
        .filter(
          (days) => days >= 0
        );

    const averageRecoveryDays =
      recoveryDurations.length
        ? Math.round(
            recoveryDurations.reduce(
              (
                sum,
                days
              ) =>
                sum + days,
              0
            ) /
              recoveryDurations.length
          )
        : 0;

    return {
      totalReleased,
      releasedThisMonth,
      amountRecovered,
      averageRecoveryDays,
    };
  }, [
    normalizedReleases,
  ]);

  /* =======================================================
     RESET
  ======================================================= */

  const resetFilters = () => {
    setSearch("");
    setReleaseDateFilter("");
    setReleaseReasonFilter(
      "All Reasons"
    );
    setLoanStatusFilter(
      "All Loan Status"
    );
    setReleasedByFilter(
      "All Staff"
    );
    setCurrentPage(1);
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="
        min-h-full
        bg-[#F7F9F8]
        px-3
        py-3
        sm:px-4
        sm:py-4
        lg:px-5
        lg:py-5
      "
    >
      {/* HEADER */}

      <header className="mb-4">
        <div
          className="
            flex
            flex-col
            gap-2.5
            lg:flex-row
            lg:items-end
            lg:justify-between
          "
        >
          <div>
            <div className="flex items-center gap-2">
              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-blue-50
                  text-blue-600
                "
              >
                <CheckCircle2
                  size={18}
                />
              </div>

              <h1
                className="
                  text-[22px]
                  font-semibold
                  tracking-tight
                  text-[#17221D]
                  sm:text-[24px]
                "
              >
                Released Vehicles
              </h1>
            </div>

            <p
              className="
                mt-1
                text-[11px]
                text-slate-500
              "
            >
              Track vehicles released
              after seizure, recovery
              and financial resolution.
            </p>
          </div>

          <div
            className="
              text-left
              text-[9px]
              text-slate-400
              lg:text-right
            "
          >
            Showing{" "}
            <span className="font-semibold text-slate-600">
              {
                filteredReleases.length
              }
            </span>{" "}
            released vehicles
          </div>
        </div>
      </header>

      {/* KPI */}

      <section
        className="
          grid
          grid-cols-1
          gap-2.5
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        <ReleasedKpi
          icon={CarFront}
          label="Total Released Vehicles"
          value={
            stats.totalReleased
          }
          note="Vehicles released after seizure"
          tone="blue"
        />

        <ReleasedKpi
          icon={RotateCcw}
          label="Released This Month"
          value={
            stats.releasedThisMonth
          }
          note="Releases completed this month"
          tone="green"
        />

        <ReleasedKpi
          icon={WalletCards}
          label="Amount Recovered"
          value={formatMoney(
            stats.amountRecovered
          )}
          note="Payments collected for released vehicles"
          tone="purple"
        />

        <ReleasedKpi
          icon={CheckCircle2}
          label="Average Recovery Days"
          value={`${stats.averageRecoveryDays} Days`}
          note="Average time from seizure to release"
          tone="orange"
        />
      </section>

      {/* FILTERS */}

      <section
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
            grid
            grid-cols-1
            gap-2
            lg:grid-cols-[minmax(220px,1.6fr)_repeat(4,minmax(125px,1fr))_auto]
          "
        >
          <div className="relative">
            <Search
              size={14}
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
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Registration, customer, loan, vehicle ID..."
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
                font-medium
                text-[#17221D]
                outline-none
                focus:border-[#9CCEB1]
                focus:ring-1
                focus:ring-[#DCEFE4]
              "
            />
          </div>

          <input
            type="date"
            value={
              releaseDateFilter
            }
            onChange={(event) =>
              setReleaseDateFilter(
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
              px-2.5
              text-[10px]
              font-medium
              text-[#17221D]
              outline-none
              focus:border-[#9CCEB1]
            "
          />

          <FilterSelect
            value={
              releaseReasonFilter
            }
            onChange={
              setReleaseReasonFilter
            }
            options={[
              "All Reasons",
              ...releaseReasons,
            ]}
          />

          <FilterSelect
            value={
              loanStatusFilter
            }
            onChange={
              setLoanStatusFilter
            }
            options={[
              "All Loan Status",
              ...loanStatuses,
            ]}
          />

          <FilterSelect
            value={
              releasedByFilter
            }
            onChange={
              setReleasedByFilter
            }
            options={[
              "All Staff",
              ...releasedByOptions,
            ]}
          />

          <button
            type="button"
            onClick={
              resetFilters
            }
            className="
              inline-flex
              h-9
              items-center
              justify-center
              gap-1.5
              rounded-lg
              border
              border-slate-200
              bg-white
              px-3
              text-[9px]
              font-semibold
              text-slate-500
              transition
              hover:border-[#A8D0BD]
              hover:bg-[#F6FBF8]
              hover:text-[#0B5D3B]
            "
          >
            <RotateCcw
              size={12}
            />
            Reset
          </button>
        </div>
      </section>

      {/* TABLE */}

      <section
        className="
          mt-3
          overflow-hidden
          rounded-xl
          border
          border-slate-200
          bg-white
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
                font-semibold
                text-[#17221D]
              "
            >
              Released Vehicle List
            </h2>

            <p
              className="
                mt-0.5
                text-[8px]
                text-slate-400
              "
            >
              Live release records from
              the vehicle seizure workflow
            </p>
          </div>

          <span
            className="
              rounded-full
              bg-blue-50
              px-2.5
              py-1
              text-[8px]
              font-bold
              text-blue-600
            "
          >
            {
              filteredReleases.length
            }
          </span>
        </div>

        {paginatedReleases.length ===
        0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table
              className="
                w-full
                min-w-[1220px]
                border-collapse
              "
            >
              <thead
                className="bg-[#F8FAF9]"
              >
                <tr
                  className="
                    border-b
                    border-slate-200
                  "
                >
                  <TableHeader>
                    Vehicle ID
                  </TableHeader>

                  <TableHeader>
                    Registration No.
                  </TableHeader>

                  <TableHeader>
                    Customer
                  </TableHeader>

                  <TableHeader>
                    Vehicle
                  </TableHeader>

                  <TableHeader>
                    Loan No.
                  </TableHeader>

                  <TableHeader>
                    Seized Date
                  </TableHeader>

                  <TableHeader>
                    Release Date
                  </TableHeader>

                  <TableHeader align="right">
                    Amount Recovered
                  </TableHeader>

                  <TableHeader>
                    Release Reason
                  </TableHeader>

                  <TableHeader>
                    Released By
                  </TableHeader>

                  <TableHeader>
                    Status
                  </TableHeader>

                  <TableHeader align="center">
                    Actions
                  </TableHeader>
                </tr>
              </thead>

              <tbody>
                {paginatedReleases.map(
                  (item) => (
                    <ReleasedVehicleRow
                      key={
                        item.recordId
                      }
                      item={item}
                      actionOpen={
                        openActionId ===
                        item.recordId
                      }
                      onToggleActions={() =>
                        setOpenActionId(
                          (current) =>
                            current ===
                            item.recordId
                              ? null
                              : item.recordId
                        )
                      }
                      onViewVehicle={() => {
                        setOpenActionId(
                          null
                        );

                        if (
                          item.customerId &&
                          item.customerId !==
                            "—"
                        ) {
                          navigate(
                            `/customers/${encodeURIComponent(
                              item.customerId
                            )}`
                          );
                        }
                      }}
                      onViewCustomer={() => {
                        setOpenActionId(
                          null
                        );

                        if (
                          item.customerId &&
                          item.customerId !==
                            "—"
                        ) {
                          navigate(
                            `/customers/${encodeURIComponent(
                              item.customerId
                            )}`
                          );
                        }
                      }}
                      onViewLoan={() => {
                        setOpenActionId(
                          null
                        );

                        navigate(
                          "/loan"
                        );
                      }}
                      onViewRelease={() => {
                        setOpenActionId(
                          null
                        );

                        setSelectedRelease(
                          item
                        );
                      }}
                      onViewSeizure={() => {
                        setOpenActionId(
                          null
                        );

                        setSelectedRelease(
                          item
                        );
                      }}
                      onViewDocuments={() => {
                        setOpenActionId(
                          null
                        );

                        setSelectedRelease(
                          item
                        );
                      }}
                      onViewPayment={() => {
                        setOpenActionId(
                          null
                        );

                        setSelectedPaymentDetails(
                          item
                        );
                      }}
                    />
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}

        <div
          className="
            flex
            flex-wrap
            items-center
            justify-between
            gap-2
            border-t
            border-slate-100
            px-3
            py-2.5
          "
        >
          <p
            className="
              text-[9px]
              text-slate-400
            "
          >
            Showing{" "}
            <span className="font-semibold text-slate-600">
              {
                filteredReleases.length
                  ? startIndex + 1
                  : 0
              }
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-600">
              {endIndex}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-600">
              {
                filteredReleases.length
              }
            </span>{" "}
            vehicles
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.max(
                      page - 1,
                      1
                    )
                )
              }
              disabled={
                currentPage ===
                  1 ||
                !filteredReleases.length
              }
              className="
                flex
                h-7
                w-7
                items-center
                justify-center
                rounded-md
                border
                border-slate-200
                text-slate-500
                transition
                hover:border-[#A8D0BD]
                hover:bg-[#F6FBF8]
                hover:text-[#0B5D3B]
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <ChevronLeft
                size={13}
              />
            </button>

            {Array.from(
              {
                length:
                  totalPages,
              },
              (_, index) =>
                index + 1
            ).map(
              (page) => (
                <button
                  key={
                    page
                  }
                  type="button"
                  onClick={() =>
                    setCurrentPage(
                      page
                    )
                  }
                  className={`flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-[9px] font-semibold ${
                    currentPage ===
                    page
                      ? "bg-[#0B5D3B] text-white"
                      : "border border-slate-200 text-slate-500 hover:border-[#A8D0BD] hover:bg-[#F6FBF8] hover:text-[#0B5D3B]"
                  }`}
                >
                  {page}
                </button>
              )
            )}

            <button
              type="button"
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.min(
                      page + 1,
                      totalPages
                    )
                )
              }
              disabled={
                currentPage ===
                  totalPages ||
                !filteredReleases.length
              }
              className="
                flex
                h-7
                w-7
                items-center
                justify-center
                rounded-md
                border
                border-slate-200
                text-slate-500
                transition
                hover:border-[#A8D0BD]
                hover:bg-[#F6FBF8]
                hover:text-[#0B5D3B]
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <ChevronRight
                size={13}
              />
            </button>
          </div>
        </div>
      </section>

      {/* RELEASE DETAILS */}

      {selectedRelease && (
        <ReleaseDetailsModal
          item={
            selectedRelease
          }
          onClose={() =>
            setSelectedRelease(
              null
            )
          }
        />
      )}

      {/* PAYMENT DETAILS */}

      {selectedPaymentDetails && (
        <PaymentDetailsModal
          item={
            selectedPaymentDetails
          }
          onClose={() =>
            setSelectedPaymentDetails(
              null
            )
          }
        />
      )}
    </div>
  );
};

/* =========================================================
   ROW
========================================================= */

const ReleasedVehicleRow = ({
  item,
  actionOpen,
  onToggleActions,
  onViewVehicle,
  onViewCustomer,
  onViewLoan,
  onViewRelease,
  onViewSeizure,
  onViewDocuments,
  onViewPayment,
}) => {
  return (
    <tr
      className="
        border-b
        border-slate-100
        transition
        hover:bg-[#FAFCFB]
      "
    >
      <td className="px-3 py-3">
        <p className="text-[10px] font-bold text-[#0B5D3B]">
          {item.vehicleId}
        </p>
      </td>

      <td className="px-3 py-3">
        <p className="text-[10px] font-semibold text-[#17221D]">
          {
            item.registrationNumber
          }
        </p>
      </td>

      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div
            className="
              flex
              h-7
              w-7
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-slate-100
              text-slate-500
            "
          >
            <UserRound size={13} />
          </div>

          <div className="min-w-0">
            <p className="max-w-[140px] truncate text-[10px] font-semibold text-[#17221D]">
              {
                item.customerName
              }
            </p>

            <p className="mt-0.5 text-[8px] text-slate-400">
              {
                item.customerId
              }
            </p>
          </div>
        </div>
      </td>

      <td className="px-3 py-3">
        <p className="max-w-[145px] truncate text-[10px] font-semibold text-[#17221D]">
          {
            item.vehicleName
          }
        </p>

        <p className="mt-0.5 text-[8px] text-slate-400">
          {
            item.vehicleType ||
            "—"
          }
        </p>
      </td>

      <td className="px-3 py-3">
        <p className="text-[9px] font-semibold text-[#0B5D3B]">
          {
            item.loanNumber
          }
        </p>
      </td>

      <td className="px-3 py-3">
        <p className="text-[9px] font-semibold text-[#17221D]">
          {formatDate(
            item.seizureDate
          )}
        </p>
      </td>

      <td className="px-3 py-3">
        <p className="text-[9px] font-semibold text-[#17221D]">
          {formatDate(
            item.releaseDate
          )}
        </p>

        <p className="mt-0.5 text-[8px] text-slate-400">
          {getRecoveryDays(
            item.seizureDate,
            item.releaseDate
          )}{" "}
          days
        </p>
      </td>

      <td className="px-3 py-3 text-right">
        <p className="text-[10px] font-bold text-[#0B5D3B]">
          {formatMoney(
            item.recoveredAmount
          )}
        </p>
      </td>

      <td className="px-3 py-3">
        <p className="max-w-[130px] truncate text-[9px] font-medium text-slate-600">
          {
            item.releaseReason
          }
        </p>
      </td>

      <td className="px-3 py-3">
        <p className="max-w-[100px] truncate text-[9px] font-medium text-slate-600">
          {
            item.releasedBy
          }
        </p>
      </td>

      <td className="px-3 py-3">
        <span
          className="
            inline-flex
            whitespace-nowrap
            rounded-full
            bg-blue-50
            px-2
            py-1
            text-[8px]
            font-semibold
            text-blue-700
          "
        >
          Released
        </span>
      </td>

      <td className="px-3 py-3">
        <ReleasedActions
          item={item}
          actionOpen={
            actionOpen
          }
          onToggleActions={
            onToggleActions
          }
          onViewVehicle={
            onViewVehicle
          }
          onViewCustomer={
            onViewCustomer
          }
          onViewLoan={
            onViewLoan
          }
          onViewRelease={
            onViewRelease
          }
          onViewSeizure={
            onViewSeizure
          }
          onViewDocuments={
            onViewDocuments
          }
          onViewPayment={
            onViewPayment
          }
        />
      </td>
    </tr>
  );
};

/* =========================================================
   ACTION MENU
========================================================= */

const ReleasedActions = ({
  actionOpen,
  onToggleActions,
  onViewVehicle,
  onViewCustomer,
  onViewLoan,
  onViewRelease,
  onViewSeizure,
  onViewDocuments,
  onViewPayment,
}) => {
  const buttonRef =
    useRef(null);

  const menuRef =
    useRef(null);

  const [position, setPosition] =
    useState({
      top: 0,
      left: 0,
    });

  const updatePosition =
    () => {
      if (
        !buttonRef.current
      ) {
        return;
      }

      const rect =
        buttonRef.current.getBoundingClientRect();

      const menuWidth =
        220;

      const menuHeight =
        340;

      const gap = 6;
      const edgeGap = 8;

      let left =
        rect.right -
        menuWidth;

      if (
        left <
        edgeGap
      ) {
        left =
          rect.left;
      }

      left =
        Math.max(
          edgeGap,
          Math.min(
            left,
            window.innerWidth -
              menuWidth -
              edgeGap
          )
        );

      let top =
        rect.bottom +
        gap;

      if (
        top + menuHeight >
        window.innerHeight -
          edgeGap
      ) {
        top =
          rect.top -
          menuHeight -
          gap;
      }

      top =
        Math.max(
          edgeGap,
          Math.min(
            top,
            window.innerHeight -
              menuHeight -
              edgeGap
          )
        );

      setPosition({
        top,
        left,
      });
    };

  useEffect(() => {
    if (!actionOpen) {
      return;
    }

    updatePosition();

    const handleOutside =
      (event) => {
        if (
          buttonRef.current?.contains(
            event.target
          ) ||
          menuRef.current?.contains(
            event.target
          )
        ) {
          return;
        }

        onToggleActions?.();
      };

    const handleViewport =
      () => {
        updatePosition();
      };

    document.addEventListener(
      "mousedown",
      handleOutside
    );

    window.addEventListener(
      "resize",
      handleViewport
    );

    window.addEventListener(
      "scroll",
      handleViewport,
      true
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutside
      );

      window.removeEventListener(
        "resize",
        handleViewport
      );

      window.removeEventListener(
        "scroll",
        handleViewport,
        true
      );
    };
  }, [
    actionOpen,
    onToggleActions,
  ]);

  return (
    <>
      <button
        ref={
          buttonRef
        }
        type="button"
        onClick={(event) => {
          event.stopPropagation();

          if (!actionOpen) {
            requestAnimationFrame(
              updatePosition
            );
          }

          onToggleActions?.();
        }}
        className="
          flex
          h-8
          w-8
          items-center
          justify-center
          rounded-lg
          border
          border-slate-200
          bg-white
          text-slate-500
          transition
          hover:border-[#0B5D3B]
          hover:bg-[#F6FBF8]
          hover:text-[#0B5D3B]
        "
        aria-label="Released vehicle actions"
        aria-expanded={
          actionOpen
        }
      >
        <MoreVertical
          size={15}
        />
      </button>

      {actionOpen &&
        createPortal(
          <div
            ref={
              menuRef
            }
            className="
              fixed
              z-[2147483647]
              w-[220px]
              overflow-hidden
              rounded-xl
              border
              border-slate-200
              bg-white
              py-1
              shadow-2xl
              ring-1
              ring-black/5
            "
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <ActionButton
              label="View Vehicle"
              icon={
                CarFront
              }
              onClick={
                onViewVehicle
              }
            />

            <ActionButton
              label="View Customer"
              icon={
                UserRound
              }
              onClick={
                onViewCustomer
              }
            />

            <ActionButton
              label="View Loan"
              icon={
                WalletCards
              }
              onClick={
                onViewLoan
              }
            />

            <ActionButton
              label="View Release Details"
              icon={
                CheckCircle2
              }
              onClick={
                onViewRelease
              }
            />

            <ActionButton
              label="View Seizure Details"
              icon={
                FileText
              }
              onClick={
                onViewSeizure
              }
            />

            <ActionButton
              label="View Documents"
              icon={
                FileText
              }
              onClick={
                onViewDocuments
              }
            />

            <div className="my-1 border-t border-slate-100" />

            <ActionButton
              label="View Payment Details"
              icon={
                ReceiptText
              }
              onClick={
                onViewPayment
              }
            />
          </div>,
          document.body
        )}
    </>
  );
};

/* =========================================================
   ACTION BUTTON
========================================================= */

const ActionButton = ({
  label,
  icon: Icon,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="
        flex
        w-full
        items-center
        gap-2
        px-3
        py-2.5
        text-left
        text-[10px]
        font-semibold
        text-[#253252]
        transition
        hover:bg-[#F6FBF8]
        hover:text-[#0B5D3B]
      "
    >
      <Icon
        size={13}
        strokeWidth={2}
      />

      {label}
    </button>
  );
};

/* =========================================================
   KPI
========================================================= */

const ReleasedKpi = ({
  icon: Icon,
  label,
  value,
  note,
  tone = "blue",
}) => {
  const styles = {
    blue: {
      bg:
        "bg-blue-50",
      icon:
        "text-blue-600",
      value:
        "text-blue-700",
    },

    green: {
      bg:
        "bg-[#EAF5EF]",
      icon:
        "text-[#0B5D3B]",
      value:
        "text-[#0B5D3B]",
    },

    purple: {
      bg:
        "bg-violet-50",
      icon:
        "text-violet-600",
      value:
        "text-violet-700",
    },

    orange: {
      bg:
        "bg-orange-50",
      icon:
        "text-orange-600",
      value:
        "text-orange-700",
    },
  };

  const current =
    styles[tone] ||
    styles.blue;

  return (
    <div
      className="
        rounded-xl
        border
        border-slate-200
        bg-white
        px-3.5
        py-3
        shadow-sm
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="
              truncate
              text-[9px]
              font-medium
              uppercase
              tracking-[0.05em]
              text-slate-400
            "
          >
            {label}
          </p>

          <p
            className={`
              mt-1
              truncate
              text-[20px]
              font-semibold
              leading-none
              tracking-tight
              ${current.value}
            `}
          >
            {value}
          </p>

          <p className="mt-1.5 truncate text-[8px] text-slate-400">
            {note}
          </p>
        </div>

        <div
          className={`
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            ${current.bg}
          `}
        >
          <Icon
            size={17}
            strokeWidth={2}
            className={
              current.icon
            }
          />
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   FILTER
========================================================= */

const FilterSelect = ({
  value,
  onChange,
  options = [],
}) => {
  return (
    <select
      value={
        value
      }
      onChange={(event) =>
        onChange(
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
        px-2.5
        text-[10px]
        font-medium
        text-[#17221D]
        outline-none
        focus:border-[#9CCEB1]
        focus:ring-1
        focus:ring-[#DCEFE4]
      "
    >
      {options.map(
        (option) => (
          <option
            key={
              option
            }
            value={
              option
            }
          >
            {option}
          </option>
        )
      )}
    </select>
  );
};

/* =========================================================
   TABLE HEADER
========================================================= */

const TableHeader = ({
  children,
  align = "left",
}) => {
  return (
    <th
      className={`
        whitespace-nowrap
        px-3
        py-2.5
        text-[8px]
        font-semibold
        uppercase
        tracking-[0.04em]
        text-slate-400
        ${
          align ===
          "right"
            ? "text-right"
            : align ===
                "center"
              ? "text-center"
              : "text-left"
        }
      `}
    >
      {children}
    </th>
  );
};

/* =========================================================
   RELEASE DETAILS MODAL
========================================================= */

const ReleaseDetailsModal = ({
  item,
  onClose,
}) => {
  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-[99999]
        flex
        items-center
        justify-center
        bg-slate-950/60
        p-4
        backdrop-blur-sm
      "
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className="
          flex
          max-h-[calc(100vh-32px)]
          w-full
          max-w-[760px]
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-2xl
        "
      >
        {/* HEADER */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-slate-100
            px-5
            py-4
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-blue-50
                text-blue-600
              "
            >
              <CheckCircle2
                size={18}
              />
            </div>

            <div>
              <h2
                className="
                  text-[14px]
                  font-bold
                  text-[#17221D]
                "
              >
                Release Details
              </h2>

              <p className="mt-0.5 text-[9px] text-slate-400">
                {
                  item.vehicleName
                }{" "}
                ·{" "}
                {
                  item.registrationNumber
                }
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              text-slate-400
              hover:bg-slate-100
            "
          >
            <X size={16} />
          </button>
        </div>

        {/* BODY */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            px-5
            py-5
          "
        >
          <DetailSection title="Vehicle Details">
            <DetailField
              label="Vehicle ID"
              value={
                item.vehicleId
              }
            />

            <DetailField
              label="Registration No."
              value={
                item.registrationNumber
              }
            />

            <DetailField
              label="Vehicle"
              value={
                item.vehicleName
              }
            />

            <DetailField
              label="Vehicle Type"
              value={
                item.vehicleType
              }
            />
          </DetailSection>

          <DetailSection title="Customer Details">
            <DetailField
              label="Customer"
              value={
                item.customerName
              }
            />

            <DetailField
              label="Customer ID"
              value={
                item.customerId
              }
            />

            <DetailField
              label="Phone"
              value={
                item.customerMobile
              }
            />
          </DetailSection>

          <DetailSection title="Loan Details">
            <DetailField
              label="Loan Number"
              value={
                item.loanNumber
              }
            />

            <DetailField
              label="Loan Amount"
              value={formatMoney(
                item.loanAmount
              )}
            />

            <DetailField
              label="Outstanding Before Release"
              value={formatMoney(
                item.outstandingBeforeRelease
              )}
              valueClass="text-red-600"
            />

            <DetailField
              label="Remaining Balance"
              value={formatMoney(
                item.remainingBalance
              )}
            />
          </DetailSection>

          <DetailSection title="Seizure Details">
            <DetailField
              label="Seizure Date"
              value={formatDate(
                item.seizureDate
              )}
            />

            <DetailField
              label="Seized By"
              value={
                item.seizedBy
              }
            />

            <DetailField
              label="Seizure Location"
              value={
                item.seizureLocation
              }
            />

            <DetailField
              label="Overdue Days"
              value={`${item.overdueDays} days`}
            />
          </DetailSection>

          <DetailSection title="Release Details">
            <DetailField
              label="Release Date"
              value={formatDate(
                item.releaseDate
              )}
            />

            <DetailField
              label="Recovery Days"
              value={`${getRecoveryDays(
                item.seizureDate,
                item.releaseDate
              )} days`}
            />

            <DetailField
              label="Release Reason"
              value={
                item.releaseReason
              }
            />

            <DetailField
              label="Released By"
              value={
                item.releasedBy
              }
            />

            <DetailField
              label="Release Location"
              value={
                item.releaseLocation
              }
            />
          </DetailSection>

          <div
            className="
              mt-5
              rounded-xl
              border
              border-[#CFE8D9]
              bg-[#F1FAF4]
              p-4
            "
          >
            <p className="text-[8px] font-bold uppercase tracking-wide text-[#0B6B43]">
              Financial Resolution
            </p>

            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <MiniValue
                label="Outstanding Before"
                value={formatMoney(
                  item.outstandingBeforeRelease
                )}
              />

              <MiniValue
                label="Amount Recovered"
                value={formatMoney(
                  item.recoveredAmount
                )}
              />

              <MiniValue
                label="Remaining Balance"
                value={formatMoney(
                  item.remainingBalance
                )}
              />
            </div>
          </div>

          {item.attachment && (
            <div
              className="
                mt-4
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                p-4
              "
            >
              <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                Release Document
              </p>

              <div className="mt-2 flex items-center gap-2">
                <FileText
                  size={15}
                  className="text-slate-500"
                />

                <span className="text-[10px] font-semibold text-[#17221D]">
                  {
                    item.attachment
                      .fileName ||
                    "Release document"
                  }
                </span>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}

        <div
          className="
            flex
            shrink-0
            justify-end
            border-t
            border-slate-100
            px-5
            py-3
          "
        >
          <button
            type="button"
            onClick={
              onClose
            }
            className="
              h-9
              rounded-lg
              border
              border-slate-200
              px-5
              text-[9px]
              font-semibold
              text-slate-600
              hover:bg-slate-50
            "
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* =========================================================
   PAYMENT DETAILS
========================================================= */

const PaymentDetailsModal = ({
  item,
  onClose,
}) => {
  const history =
    Array.isArray(
      item?.loan?.paymentHistory
    )
      ? item.loan.paymentHistory
      : [];

  const payments =
    history.filter(
      (payment) => {
        const date =
          parseLocalDate(
            payment?.date ||
              payment?.paymentDate ||
              payment?.paidAt
          );

        const start =
          parseLocalDate(
            item?.seizureDate
          );

        const end =
          parseLocalDate(
            item?.releaseDate
          );

        if (!date) {
          return false;
        }

        if (
          start &&
          date.getTime() <
            start.getTime()
        ) {
          return false;
        }

        if (
          end &&
          date.getTime() >
            end.getTime()
        ) {
          return false;
        }

        return true;
      }
    );

  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-[99999]
        flex
        items-center
        justify-center
        bg-slate-950/60
        p-4
        backdrop-blur-sm
      "
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className="
          w-full
          max-w-[600px]
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-2xl
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-slate-100
            px-5
            py-4
          "
        >
          <div>
            <h2 className="text-[14px] font-bold text-[#17221D]">
              Payment Details
            </h2>

            <p className="mt-0.5 text-[9px] text-slate-400">
              {
                item.vehicleName
              }{" "}
              ·{" "}
              {
                item.loanNumber
              }
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              text-slate-400
              hover:bg-slate-100
            "
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          <div
            className="
              rounded-xl
              border
              border-[#CFE8D9]
              bg-[#F1FAF4]
              p-4
            "
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MiniValue
                label="Outstanding Before"
                value={formatMoney(
                  item.outstandingBeforeRelease
                )}
              />

              <MiniValue
                label="Recovered"
                value={formatMoney(
                  item.recoveredAmount
                )}
              />

              <MiniValue
                label="Remaining"
                value={formatMoney(
                  item.remainingBalance
                )}
              />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            {payments.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[10px] font-semibold text-[#17221D]">
                  No payment records found
                </p>

                <p className="mt-1 text-[8px] text-slate-400">
                  No payments were recorded
                  between seizure and release.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {payments.map(
                  (
                    payment,
                    index
                  ) => (
                    <div
                      key={
                        payment?.id ||
                        `${payment?.date}-${index}`
                      }
                      className="
                        flex
                        items-center
                        justify-between
                        gap-3
                        px-4
                        py-3
                      "
                    >
                      <div className="min-w-0">
                        <p className="text-[9px] font-semibold text-[#17221D]">
                          {formatDate(
                            payment?.date ||
                              payment?.paymentDate ||
                              payment?.paidAt
                          )}
                        </p>

                        <p className="mt-0.5 text-[8px] text-slate-400">
                          {payment?.paymentMode ||
                            payment?.mode ||
                            "Payment"}
                        </p>
                      </div>

                      <p className="text-[10px] font-bold text-[#0B5D3B]">
                        {formatMoney(
                          payment?.amount ||
                            payment?.paymentAmount ||
                            0
                        )}
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={
              onClose
            }
            className="
              h-9
              rounded-lg
              border
              border-slate-200
              px-5
              text-[9px]
              font-semibold
              text-slate-600
              hover:bg-slate-50
            "
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* =========================================================
   DETAIL SECTION
========================================================= */

const DetailSection = ({
  title,
  children,
}) => {
  return (
    <section className="mb-5">
      <h3
        className="
          mb-3
          text-[9px]
          font-bold
          uppercase
          tracking-[0.08em]
          text-slate-400
        "
      >
        {title}
      </h3>

      <div
        className="
          grid
          grid-cols-1
          gap-x-5
          gap-y-4
          sm:grid-cols-2
        "
      >
        {children}
      </div>
    </section>
  );
};

/* =========================================================
   DETAIL FIELD
========================================================= */

const DetailField = ({
  label,
  value,
  valueClass = "text-[#17221D]",
}) => {
  return (
    <div className="min-w-0">
      <p
        className="
          text-[7px]
          font-bold
          uppercase
          tracking-[0.06em]
          text-slate-400
        "
      >
        {label}
      </p>

      <p
        className={`
          mt-1
          break-words
          text-[10px]
          font-semibold
          ${valueClass}
        `}
      >
        {value || "—"}
      </p>
    </div>
  );
};

/* =========================================================
   MINI VALUE
========================================================= */

const MiniValue = ({
  label,
  value,
}) => {
  return (
    <div>
      <p className="text-[7px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-[11px] font-bold text-[#17221D]">
        {value}
      </p>
    </div>
  );
};

/* =========================================================
   EMPTY
========================================================= */

const EmptyState = () => {
  return (
    <div className="px-5 py-14 text-center">
      <div
        className="
          mx-auto
          flex
          h-11
          w-11
          items-center
          justify-center
          rounded-xl
          bg-blue-50
          text-blue-600
        "
      >
        <CarFront
          size={20}
        />
      </div>

      <p className="mt-3 text-[12px] font-semibold text-[#17221D]">
        No released vehicles found
      </p>

      <p className="mt-1 text-[9px] text-slate-400">
        Released vehicles matching
        the selected filters will
        appear here.
      </p>
    </div>
  );
};

/* =========================================================
   HELPERS
========================================================= */

const normalize = (
  value
) => {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
};

const uniqueSorted = (
  values
) => {
  return Array.from(
    new Set(
      values.filter(Boolean)
    )
  ).sort((a, b) =>
    String(a).localeCompare(
      String(b)
    )
  );
};

const parseLocalDate = (
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

const getDateKey = (
  value
) => {
  const date =
    parseLocalDate(
      value
    );

  if (!date) {
    return "";
  }

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    ),
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    ),
  ].join("-");
};

const formatDate = (
  value
) => {
  const date =
    parseLocalDate(
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

const formatMoney = (
  value
) => {
  return `₹${Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  )}`;
};

const getRecoveryDays = (
  seizureDate,
  releaseDate
) => {
  const start =
    parseLocalDate(
      seizureDate
    );

  const end =
    parseLocalDate(
      releaseDate
    );

  if (!start || !end) {
    return 0;
  }

  start.setHours(
    0,
    0,
    0,
    0
  );

  end.setHours(
    0,
    0,
    0,
    0
  );

  return Math.max(
    0,
    Math.floor(
      (
        end.getTime() -
        start.getTime()
      ) /
        (
          1000 *
          60 *
          60 *
          24
        )
    )
  );
};

const getLoanOverdueDays = (
  loan
) => {
  if (!loan) {
    return 0;
  }

  const schedule =
    Array.isArray(
      loan?.repaymentSchedule
    )
      ? loan.repaymentSchedule
      : [];

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  let maxDays = 0;

  schedule.forEach(
    (row) => {
      const status =
        normalize(
          row?.status
        );

      if (
        status === "paid" ||
        status === "completed" ||
        status === "closed" ||
        status === "settled"
      ) {
        return;
      }

      const dueDate =
        parseLocalDate(
          row?.dueDate
        );

      if (!dueDate) {
        return;
      }

      dueDate.setHours(
        0,
        0,
        0,
        0
      );

      if (
        dueDate.getTime() >=
        today.getTime()
      ) {
        return;
      }

      const days =
        Math.floor(
          (
            today.getTime() -
            dueDate.getTime()
          ) /
            (
              1000 *
              60 *
              60 *
              24
            )
        );

      maxDays =
        Math.max(
          maxDays,
          days
        );
    }
  );

  return maxDays;
};

export default ReleasedVehicles;