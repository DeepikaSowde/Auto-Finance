import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";

import {
  AlertTriangle,
  CarFront,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  RotateCcw,
  Search,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  getCustomers,
  getLoans,
  getOutstandingAmount,
} from "../../services/customerStorage";

import {
  getVehicleSeizures,
  releaseVehicleSeizure,
  markVehicleForSale,
  getVehicleSeizureByVehicleId,
} from "../../services/vehicleStorage";

/* =========================================================
   MAIN
========================================================= */

const SeizedVehicles = () => {
  const navigate = useNavigate();

  const [seizures, setSeizures] = useState([]);
  const [loans, setLoans] = useState([]);

  const [search, setSearch] = useState("");

  const [seizureDateFilter, setSeizureDateFilter] =
    useState("");

  const [vehicleTypeFilter, setVehicleTypeFilter] =
    useState("All Types");

  const [loanStatusFilter, setLoanStatusFilter] =
    useState("All Loan Status");

  const [reasonFilter, setReasonFilter] =
    useState("All Reasons");

  const [recoveryStatusFilter, setRecoveryStatusFilter] =
    useState("All Recovery Status");

  const [currentPage, setCurrentPage] =
    useState(1);

  const [openActionId, setOpenActionId] =
    useState(null);

  const [selectedSeizure, setSelectedSeizure] =
    useState(null);

  const [releaseTarget, setReleaseTarget] =
    useState(null);

  const [sellTarget, setSellTarget] =
    useState(null);

  const [customers, setCustomers] =
    useState([]);

  const rowsPerPage = 7;

  /* =======================================================
     LOAD
  ======================================================= */

  const loadData = async () => {
    try {
      const [
        storedSeizures,
        storedLoans,
        storedCustomers,
      ] = await Promise.all([
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
        "Failed to load seized vehicles:",
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
     HELPERS
  ======================================================= */

  const findLoanForSeizure = (seizure) => {
    const seizureLoanId =
      seizure?.loanId || "";

    const seizureLoanNumber =
      seizure?.loanNumber || "";

    return (
      loans.find((loan) => {
        const loanId =
          loan?.id || "";

        const loanNumber =
          loan?.loanNumber || "";

        return (
          (
            seizureLoanId &&
            String(loanId) ===
              String(seizureLoanId)
          ) ||
          (
            seizureLoanNumber &&
            String(loanNumber) ===
              String(seizureLoanNumber)
          )
        );
      }) || null
    );
  };

  const findCustomerForSeizure = (seizure) => {
    const customerId =
      seizure?.customerId || "";

    return (
      customers.find(
        (record) =>
          String(
            record?.customer?.id || ""
          ) ===
            String(customerId)
      ) || null
    );
  };

  /* =======================================================
     NORMALIZED SEIZURES
  ======================================================= */

  const normalizedSeizures =
    useMemo(() => {
      return seizures
        .filter(
          (seizure) =>
            normalize(
              seizure?.status
            ) === "seized"
        )
        .map((seizure) => {
          const loan =
            findLoanForSeizure(
              seizure
            );

          const customer =
            findCustomerForSeizure(
              seizure
            );

          const vehicle =
            loan?.vehicle || {};

          const vehicleName =
            seizure?.vehicleName ||
            [
              vehicle?.brand,
              vehicle?.model,
              vehicle?.variant,
            ]
              .filter(Boolean)
              .join(" ") ||
            "Vehicle";

          const outstanding =
            Number(
              seizure?.outstandingAmount ??
                seizure?.outstandingBeforeSeizure ??
                getOutstandingAmount(
                  loan
                ) ??
                0
            );

          const loanStatus =
            loan?.status ||
            seizure?.loanStatus ||
            "Active";

          const overdueDays =
            getLoanOverdueDays(
              loan
            );

          const vehicleType =
            seizure?.vehicleType ||
            vehicle?.vehicleType ||
            "";

          const location =
            seizure?.location ||
            seizure?.seizureLocation ||
            "—";

          const recoveryStatus =
            seizure?.recoveryStatus ||
            "Pending";

          return {
            ...seizure,

            recordId:
              seizure?.id || "",

            vehicleId:
              seizure?.vehicleId ||
              vehicle?.id ||
              vehicle?.vehicleId ||
              "—",

            registrationNumber:
              seizure?.registrationNumber ||
              vehicle?.registrationNumber ||
              loan?.registrationNumber ||
              loan?.rc
                ?.registrationNumber ||
              "—",

            customerId:
              seizure?.customerId ||
              loan?.customerId ||
              customer?.customer?.id ||
              "—",

            customerName:
              seizure?.customerName ||
              loan?.customerName ||
              customer?.customer
                ?.personal?.name ||
              "Customer",

            loanId:
              seizure?.loanId ||
              loan?.id ||
              "—",

            loanNumber:
              seizure?.loanNumber ||
              loan?.loanNumber ||
              "—",

            vehicleName,

            vehicleType,

            loanAmount:
              Number(
                seizure?.loanAmount ??
                  loan?.loanAmount ??
                  loan?.vehicleAmount ??
                  loan?.calculation
                    ?.loanAmount ??
                  0
              ),

            outstanding,

            overdueDays,

            seizureDate:
              seizure?.seizedAt ||
              seizure?.createdAt ||
              "",

            seizedBy:
              seizure?.seizedBy ||
              seizure?.createdBy ||
              "—",

            location,

            recoveryStatus,

            loanStatus,

            reason:
              seizure?.reason ||
              "—",

            attachment:
              seizure?.attachment ||
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

  const vehicleTypes =
    useMemo(() => {
      return uniqueSorted(
        normalizedSeizures.map(
          (item) =>
            item.vehicleType
        )
      );
    }, [
      normalizedSeizures,
    ]);

  const loanStatuses =
    useMemo(() => {
      return uniqueSorted(
        normalizedSeizures.map(
          (item) =>
            item.loanStatus
        )
      );
    }, [
      normalizedSeizures,
    ]);

  const reasons =
    useMemo(() => {
      return uniqueSorted(
        normalizedSeizures.map(
          (item) =>
            item.reason
        )
      );
    }, [
      normalizedSeizures,
    ]);

  const recoveryStatuses =
    useMemo(() => {
      return uniqueSorted(
        normalizedSeizures.map(
          (item) =>
            item.recoveryStatus
        )
      );
    }, [
      normalizedSeizures,
    ]);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredSeizures =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return normalizedSeizures.filter(
        (item) => {
          const searchable = [
            item.registrationNumber,
            item.customerName,
            item.loanNumber,
            item.vehicleId,
            item.vehicleName,
            item.customerId,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !query ||
            searchable.includes(
              query
            );

          const matchesDate =
            !seizureDateFilter ||
            getDateKey(
              item.seizureDate
            ) ===
              seizureDateFilter;

          const matchesVehicleType =
            vehicleTypeFilter ===
              "All Types" ||
            item.vehicleType ===
              vehicleTypeFilter;

          const matchesLoanStatus =
            loanStatusFilter ===
              "All Loan Status" ||
            item.loanStatus ===
              loanStatusFilter;

          const matchesReason =
            reasonFilter ===
              "All Reasons" ||
            item.reason ===
              reasonFilter;

          const matchesRecovery =
            recoveryStatusFilter ===
              "All Recovery Status" ||
            item.recoveryStatus ===
              recoveryStatusFilter;

          return (
            matchesSearch &&
            matchesDate &&
            matchesVehicleType &&
            matchesLoanStatus &&
            matchesReason &&
            matchesRecovery
          );
        }
      );
    }, [
      normalizedSeizures,
      search,
      seizureDateFilter,
      vehicleTypeFilter,
      loanStatusFilter,
      reasonFilter,
      recoveryStatusFilter,
    ]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredSeizures.length /
          rowsPerPage
      )
    );

  useEffect(() => {
    setCurrentPage(1);
    setOpenActionId(null);
  }, [
    search,
    seizureDateFilter,
    vehicleTypeFilter,
    loanStatusFilter,
    reasonFilter,
    recoveryStatusFilter,
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
    filteredSeizures.length === 0
      ? 0
      : (
          currentPage - 1
        ) *
        rowsPerPage;

  const endIndex =
    Math.min(
      startIndex +
        rowsPerPage,
      filteredSeizures.length
    );

  const paginatedSeizures =
    filteredSeizures.slice(
      startIndex,
      endIndex
    );

  /* =======================================================
     KPI
  ======================================================= */

  const stats =
    useMemo(() => {
      const totalSeized =
        normalizedSeizures.length;

      const totalOutstanding =
        normalizedSeizures.reduce(
          (sum, item) =>
            sum +
            Number(
              item?.outstanding ||
                0
            ),
          0
        );

      const now =
        new Date();

      const month =
        now.getMonth();

      const year =
        now.getFullYear();

      const seizedThisMonth =
        normalizedSeizures.filter(
          (item) => {
            const date =
              parseLocalDate(
                item?.seizureDate
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

      const pendingRecovery =
        normalizedSeizures.filter(
          (item) =>
            normalize(
              item?.recoveryStatus
            ) === "pending"
        ).length;

      return {
        totalSeized,
        totalOutstanding,
        seizedThisMonth,
        pendingRecovery,
      };
    }, [
      normalizedSeizures,
    ]);

  /* =======================================================
     RESET
  ======================================================= */

  const resetFilters = () => {
    setSearch("");
    setSeizureDateFilter("");

    setVehicleTypeFilter(
      "All Types"
    );

    setLoanStatusFilter(
      "All Loan Status"
    );

    setReasonFilter(
      "All Reasons"
    );

    setRecoveryStatusFilter(
      "All Recovery Status"
    );

    setCurrentPage(1);
  };

  /* =======================================================
     RELEASE
  ======================================================= */

  const confirmRelease = async () => {
    if (!releaseTarget) {
      return;
    }

    const recordId =
      releaseTarget?.recordId ||
      releaseTarget?.id ||
      "";

    if (!recordId) {
      window.alert(
        "Unable to release vehicle: seizure record ID is missing."
      );

      return;
    }

    try {
      const result =
        await releaseVehicleSeizure(
          recordId,
          "Admin",
          "Vehicle released from seizure module."
        );

      /*
       * IMPORTANT:
       *
       * releaseVehicleSeizure() must return
       * the updated lifecycle record.
       *
       * If it returns null, the record was not
       * actually changed and we should NOT close
       * the workflow silently.
       */

      if (!result) {
        window.alert(
          "Unable to release this vehicle. The vehicle may no longer be in Seized status."
        );

        loadData();

        return;
      }

      /*
       * Immediately refresh this page.
       *
       * ReleasedVehicles.jsx reads the same
       * vehicleStorage record, so once the status
       * is Released it will automatically appear
       * there.
       */
      loadData();

      setReleaseTarget(null);
      setOpenActionId(null);

      /*
       * Give the other page/component a chance
       * to read the updated localStorage record.
       */
      window.dispatchEvent(
        new CustomEvent(
          "auto-finance:data-updated"
        )
      );
    } catch (error) {
      console.error(
        "Failed to release vehicle:",
        error
      );

      window.alert(
        error?.message ||
          "Failed to release vehicle."
      );
    }
  };

  /* =======================================================
     MOVE TO PENDING SALE
  ======================================================= */

  const confirmPendingSale = async () => {
    if (!sellTarget) {
      return;
    }

    try {
      const seizure =
        await getVehicleSeizureByVehicleId(
          sellTarget?.vehicleId,
          sellTarget?.loanId,
          sellTarget?.loanNumber
        );

      if (!seizure) {
        window.alert(
          "Seizure record not found. Please make sure this vehicle is currently seized."
        );

        return;
      }

      if (
        normalize(
          seizure?.status
        ) !== "seized"
      ) {
        window.alert(
          `This vehicle cannot move to Pending Sale because its current status is "${seizure?.status || "Unknown"}".`
        );

        loadData();

        return;
      }

      const updated =
        await markVehicleForSale(
          seizure.id,
          {
            vehicleId:
              sellTarget?.vehicleId,

            registrationNumber:
              sellTarget?.registrationNumber,

            vehicleName:
              [
                sellTarget?.brand,
                sellTarget?.model,
                sellTarget?.variant,
              ]
                .filter(Boolean)
                .join(" ") ||
              sellTarget?.vehicleName ||
              "Vehicle",

            vehicleType:
              sellTarget?.vehicleType,

            customerId:
              sellTarget?.customerId,

            customerName:
              sellTarget?.customerName,

            loanId:
              sellTarget?.loanId,

            loanNumber:
              sellTarget?.loanNumber,

            loanAmount:
              Number(
                sellTarget?.loanAmount ||
                  0
              ),

            outstandingAmount:
              Number(
                sellTarget?.outstanding ||
                  0
              ),

            startedBy:
              "Admin",
          }
        );

      if (!updated) {
        window.alert(
          "Unable to move this vehicle into Pending Sale."
        );

        loadData();

        return;
      }

      setSellTarget(null);
      setOpenActionId(null);

      loadData();

      window.dispatchEvent(
        new CustomEvent(
          "auto-finance:data-updated"
        )
      );

      navigate(
        "/vehicles/sold"
      );
    } catch (error) {
      console.error(
        "Failed to move vehicle to Pending Sale:",
        error
      );

      window.alert(
        error?.message ||
          "Failed to move vehicle to Pending Sale."
      );
    }
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
                  bg-red-50
                  text-red-600
                "
              >
                <AlertTriangle
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
                Seized Vehicles
              </h1>
            </div>

            <p
              className="
                mt-1
                text-[11px]
                text-slate-500
              "
            >
              Manage seized vehicles,
              outstanding recovery and
              seizure records.
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
                filteredSeizures.length
              }
            </span>{" "}
            seized vehicles
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
        <SeizedKpi
          icon={CarFront}
          label="Total Seized Vehicles"
          value={
            stats.totalSeized
          }
          note="Currently seized"
          tone="red"
        />

        <SeizedKpi
          icon={WalletCards}
          label="Total Outstanding"
          value={formatMoney(
            stats.totalOutstanding
          )}
          note="Outstanding against seized vehicles"
          tone="dark"
        />

        <SeizedKpi
          icon={AlertTriangle}
          label="Seized This Month"
          value={
            stats.seizedThisMonth
          }
          note="New seizure records this month"
          tone="orange"
        />

        <SeizedKpi
          icon={RotateCcw}
          label="Pending Recovery"
          value={
            stats.pendingRecovery
          }
          note="Awaiting recovery action"
          tone="blue"
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
            lg:grid-cols-[minmax(230px,1.6fr)_repeat(5,minmax(125px,1fr))_auto]
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
              seizureDateFilter
            }
            onChange={(event) =>
              setSeizureDateFilter(
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
            "
          />

          <FilterSelect
            value={
              vehicleTypeFilter
            }
            onChange={
              setVehicleTypeFilter
            }
            options={[
              "All Types",
              ...vehicleTypes,
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
              reasonFilter
            }
            onChange={
              setReasonFilter
            }
            options={[
              "All Reasons",
              ...reasons,
            ]}
          />

          <FilterSelect
            value={
              recoveryStatusFilter
            }
            onChange={
              setRecoveryStatusFilter
            }
            options={[
              "All Recovery Status",
              ...recoveryStatuses,
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
              Seized Vehicle List
            </h2>

            <p
              className="
                mt-0.5
                text-[8px]
                text-slate-400
              "
            >
              Live seizure records from
              the vehicle seizure module
            </p>
          </div>

          <span
            className="
              rounded-full
              bg-red-50
              px-2.5
              py-1
              text-[8px]
              font-bold
              text-red-600
            "
          >
            {
              filteredSeizures.length
            }
          </span>
        </div>

        {paginatedSeizures.length ===
        0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table
              className="
                w-full
                min-w-[1200px]
                border-collapse
              "
            >
              <thead
                className="
                  bg-[#F8FAF9]
                "
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

                  <TableHeader align="right">
                    Outstanding
                  </TableHeader>

                  <TableHeader align="center">
                    Overdue Days
                  </TableHeader>

                  <TableHeader>
                    Seizure Date
                  </TableHeader>

                  <TableHeader>
                    Seized By
                  </TableHeader>

                  <TableHeader>
                    Location
                  </TableHeader>

                  <TableHeader>
                    Recovery
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
                {paginatedSeizures.map(
                  (item) => (
                    <SeizedVehicleRow
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
                      onViewDetails={() => {
                        setOpenActionId(
                          null
                        );

                        setSelectedSeizure(
                          item
                        );
                      }}
                      onRelease={() => {
                        setOpenActionId(
                          null
                        );

                        setReleaseTarget(
                          item
                        );
                      }}
                      onSell={() => {
                        setOpenActionId(
                          null
                        );

                        setSellTarget(
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
                filteredSeizures.length
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
                filteredSeizures.length
              }
            </span>{" "}
            vehicles
          </p>

          <div
            className="
              flex
              items-center
              gap-1
            "
          >
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
                !filteredSeizures.length
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
                  key={page}
                  type="button"
                  onClick={() =>
                    setCurrentPage(
                      page
                    )
                  }
                  className={`
                    flex
                    h-7
                    min-w-7
                    items-center
                    justify-center
                    rounded-md
                    px-1.5
                    text-[9px]
                    font-semibold
                    ${
                      currentPage ===
                      page
                        ? "bg-[#0B5D3B] text-white"
                        : "border border-slate-200 text-slate-500 hover:border-[#A8D0BD] hover:bg-[#F6FBF8] hover:text-[#0B5D3B]"
                    }
                  `}
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
                !filteredSeizures.length
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

      {/* DETAILS */}

      {selectedSeizure && (
        <SeizureDetailsModal
          item={
            selectedSeizure
          }
          onClose={() =>
            setSelectedSeizure(
              null
            )
          }
        />
      )}

      {/* RELEASE */}

      {releaseTarget && (
        <ReleaseModal
          item={
            releaseTarget
          }
          onCancel={() =>
            setReleaseTarget(
              null
            )
          }
          onConfirm={
            confirmRelease
          }
        />
      )}

      {/* SALE */}

      {sellTarget && (
        <SellVehicleModal
          item={sellTarget}
          onCancel={() =>
            setSellTarget(
              null
            )
          }
          onConfirm={
            confirmPendingSale
          }
        />
      )}
    </div>
  );
};

/* =========================================================
   ROW
========================================================= */

const SeizedVehicleRow = ({
  item,
  actionOpen,
  onToggleActions,
  onViewCustomer,
  onViewLoan,
  onViewDetails,
  onRelease,
  onSell,
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
            <UserRound
              size={13}
            />
          </div>

          <div className="min-w-0">
            <p className="max-w-[140px] truncate text-[10px] font-semibold text-[#17221D]">
              {
                item.customerName
              }
            </p>

            <p className="mt-0.5 text-[8px] text-slate-400">
              {item.customerId}
            </p>
          </div>
        </div>
      </td>

      <td className="px-3 py-3">
        <p className="max-w-[150px] truncate text-[10px] font-semibold text-[#17221D]">
          {item.vehicleName}
        </p>

        <p className="mt-0.5 text-[8px] text-slate-400">
          {item.vehicleType ||
            "—"}
        </p>
      </td>

      <td className="px-3 py-3">
        <p className="text-[9px] font-semibold text-[#0B5D3B]">
          {item.loanNumber}
        </p>
      </td>

      <td className="px-3 py-3 text-right">
        <p className="text-[10px] font-semibold text-red-600">
          {formatMoney(
            item.outstanding
          )}
        </p>
      </td>

      <td className="px-3 py-3 text-center">
        <span
          className="
            inline-flex
            min-w-[28px]
            items-center
            justify-center
            rounded-full
            bg-red-50
            px-2
            py-1
            text-[8px]
            font-bold
            text-red-600
          "
        >
          {item.overdueDays}
        </span>
      </td>

      <td className="px-3 py-3">
        <p className="text-[9px] font-semibold text-[#17221D]">
          {formatDate(
            item.seizureDate
          )}
        </p>
      </td>

      <td className="px-3 py-3">
        <p className="max-w-[100px] truncate text-[9px] font-medium text-slate-600">
          {item.seizedBy}
        </p>
      </td>

      <td className="px-3 py-3">
        <div className="flex items-center gap-1">
          <MapPin
            size={10}
            className="shrink-0 text-slate-400"
          />

          <span className="max-w-[110px] truncate text-[9px] text-slate-500">
            {item.location}
          </span>
        </div>
      </td>

      <td className="px-3 py-3">
        <RecoveryBadge
          status={
            item.recoveryStatus
          }
        />
      </td>

      <td className="px-3 py-3">
        <span
          className="
            inline-flex
            rounded-full
            bg-orange-50
            px-2
            py-1
            text-[8px]
            font-semibold
            text-orange-700
          "
        >
          Seized
        </span>
      </td>

      <td className="px-3 py-3">
        <SeizedActions
          actionOpen={
            actionOpen
          }
          onToggleActions={
            onToggleActions
          }
          onViewCustomer={
            onViewCustomer
          }
          onViewLoan={
            onViewLoan
          }
          onViewDetails={
            onViewDetails
          }
          onRelease={
            onRelease
          }
          onSell={
            onSell
          }
        />
      </td>
    </tr>
  );
};

/* =========================================================
   ACTION MENU
========================================================= */

const SeizedActions = ({
  actionOpen,
  onToggleActions,
  onViewCustomer,
  onViewLoan,
  onViewDetails,
  onRelease,
  onSell,
}) => {
  const buttonRef =
    useRef(null);

  const menuRef =
    useRef(null);

  const [menuPosition, setMenuPosition] =
    useState({
      top: 0,
      left: 0,
    });

  const updateMenuPosition = () => {
    if (!buttonRef.current) {
      return;
    }

    const rect =
      buttonRef.current.getBoundingClientRect();

    const menuWidth = 210;
    const menuHeight = 305;
    const gap = 6;
    const viewportPadding = 8;

    let left =
      rect.right -
      menuWidth;

    if (
      left <
      viewportPadding
    ) {
      left =
        rect.left;
    }

    if (
      left + menuWidth >
      window.innerWidth -
        viewportPadding
    ) {
      left =
        window.innerWidth -
        menuWidth -
        viewportPadding;
    }

    left =
      Math.max(
        viewportPadding,
        left
      );

    let top =
      rect.bottom +
      gap;

    if (
      top + menuHeight >
      window.innerHeight -
        viewportPadding
    ) {
      top =
        rect.top -
        menuHeight -
        gap;
    }

    top =
      Math.max(
        viewportPadding,
        Math.min(
          top,
          window.innerHeight -
            menuHeight -
            viewportPadding
        )
      );

    setMenuPosition({
      top,
      left,
    });
  };

  useEffect(() => {
    if (!actionOpen) {
      return;
    }

    updateMenuPosition();

    const handleOutsideClick = (
      event
    ) => {
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

    const handleViewportChange = () => {
      updateMenuPosition();
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    window.addEventListener(
      "resize",
      handleViewportChange
    );

    window.addEventListener(
      "scroll",
      handleViewportChange,
      true
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      window.removeEventListener(
        "resize",
        handleViewportChange
      );

      window.removeEventListener(
        "scroll",
        handleViewportChange,
        true
      );
    };
  }, [
    actionOpen,
    onToggleActions,
  ]);

  return (
    <>
      <div className="flex justify-center">
        <button
          ref={buttonRef}
          type="button"
          onClick={(event) => {
            event.stopPropagation();

            if (!actionOpen) {
              requestAnimationFrame(
                updateMenuPosition
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
          aria-label="Seized vehicle actions"
          aria-expanded={
            actionOpen
          }
        >
          <span className="text-[18px] leading-none">
            ⋮
          </span>
        </button>
      </div>

      {actionOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="
              fixed
              z-[2147483647]
              w-[210px]
              overflow-hidden
              rounded-xl
              border
              border-slate-200
              bg-white
              py-1
              shadow-[0_18px_50px_rgba(15,23,42,0.18)]
              ring-1
              ring-black/5
            "
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <ActionItem
              label="View Vehicle"
              icon={CarFront}
              onClick={() => {
                onToggleActions?.();
                onViewDetails?.();
              }}
            />

            <ActionItem
              label="View Customer"
              icon={UserRound}
              onClick={() => {
                onToggleActions?.();
                onViewCustomer?.();
              }}
            />

            <ActionItem
              label="View Loan"
              icon={WalletCards}
              onClick={() => {
                onToggleActions?.();
                onViewLoan?.();
              }}
            />

            <ActionItem
              label="View Seizure Details"
              icon={FileText}
              onClick={() => {
                onToggleActions?.();
                onViewDetails?.();
              }}
            />

            <ActionItem
              label="View Documents"
              icon={FileText}
              onClick={() => {
                onToggleActions?.();
                onViewDetails?.();
              }}
            />

            <div className="my-1 border-t border-slate-100" />

            {/* RELEASE */}

            <ActionItem
              label="Release Vehicle"
              icon={RotateCcw}
              blue
              onClick={() => {
                onToggleActions?.();

                requestAnimationFrame(() => {
                  onRelease?.();
                });
              }}
            />

            {/* SELL */}

            <ActionItem
              label="Sell Vehicle"
              icon={CarFront}
              orange
              onClick={() => {
                onToggleActions?.();

                requestAnimationFrame(() => {
                  onSell?.();
                });
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
};

/* =========================================================
   ACTION ITEM
========================================================= */

const ActionItem = ({
  label,
  icon: Icon,
  onClick,
  danger = false,
  blue = false,
  orange = false,
}) => {
  let textClass =
    "text-[#253252]";

  let hoverClass =
    "hover:bg-[#F6FBF8] hover:text-[#0B5D3B]";

  if (danger) {
    textClass =
      "text-red-600";

    hoverClass =
      "hover:bg-red-50";
  }

  if (blue) {
    textClass =
      "text-blue-600";

    hoverClass =
      "hover:bg-blue-50";
  }

  if (orange) {
    textClass =
      "text-orange-600";

    hoverClass =
      "hover:bg-orange-50";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex
        w-full
        items-center
        gap-2
        px-3
        py-2.5
        text-left
        text-[10px]
        font-semibold
        transition
        ${textClass}
        ${hoverClass}
      `}
    >
      <Icon
        size={13}
        strokeWidth={2}
      />

      <span>
        {label}
      </span>
    </button>
  );
};

/* =========================================================
   KPI
========================================================= */

const SeizedKpi = ({
  icon: Icon,
  label,
  value,
  note,
  tone,
}) => {
  const styles = {
    red: {
      bg: "bg-red-50",
      icon: "text-red-600",
      value: "text-red-700",
    },

    orange: {
      bg: "bg-orange-50",
      icon: "text-orange-600",
      value: "text-orange-700",
    },

    blue: {
      bg: "bg-blue-50",
      icon: "text-blue-600",
      value: "text-blue-700",
    },

    dark: {
      bg: "bg-[#EAF5EF]",
      icon: "text-[#0B5D3B]",
      value: "text-[#17221D]",
    },
  };

  const current =
    styles[tone] ||
    styles.dark;

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
      value={value}
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
            key={option}
            value={option}
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
          align === "right"
            ? "text-right"
            : align === "center"
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
   RECOVERY BADGE
========================================================= */

const RecoveryBadge = ({
  status,
}) => {
  const normalized =
    normalize(status);

  if (
    normalized ===
    "completed"
  ) {
    return (
      <span
        className="
          inline-flex
          rounded-full
          bg-emerald-50
          px-2
          py-1
          text-[8px]
          font-semibold
          text-emerald-700
        "
      >
        Completed
      </span>
    );
  }

  if (
    normalized ===
      "in progress" ||
    normalized ===
      "processing"
  ) {
    return (
      <span
        className="
          inline-flex
          rounded-full
          bg-blue-50
          px-2
          py-1
          text-[8px]
          font-semibold
          text-blue-700
        "
      >
        In Progress
      </span>
    );
  }

  return (
    <span
      className="
        inline-flex
        rounded-full
        bg-amber-50
        px-2
        py-1
        text-[8px]
        font-semibold
        text-amber-700
      "
    >
      Pending
    </span>
  );
};

/* =========================================================
   DETAILS MODAL
========================================================= */

const SeizureDetailsModal = ({
  item,
  onClose,
}) => {
  const modal = (
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
          w-full
          max-w-[680px]
          max-h-[calc(100vh-32px)]
          flex-col
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
            shrink-0
            items-center
            justify-between
            border-b
            border-slate-100
            bg-white
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
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-red-50
                text-red-600
              "
            >
              <AlertTriangle
                size={18}
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-[14px] font-bold text-[#17221D]">
                Seizure Details
              </h2>

              <p className="mt-0.5 truncate text-[9px] text-slate-400">
                {item.vehicleName}
              </p>
            </div>
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
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-700
            "
          >
            <X size={17} />
          </button>
        </div>

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            px-5
            py-5
          "
        >
          <div
            className="
              grid
              grid-cols-1
              gap-x-6
              gap-y-5
              sm:grid-cols-2
            "
          >
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
              label="Loan Number"
              value={
                item.loanNumber
              }
            />

            <DetailField
              label="Loan ID"
              value={
                item.loanId
              }
            />

            <DetailField
              label="Loan Amount"
              value={formatMoney(
                item.loanAmount
              )}
            />

            <DetailField
              label="Outstanding"
              value={formatMoney(
                item.outstanding
              )}
              valueClass="text-red-600"
            />

            <DetailField
              label="Overdue Days"
              value={`${item.overdueDays} days`}
            />

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
              label="Location"
              value={
                item.location
              }
            />
          </div>

          <div
            className="
              mt-6
              rounded-xl
              border
              border-red-100
              bg-red-50/70
              p-4
            "
          >
            <p
              className="
                text-[8px]
                font-bold
                uppercase
                tracking-[0.08em]
                text-red-500
              "
            >
              Seizure Reason
            </p>

            <p
              className="
                mt-2
                text-[10px]
                font-medium
                leading-5
                text-[#17221D]
              "
            >
              {item.reason}
            </p>
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
              <p
                className="
                  text-[8px]
                  font-bold
                  uppercase
                  tracking-[0.08em]
                  text-slate-400
                "
              >
                Attachment
              </p>

              <p
                className="
                  mt-2
                  text-[10px]
                  font-semibold
                  text-[#17221D]
                "
              >
                {item.attachment.fileName ||
                  "Seizure document"}
              </p>
            </div>
          )}
        </div>

        <div
          className="
            flex
            shrink-0
            justify-end
            border-t
            border-slate-100
            bg-white
            px-5
            py-3
          "
        >
          <button
            type="button"
            onClick={onClose}
            className="
              h-9
              rounded-lg
              border
              border-slate-200
              bg-white
              px-5
              text-[9px]
              font-semibold
              text-slate-600
              transition
              hover:bg-slate-50
            "
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(
    modal,
    document.body
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
          leading-4
          ${valueClass}
        `}
      >
        {value || "—"}
      </p>
    </div>
  );
};

/* =========================================================
   RELEASE MODAL
========================================================= */

const ReleaseModal = ({
  item,
  onCancel,
  onConfirm,
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
          onCancel();
        }
      }}
    >
      <div
        className="
          w-full
          max-w-[440px]
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-2xl
        "
      >
        <div className="px-5 py-5">
          <div className="flex items-start gap-3">
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-blue-50
                text-blue-600
              "
            >
              <RotateCcw
                size={18}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[14px] font-bold text-[#17221D]">
                    Release Vehicle?
                  </h2>

                  <p className="mt-1 text-[9px] leading-4 text-slate-500">
                    This will change the
                    vehicle lifecycle from
                    Seized to Released.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onCancel}
                  className="
                    flex
                    h-7
                    w-7
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    text-slate-400
                    hover:bg-slate-100
                    hover:text-slate-700
                  "
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 pb-4">
          <div
            className="
              rounded-xl
              border
              border-blue-100
              bg-blue-50/70
              p-4
            "
          >
            <p
              className="
                text-[8px]
                font-bold
                uppercase
                tracking-[0.08em]
                text-blue-600
              "
            >
              Vehicle
            </p>

            <p
              className="
                mt-1.5
                text-[12px]
                font-bold
                text-[#17221D]
              "
            >
              {item.vehicleName}
            </p>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <span className="text-[9px] font-medium text-slate-500">
                {
                  item.registrationNumber
                }
              </span>

              <span className="text-[9px] text-slate-300">
                •
              </span>

              <span className="text-[9px] font-medium text-slate-500">
                {item.loanNumber}
              </span>
            </div>
          </div>

          <div
            className="
              mt-3
              rounded-lg
              bg-blue-50
              px-3
              py-2.5
              text-[9px]
              leading-4
              text-slate-600
            "
          >
            After release, this vehicle
            will disappear from the
            <span className="font-semibold text-[#17221D]">
              {" "}Seized Vehicles
            </span>{" "}
            page and appear in the
            <span className="font-semibold text-[#17221D]">
              {" "}Released Vehicles
            </span>{" "}
            page.
          </div>
        </div>

        <div
          className="
            flex
            justify-end
            gap-2
            border-t
            border-slate-100
            bg-slate-50/50
            px-5
            py-3.5
          "
        >
          <button
            type="button"
            onClick={onCancel}
            className="
              h-9
              rounded-lg
              border
              border-slate-200
              bg-white
              px-4
              text-[9px]
              font-semibold
              text-slate-600
              transition
              hover:bg-slate-50
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="
              h-9
              rounded-lg
              bg-blue-600
              px-4
              text-[9px]
              font-bold
              text-white
              transition
              hover:bg-blue-700
            "
          >
            Release Vehicle
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* =========================================================
   SELL MODAL
========================================================= */

const SellVehicleModal = ({
  item,
  onCancel,
  onConfirm,
}) => {
  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-[2147483647]
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
          onCancel?.();
        }
      }}
    >
      <div
        className="
          w-full
          max-w-[440px]
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-2xl
        "
      >
        <div className="px-5 py-5">
          <div className="flex items-start gap-3">
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-orange-50
                text-orange-600
              "
            >
              <CarFront
                size={18}
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-[14px] font-bold text-[#17221D]">
                Sell Vehicle?
              </h2>

              <p className="mt-1 text-[9px] leading-4 text-slate-500">
                Move this seized vehicle
                into the Pending Sale
                workflow?
              </p>
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="
                ml-auto
                flex
                h-7
                w-7
                shrink-0
                items-center
                justify-center
                rounded-lg
                text-slate-400
                hover:bg-slate-100
                hover:text-slate-700
              "
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="px-5 pb-4">
          <div
            className="
              rounded-xl
              border
              border-orange-100
              bg-orange-50/70
              p-4
            "
          >
            <p className="text-[8px] font-bold uppercase tracking-wide text-orange-600">
              Vehicle
            </p>

            <p className="mt-1.5 text-[12px] font-bold text-[#17221D]">
              {
                item.vehicleName
              }
            </p>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <span className="text-[9px] text-slate-500">
                {
                  item.registrationNumber
                }
              </span>

              <span className="text-[9px] text-slate-300">
                •
              </span>

              <span className="text-[9px] text-slate-500">
                {item.loanNumber}
              </span>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-[9px] leading-4 text-slate-500">
            This vehicle will move to
            <span className="font-semibold text-[#17221D]">
              {" "}Pending Sale
            </span>.
            It will not be marked as Sold
            until the final sale is
            completed.
          </div>
        </div>

        <div
          className="
            flex
            justify-end
            gap-2
            border-t
            border-slate-100
            bg-slate-50/50
            px-5
            py-3.5
          "
        >
          <button
            type="button"
            onClick={onCancel}
            className="
              h-9
              rounded-lg
              border
              border-slate-200
              bg-white
              px-4
              text-[9px]
              font-semibold
              text-slate-600
              hover:bg-slate-50
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="
              h-9
              rounded-lg
              bg-orange-500
              px-4
              text-[9px]
              font-bold
              text-white
              hover:bg-orange-600
            "
          >
            Move to Pending Sale
          </button>
        </div>
      </div>
    </div>,
    document.body
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
          bg-[#EAF5EF]
          text-[#0B5D3B]
        "
      >
        <CarFront size={20} />
      </div>

      <p className="mt-3 text-[12px] font-semibold text-[#17221D]">
        No seized vehicles found
      </p>

      <p className="mt-1 text-[9px] text-slate-400">
        Seized vehicles matching
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
    parseLocalDate(value);

  if (!date) {
    return "";
  }

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(2, "0"),
    String(
      date.getDate()
    ).padStart(2, "0"),
  ].join("-");
};

const formatDate = (
  value
) => {
  const date =
    parseLocalDate(value);

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

export default SeizedVehicles;