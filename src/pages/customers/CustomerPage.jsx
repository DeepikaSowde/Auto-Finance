// src/pages/customers/CustomerPage.jsx

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  Users,
  UserCheck,
  IndianRupee,
  Search,
  Plus,
  Eye,
  MoreVertical,
  SlidersHorizontal,
  Download,
  RotateCcw,
  ShieldCheck,
  Grid2X2,
  ListFilter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  CalendarDays,
  Clock3,
  FileText,
} from "lucide-react";

import {
  getCustomers,
  getOutstandingAmount,
} from "../../services/customerStorage";
import LoanDetailsDrawer from "../../components/loans/LoanDetailsDrawer";
import { can } from "../../config/permissions";
import CustomerActivityHistoryModal from "../../components/customers/CustomerActivityHistoryModal";
/* =========================================================
   BASE HELPERS
========================================================= */

const getPersonal = (customer) =>
  customer?.customer?.personal || {};

const getVehicle = (customer) =>
  customer?.vehicle || {};

const getLoan = (customer) =>
  customer?.loan || {};

const getRc = (customer) =>
  customer?.rc || {};

const getVehicleName = (customer) => {
  const vehicle = getVehicle(customer);

  return (
    [
      vehicle?.brand,
      vehicle?.model,
      vehicle?.variant,
    ]
      .filter(Boolean)
      .join(" ") || "Not assigned"
  );
};

const getRegistration = (customer) =>
  getRc(customer)?.registrationNumber ||
  "";

const getOutstanding = (customer) =>
  getOutstandingAmount(
    getLoan(customer)
  );

const getInitials = (name) => {
  if (!name) {
    return "C";
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    parts[0]
      .charAt(0)
      .toUpperCase() +
    parts[1]
      .charAt(0)
      .toUpperCase()
  );
};

const getDueStatus = (customer) => {
  const schedule =
    getLoan(customer)
      ?.repaymentSchedule || [];

  if (
    schedule.some(
      (row) =>
        row?.status === "Overdue"
    )
  ) {
    return "Overdue";
  }

  if (
    schedule.some(
      (row) =>
        row?.status === "Pending" ||
        row?.status === "Partially Paid"
    )
  ) {
    return "Due";
  }

  return "Completed";
};

