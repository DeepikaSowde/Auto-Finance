import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CarFront,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ShieldCheck,
  FileText,
  WalletCards,
  AlertTriangle,
  X,
  Paperclip,
  UserRound,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

import {
  getCustomers,
  getOutstandingAmount,
} from "../../services/customerStorage";

import {
  addVehicleSeizure,
  getVehicleRecords,
} from "../../services/vehicleStorage";

/* =========================================================
   MAIN
========================================================= */

const Vehicle = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);

  const [vehicleRecords, setVehicleRecords] = useState([]);

  const [search, setSearch] = useState("");

  const [vehicleStatusFilter, setVehicleStatusFilter] =
    useState("All Status");

  const [vehicleTypeFilter, setVehicleTypeFilter] =
    useState("All Types");

  const [fuelTypeFilter, setFuelTypeFilter] =
    useState("All Fuel");

  const [loanStatusFilter, setLoanStatusFilter] =
    useState("All Loan Status");

  const [currentPage, setCurrentPage] = useState(1);

  const [openActionVehicleKey, setOpenActionVehicleKey] =
    useState(null);

  const [seizeVehicle, setSeizeVehicle] = useState(null);

  const rowsPerPage = 7;

  /* =======================================================
     LOAD / LIVE SYNC
  ======================================================= */

  useEffect(() => {
    const reload = async () => {
      const [loadedCustomers, loadedVehicles] =
        await Promise.all([
          safeGetCustomers(),
          safeGetVehicles(),
        ]);

      setCustomers(loadedCustomers);
      setVehicleRecords(loadedVehicles);
    };

    reload();

    window.addEventListener(
      "fleetopz:data-updated",
      reload
    );

    window.addEventListener(
      "auto-finance:data-updated",
      reload
    );

    window.addEventListener(
      "storage",
      reload
    );

    return () => {
      window.removeEventListener(
        "fleetopz:data-updated",
        reload
      );

      window.removeEventListener(
        "auto-finance:data-updated",
        reload
      );

      window.removeEventListener(
        "storage",
        reload
      );
    };
  }, []);

  /* =======================================================
     NORMALIZED VEHICLES
  ======================================================= */

  const vehicles = useMemo(() => {
    const source = Array.isArray(customers)
      ? customers
      : [];

    const unique = new Map();

    source.forEach((record) => {
      const loan = record?.loan || {};

      const vehicle =
        record?.vehicle ||
        loan?.vehicle ||
        {};

      const rc =
        record?.rc ||
        loan?.rc ||
        {};

      const customer =
        record?.customer ||
        {};

      const vehicleId =
        vehicle?.id ||
        vehicle?.vehicleId ||
        loan?.vehicleId ||
        loan?.vehicle?.id ||
        loan?.vehicle?.vehicleId ||
        "";

      const registrationNumber =
        rc?.registrationNumber ||
        vehicle?.registrationNumber ||
        loan?.registrationNumber ||
        loan?.rc?.registrationNumber ||
        "";

      const vehicleKey =
        vehicleId ||
        registrationNumber ||
        rc?.chassisNumber ||
        rc?.engineNumber ||
        loan?.id ||
        loan?.loanNumber ||
        "";

      if (!vehicleKey) {
        return;
      }

      const customerId =
        record?.customerId ||
        customer?.id ||
        customer?.customerNumber ||
        "";

      const customerName =
        record?.customerName ||
        customer?.personal?.name ||
        customer?.customerName ||
        "";

      const loanAmount = Number(
        loan?.loanAmount ||
          loan?.vehicleAmount ||
          loan?.calculation?.loanAmount ||
          0
      );

      const outstanding = Number(
        getOutstandingAmount(loan) || 0
      );

      const lifecycle =
        getLifecycleFromStorage({
          vehicleId,
          vehicleStatus:
            vehicle?.status || "",
          vehicleRecords,
        });

      const vehicleRecord = {
        vehicleKey,

        vehicleId,

        registrationNumber,

        customerName,

        customerId,

        mobile:
          record?.mobileNumber ||
          customer?.personal?.mobileNumber ||
          "",

        brand:
          vehicle?.brand ||
          "",

        model:
          vehicle?.model ||
          "",

        variant:
          vehicle?.variant ||
          "",

        vehicleType:
          vehicle?.vehicleType ||
          "",

        fuelType:
          vehicle?.fuelType ||
          "",

        colour:
          vehicle?.colour ||
          vehicle?.color ||
          "",

        manufacturingYear:
          vehicle?.manufacturingYear ||
          "",

        loanId:
          loan?.id ||
          "",

        loanNumber:
          loan?.loanNumber ||
          "",

        loanAmount,

        outstanding,

        loanStatus:
          loan?.status ||
          "Active",

        vehicleStatus:
          lifecycle.status,

        lifecycleRecord:
          lifecycle.record,

        rcStatus:
          getRcStatus({
            ...loan,
            rc,
          }),

        insuranceStatus:
          getInsuranceStatus({
            ...loan,
            rc,
          }),

        nextDue:
          getNextDue(loan),

        customerRouteId:
          customer?.id ||
          customer?.customerId ||
          "",
      };

      const previous =
        unique.get(vehicleKey);

      if (
        !previous ||
        getTimestamp(loan) >=
          getTimestamp(
            previous.__sourceLoan
          )
      ) {
        unique.set(
          vehicleKey,
          {
            ...vehicleRecord,
            __sourceLoan: loan,
          }
        );
      }
    });

    return Array.from(
      unique.values()
    ).map(
      ({
        __sourceLoan,
        ...vehicle
      }) => vehicle
    );
  }, [customers, vehicleRecords]);

  /* =======================================================
     FILTER OPTIONS
  ======================================================= */

  const vehicleTypes = useMemo(() => {
    return uniqueSortedValues(
      vehicles.map(
        (item) => item.vehicleType
      )
    );
  }, [vehicles]);

  const fuelTypes = useMemo(() => {
    return uniqueSortedValues(
      vehicles.map(
        (item) => item.fuelType
      )
    );
  }, [vehicles]);

  const loanStatuses = useMemo(() => {
    return uniqueSortedValues(
      vehicles.map(
        (item) => item.loanStatus
      )
    );
  }, [vehicles]);

  /* =======================================================
     KPI
  ======================================================= */

  const stats = useMemo(() => {
    const total =
      vehicles.length;

    const financed =
      vehicles.filter(
        (vehicle) =>
          Number(vehicle.loanAmount) > 0 ||
          Boolean(vehicle.loanNumber)
      ).length;

    const active =
      vehicles.filter(
        (vehicle) =>
          isActiveVehicle(vehicle)
      ).length;

    const seized =
      vehicles.filter(
        (vehicle) =>
          normalize(
            vehicle.vehicleStatus
          ) === "seized"
      ).length;

    const released =
      vehicles.filter(
        (vehicle) =>
          normalize(
            vehicle.vehicleStatus
          ) === "released"
      ).length;

    return {
      total,
      financed,
      active,
      seized,
      released,
    };
  }, [vehicles]);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredVehicles = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return vehicles.filter(
      (vehicle) => {
        const searchable = [
          vehicle.vehicleId,
          vehicle.registrationNumber,
          vehicle.customerName,
          vehicle.customerId,
          vehicle.mobile,
          vehicle.brand,
          vehicle.model,
          vehicle.variant,
          vehicle.loanNumber,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !query ||
          searchable.includes(query);

        const matchesVehicleStatus =
          vehicleStatusFilter ===
            "All Status" ||
          normalize(
            vehicle.vehicleStatus
          ) ===
            normalize(
              vehicleStatusFilter
            );

        const matchesVehicleType =
          vehicleTypeFilter ===
            "All Types" ||
          vehicle.vehicleType ===
            vehicleTypeFilter;

        const matchesFuel =
          fuelTypeFilter ===
            "All Fuel" ||
          vehicle.fuelType ===
            fuelTypeFilter;

        const matchesLoanStatus =
          loanStatusFilter ===
            "All Loan Status" ||
          normalize(
            vehicle.loanStatus
          ) ===
            normalize(
              loanStatusFilter
            );

        return (
          matchesSearch &&
          matchesVehicleStatus &&
          matchesVehicleType &&
          matchesFuel &&
          matchesLoanStatus
        );
      }
    );
  }, [
    vehicles,
    search,
    vehicleStatusFilter,
    vehicleTypeFilter,
    fuelTypeFilter,
    loanStatusFilter,
  ]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredVehicles.length /
        rowsPerPage
    )
  );

  useEffect(() => {
    setCurrentPage(1);
    setOpenActionVehicleKey(null);
  }, [
    search,
    vehicleStatusFilter,
    vehicleTypeFilter,
    fuelTypeFilter,
    loanStatusFilter,
  ]);

  useEffect(() => {
    setOpenActionVehicleKey(null);
  }, [currentPage]);

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
    filteredVehicles.length === 0
      ? 0
      : (currentPage - 1) *
        rowsPerPage;

  const endIndex = Math.min(
    startIndex + rowsPerPage,
    filteredVehicles.length
  );

  const paginatedVehicles =
    filteredVehicles.slice(
      startIndex,
      endIndex
    );

  /* =======================================================
     RESET
  ======================================================= */

  const resetFilters = () => {
    setSearch("");

    setVehicleStatusFilter(
      "All Status"
    );

    setVehicleTypeFilter(
      "All Types"
    );

    setFuelTypeFilter(
      "All Fuel"
    );

    setLoanStatusFilter(
      "All Loan Status"
    );

    setCurrentPage(1);
  };

  /* =======================================================
     SEIZE COMPLETE
  ======================================================= */

  const handleSeizeComplete = async () => {
    setSeizeVehicle(null);
    setOpenActionVehicleKey(null);

    const [updatedCustomers, updatedVehicles] =
      await Promise.all([
        safeGetCustomers(),
        safeGetVehicles(),
      ]);

    setCustomers(updatedCustomers);
    setVehicleRecords(updatedVehicles);

    window.dispatchEvent(
      new CustomEvent(
        "auto-finance:data-updated"
      )
    );

    /*
     * IMPORTANT FLOW:
     *
     * Vehicles
     *    ↓
     * Seize
     *    ↓
     * Seized Vehicles page
     */
    navigate(
      "/vehicles/seized"
    );
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
            gap-2
            sm:flex-row
            sm:items-end
            sm:justify-between
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
              <CarFront
                size={21}
                strokeWidth={2.2}
                className="text-[#0B5D3B]"
              />

              <h1
                className="
                  text-[22px]
                  font-semibold
                  tracking-tight
                  text-[#17221D]
                  sm:text-[24px]
                "
              >
                Vehicles
              </h1>
            </div>

            <p
              className="
                mt-1
                text-[11px]
                text-slate-500
              "
            >
              Manage vehicles linked to
              existing customers and
              financed loans.
            </p>
          </div>

          <div
            className="
              text-right
              text-[9px]
              text-slate-400
            "
          >
            Showing{" "}
            <span className="font-semibold text-slate-600">
              {filteredVehicles.length}
            </span>{" "}
            vehicles
          </div>
        </div>
      </header>

      {/* KPI */}

      <div
        className="
          grid
          grid-cols-1
          gap-2.5
          sm:grid-cols-2
          lg:grid-cols-4
        "
      >
        <VehicleKpiCard
          icon={CarFront}
          label="Total Vehicles"
          value={stats.total}
          note="Registered vehicles"
          tone="blue"
        />

        <VehicleKpiCard
          icon={WalletCards}
          label="Financed Vehicles"
          value={stats.financed}
          note="Linked to loans"
          tone="green"
        />

        <VehicleKpiCard
          icon={FileText}
          label="Seized Vehicles"
          value={stats.seized}
          note="Marked as seized"
          tone="orange"
        />

        <VehicleKpiCard
          icon={ShieldCheck}
          label="Released Vehicles"
          value={stats.released}
          note="Explicitly released"
          tone="red"
        />
      </div>

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
            lg:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(130px,1fr))_auto]
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
              placeholder="Search registration, vehicle, customer, loan..."
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

          <FilterSelect
            value={
              vehicleStatusFilter
            }
            onChange={
              setVehicleStatusFilter
            }
            options={[
              "All Status",
              "Active",
              "Overdue",
              "Pending",
              "Closed",
              "Seized",
              "Released",
              "Pending Sale",
              "Sold",
              "Written Off",
            ]}
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
              fuelTypeFilter
            }
            onChange={
              setFuelTypeFilter
            }
            options={[
              "All Fuel",
              ...fuelTypes,
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
              Vehicles List
            </h2>

            <p
              className="
                mt-0.5
                text-[8px]
                text-slate-400
              "
            >
              Vehicle records and
              lifecycle status.
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
            {filteredVehicles.length}
          </span>
        </div>

        {paginatedVehicles.length ===
        0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto overflow-y-visible">
            <table
              className="
                w-full
                min-w-[1180px]
                border-collapse
              "
            >
              <thead className="bg-[#F8FAF9]">
                <tr className="border-b border-slate-200">
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
                    Brand & Model
                  </TableHeader>

                  <TableHeader>
                    Vehicle Type
                  </TableHeader>

                  <TableHeader>
                    Loan No.
                  </TableHeader>

                  <TableHeader align="right">
                    Loan Amount
                  </TableHeader>

                  <TableHeader align="right">
                    Outstanding
                  </TableHeader>

                  <TableHeader>
                    Status
                  </TableHeader>

                  <TableHeader>
                    RC Status
                  </TableHeader>

                  <TableHeader>
                    Insurance
                  </TableHeader>

                  <TableHeader>
                    Next Due
                  </TableHeader>

                  <TableHeader align="center">
                    Actions
                  </TableHeader>
                </tr>
              </thead>

              <tbody>
                {paginatedVehicles.map(
                  (vehicle) => (
                    <VehicleRow
                      key={
                        vehicle.vehicleKey
                      }
                      vehicle={
                        vehicle
                      }
                      actionOpen={
                        openActionVehicleKey ===
                        vehicle.vehicleKey
                      }
                      onToggleActions={() =>
                        setOpenActionVehicleKey(
                          (current) =>
                            current ===
                            vehicle.vehicleKey
                              ? null
                              : vehicle.vehicleKey
                        )
                      }
                      onView={() => {
                        setOpenActionVehicleKey(
                          null
                        );

                        if (
                          vehicle.customerRouteId
                        ) {
                          navigate(
                            `/customers/${encodeURIComponent(
                              vehicle.customerRouteId
                            )}`
                          );
                        }
                      }}
                      onRequestSeize={() => {
                        setOpenActionVehicleKey(
                          null
                        );

                        setSeizeVehicle(
                          vehicle
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
          <p className="text-[9px] text-slate-400">
            Showing{" "}
            <span className="font-semibold text-slate-600">
              {filteredVehicles.length
                ? startIndex + 1
                : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-600">
              {endIndex}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-600">
              {
                filteredVehicles.length
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
                !filteredVehicles.length
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
              <ChevronLeft size={13} />
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
                !filteredVehicles.length
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
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </section>

      {/* SEIZE MODAL */}

      {seizeVehicle && (
        <SeizeVehicleModal
          vehicle={
            seizeVehicle
          }
          onCancel={() =>
            setSeizeVehicle(
              null
            )
          }
          onComplete={
            handleSeizeComplete
          }
        />
      )}
    </div>
  );
};

/* =========================================================
   VEHICLE ROW
========================================================= */

const VehicleRow = ({
  vehicle,
  actionOpen,
  onToggleActions,
  onView,
  onRequestSeize,
}) => {
  const vehicleName =
    [
      vehicle.brand,
      vehicle.model,
      vehicle.variant,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Vehicle not assigned";

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
          {vehicle.vehicleId ||
            "—"}
        </p>

        {vehicle.colour && (
          <p className="mt-0.5 text-[8px] text-slate-400">
            {vehicle.colour}
          </p>
        )}
      </td>

      <td className="px-3 py-3">
        <p className="text-[10px] font-semibold text-[#17221D]">
          {
            vehicle.registrationNumber ||
            "—"
          }
        </p>
      </td>

      <td className="px-3 py-3">
        <p className="max-w-[150px] truncate text-[10px] font-semibold text-[#17221D]">
          {
            vehicle.customerName ||
            "Unnamed Customer"
          }
        </p>

        <p className="mt-0.5 text-[8px] text-slate-400">
          {
            vehicle.customerId ||
            vehicle.mobile ||
            "—"
          }
        </p>
      </td>

      <td className="px-3 py-3">
        <p className="max-w-[170px] truncate text-[10px] font-semibold text-[#17221D]">
          {vehicleName}
        </p>

        {vehicle.manufacturingYear && (
          <p className="mt-0.5 text-[8px] text-slate-400">
            {
              vehicle.manufacturingYear
            }
          </p>
        )}
      </td>

      <td className="px-3 py-3">
        <span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-1 text-[8px] font-semibold text-slate-600">
          {
            vehicle.vehicleType ||
            "—"
          }
        </span>
      </td>

      <td className="px-3 py-3">
        <p className="text-[9px] font-semibold text-[#0B5D3B]">
          {
            vehicle.loanNumber ||
            "—"
          }
        </p>
      </td>

      <td className="px-3 py-3 text-right">
        <span className="text-[10px] font-semibold text-[#17221D]">
          {formatMoney(
            vehicle.loanAmount
          )}
        </span>
      </td>

      <td className="px-3 py-3 text-right">
        <span className="text-[10px] font-semibold text-[#17221D]">
          {formatMoney(
            vehicle.outstanding
          )}
        </span>
      </td>

      <td className="px-3 py-3">
        <VehicleStatusBadge
          status={
            vehicle.vehicleStatus
          }
        />
      </td>

      <td className="px-3 py-3">
        <SimpleStatusBadge
          status={
            vehicle.rcStatus
          }
        />
      </td>

      <td className="px-3 py-3">
        <SimpleStatusBadge
          status={
            vehicle.insuranceStatus
          }
        />
      </td>

      <td className="px-3 py-3">
        {vehicle.nextDue ? (
          <>
            <p className="text-[9px] font-semibold text-[#17221D]">
              {formatDate(
                vehicle.nextDue.dueDate
              )}
            </p>

            <p className="mt-0.5 text-[8px] font-medium text-slate-400">
              {formatMoney(
                vehicle.nextDue.amount
              )}
            </p>
          </>
        ) : (
          <span className="text-[9px] text-slate-400">
            —
          </span>
        )}
      </td>

      <td className="px-3 py-3">
        <VehicleActionsMenu
          vehicle={
            vehicle
          }
          actionOpen={
            actionOpen
          }
          onToggleActions={
            onToggleActions
          }
          onViewCustomer={
            onView
          }
          onRequestSeize={
            onRequestSeize
          }
        />
      </td>
    </tr>
  );
};

/* =========================================================
   VEHICLE ACTIONS MENU
========================================================= */

const VehicleActionsMenu = ({
  vehicle,
  actionOpen = false,
  onToggleActions,
  onViewCustomer,
  onRequestSeize,
}) => {
  const navigate =
    useNavigate();

  const buttonRef =
    useRef(null);

  const menuRef =
    useRef(null);

  const [position, setPosition] =
    useState({
      top: 0,
      left: 0,
    });

  const status =
    normalize(
      vehicle?.vehicleStatus
    );

  const isSeized =
    status === "seized";

  /*
   * On Vehicles page:
   *
   * - Active/Overdue/etc. -> Seize available
   * - Seized -> no second seizure
   *
   * Release and Sell are handled
   * in Seized Vehicles page.
   */
  const canSeize =
    !isSeized &&
    status !== "pending sale" &&
    status !== "sold";

  const updatePosition = () => {
    if (!buttonRef.current) {
      return;
    }

    const rect =
      buttonRef.current.getBoundingClientRect();

    const menuWidth = 220;

    const menuHeight =
      canSeize
        ? 235
        : 205;

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

    const handleOutsideClick =
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

    const handleViewportChange =
      () => {
        updatePosition();
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
    isSeized,
    canSeize,
    onToggleActions,
  ]);

  const handleSeize = () => {
    onToggleActions?.();

    requestAnimationFrame(() => {
      onRequestSeize?.();
    });
  };

  const handleViewCustomer = () => {
    onToggleActions?.();
    onViewCustomer?.();
  };

  const handleViewLoan = () => {
    onToggleActions?.();

    if (
      vehicle?.loanId ||
      vehicle?.loanNumber
    ) {
      navigate("/loan");
    }
  };

  return (
    <>
      <div className="flex justify-center">
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
          title="Vehicle actions"
          aria-label="Vehicle actions"
          aria-expanded={
            actionOpen
          }
        >
          <MoreVertical
            size={15}
            strokeWidth={2}
          />
        </button>
      </div>

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
            <ActionMenuItem
              label="View Vehicle"
              icon={CarFront}
              onClick={() => {
                onToggleActions?.();
              }}
            />

            <ActionMenuItem
              label="View Customer"
              icon={UserRound}
              onClick={
                handleViewCustomer
              }
            />

            <ActionMenuItem
              label="View Loan"
              icon={WalletCards}
              onClick={
                handleViewLoan
              }
            />

            <ActionMenuItem
              label="View Documents"
              icon={FileText}
              onClick={() => {
                onToggleActions?.();
              }}
            />

            <ActionMenuItem
              label="Generate Statement"
              icon={FileText}
              onClick={() => {
                onToggleActions?.();

                if (
                  vehicle?.loanId ||
                  vehicle?.loanNumber
                ) {
                  navigate("/loan");
                }
              }}
            />

            <div className="my-1 border-t border-slate-100" />

            {canSeize ? (
              <ActionMenuItem
                label="Seize Vehicle"
                icon={AlertTriangle}
                danger
                onClick={
                  handleSeize
                }
              />
            ) : isSeized ? (
              <ActionMenuItem
                label="View Seized Vehicle"
                icon={AlertTriangle}
                danger
                onClick={() => {
                  onToggleActions?.();

                  /*
                   * Seized Vehicles page is
                   * responsible for Release
                   * and Sell.
                   */
                  navigate(
                    "/vehicles/seized"
                  );
                }}
              />
            ) : (
              <ActionMenuItem
                label="View Vehicle Status"
                icon={ShieldCheck}
                onClick={() => {
                  onToggleActions?.();
                }}
              />
            )}
          </div>,
          document.body
        )}
    </>
  );
};

/* =========================================================
   ACTION MENU ITEM
========================================================= */

const ActionMenuItem = ({
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
      "hover:bg-red-50 hover:text-red-700";
  }

  if (blue) {
    textClass =
      "text-blue-600";

    hoverClass =
      "hover:bg-blue-50 hover:text-blue-700";
  }

  if (orange) {
    textClass =
      "text-orange-600";

    hoverClass =
      "hover:bg-orange-50 hover:text-orange-700";
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
   KPI CARD
========================================================= */

const VehicleKpiCard = ({
  icon: Icon,
  label,
  value,
  note,
  tone = "green",
}) => {
  const styles = {
    blue: {
      iconBg:
        "bg-blue-50",
      iconText:
        "text-blue-600",
      valueText:
        "text-[#17221D]",
    },

    green: {
      iconBg:
        "bg-[#EAF5EF]",
      iconText:
        "text-[#0B5D3B]",
      valueText:
        "text-[#0B5D3B]",
    },

    purple: {
      iconBg:
        "bg-violet-50",
      iconText:
        "text-violet-600",
      valueText:
        "text-violet-700",
    },

    orange: {
      iconBg:
        "bg-orange-50",
      iconText:
        "text-orange-600",
      valueText:
        "text-orange-700",
    },

    red: {
      iconBg:
        "bg-red-50",
      iconText:
        "text-red-600",
      valueText:
        "text-red-700",
    },
  };

  const current =
    styles[tone] ||
    styles.green;

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
              text-[20px]
              font-semibold
              leading-none
              tracking-tight
              ${current.valueText}
            `}
          >
            {Number(
              value || 0
            ).toLocaleString(
              "en-IN"
            )}
          </p>

          <p
            className="
              mt-1.5
              truncate
              text-[9px]
              text-slate-400
            "
          >
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
            ${current.iconBg}
          `}
        >
          <Icon
            size={17}
            strokeWidth={2}
            className={
              current.iconText
            }
          />
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   FILTER SELECT
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
   STATUS BADGE
========================================================= */

const VehicleStatusBadge = ({
  status,
}) => {
  const normalized =
    normalize(status);

  let classes =
    "bg-slate-100 text-slate-600";

  let label =
    status ||
    "Unknown";

  if (
    normalized === "active"
  ) {
    classes =
      "bg-[#EAF5EF] text-[#0B5D3B]";
    label = "Active";
  } else if (
    normalized === "overdue"
  ) {
    classes =
      "bg-red-50 text-red-700";
    label = "Overdue";
  } else if (
    normalized === "pending"
  ) {
    classes =
      "bg-amber-50 text-amber-700";
    label = "Pending";
  } else if (
    normalized === "closed"
  ) {
    classes =
      "bg-slate-100 text-slate-600";
    label = "Closed";
  } else if (
    normalized === "seized"
  ) {
    classes =
      "bg-orange-50 text-orange-700";
    label = "Seized";
  } else if (
    normalized === "released"
  ) {
    classes =
      "bg-blue-50 text-blue-700";
    label = "Released";
  } else if (
    normalized === "pending sale"
  ) {
    classes =
      "bg-orange-50 text-orange-700";
    label = "Pending Sale";
  } else if (
    normalized === "sold"
  ) {
    classes =
      "bg-slate-100 text-slate-700";
    label = "Sold";
  } else if (
    normalized === "written off"
  ) {
    classes =
      "bg-red-50 text-red-700";
    label = "Written Off";
  }

  return (
    <span
      className={`
        inline-flex
        whitespace-nowrap
        rounded-full
        px-2
        py-1
        text-[8px]
        font-semibold
        ${classes}
      `}
    >
      {label}
    </span>
  );
};

/* =========================================================
   SIMPLE STATUS
========================================================= */

const SimpleStatusBadge = ({
  status,
}) => {
  if (
    !status ||
    status === "—"
  ) {
    return (
      <span className="text-[9px] text-slate-400">
        —
      </span>
    );
  }

  const normalized =
    normalize(status);

  let classes =
    "bg-slate-100 text-slate-600";

  if (
    normalized === "verified" ||
    normalized === "active"
  ) {
    classes =
      "bg-[#EAF5EF] text-[#0B5D3B]";
  } else if (
    normalized === "pending"
  ) {
    classes =
      "bg-amber-50 text-amber-700";
  } else if (
    normalized === "expired"
  ) {
    classes =
      "bg-red-50 text-red-700";
  } else if (
    normalized === "expiring soon"
  ) {
    classes =
      "bg-orange-50 text-orange-700";
  } else if (
    normalized === "rejected"
  ) {
    classes =
      "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`
        inline-flex
        whitespace-nowrap
        rounded-full
        px-2
        py-1
        text-[8px]
        font-semibold
        ${classes}
      `}
    >
      {status}
    </span>
  );
};

/* =========================================================
   EMPTY
========================================================= */

const EmptyState = () => {
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

      <p
        className="
          mt-3
          text-[12px]
          font-semibold
          text-[#17221D]
        "
      >
        No vehicles found
      </p>

      <p
        className="
          mt-1
          text-[9px]
          text-slate-400
        "
      >
        Try changing the search
        or filters.
      </p>
    </div>
  );
};

/* =========================================================
   SEIZE VEHICLE CONFIRMATION
========================================================= */

const SeizeVehicleModal = ({
  vehicle,
  onCancel,
  onComplete,
}) => {
  const [showForm, setShowForm] =
    useState(false);

  useEffect(() => {
    setShowForm(false);
  }, [
    vehicle?.vehicleKey,
  ]);

  const vehicleName =
    [
      vehicle?.brand,
      vehicle?.model,
      vehicle?.variant,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Vehicle";

  if (showForm) {
    return (
      <SeizureForm
        vehicle={vehicle}
        onCancel={onCancel}
        onComplete={onComplete}
      />
    );
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-[2147483647]
        flex
        items-center
        justify-center
        bg-slate-950/50
        p-4
        backdrop-blur-[3px]
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
          max-w-[420px]
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
            items-start
            gap-3
            border-b
            border-slate-100
            px-5
            py-4
          "
        >
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
              size={19}
            />
          </div>

          <div>
            <h2 className="text-[13px] font-bold text-[#17221D]">
              Seize Vehicle?
            </h2>

            <p className="mt-1 text-[9px] leading-4 text-slate-500">
              Are you sure you want to
              start the vehicle seizure
              process?
            </p>
          </div>
        </div>

        <div className="px-5 py-4">
          <div
            className="
              rounded-xl
              border
              border-red-100
              bg-red-50/60
              px-3.5
              py-3
            "
          >
            <p className="text-[8px] font-semibold uppercase tracking-wide text-red-500">
              Vehicle
            </p>

            <p className="mt-1 text-[11px] font-bold text-[#17221D]">
              {vehicleName}
            </p>

            <p className="mt-0.5 text-[9px] text-slate-500">
              {vehicle?.registrationNumber ||
                "No registration number"}

              {vehicle?.loanNumber
                ? ` • ${vehicle.loanNumber}`
                : ""}
            </p>
          </div>
        </div>

        <div
          className="
            flex
            justify-end
            gap-2
            border-t
            border-slate-100
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
            onClick={() =>
              setShowForm(true)
            }
            className="
              h-9
              rounded-lg
              bg-red-600
              px-4
              text-[9px]
              font-bold
              text-white
              shadow-sm
              hover:bg-red-700
            "
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   SEIZURE FORM
========================================================= */

const SeizureForm = ({
  vehicle,
  onCancel,
  onComplete,
}) => {
  const vehicleName =
    [
      vehicle?.brand,
      vehicle?.model,
      vehicle?.variant,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Vehicle";

  const loanAmount = Number(
    vehicle?.loanAmount || 0
  );

  const outstanding = Number(
    vehicle?.outstanding || 0
  );

  const principalOutstanding =
    Number(
      vehicle?.principalOutstanding ||
        vehicle?.loanAmount ||
        0
    );

  const interestOutstanding =
    Math.max(
      outstanding -
        principalOutstanding,
      0
    );

  const [
    reason,
    setReason,
  ] = useState("");

  const [
    remarks,
    setRemarks,
  ] = useState("");

  const [
    attachment,
    setAttachment,
  ] = useState(null);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");

    if (!reason.trim()) {
      setError(
        "Please enter the reason for seizure."
      );

      return;
    }

    try {
      setSaving(true);

      const seizure =
        await addVehicleSeizure({
          vehicleId:
            vehicle?.vehicleId ||
            "",

          registrationNumber:
            vehicle?.registrationNumber ||
            "",

          vehicleName,

          vehicleType:
            vehicle?.vehicleType ||
            "",

          customerId:
            vehicle?.customerId ||
            "",

          customerName:
            vehicle?.customerName ||
            "",

          loanId:
            vehicle?.loanId ||
            "",

          loanNumber:
            vehicle?.loanNumber ||
            "",

          loanAmount,

          outstandingAmount:
            outstanding,

          principalOutstanding,

          interestOutstanding,

          reason:
            reason.trim(),

          remarks:
            remarks.trim(),

          attachment:
            attachment
              ? {
                  fileName:
                    attachment.name,

                  fileType:
                    attachment.type,

                  fileSize:
                    attachment.size,

                  uploadedAt:
                    new Date().toISOString(),
                }
              : null,
        });

      setTimeout(() => {
        setSaving(false);

        onComplete?.(
          seizure
        );
      }, 100);
    } catch (submitError) {
      console.error(
        "Failed to seize vehicle:",
        submitError
      );

      setSaving(false);

      setError(
        submitError?.message ||
          "Unable to save seizure record."
      );
    }
  };

  return (
    <div
      className="
        fixed
        inset-0
        z-[2147483647]
        flex
        items-center
        justify-center
        bg-slate-950/50
        p-4
        backdrop-blur-[3px]
      "
    >
      <div
        className="
          flex
          max-h-[92vh]
          w-full
          max-w-[720px]
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
                bg-red-50
                text-red-600
              "
            >
              <AlertTriangle
                size={18}
              />
            </div>

            <div>
              <h2 className="text-[13px] font-bold text-[#17221D]">
                Vehicle Seizure
              </h2>

              <p className="mt-0.5 text-[9px] text-slate-400">
                Record seizure details
                before confirming.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              text-slate-400
              hover:bg-slate-50
              disabled:opacity-50
            "
          >
            <X size={16} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="
            min-h-0
            overflow-y-auto
            p-5
          "
        >
          <div
            className="
              rounded-xl
              border
              border-slate-200
              bg-[#F8FAF9]
              p-4
            "
          >
            <div
              className="
                mb-3
                flex
                items-center
                gap-2
              "
            >
              <CarFront
                size={15}
                className="text-[#0B5D3B]"
              />

              <p className="text-[10px] font-bold text-[#17221D]">
                Vehicle & Loan Information
              </p>
            </div>

            <div
              className="
                grid
                grid-cols-1
                gap-3
                sm:grid-cols-2
                lg:grid-cols-3
              "
            >
              <SeizureField
                label="Vehicle"
                value={vehicleName}
              />

              <SeizureField
                label="Registration"
                value={
                  vehicle?.registrationNumber ||
                  "—"
                }
              />

              <SeizureField
                label="Vehicle ID"
                value={
                  vehicle?.vehicleId ||
                  "—"
                }
              />

              <SeizureField
                label="Customer"
                value={
                  vehicle?.customerName ||
                  "—"
                }
              />

              <SeizureField
                label="Customer ID"
                value={
                  vehicle?.customerId ||
                  "—"
                }
              />

              <SeizureField
                label="Loan Number"
                value={
                  vehicle?.loanNumber ||
                  "—"
                }
              />

              <SeizureField
                label="Loan ID"
                value={
                  vehicle?.loanId ||
                  "—"
                }
              />

              <SeizureField
                label="Loan Amount"
                value={formatMoney(
                  loanAmount
                )}
              />

              <SeizureField
                label="Outstanding"
                value={formatMoney(
                  outstanding
                )}
                valueClass="text-red-600"
              />

              <SeizureField
                label="Principal Outstanding"
                value={formatMoney(
                  principalOutstanding
                )}
              />

              <SeizureField
                label="Interest Outstanding"
                value={formatMoney(
                  interestOutstanding
                )}
              />

              <SeizureField
                label="Remaining Balance"
                value={formatMoney(
                  outstanding
                )}
                valueClass="text-red-600"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-[8px] font-bold uppercase tracking-wide text-slate-400">
              Reason for Seizure
            </label>

            <textarea
              value={reason}
              onChange={(event) =>
                setReason(
                  event.target.value
                )
              }
              rows={3}
              placeholder="Enter why the vehicle is being seized..."
              className="
                w-full
                rounded-lg
                border
                border-slate-200
                px-3
                py-2.5
                text-[10px]
                text-[#17221D]
                outline-none
                focus:border-[#9CCEB1]
                focus:ring-1
                focus:ring-[#DCEFE4]
              "
            />
          </div>

          <div className="mt-3">
            <label className="mb-1.5 block text-[8px] font-bold uppercase tracking-wide text-slate-400">
              Additional Remarks
            </label>

            <textarea
              value={remarks}
              onChange={(event) =>
                setRemarks(
                  event.target.value
                )
              }
              rows={2}
              placeholder="Optional remarks..."
              className="
                w-full
                rounded-lg
                border
                border-slate-200
                px-3
                py-2.5
                text-[10px]
                text-[#17221D]
                outline-none
                focus:border-[#9CCEB1]
              "
            />
          </div>

          <div className="mt-3">
            <label className="mb-1.5 block text-[8px] font-bold uppercase tracking-wide text-slate-400">
              Attachment
            </label>

            <label
              className="
                flex
                cursor-pointer
                items-center
                gap-3
                rounded-lg
                border
                border-dashed
                border-slate-300
                bg-slate-50
                px-3
                py-3
                transition
                hover:border-[#9CCEB1]
                hover:bg-[#F6FBF8]
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
                  bg-white
                  text-slate-500
                "
              >
                <Paperclip size={14} />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-semibold text-[#17221D]">
                  {attachment
                    ? attachment.name
                    : "Attach seizure document"}
                </p>

                <p className="mt-0.5 text-[8px] text-slate-400">
                  Supporting document or
                  seizure notice
                </p>
              </div>

              <input
                type="file"
                className="hidden"
                onChange={(event) =>
                  setAttachment(
                    event.target.files?.[0] ||
                      null
                  )
                }
              />
            </label>
          </div>

          {error && (
            <div
              className="
                mt-3
                rounded-lg
                border
                border-red-200
                bg-red-50
                px-3
                py-2.5
                text-[9px]
                font-semibold
                text-red-600
              "
            >
              {error}
            </div>
          )}

          <div
            className="
              mt-5
              flex
              items-center
              justify-end
              gap-2
              border-t
              border-slate-100
              pt-4
            "
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="
                h-9
                rounded-lg
                border
                border-slate-200
                px-4
                text-[9px]
                font-semibold
                text-slate-500
                disabled:opacity-50
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="
                inline-flex
                h-9
                items-center
                gap-1.5
                rounded-lg
                bg-red-600
                px-5
                text-[9px]
                font-bold
                text-white
                shadow-sm
                hover:bg-red-700
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              <AlertTriangle
                size={12}
              />

              {saving
                ? "Saving..."
                : "Seize Vehicle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================
   SEIZURE FIELD
========================================================= */

const SeizureField = ({
  label,
  value,
  valueClass = "text-[#17221D]",
}) => {
  return (
    <div>
      <p className="text-[7px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`
          mt-1
          truncate
          text-[10px]
          font-semibold
          ${valueClass}
        `}
      >
        {value}
      </p>
    </div>
  );
};

/* =========================================================
   HELPERS
========================================================= */

const safeGetVehicles = async () => {
  try {
    const result = await getVehicleRecords();

    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error(
      "Failed to load vehicle lifecycle records:",
      error
    );

    return [];
  }
};

const safeGetCustomers = async () => {
  try {
    const result =
      await getCustomers();

    return Array.isArray(result)
      ? result
      : [];
  } catch (error) {
    console.error(
      "Failed to load customers for vehicles:",
      error
    );

    return [];
  }
};

/* =========================================================
   LIFECYCLE RESOLUTION
========================================================= */

const getLifecycleFromStorage = ({
  vehicleId,
  vehicleStatus,
  vehicleRecords = [],
}) => {
  try {
    const vehicle = vehicleRecords.find(
      (record) =>
        String(
          record?.vehicleId || record?.id || ""
        ) === String(vehicleId || "")
    );

    if (vehicle) {
      return {
        status:
          normalizeLifecycleStatus(
            vehicle?.status ||
              vehicleStatus ||
              "Active"
          ),

        /*
         * Keep the master lifecycle
         * record available to this page.
         */
        record:
          vehicle ||
          null,
      };
    }

    return {
      status:
        normalizeLifecycleStatus(
          vehicleStatus ||
            "Active"
        ),

      record: null,
    };
  } catch (error) {
    console.error(
      "Failed to read vehicle lifecycle:",
      error
    );

    return {
      status:
        normalizeLifecycleStatus(
          vehicleStatus ||
            "Active"
        ),

      record: null,
    };
  }
};

const normalizeLifecycleStatus = (
  value
) => {
  const raw =
    normalize(value);

  if (
    raw === "pending sale"
  ) {
    return "Pending Sale";
  }

  if (
    raw === "sold"
  ) {
    return "Sold";
  }

  if (
    raw === "seized"
  ) {
    return "Seized";
  }

  if (
    raw === "released"
  ) {
    return "Released";
  }

  if (
    raw === "active"
  ) {
    return "Active";
  }

  if (
    raw === "overdue"
  ) {
    return "Overdue";
  }

  if (
    raw === "pending"
  ) {
    return "Pending";
  }

  if (
    raw === "closed"
  ) {
    return "Closed";
  }

  if (
    raw === "written off"
  ) {
    return "Written Off";
  }

  return (
    value ||
    "Active"
  );
};

const normalize = (
  value
) => {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
};

const isActiveVehicle = (
  vehicle
) => {
  const status =
    normalize(
      vehicle?.vehicleStatus
    );

  return (
    status !== "closed" &&
    status !== "seized" &&
    status !== "pending sale" &&
    status !== "sold" &&
    status !== "written off"
  );
};

const getTimestamp = (
  loan
) => {
  if (!loan) {
    return 0;
  }

  const date =
    new Date(
      loan?.updatedAt ||
        loan?.createdAt ||
        0
    );

  return Number.isNaN(
    date.getTime()
  )
    ? 0
    : date.getTime();
};

const getRcStatus = (
  loan
) => {
  const rc =
    loan?.rc || {};

  const explicit =
    rc?.status ||
    rc?.rcStatus ||
    loan?.rcStatus;

  if (explicit) {
    return formatStatus(
      explicit
    );
  }

  return "";
};

const getInsuranceStatus = (
  loan
) => {
  const insurance =
    loan?.rc?.insurance ||
    loan?.insurance ||
    {};

  const explicit =
    insurance?.status ||
    insurance?.insuranceStatus;

  if (explicit) {
    return formatStatus(
      explicit
    );
  }

  const expiryValue =
    insurance?.expiryDate ||
    insurance?.validUntil ||
    insurance?.endDate ||
    insurance?.expiry ||
    loan?.rc
      ?.insuranceExpiry ||
    loan?.insuranceExpiry;

  if (!expiryValue) {
    return "";
  }

  const expiry =
    parseLocalDate(
      expiryValue
    );

  if (!expiry) {
    return "";
  }

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const diff =
    Math.ceil(
      (
        expiry.getTime() -
        today.getTime()
      ) /
        (
          1000 *
          60 *
          60 *
          24
        )
    );

  if (diff < 0) {
    return "Expired";
  }

  if (diff <= 30) {
    return "Expiring Soon";
  }

  return "Active";
};

const getNextDue = (
  loan
) => {
  const schedule =
    Array.isArray(
      loan?.repaymentSchedule
    )
      ? loan.repaymentSchedule
      : [];

  let best = null;

  schedule.forEach(
    (row) => {
      const status =
        normalize(
          row?.status
        );

      if (
        [
          "paid",
          "completed",
          "closed",
          "settled",
        ].includes(status)
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

      const amount =
        Number(
          row?.balance ??
            row?.remainingAmount ??
            row?.paymentAmount ??
            row?.emiAmount ??
            row?.amount ??
            0
        );

      if (amount <= 0) {
        return;
      }

      if (
        !best ||
        dueDate.getTime() <
          best.dueDate.getTime()
      ) {
        best = {
          dueDate,
          amount,
        };
      }
    }
  );

  return best;
};

const formatStatus = (
  value
) => {
  const raw =
    normalize(value);

  if (
    raw === "verified"
  ) {
    return "Verified";
  }

  if (
    raw === "pending"
  ) {
    return "Pending";
  }

  if (
    raw === "active"
  ) {
    return "Active";
  }

  if (
    raw === "expired"
  ) {
    return "Expired";
  }

  if (
    raw === "rejected"
  ) {
    return "Rejected";
  }

  if (
    raw === "expiring soon"
  ) {
    return "Expiring Soon";
  }

  return String(value);
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

const uniqueSortedValues = (
  values
) => {
  return Array.from(
    new Set(
      values.filter(Boolean)
    )
  ).sort(
    (a, b) =>
      String(a).localeCompare(
        String(b)
      )
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

const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    value instanceof Date
      ? value
      : parseLocalDate(value);

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

export default Vehicle;