const getNextDueDate = (customer) => {
  const schedule =
    getLoan(customer)
      ?.repaymentSchedule || [];

  const nextPayment =
    schedule.find(
      (row) =>
        row?.status === "Pending" ||
        row?.status === "Overdue" ||
        row?.status === "Partially Paid"
    );

  return nextPayment?.dueDate || "";
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
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

const getLoanStatus = (customer) => {
  const loan = getLoan(customer);

  return (
    loan?.status ||
    customer?.customer?.status ||
    "Draft"
  );
};

const getLoanType = (customer) => {
  const loan = getLoan(customer);

  return (
    loan?.interest?.type ||
    loan?.interestType ||
    "Flat"
  );
};

/* =========================================================
   PAGE
========================================================= */

const CustomerPage = () => {
  const navigate = useNavigate();

  /* =====================================================
     DATA
  ====================================================== */

  const [customers, setCustomers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);
    const [selectedCustomer, setSelectedCustomer] =
  useState(null);

const [showLoanDrawer, setShowLoanDrawer] =
  useState(false);

const [showActivityHistory, setShowActivityHistory] =
  useState(false);

  /* =====================================================
     SEARCH / FILTER STATE
  ====================================================== */

  const [search, setSearch] =
    useState("");

  const [showFilters, setShowFilters] =
    useState(false);

  const [viewMode, setViewMode] =
    useState("list");

  /*
   * List = 7 rows per page
   * Grid = 6 boxes per page
   */
  const [currentPage, setCurrentPage] =
    useState(1);

  const customersPerPage =
    viewMode === "grid" ? 6 : 7;

  const [activeTab, setActiveTab] =
    useState("all");

  const [filters, setFilters] =
    useState({
      customerStatus:
        "All Status",
      loanStatus:
        "All Loan Status",
      loanType:
        "All Loan Types",
      dueStatus:
        "All Due Status",
      dateRange: "",
      branch:
        "All Branches",
      vehicleType:
        "All Vehicle Types",
      brand:
        "All Brands",
      city:
        "All Cities",
      minLoan: "",
      maxLoan: "",
      minOutstanding: "",
      maxOutstanding: "",
    });

  const [openMenuId, setOpenMenuId] =
    useState(null);

  /* =====================================================
     LOAD CUSTOMERS
  ====================================================== */

  const loadCustomers = async () => {
    try {
      const storedCustomers =
        await getCustomers();

      setCustomers(
        Array.isArray(
          storedCustomers
        )
          ? storedCustomers
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load customers:",
        error
      );

      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();

    const handleUpdate = () => {
      loadCustomers();
    };

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
        "fleetopz:data-updated",
        handleUpdate
      );

      window.removeEventListener(
        "storage",
        handleUpdate
      );
    };
  }, []);

  /* =====================================================
     MONEY
  ====================================================== */

  const money = (value) => {
    return Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    );
  };

  /* =====================================================
     FILTER HELPERS
  ====================================================== */

  const updateFilter = (
    field,
    value
  ) => {
    setFilters(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );
  };

  const resetFilters = () => {
    setFilters({
      customerStatus:
        "All Status",
      loanStatus:
        "All Loan Status",
      loanType:
        "All Loan Types",
      dueStatus:
        "All Due Status",
      dateRange: "",
      branch:
        "All Branches",
      vehicleType:
        "All Vehicle Types",
      brand:
        "All Brands",
      city:
        "All Cities",
      minLoan: "",
      maxLoan: "",
      minOutstanding: "",
      maxOutstanding: "",
    });

    setSearch("");
    setActiveTab("all");
    setCurrentPage(1);
  };

  /* =====================================================
     SUMMARY
  ====================================================== */

  const stats = useMemo(() => {
    const totalCustomers =
      customers.length;

    const activeCustomers =
      customers.filter(
        (customer) =>
          customer?.customer?.status ===
          "Active"
      ).length;

    const totalDisbursed =
      customers.reduce(
        (total, customer) =>
          total +
          Number(
            customer?.loan
              ?.loanAmount || 0
          ),
        0
      );

    const totalOutstanding =
      customers.reduce(
        (total, customer) =>
          total +
          getOutstanding(
            customer
          ),
        0
      );

    const closedLoans =
      customers.filter(
        (customer) =>
          getLoanStatus(
            customer
          ) === "Closed"
      ).length;

    const overdueCustomers =
      customers.filter(
        (customer) =>
          getDueStatus(
            customer
          ) === "Overdue"
      ).length;

    return {
      totalCustomers,
      activeCustomers,
      totalDisbursed,
      totalOutstanding,
      closedLoans,
      overdueCustomers,
    };
  }, [customers]);

  /* =====================================================
     FILTERED CUSTOMERS
  ====================================================== */

  const filteredCustomers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      let result =
        customers.filter(
          (customer) => {
            const personal =
              getPersonal(
                customer
              );

            const vehicle =
              getVehicle(
                customer
              );

            const loan =
              getLoan(
                customer
              );

            const rc =
              getRc(
                customer
              );

            const outstanding =
              getOutstanding(
                customer
              );

            const loanAmount =
              Number(
                loan?.loanAmount ||
                  0
              );

            /* SEARCH */

            const searchableText =
              [
                personal?.name,
                personal?.mobileNumber,
                personal?.alternateMobileNumber,
                customer
                  ?.customer?.id,
                customer
                  ?.customer
                  ?.customerNumber,
                vehicle?.brand,
                vehicle?.model,
                vehicle?.variant,
                rc?.registrationNumber,
                loan?.loanNumber,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
              !query ||
              searchableText.includes(
                query
              );

            /* CUSTOMER STATUS */

            const matchesCustomerStatus =
              filters.customerStatus ===
                "All Status" ||
              customer
                ?.customer
                ?.status ===
                filters.customerStatus;

            /* LOAN STATUS */

            const matchesLoanStatus =
              filters.loanStatus ===
                "All Loan Status" ||
              getLoanStatus(
                customer
              ) ===
                filters.loanStatus;

            /* LOAN TYPE */

            const matchesLoanType =
              filters.loanType ===
                "All Loan Types" ||
              getLoanType(
                customer
              ) ===
                filters.loanType;

            /* DUE STATUS */

            const matchesDueStatus =
              filters.dueStatus ===
                "All Due Status" ||
              getDueStatus(
                customer
              ) ===
                filters.dueStatus;

            /* VEHICLE TYPE */

            const matchesVehicleType =
              filters.vehicleType ===
                "All Vehicle Types" ||
              vehicle?.vehicleType ===
                filters.vehicleType;

            /* BRAND */

            const matchesBrand =
              filters.brand ===
                "All Brands" ||
              vehicle?.brand ===
                filters.brand;

            /* CITY */

            const matchesCity =
              filters.city ===
                "All Cities" ||
              personal?.area ===
                filters.city ||
              rc?.location ===
                filters.city;

            /* BRANCH */

            const matchesBranch =
              filters.branch ===
                "All Branches" ||
              rc?.location ===
                filters.branch ||
              personal?.area ===
                filters.branch;

            /* DATE */

            const nextDueDate =
              getNextDueDate(
                customer
              );

            const matchesDate =
              !filters.dateRange ||
              String(
                nextDueDate || ""
              ).startsWith(
                filters.dateRange
              );

            /* LOAN RANGE */

            const minLoan =
              filters.minLoan ===
              ""
                ? 0
                : Number(
                    filters.minLoan
                  );

            const maxLoan =
              filters.maxLoan ===
              ""
                ? Infinity
                : Number(
                    filters.maxLoan
                  );

            const matchesLoanRange =
              loanAmount >=
                minLoan &&
              loanAmount <=
                maxLoan;

            /* OUTSTANDING RANGE */

            const minOutstanding =
              filters.minOutstanding ===
              ""
                ? 0
                : Number(
                    filters.minOutstanding
                  );

            const maxOutstanding =
              filters.maxOutstanding ===
              ""
                ? Infinity
                : Number(
                    filters.maxOutstanding
                  );

            const matchesOutstandingRange =
              outstanding >=
                minOutstanding &&
              outstanding <=
                maxOutstanding;

            return (
              matchesSearch &&
              matchesCustomerStatus &&
              matchesLoanStatus &&
              matchesLoanType &&
              matchesDueStatus &&
              matchesVehicleType &&
              matchesBrand &&
              matchesCity &&
              matchesBranch &&
              matchesDate &&
              matchesLoanRange &&
              matchesOutstandingRange
            );
          }
        );

      /* =================================================
         TABS
      ================================================== */

      if (
        activeTab ===
        "active"
      ) {
        result =
          result.filter(
            (customer) =>
              customer
                ?.customer
                ?.status ===
              "Active"
          );
      }

      if (
        activeTab ===
        "overdue"
      ) {
        result =
          result.filter(
            (customer) =>
              getDueStatus(
                customer
              ) ===
              "Overdue"
          );
      }

      if (
        activeTab ===
        "recent"
      ) {
        result = [
          ...result,
        ]
          .sort(
            (a, b) => {
              const aDate =
                new Date(
                  a?.customer
                    ?.createdAt ||
                    0
                ).getTime();

              const bDate =
                new Date(
                  b?.customer
                    ?.createdAt ||
                    0
                ).getTime();

              return (
                bDate -
                aDate
              );
            }
          )
          .slice(0, 25);
      }

      return result;
    }, [
      customers,
      search,
      filters,
      activeTab,
    ]);
    

  /* =====================================================
     PAGINATION
  ====================================================== */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredCustomers.length /
          customersPerPage
      )
    );

  /*
   * Reset to page 1 whenever
   * the displayed dataset changes.
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    filters,
    activeTab,
    viewMode,
  ]);

  /*
   * Protect against deleting/filtering
   * the last page.
   */
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
    filteredCustomers.length ===
    0
      ? 0
      : (currentPage - 1) *
        customersPerPage;

  const endIndex = Math.min(
    startIndex +
      customersPerPage,
    filteredCustomers.length
  );

  const paginatedCustomers =
    filteredCustomers.slice(
      startIndex,
      endIndex
    );

  /* =====================================================
     EXPORT
  ====================================================== */

  const handleExport = () => {
    if (
      !filteredCustomers.length
    ) {
      return;
    }

    const rows = [
      [
        "Customer",
        "Customer ID",
        "Mobile",
        "Vehicle",
        "Registration",
        "Loan Amount",
        "Outstanding",
        "Status",
      ],
    ];

    filteredCustomers.forEach(
      (customer) => {
        const personal =
          getPersonal(
            customer
          );

        const loan =
          getLoan(
            customer
          );

        rows.push([
          personal?.name ||
            "",
          customer
            ?.customer
            ?.customerNumber ||
            customer
              ?.customer?.id ||
            "",
          personal?.mobileNumber ||
            "",
          getVehicleName(
            customer
          ),
          getRegistration(
            customer
          ),
          Number(
            loan?.loanAmount ||
              0
          ),
          getOutstanding(
            customer
          ),
          customer
            ?.customer?.status ||
            "",
        ]);
      }
    );

    const csv =
      rows
        .map((row) =>
          row
            .map((value) => {
              const text =
                String(
                  value ?? ""
                );

              return `"${text.replace(
                /"/g,
                '""'
              )}"`;
            })
            .join(",")
        )
        .join("\n");

    const blob =
      new Blob(
        [csv],
        {
          type: "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;
    link.download =
      "customers.csv";

    link.click();

    URL.revokeObjectURL(
      url
    );
  };

  /* =====================================================
     NAVIGATION
  ====================================================== */

  const handleAddCustomer =
    () => {
      navigate(
        "/customers/onboarding"
      );
    };

const handleView = (customer) => {
  const id =
    customer?.customer?.id;

  if (!id) {
    return;
  }

  navigate(`/customers/${id}`);
};

const handleViewLoan = (customer) => {
  if (!customer?.loan) {
    return;
  }

  setSelectedCustomer(customer);
  setShowLoanDrawer(true);
};

const handleViewActivity = (customer) => {
  setSelectedCustomer(customer);
  setShowActivityHistory(true);
};

const closeLoanDrawer = () => {
  setShowLoanDrawer(false);
  setSelectedCustomer(null);
};

const closeActivityHistory = () => {
  setShowActivityHistory(false);
  setSelectedCustomer(null);
};
  
const selectedLoan =
  selectedCustomer?.loan || null;

const selectedPaymentHistory =
  Array.isArray(
    selectedLoan?.paymentHistory
  )
    ? selectedLoan.paymentHistory
    : [];

const selectedRepaymentSchedule =
  Array.isArray(
    selectedLoan?.repaymentSchedule
  )
    ? selectedLoan.repaymentSchedule
    : [];

const selectedLoanStatus =
  String(
    selectedLoan?.status || ""
  )
    .trim()
    .toLowerCase();

const selectedIsTerminalLoan =
  selectedLoanStatus === "closed" ||
  selectedLoanStatus === "paid" ||
  selectedLoanStatus === "paid off" ||
  selectedLoanStatus === "foreclosed";
  /* =====================================================
     LOADING
  ====================================================== */

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#F8FAF9] px-4 text-center">
        <p className="text-sm text-slate-500">
          Loading customers...
        </p>
      </div>
    );
  }

  /* =====================================================
     RENDER
  ====================================================== */

  return (
    <div
      className="
        min-h-full
        w-full
        max-w-full
        overflow-x-hidden
        bg-[#F8FAF9]
        px-3
        py-3
        sm:px-5
        sm:py-4
        lg:px-6
      "
    >
      {/* =================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#17221D] sm:text-[22px] md:text-[24px]">
            Customers
          </h1>

          <p className="mt-0.5 text-[11px] text-[#68756E] sm:text-xs sm:text-sm">
            Manage customer information and vehicle finance records
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={
              handleExport
            }
            className="
              col-span-1
              inline-flex
              h-9
              w-full
              items-center
              justify-center
              gap-1.5
              rounded-lg
              border
              border-slate-200
              bg-white
              px-3
              text-[11px]
              font-medium
              text-slate-600
              transition
              hover:border-slate-300
              sm:w-auto
            "
          >
            <Download
              size={14}
              className="shrink-0"
            />

            Export

            <ChevronDown
              size={13}
              className="shrink-0"
            />
          </button>

        </div>
      </div>

      {/* =================================================
          SUMMARY CARDS
      ================================================== */}

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-5">
        <SummaryCard
          icon={Users}
          label="Total Customers"
          value={stats.totalCustomers.toLocaleString(
            "en-IN"
          )}
          note="All time customers"
        />

        <SummaryCard
          icon={UserCheck}
          label="Active Customers"
          value={stats.activeCustomers.toLocaleString(
            "en-IN"
          )}
          note="With active loans"
          green
        />

        <SummaryCard
          icon={IndianRupee}
          label="Total Disbursed"
          value={formatCr(
            stats.totalDisbursed
          )}
          note="All time disbursed amount"
          blue
        />

        <SummaryCard
          icon={IndianRupee}
          label="Total Outstanding"
          value={formatCr(
            stats.totalOutstanding
          )}
          note="Remaining loan amount"
          gold
        />

        <SummaryCard
          icon={ShieldCheck}
          label="Closed Loans"
          value={stats.closedLoans.toLocaleString(
            "en-IN"
          )}
          note="Successfully closed"
          purple
        />
      </div>

      {/* =================================================
          SEARCH / FILTER
      ================================================== */}

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-2.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
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
              placeholder="Search by name, mobile, customer ID, vehicle no., loan ID..."
              className="
                h-9
                w-full
                rounded-lg
                border
                border-slate-200
                bg-white
                pl-9
                pr-3
                text-xs
                text-slate-700
                outline-none
                transition
                placeholder:text-slate-400
                focus:border-[#0B5D3B]
                focus:ring-1
                focus:ring-[#0B5D3B]
              "
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={
                resetFilters
              }
              className="
                inline-flex
                h-9
                w-full
                items-center
                justify-center
                gap-1.5
                rounded-lg
                border
                border-slate-200
                bg-white
                px-3
                text-[11px]
                font-medium
                text-slate-500
                transition
                hover:border-slate-300
                hover:text-slate-700
                sm:w-auto
              "
            >
              <RotateCcw
                size={13}
                className="shrink-0"
              />

              Reset Filters
            </button>

            <button
              type="button"
              onClick={() =>
                setShowFilters(
                  (previous) =>
                    !previous
                )
              }
              className={`
                inline-flex
                h-9
                w-full
                items-center
                justify-center
                gap-1.5
                rounded-lg
                border
                px-3
                text-[11px]
                font-medium
                transition
                sm:w-auto
                ${
                  showFilters
                    ? "border-[#A8D0BD] bg-[#F6FBF8] text-[#0B5D3B]"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }
              `}
            >
              <SlidersHorizontal
                size={13}
                className="shrink-0"
              />

              {showFilters
                ? "Hide Filters"
                : "Show Filters"}
            </button>
          </div>
        </div>

        {/* =================================================
            ADVANCED FILTERS
        ================================================== */}

        {showFilters && (
          <div className="mt-2.5 border-t border-slate-100 pt-2.5">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              <FilterSelect
                label="Customer Status"
                value={
                  filters.customerStatus
                }
                onChange={(value) =>
                  updateFilter(
                    "customerStatus",
                    value
                  )
                }
                options={[
                  "All Status",
                  "Active",
                  "Inactive",
                  "Closed",
                ]}
              />

              <FilterSelect
                label="Loan Status"
                value={
                  filters.loanStatus
                }
                onChange={(value) =>
                  updateFilter(
                    "loanStatus",
                    value
                  )
                }
                options={[
                  "All Loan Status",
                  "Active",
                  "Closed",
                ]}
              />

              <FilterSelect
                label="Loan Type"
                value={
                  filters.loanType
                }
                onChange={(value) =>
                  updateFilter(
                    "loanType",
                    value
                  )
                }
                options={[
                  "All Loan Types",
                  "Flat",
                  "Reducing",
                ]}
              />

              <FilterSelect
                label="Due Status"
                value={
                  filters.dueStatus
                }
                onChange={(value) =>
                  updateFilter(
                    "dueStatus",
                    value
                  )
                }
                options={[
                  "All Due Status",
                  "Overdue",
                  "Due",
                  "Completed",
                ]}
              />

              <FilterInput
                label="Date Range"
                value={
                  filters.dateRange
                }
                type="date"
                onChange={(value) =>
                  updateFilter(
                    "dateRange",
                    value
                  )
                }
              />

              <FilterSelect
                label="Branch / Location"
                value={
                  filters.branch
                }
                onChange={(value) =>
                  updateFilter(
                    "branch",
                    value
                  )
                }
                options={[
                  "All Branches",
                ]}
              />
            </div>

            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              <FilterSelect
                label="Vehicle Type"
                value={
                  filters.vehicleType
                }
                onChange={(value) =>
                  updateFilter(
                    "vehicleType",
                    value
                  )
                }
                options={[
                  "All Vehicle Types",
                  "Two Wheeler",
                  "Three Wheeler",
                  "Car",
                  "Commercial Vehicle",
                  "Tractor",
                  "Other",
                ]}
              />

              <FilterSelect
                label="Vehicle Brand"
                value={
                  filters.brand
                }
                onChange={(value) =>
                  updateFilter(
                    "brand",
                    value
                  )
                }
                options={getBrandOptions(
                  customers
                )}
              />

              <FilterSelect
                label="City"
                value={
                  filters.city
                }
                onChange={(value) =>
                  updateFilter(
                    "city",
                    value
                  )
                }
                options={getCityOptions(
                  customers
                )}
              />

              <RangeFilter
                label="Loan Amount"
                minValue={
                  filters.minLoan
                }
                maxValue={
                  filters.maxLoan
                }
                onMinChange={(value) =>
                  updateFilter(
                    "minLoan",
                    value
                  )
                }
                onMaxChange={(value) =>
                  updateFilter(
                    "maxLoan",
                    value
                  )
                }
              />

              <RangeFilter
                label="Outstanding Amount"
                minValue={
                  filters.minOutstanding
                }
                maxValue={
                  filters.maxOutstanding
                }
                onMinChange={(value) =>
                  updateFilter(
                    "minOutstanding",
                    value
                  )
                }
                onMaxChange={(value) =>
                  updateFilter(
                    "maxOutstanding",
                    value
                  )
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* =================================================
          TABS + VIEW SWITCH
      ================================================== */}

      <div className="mt-3 flex flex-col gap-2 border-b border-slate-200 sm:flex-row sm:items-end sm:justify-between">
        <div className="-mx-3 flex min-w-0 items-center gap-4 overflow-x-auto px-3 sm:mx-0 sm:gap-5 sm:px-0">
          <TabButton
            active={
              activeTab === "all"
            }
            label={`All Customers (${stats.totalCustomers.toLocaleString(
              "en-IN"
            )})`}
            onClick={() =>
              setActiveTab("all")
            }
          />

          <TabButton
            active={
              activeTab === "active"
            }
            label={`Active Loans (${stats.activeCustomers.toLocaleString(
              "en-IN"
            )})`}
            onClick={() =>
              setActiveTab("active")
            }
          />

          <TabButton
            active={
              activeTab ===
              "overdue"
            }
            label={`Overdue Customers (${stats.overdueCustomers.toLocaleString(
              "en-IN"
            )})`}
            onClick={() =>
              setActiveTab(
                "overdue"
              )
            }
          />

          <TabButton
            active={
              activeTab ===
              "recent"
            }
            label={`Recent Customers (${Math.min(
              25,
              customers.length
            )})`}
            onClick={() =>
              setActiveTab(
                "recent"
              )
            }
          />
        </div>

        <div className="flex items-center justify-end gap-2 pb-2">
          <button
            type="button"
            onClick={() => {
              setViewMode(
                "list"
              );
              setCurrentPage(
                1
              );
            }}
            className={`
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-md
              border
              ${
                viewMode ===
                "list"
                  ? "border-[#A8D0BD] bg-[#F6FBF8] text-[#0B5D3B]"
                  : "border-slate-200 bg-white text-slate-400"
              }
            `}
            title="List view"
          >
            <ListFilter
              size={14}
            />
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode(
                "grid"
              );
              setCurrentPage(
                1
              );
            }}
            className={`
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-md
              border
              ${
                viewMode ===
                "grid"
                  ? "border-[#A8D0BD] bg-[#F6FBF8] text-[#0B5D3B]"
                  : "border-slate-200 bg-white text-slate-400"
              }
            `}
            title="Grid view"
          >
            <Grid2X2
              size={14}
            />
          </button>
        </div>
      </div>

      {/* =================================================
          CURRENT COUNT
      ================================================== */}

      <div className="px-1 py-2">
        <p className="text-[10px] text-slate-400">
          Showing{" "}
          <span className="font-semibold text-slate-600">
            {filteredCustomers.length ===
            0
              ? 0
              : startIndex + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-slate-600">
            {endIndex}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-600">
            {
              filteredCustomers.length
            }
          </span>{" "}
          customers
        </p>
      </div>

      {/* =================================================
          TABLE / GRID
      ================================================== */}

      {viewMode ===
      "list" ? (
     <CustomerTable
  customers={paginatedCustomers}
  onView={handleView}
  onViewLoan={handleViewLoan}
  onViewActivity={handleViewActivity}
  openMenuId={openMenuId}
  setOpenMenuId={setOpenMenuId}
  money={money}
/>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {paginatedCustomers.length ===
          0 ? (
            <div className="sm:col-span-2 xl:col-span-3">
              <EmptyContent
                onAdd={
                  handleAddCustomer
                }
              />
            </div>
          ) : (
            paginatedCustomers.map(
              (
                customer
              ) => (
                <CustomerGridCard
  key={customer?.customer?.id}
  customer={customer}
  money={money}
  onView={() => handleView(customer)}
  onViewLoan={() => handleViewLoan(customer)}
  onViewActivity={() =>
    handleViewActivity(customer)
  }
  openMenuId={openMenuId}
  setOpenMenuId={setOpenMenuId}
/>
              )
            )
          )}
        </div>
      )}

      {/* =================================================
          PAGINATION
      ================================================== */}

      {filteredCustomers.length >
        0 && (
        <Pagination
          currentPage={
            currentPage
          }
          totalPages={
            totalPages
          }
          totalItems={
            filteredCustomers.length
          }
          startIndex={
            startIndex
          }
          endIndex={
            endIndex
          }
          onPrevious={() =>
            setCurrentPage(
              (page) =>
                Math.max(
                  page - 1,
                  1
                )
            )
          }
          onNext={() =>
            setCurrentPage(
              (page) =>
                Math.min(
                  page + 1,
                  totalPages
                )
            )
          }
          onPageChange={
            setCurrentPage
          }
        />
      )}
      {showLoanDrawer && selectedLoan && (
  <LoanDetailsDrawer
    loan={selectedLoan}
    onClose={closeLoanDrawer}
  />
)}

{showActivityHistory && selectedCustomer && (
  <CustomerActivityHistoryModal
    customer={selectedCustomer}
    paymentHistory={selectedPaymentHistory}
    repaymentSchedule={selectedRepaymentSchedule}
    isTerminalLoan={selectedIsTerminalLoan}
    onClose={closeActivityHistory}
  />
)}
    </div>
  );
};

/* =========================================================
   SUMMARY CARD
========================================================= */

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  note,
  green = false,
  gold = false,
  blue = false,
  purple = false,
}) => {
  const iconBg =
    gold
      ? "bg-[#FFF6DE]"
      : purple
      ? "bg-[#F0ECFF]"
      : blue
      ? "bg-[#EAF2FF]"
      : "bg-[#EAF5EF]";

  const iconText =
    gold
      ? "text-[#D4A72C]"
      : purple
      ? "text-[#6D5BD0]"
      : blue
      ? "text-[#3974C9]"
      : "text-[#0B5D3B]";

  return (
    <div
      className="
        min-w-0
        rounded-xl
        border
        border-slate-200
        bg-white
        px-3
        py-2.5
        sm:px-3.5
        sm:py-3
      "
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="truncate text-[9px] font-medium text-slate-500 sm:text-[10px]">
            {label}
          </p>

          <p
            className={`
              mt-1
              truncate
              text-sm
              font-semibold
              tracking-tight
              sm:text-[18px]
              ${
                green ||
                gold
                  ? "text-[#0B5D3B]"
                  : "text-[#17221D]"
              }
            `}
          >
            {value}
          </p>

          <p className="mt-1 hidden truncate text-[9px] text-slate-400 sm:block">
            {note}
          </p>
        </div>

        <div
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
            ${iconBg}
          `}
        >
          <Icon
            size={16}
            className={`${iconText} sm:hidden`}
          />

          <Icon
            size={17}
            className={`hidden ${iconText} sm:block`}
          />
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   CUSTOMER TABLE
========================================================= */

const CustomerTable = ({
  customers,
  onView,
  onViewLoan,
  onViewActivity,
  openMenuId,
  setOpenMenuId,
  money,
}) => {
  const [
    menuPosition,
    setMenuPosition,
  ] = useState({
    top: 0,
    left: 0,
  });

  if (
    !customers.length
  ) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white">
        <EmptyContent
          onAdd={() => {
            window.location.href =
              "/customers/onboarding";
          }}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="[-webkit-overflow-scrolling:touch] overflow-x-auto">
        <table className="w-full min-w-[600px] sm:min-w-[720px] md:min-w-[860px] lg:min-w-[1000px]">
          <thead className="bg-[#F8FAF9]">
            <tr className="border-b border-slate-200">
              <TableHeader>
                Customer
              </TableHeader>

              <TableHeader className="hidden sm:table-cell">
                Contact
              </TableHeader>

              <TableHeader>
                Vehicle
              </TableHeader>

              <TableHeader className="hidden md:table-cell">
                Loan Details
              </TableHeader>

              <TableHeader>
                Outstanding
              </TableHeader>

              <TableHeader className="hidden lg:table-cell">
                Next Due
              </TableHeader>

              <TableHeader align="center">
                Status
              </TableHeader>

              <TableHeader align="center">
                Action
              </TableHeader>
            </tr>
          </thead>

          <tbody>
            {customers.map(
              (
                customer
              ) => {
                const personal =
                  getPersonal(
                    customer
                  );

                const vehicle =
                  getVehicle(
                    customer
                  );

                const loan =
                  getLoan(
                    customer
                  );

                const rc =
                  getRc(
                    customer
                  );

                const outstanding =
                  getOutstanding(
                    customer
                  );

                const vehicleName =
                  getVehicleName(
                    customer
                  );

                const customerId =
                  customer
                    ?.customer
                    ?.id;

                const dueStatus =
                  getDueStatus(
                    customer
                  );

                const nextDueDate =
                  getNextDueDate(
                    customer
                  );

                return (
                  <tr
                    key={
                      customerId ||
                      customer
                        ?.customer
                        ?.customerNumber
                    }
                    onDoubleClick={() =>
                      onView(
                        customer
                      )
                    }
                    className="
                      cursor-pointer
                      border-b
                      border-slate-100
                      transition
                      hover:bg-[#FAFCFB]
                    "
                  >
                    {/* CUSTOMER */}

                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF5EF] text-[10px] font-semibold text-[#0B5D3B]">
                          {getInitials(
                            personal?.name
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-semibold text-[#17221D]">
                            {personal?.name ||
                              "Unnamed Customer"}
                          </p>

                          <p className="mt-0.5 truncate text-[9px] text-slate-400">
                            {customer
                              ?.customer
                              ?.customerNumber ||
                              customerId ||
                              "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* CONTACT */}

                    <td className="hidden px-3.5 py-2.5 sm:table-cell">
                      <p className="text-[11px] text-slate-600">
                        {personal?.mobileNumber ||
                          "—"}
                      </p>

                      {personal?.alternateMobileNumber && (
                        <p className="mt-0.5 text-[9px] text-slate-400">
                          {
                            personal.alternateMobileNumber
                          }
                        </p>
                      )}
                    </td>

                    {/* VEHICLE */}

                    <td className="px-3.5 py-2.5">
                      <p
                        className={`truncate text-[11px] font-medium ${
                          vehicleName ===
                          "Not assigned"
                            ? "text-slate-400"
                            : "text-slate-700"
                        }`}
                      >
                        {vehicleName}
                      </p>

                      <p className="mt-0.5 text-[9px] uppercase text-slate-400">
                        {rc?.registrationNumber ||
                          "No registration"}
                      </p>
                    </td>

                    {/* LOAN */}

                    <td className="hidden px-3.5 py-2.5 md:table-cell">
                      <p className="text-[11px] font-semibold text-[#17221D]">
                        ₹
                        {money(
                          loan?.loanAmount
                        )}
                      </p>

                      <p className="mt-0.5 text-[9px] text-slate-400">
                        EMI: ₹
                        {money(
                          loan?.repayment
                            ?.method ===
                            "Principal"
                            ? loan
                                ?.repaymentSchedule?.[0]
                                ?.paymentAmount ||
                              loan?.calculation
                                ?.paymentAmount ||
                              0
                            : loan?.calculation
                                ?.emiAmount ||
                              loan?.emiAmount ||
                              0
                        )}
                      </p>
                    </td>

                    {/* OUTSTANDING */}

                    <td className="px-3.5 py-2.5">
                      <p className="text-[11px] font-semibold text-[#0B5D3B]">
                        ₹
                        {money(
                          outstanding
                        )}
                      </p>

                      <p className="mt-0.5 text-[9px] text-slate-400">
                        {dueStatus ===
                        "Overdue"
                          ? "Overdue"
                          : dueStatus ===
                            "Due"
                          ? "Payment Due"
                          : "On Schedule"}
                      </p>
                    </td>

                    {/* NEXT DUE */}

                    <td className="hidden px-3.5 py-2.5 lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays
                          size={12}
                          className="shrink-0 text-slate-400"
                        />

                        <span className="text-[11px] font-medium text-slate-600">
                          {formatDate(
                            nextDueDate
                          )}
                        </span>
                      </div>
                    </td>

                    {/* STATUS */}

                    <td className="px-3.5 py-2.5 text-center">
                      <StatusBadge
                        status={
                          customer
                            ?.customer
                            ?.status ||
                          "Unknown"
                        }
                      />
                    </td>

                    {/* ACTION */}

                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={(
                            event
                          ) => {
                            event.stopPropagation();
                            onView(
                              customer
                            );
                          }}
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
                            hover:border-[#0B5D3B]
                            hover:text-[#0B5D3B]
                          "
                          title="View Customer"
                        >
                          <Eye
                            size={13}
                          />
                        </button>

                        <button
  type="button"
  onClick={(event) => {
    event.stopPropagation();
    handleViewActivity(customer);
  }}
  className="
    hidden
    h-7
    w-7
    items-center
    justify-center
    rounded-md
    border
    border-slate-200
    text-slate-500
    transition
    hover:border-[#0B5D3B]
    hover:bg-[#F6FBF8]
    hover:text-[#0B5D3B]
    sm:flex
  "
  title="Activity History"
>
  <Clock3 size={13} />
</button>
                        <button
                          type="button"
                          onClick={(
                            event
                          ) => {
                            event.stopPropagation();
                            onView(
                              customer
                            );
                          }}
                          className="
                            hidden
                            h-7
                            w-7
                            items-center
                            justify-center
                            rounded-md
                            border
                            border-slate-200
                            text-slate-500
                            transition
                            hover:border-slate-300
                            hover:text-slate-700
                            sm:flex
                          "
                          title="Edit Customer"
                        >
                          <Pencil
                            size={13}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={(
                            event
                          ) => {
                            event.stopPropagation();

                            const rect =
                              event.currentTarget.getBoundingClientRect();

                            const menuWidth =
                              230;

                            const menuHeight =
                              330;

                            const gap =
                              6;

                            let left =
                              rect.right -
                              menuWidth;

                            let top =
                              rect.bottom +
                              gap;

                            left =
                              Math.max(
                                8,
                                Math.min(
                                  left,
                                  window.innerWidth -
                                    menuWidth -
                                    8
                                )
                              );

                            if (
                              top +
                                menuHeight >
                              window.innerHeight -
                                8
                            ) {
                              top =
                                rect.top -
                                menuHeight -
                                gap;
                            }

                            setMenuPosition(
                              {
                                top,
                                left,
                              }
                            );

                            setOpenMenuId(
                              openMenuId ===
                                customerId
                                ? null
                                : customerId
                            );
                          }}
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
                            hover:border-slate-300
                            hover:text-slate-700
                          "
                          title="More Actions"
                        >
                          <MoreVertical
                            size={
                              13
                            }
                          />
                        </button>

                        {/* MORE MENU */}

                        {openMenuId ===
                          customerId && (
                          <div
                            onClick={(
                              event
                            ) =>
                              event.stopPropagation()
                            }
                            style={{
                              top: menuPosition.top,
                              left: menuPosition.left,
                            }}
                            className="
                              fixed
                              z-[9999]
                              w-[230px]
                              max-w-[calc(100vw-16px)]
                              overflow-hidden
                              rounded-xl
                              border
                              border-slate-200
                              bg-white
                              shadow-2xl
                              ring-1
                              ring-black/5
                            "
                          >
                          <MenuItem
  label="View Loan Details"
  icon={Eye}
  onClick={() => {
    setOpenMenuId(null);
    handleViewLoan(customer);
  }}
/>

                            {can("collections", "add") && (
                            <MenuItem
                              label="Add Payment"
                              icon={
                                IndianRupee
                              }
                              onClick={() =>
                                setOpenMenuId(
                                  null
                                )
                              }
                            />
                            )}

                            <MenuItem
                              label="Upload Documents"
                              icon={
                                Download
                              }
                              onClick={() =>
                                setOpenMenuId(
                                  null
                                )
                              }
                            />

                            <MenuItem
                              label="Generate Statement"
                              icon={
                                FileText
                              }
                              onClick={() =>
                                setOpenMenuId(
                                  null
                                )
                              }
                            />

                            <MenuItem
                              label="Download Documents"
                              icon={
                                Download
                              }
                              onClick={() =>
                                setOpenMenuId(
                                  null
                                )
                              }
                            />

                            {can("reminders", "add") && (
                            <MenuItem
                              label="Send Payment Reminder"
                              icon={
                                CalendarDays
                              }
                              onClick={() =>
                                setOpenMenuId(
                                  null
                                )
                              }
                            />
                            )}

                            {can("customers", "edit") && (
                            <>
                            <div className="border-t border-slate-100" />

                            <MenuItem
                              label="Deactivate Customer"
                              icon={
                                UserCheck
                              }
                              danger
                              onClick={() => {
                                setOpenMenuId(
                                  null
                                );

                                const name =
                                  personal?.name ||
                                  "this customer";

                                const confirmed =
                                  window.confirm(
                                    `Are you sure you want to deactivate ${name}?`
                                  );

                                if (
                                  !confirmed
                                ) {
                                  return;
                                }
                              }}
                            />
                            </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* =========================================================
   GRID CARD
========================================================= */

const CustomerGridCard = ({
  customer,
  money,
  onView,
  onViewLoan,
  onViewActivity,
  openMenuId,
  setOpenMenuId,
}) => {
  const personal =
    getPersonal(customer);

  const loan =
    getLoan(customer);

  const outstanding =
    getOutstanding(customer);

  const customerId =
    customer
      ?.customer?.id;

  return (
    <div
      className="
        relative
        rounded-xl
        border
        border-slate-200
        bg-white
        p-3
        sm:p-3.5
      "
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF5EF] text-xs font-semibold text-[#0B5D3B]">
            {getInitials(
              personal?.name
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[#17221D]">
              {personal?.name ||
                "Unnamed Customer"}
            </p>

            <p className="mt-0.5 truncate text-[9px] text-slate-400">
              {customer
                ?.customer
                ?.customerNumber ||
                customerId ||
                "—"}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <StatusBadge
            status={
              customer
                ?.customer
                ?.status ||
              "Unknown"
            }
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
        <MobileDetail
          label="Mobile"
          value={
            personal?.mobileNumber ||
            "—"
          }
        />

        <MobileDetail
          label="Vehicle"
          value={getVehicleName(
            customer
          )}
        />

        <MobileDetail
          label="Loan Amount"
          value={`₹${money(
            loan?.loanAmount
          )}`}
        />

        <MobileDetail
          label="Outstanding"
          value={`₹${money(
            outstanding
          )}`}
          green
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={
            onView
          }
          className="
            flex
            h-8
            flex-1
            min-w-[72px]
            items-center
            justify-center
            gap-1.5
            rounded-lg
            border
            border-slate-200
            text-[10px]
            font-semibold
            text-slate-600
            transition
            hover:border-[#0B5D3B]
            hover:text-[#0B5D3B]
          "
          title="View Customer"
        >
          <Eye
            size={13}
          />
          View
        </button>

        <button
  type="button"
  onClick={onViewActivity}
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
    text-slate-500
    transition
    hover:border-[#0B5D3B]
    hover:bg-[#F6FBF8]
    hover:text-[#0B5D3B]
  "
  title="Activity History"
>
  <Clock3 size={13} />
</button>
        <button
          type="button"
          onClick={
            onView
          }
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
            text-slate-500
            transition
            hover:border-slate-300
            hover:text-slate-700
          "
          title="Edit Customer"
        >
          <Pencil
            size={13}
          />
        </button>

        <button
          type="button"
          onClick={() =>
            setOpenMenuId(
              openMenuId ===
                customerId
                ? null
                : customerId
            )
          }
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
            text-slate-500
            transition
            hover:border-slate-300
            hover:text-slate-700
          "
          title="More Actions"
        >
          <MoreVertical
            size={14}
          />
        </button>

        {openMenuId ===
          customerId && (
          <div
            className="
              absolute
              bottom-12
              right-3
              z-50
              w-[calc(100%-24px)]
              max-w-[235px]
              overflow-hidden
              rounded-lg
              border
              border-slate-200
              bg-white
              shadow-xl
            "
          >
          <MenuItem
  label="View Loan Details"
  icon={Eye}
  onClick={() => {
    setOpenMenuId(null);
    onViewLoan();
  }}
/>
            <MenuItem
              label="Add Payment"
              icon={
                IndianRupee
              }
              onClick={() =>
                setOpenMenuId(
                  null
                )
              }
            />

            <MenuItem
              label="Upload Documents"
              icon={
                Download
              }
              onClick={() =>
                setOpenMenuId(
                  null
                )
              }
            />

            <MenuItem
              label="Generate Statement"
              icon={
                FileText
              }
              onClick={() =>
                setOpenMenuId(
                  null
                )
              }
            />

            <MenuItem
              label="Download Documents"
              icon={
                Download
              }
              onClick={() =>
                setOpenMenuId(
                  null
                )
              }
            />

            <MenuItem
              label="Send Payment Reminder"
              icon={
                CalendarDays
              }
              onClick={() =>
                setOpenMenuId(
                  null
                )
              }
            />

            <div className="border-t border-slate-100" />

            <MenuItem
              label="Deactivate Customer"
              icon={
                UserCheck
              }
              danger
              onClick={() => {
                setOpenMenuId(
                  null
                );

                const name =
                  personal?.name ||
                  "this customer";

                const confirmed =
                  window.confirm(
                    `Are you sure you want to deactivate ${name}?`
                  );

                if (
                  !confirmed
                ) {
                  return;
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================================================
   FILTER SELECT
========================================================= */

const FilterSelect = ({
  label,
  value,
  onChange,
  options,
}) => {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-[9px] font-medium text-slate-500">
        {label}
      </label>

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
          text-slate-600
          outline-none
          transition
          focus:border-[#0B5D3B]
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
    </div>
  );
};

/* =========================================================
   FILTER INPUT
========================================================= */

const FilterInput = ({
  label,
  value,
  onChange,
  type = "text",
}) => {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-[9px] font-medium text-slate-500">
        {label}
      </label>

      <input
        type={type}
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
          text-slate-600
          outline-none
          transition
          focus:border-[#0B5D3B]
        "
      />
    </div>
  );
};

/* =========================================================
   RANGE FILTER
========================================================= */

const RangeFilter = ({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}) => {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-[9px] font-medium text-slate-500">
        {label}
      </label>

      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={minValue}
          onChange={(event) =>
            onMinChange(
              event.target.value
            )
          }
          placeholder="Min"
          className="
            h-9
            min-w-0
            flex-1
            rounded-lg
            border
            border-slate-200
            bg-white
            px-2
            text-[10px]
            text-slate-600
            outline-none
            focus:border-[#0B5D3B]
          "
        />

        <span className="text-[9px] text-slate-400">
          -
        </span>

        <input
          type="number"
          value={maxValue}
          onChange={(event) =>
            onMaxChange(
              event.target.value
            )
          }
          placeholder="Max"
          className="
            h-9
            min-w-0
            flex-1
            rounded-lg
            border
            border-slate-200
            bg-white
            px-2
            text-[10px]
            text-slate-600
            outline-none
            focus:border-[#0B5D3B]
          "
        />
      </div>
    </div>
  );
};

/* =========================================================
   TAB
========================================================= */

const TabButton = ({
  label,
  active,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`
        relative
        shrink-0
        whitespace-nowrap
        pb-2
        text-[10px]
        font-medium
        transition
        ${
          active
            ? "text-[#0B5D3B]"
            : "text-slate-400 hover:text-slate-600"
        }
      `}
    >
      {label}

      {active && (
        <span
          className="
            absolute
            bottom-0
            left-0
            right-0
            h-[2px]
            rounded-full
            bg-[#0B5D3B]
          "
        />
      )}
    </button>
  );
};

/* =========================================================
   STATUS
========================================================= */

const StatusBadge = ({
  status,
}) => {
  const normalized =
    String(
      status || ""
    ).toLowerCase();

  let classes =
    "bg-slate-100 text-slate-500";

  if (
    normalized ===
    "active"
  ) {
    classes =
      "bg-[#EAF5EF] text-[#0B5D3B]";
  } else if (
    normalized ===
    "overdue"
  ) {
    classes =
      "bg-red-50 text-red-600";
  } else if (
    normalized ===
    "closed"
  ) {
    classes =
      "bg-[#F0ECFF] text-[#6D5BD0]";
  } else if (
    normalized ===
    "inactive"
  ) {
    classes =
      "bg-slate-100 text-slate-500";
  }

  return (
    <span
      className={`
        inline-flex
        whitespace-nowrap
        rounded-full
        px-2
        py-1
        text-[9px]
        font-semibold
        ${classes}
      `}
    >
      {status}
    </span>
  );
};

/* =========================================================
   MOBILE DETAIL
========================================================= */

const MobileDetail = ({
  label,
  value,
  green = false,
}) => {
  return (
    <div className="min-w-0">
      <p className="text-[8px] uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`
          mt-0.5
          truncate
          text-[10px]
          font-medium
          ${
            green
              ? "text-[#0B5D3B]"
              : "text-slate-700"
          }
        `}
      >
        {value}
      </p>
    </div>
  );
};

/* =========================================================
   EMPTY CONTENT
========================================================= */

const EmptyContent = ({
  onAdd,
}) => {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center sm:px-6 sm:py-14">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF5EF]">
        <Users
          size={20}
          className="text-[#0B5D3B]"
        />
      </div>

      <h3 className="mt-3 text-sm font-semibold text-[#17221D]">
        No customers found
      </h3>

      <p className="mt-1 max-w-xs text-xs text-slate-400">
        Add a customer to start managing customer and vehicle finance records.
      </p>

      {can("loans", "add") && (
      <button
        type="button"
        onClick={onAdd}
        className="
          mt-3
          inline-flex
          items-center
          gap-1.5
          rounded-lg
          bg-[#0B5D3B]
          px-3.5
          py-2
          text-[11px]
          font-semibold
          text-white
          transition
          hover:bg-[#084A30]
        "
      >
        <Plus
          size={14}
        />

        Add Customer
      </button>
      )}
    </div>
  );
};

/* =========================================================
   TABLE HEADER
========================================================= */

const TableHeader = ({
  children,
  align = "left",
  className = "",
}) => {
  return (
    <th
      className={`
        whitespace-nowrap
        px-3.5
        py-2.5
        text-[9px]
        font-semibold
        uppercase
        tracking-[0.08em]
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
        ${className}
      `}
    >
      {children}
    </th>
  );
};

/* =========================================================
   BRAND OPTIONS
========================================================= */

const getBrandOptions = (
  customers
) => {
  const brands =
    customers
      .map(
        (customer) =>
          customer?.vehicle
            ?.brand
      )
      .filter(Boolean);

  return [
    "All Brands",
    ...Array.from(
      new Set(brands)
    ).sort(),
  ];
};

/* =========================================================
   CITY OPTIONS
========================================================= */

const getCityOptions = (
  customers
) => {
  const cities =
    customers
      .flatMap(
        (customer) => [
          customer
            ?.customer
            ?.personal?.area,
          customer
            ?.rc
            ?.location,
        ]
      )
      .filter(Boolean);

  return [
    "All Cities",
    ...Array.from(
      new Set(cities)
    ).sort(),
  ];
};

/* =========================================================
   NUMBER FORMAT
========================================================= */

const formatCr = (
  value
) => {
  const amount =
    Number(value || 0);

  if (
    amount >= 10000000
  ) {
    return `₹${(
      amount / 10000000
    ).toFixed(2)} Cr`;
  }

  if (
    amount >= 100000
  ) {
    return `₹${(
      amount / 100000
    ).toFixed(2)} L`;
  }

  return `₹${amount.toLocaleString(
    "en-IN"
  )}`;
};

/* =========================================================
   MENU ITEM
========================================================= */

const MenuItem = ({
  label,
  icon: Icon,
  onClick,
  danger = false,
}) => {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`
        flex
        w-full
        items-center
        gap-2.5
        px-3
        py-2.5
        text-left
        text-[11px]
        font-medium
        transition
        ${
          danger
            ? "text-red-600 hover:bg-red-50"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
        }
      `}
    >
      <Icon
        size={14}
        className="shrink-0"
      />

      <span>
        {label}
      </span>
    </button>
  );
};

/* =========================================================
   PAGINATION
========================================================= */

const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPrevious,
  onNext,
  onPageChange,
}) => {
  const pages =
    Array.from(
      {
        length:
          totalPages,
      },
      (_, index) =>
        index + 1
    );

  return (
    <div
      className="
        mt-3
        flex
        flex-col
        gap-2
        rounded-xl
        border
        border-slate-200
        bg-white
        px-3
        py-2.5
        sm:flex-row
        sm:items-center
        sm:justify-between
      "
    >
      <p className="text-center text-[9px] text-slate-400 sm:text-left">
        Showing{" "}
        <span className="font-semibold text-slate-600">
          {startIndex + 1}
        </span>{" "}
        to{" "}
        <span className="font-semibold text-slate-600">
          {endIndex}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-slate-600">
          {totalItems}
        </span>
      </p>

      <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-end">
        <button
          type="button"
          onClick={
            onPrevious
          }
          disabled={
            currentPage === 1
          }
          className="
            flex
            h-7
            w-7
            shrink-0
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
          aria-label="Previous page"
        >
          <ChevronLeft
            size={13}
          />
        </button>

        {pages.map(
          (page) => (
            <button
              key={page}
              type="button"
              onClick={() =>
                onPageChange(
                  page
                )
              }
              className={`
                flex
                h-7
                min-w-7
                shrink-0
                items-center
                justify-center
                rounded-md
                px-1.5
                text-[9px]
                font-semibold
                transition
                ${
                  page ===
                  currentPage
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
          onClick={
            onNext
          }
          disabled={
            currentPage ===
            totalPages
          }
          className="
            flex
            h-7
            w-7
            shrink-0
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
          aria-label="Next page"
        >
          <ChevronRight
            size={13}
          />
        </button>
      </div>
    </div>
  );
};

export default CustomerPage;