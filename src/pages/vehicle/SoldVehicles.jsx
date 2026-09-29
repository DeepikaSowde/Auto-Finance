// src/pages/vehicle/SoldVehicles.jsx

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  useNavigate,
} from "react-router-dom";

import {
  CarFront,
  ChevronLeft,
  ChevronRight,
  FileText,
  IndianRupee,
  MoreVertical,
  ReceiptText,
  RotateCcw,
  Search,
  UserRound,
  WalletCards,
  X,
  CheckCircle2,
  CircleDollarSign,
} from "lucide-react";

import {
  getCustomers,
  getLoans,
  getOutstandingAmount,
} from "../../services/customerStorage";
import { can } from "../../config/permissions";

import {
  getVehicleRecords,
  completeVehicleSale,
} from "../../services/vehicleStorage";

/* =========================================================
   MAIN
========================================================= */

const SoldVehicles = () => {
  const navigate = useNavigate();

  const [records, setRecords] =
    useState([]);

  const [loans, setLoans] =
    useState([]);

  const [customers, setCustomers] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [saleDateFilter, setSaleDateFilter] =
    useState("");

  const [saleMethodFilter, setSaleMethodFilter] =
    useState("All Sale Methods");

  const [saleStatusFilter, setSaleStatusFilter] =
    useState("All Sale Status");

  const [buyerFilter, setBuyerFilter] =
    useState("All Buyers");

  const [currentPage, setCurrentPage] =
    useState(1);

  const [openActionId, setOpenActionId] =
    useState(null);

  const [selectedSale, setSelectedSale] =
    useState(null);

  const [saleFormTarget, setSaleFormTarget] =
    useState(null);

  const rowsPerPage = 7;

  /* =======================================================
     LOAD
  ======================================================= */

  const loadData = async () => {
    try {
      const [vehicleRecords, storedLoans, storedCustomers] =
        await Promise.all([
          getVehicleRecords(),
          getLoans(),
          getCustomers(),
        ]);

      setCustomers(
        Array.isArray(storedCustomers)
          ? storedCustomers
          : []
      );

      setRecords(
        Array.isArray(vehicleRecords)
          ? vehicleRecords
          : []
      );

      setLoans(
        Array.isArray(storedLoans)
          ? storedLoans
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load vehicle sale records:",
        error
      );

      setRecords([]);
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

  const findLoanForVehicle = (
    record
  ) => {
    const loanId =
      record?.loanId || "";

    const loanNumber =
      record?.loanNumber || "";

    if (
      !loanId &&
      !loanNumber
    ) {
      return null;
    }

    return (
      loans.find(
        (loan) => {
          const storedLoanId =
            loan?.id || "";

          const storedLoanNumber =
            loan?.loanNumber || "";

          return (
            (
              loanId &&
              String(
                storedLoanId
              ) ===
                String(
                  loanId
                )
            ) ||
            (
              loanNumber &&
              String(
                storedLoanNumber
              ) ===
                String(
                  loanNumber
                )
            )
          );
        }
      ) || null
    );
  };

  /* =======================================================
     FIND CUSTOMER
  ======================================================= */

  const findCustomerForVehicle = (
    record
  ) => {
    const customerId =
      record?.customerId || "";

    if (!customerId) {
      return null;
    }

    return (
      customers.find(
        (
          customerRecord
        ) => {
          const storedCustomerId =
            customerRecord?.customer?.id ||
            customerRecord?.customerId ||
            customerRecord?.id ||
            "";

          return (
            String(
              storedCustomerId
            ) ===
            String(
              customerId
            )
          );
        }
      ) || null
    );
  };

  /* =======================================================
     NORMALIZED SALES
  ======================================================= */

 const normalizedSales =
  useMemo(() => {
    return records
      .filter((record) => {
        const status =
          normalize(
            record?.status
          );

        return (
          status === "pending sale" ||
          status === "sold"
        );
      })
      .map((vehicleRecord) => {
        const loan =
          findLoanForVehicle(
            vehicleRecord
          );

        const customer =
          findCustomerForVehicle(
            vehicleRecord
          );

        const vehicle =
          vehicleRecord || {};

        const saleData =
          vehicle?.sale || {};

        const vehicleName =
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
            saleData?.outstandingAmount ??
              vehicle?.outstandingAmount ??
              getOutstandingAmount(
                loan
              ) ??
              0
          );

        const salePrice =
          Number(
            saleData?.salePrice || 0
          );

        const saleExpenses =
          Number(
            saleData?.saleExpenses || 0
          );

        const netRecovery =
          Number(
            saleData?.netSaleProceeds ??
              saleData?.netRecovery ??
              Math.max(
                salePrice -
                  saleExpenses,
                0
              )
          );

        const deficiencySurplus =
          Number(
            saleData?.deficiencySurplus ??
              (
                netRecovery -
                outstanding
              )
          );

        const currentStatus =
          normalize(
            vehicle?.status
          );

        return {
          ...vehicleRecord,

          recordId:
            vehicleRecord?.vehicleId ||
            vehicleRecord?.id,

          vehicleId:
            vehicleRecord?.vehicleId ||
            vehicleRecord?.id ||
            "—",

          registrationNumber:
            vehicleRecord?.registrationNumber ||
            "—",

          customerId:
            vehicleRecord?.customerId ||
            loan?.customerId ||
            customer?.customer?.id ||
            "—",

          customerName:
            vehicleRecord?.customerName ||
            loan?.customerName ||
            customer?.customer?.personal?.name ||
            "Customer",

          vehicleName,

          vehicleType:
            vehicleRecord?.vehicleType ||
            "—",

          loanId:
            vehicleRecord?.loanId ||
            loan?.id ||
            "—",

          loanNumber:
            vehicleRecord?.loanNumber ||
            loan?.loanNumber ||
            "—",

          loanAmount:
            Number(
              vehicleRecord?.loanAmount ??
                loan?.loanAmount ??
                0
            ),

          outstanding,

          saleDate:
            saleData?.soldAt ||
            saleData?.saleDate ||
            saleData?.initiatedAt ||
            vehicleRecord?.updatedAt ||
            "",

          salePrice,

          saleExpenses,

          netRecovery,

          deficiencySurplus,

          saleMethod:
            saleData?.saleMethod ||
            "—",

          saleStatus:
            currentStatus ===
            "pending sale"
              ? "Pending Sale"
              : "Sold",

          buyerName:
            saleData?.buyerName ||
            "—",

          buyerId:
            saleData?.buyerId ||
            "",

          soldBy:
            saleData?.soldBy ||
            "—",

          location:
            saleData?.saleLocation ||
            "—",

          seizureDate:
            vehicleRecord?.seizure
              ?.seizedAt ||
            vehicleRecord?.seizure
              ?.seizureDate ||
            "",

          seizureReason:
            vehicleRecord?.seizure
              ?.reason ||
            "—",

          attachment:
            saleData?.attachment ||
            null,

          lifecycleStatus:
            currentStatus ===
            "pending sale"
              ? "Pending Sale"
              : "Sold",

          saleData,

          loan,

          customer,
        };
      });
  }, [
    records,
    loans,
  ]);

  /* =======================================================
     FILTER OPTIONS
  ======================================================= */

  const saleMethods =
    useMemo(() => {
      return uniqueSorted(
        normalizedSales.map(
          (item) =>
            item.saleMethod
        )
      );
    }, [
      normalizedSales,
    ]);

  const saleStatuses =
    useMemo(() => {
      return uniqueSorted(
        normalizedSales.map(
          (item) =>
            item.saleStatus
        )
      );
    }, [
      normalizedSales,
    ]);

  const buyers =
    useMemo(() => {
      return uniqueSorted(
        normalizedSales.map(
          (item) =>
            item.buyerName
        )
      );
    }, [
      normalizedSales,
    ]);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredSales =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return normalizedSales.filter(
        (item) => {
          const searchable =
            [
              item.vehicleId,
              item.registrationNumber,
              item.customerName,
              item.customerId,
              item.vehicleName,
              item.loanNumber,
              item.buyerName,
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
            !saleDateFilter ||
            getDateKey(
              item.saleDate
            ) ===
              saleDateFilter;

          const matchesMethod =
            saleMethodFilter ===
              "All Sale Methods" ||
            item.saleMethod ===
              saleMethodFilter;

          const matchesStatus =
            saleStatusFilter ===
              "All Sale Status" ||
            item.saleStatus ===
              saleStatusFilter;

          const matchesBuyer =
            buyerFilter ===
              "All Buyers" ||
            item.buyerName ===
              buyerFilter;

          return (
            matchesSearch &&
            matchesDate &&
            matchesMethod &&
            matchesStatus &&
            matchesBuyer
          );
        }
      );
    }, [
      normalizedSales,
      search,
      saleDateFilter,
      saleMethodFilter,
      saleStatusFilter,
      buyerFilter,
    ]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredSales.length /
          rowsPerPage
      )
    );

  useEffect(() => {
    setCurrentPage(1);
    setOpenActionId(null);
  }, [
    search,
    saleDateFilter,
    saleMethodFilter,
    saleStatusFilter,
    buyerFilter,
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
    filteredSales.length === 0
      ? 0
      : (
          currentPage -
          1
        ) * rowsPerPage;

  const endIndex =
    Math.min(
      startIndex +
        rowsPerPage,
      filteredSales.length
    );

  const paginatedSales =
    filteredSales.slice(
      startIndex,
      endIndex
    );

  /* =======================================================
     KPI
  ======================================================= */

  const stats =
    useMemo(() => {
      const pendingSaleCount =
        normalizedSales.filter(
          (item) =>
            normalize(
              item.lifecycleStatus
            ) ===
            "pending sale"
        ).length;

      const totalSold =
        normalizedSales.filter(
          (item) =>
            normalize(
              item.lifecycleStatus
            ) ===
            "sold"
        ).length;

      const totalSaleValue =
        normalizedSales
          .filter(
            (item) =>
              normalize(
                item.lifecycleStatus
              ) ===
              "sold"
          )
          .reduce(
            (
              sum,
              item
            ) =>
              sum +
              Number(
                item.salePrice ||
                  0
              ),
            0
          );

      const totalRecovered =
        normalizedSales
          .filter(
            (item) =>
              normalize(
                item.lifecycleStatus
              ) ===
              "sold"
          )
          .reduce(
            (
              sum,
              item
            ) =>
              sum +
              Number(
                item.netRecovery ||
                  0
              ),
            0
          );

      const totalDeficiency =
        normalizedSales
          .filter(
            (item) =>
              normalize(
                item.lifecycleStatus
              ) ===
              "sold"
          )
          .reduce(
            (
              sum,
              item
            ) => {
              const difference =
                Number(
                  item.deficiencySurplus ||
                    0
                );

              return (
                sum +
                Math.max(
                  -difference,
                  0
                )
              );
            },
            0
          );

      return {
        pendingSaleCount,
        totalSold,
        totalSaleValue,
        totalRecovered,
        totalDeficiency,
      };
    }, [
      normalizedSales,
    ]);

  /* =======================================================
     RESET
  ======================================================= */

  const resetFilters = () => {
    setSearch("");

    setSaleDateFilter("");

    setSaleMethodFilter(
      "All Sale Methods"
    );

    setSaleStatusFilter(
      "All Sale Status"
    );

    setBuyerFilter(
      "All Buyers"
    );

    setCurrentPage(1);
  };

  /* =======================================================
     COMPLETE SALE
  ======================================================= */

const handleCompleteSale = async (
  vehicleId,
  saleData
) => {
  try {
    const result =
      await completeVehicleSale(
        vehicleId,
        saleData
      );

    if (!result) {
      window.alert(
        "Unable to complete this vehicle sale."
      );
      return;
    }

    setSaleFormTarget(null);
    setSelectedSale(null);
    setOpenActionId(null);

    loadData();
  } catch (error) {
    console.error(
      "Failed to complete vehicle sale:",
      error
    );

    window.alert(
      error?.message ||
        "Unable to complete vehicle sale."
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
                  bg-orange-50
                  text-orange-600
                "
              >
                <IndianRupee
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
                Vehicle Sales
              </h1>
            </div>

            <p
              className="
                mt-1
                text-[11px]
                text-slate-500
              "
            >
              Manage pending sale vehicles,
              completed sales and financial
              recovery.
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
                filteredSales.length
              }
            </span>{" "}
            sale records
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
        <SoldKpi
          icon={CarFront}
          label="Pending Sale"
          value={
            stats.pendingSaleCount
          }
          note="Vehicles waiting for final sale"
          tone="orange"
        />

        <SoldKpi
          icon={CheckCircle2}
          label="Total Sold"
          value={
            stats.totalSold
          }
          note="Completed vehicle sales"
          tone="green"
        />

        <SoldKpi
          icon={IndianRupee}
          label="Total Sale Value"
          value={formatMoney(
            stats.totalSaleValue
          )}
          note="Gross value of completed sales"
          tone="blue"
        />

        <SoldKpi
          icon={ReceiptText}
          label="Total Deficiency"
          value={formatMoney(
            stats.totalDeficiency
          )}
          note="Outstanding deficiency after sale"
          tone="red"
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
              value={
                search
              }
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
              saleDateFilter
            }
            onChange={(event) =>
              setSaleDateFilter(
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
              saleMethodFilter
            }
            onChange={
              setSaleMethodFilter
            }
            options={[
              "All Sale Methods",
              ...saleMethods,
            ]}
          />

          <FilterSelect
            value={
              saleStatusFilter
            }
            onChange={
              setSaleStatusFilter
            }
            options={[
              "All Sale Status",
              ...saleStatuses,
            ]}
          />

          <FilterSelect
            value={
              buyerFilter
            }
            onChange={
              setBuyerFilter
            }
            options={[
              "All Buyers",
              ...buyers,
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
              Vehicle Sale List
            </h2>

            <p
              className="
                mt-0.5
                text-[8px]
                text-slate-400
              "
            >
              Pending Sale and Sold records
              from vehicleStorage.
            </p>
          </div>

          <span
            className="
              rounded-full
              bg-orange-50
              px-2.5
              py-1
              text-[8px]
              font-bold
              text-orange-600
            "
          >
            {
              filteredSales.length
            }
          </span>
        </div>

        {paginatedSales.length ===
        0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table
              className="
                w-full
                min-w-[1440px]
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
                    Vehicle
                  </TableHeader>

                  <TableHeader>
                    Loan No.
                  </TableHeader>

                  <TableHeader align="right">
                    Outstanding
                  </TableHeader>

                  <TableHeader>
                    Sale Date
                  </TableHeader>

                  <TableHeader align="right">
                    Sale Price
                  </TableHeader>

                  <TableHeader align="right">
                    Expenses
                  </TableHeader>

                  <TableHeader align="right">
                    Net Recovery
                  </TableHeader>

                  <TableHeader align="right">
                    Deficiency / Surplus
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
                {paginatedSales.map(
                  (item) => (
                    <SoldVehicleRow
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
                          (
                            current
                          ) =>
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
                      onViewDetails={() => {
                        setOpenActionId(
                          null
                        );

                        setSelectedSale(
                          item
                        );
                      }}
                      onStartSale={() => {
                        setOpenActionId(
                          null
                        );

                        setSaleFormTarget(
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
                filteredSales.length
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
                filteredSales.length
              }
            </span>{" "}
            records
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
                !filteredSales.length
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
                !filteredSales.length
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

      {selectedSale && (
        <SaleDetailsModal
          item={
            selectedSale
          }
          onClose={() =>
            setSelectedSale(
              null
            )
          }
          onStartSale={() => {
            const target =
              selectedSale;

            setSelectedSale(
              null
            );

            setSaleFormTarget(
              target
            );
          }}
        />
      )}

      {/* COMPLETE SALE */}

    {saleFormTarget && (
  <CompleteSaleModal
    item={saleFormTarget}
    onCancel={() =>
      setSaleFormTarget(null)
    }
    onConfirm={(saleData) =>
      handleCompleteSale(
        saleFormTarget.vehicleId,
        saleData
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

const SoldVehicleRow = ({
  item,
  actionOpen,
  onToggleActions,
  onViewVehicle,
  onViewCustomer,
  onViewLoan,
  onViewDetails,
  onStartSale,
}) => {
  const isPending =
    normalize(
      item.lifecycleStatus
    ) === "pending sale";

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
          {item.registrationNumber}
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
            item.vehicleType
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

      <td className="px-3 py-3 text-right">
        <p className="text-[10px] font-semibold text-red-600">
          {formatMoney(
            item.outstanding
          )}
        </p>
      </td>

      <td className="px-3 py-3">
        {isPending ? (
          <>
            <p className="text-[9px] font-semibold text-orange-600">
              Pending Sale
            </p>

            <p className="mt-0.5 text-[8px] text-slate-400">
              Sale not completed
            </p>
          </>
        ) : (
          <>
            <p className="text-[9px] font-semibold text-[#17221D]">
              {formatDate(
                item.saleDate
              )}
            </p>

            <p className="mt-0.5 text-[8px] text-slate-400">
              {
                item.saleMethod
              }
            </p>
          </>
        )}
      </td>

      <td className="px-3 py-3 text-right">
        <p className="text-[10px] font-bold text-[#0B5D3B]">
          {formatMoney(
            item.salePrice
          )}
        </p>
      </td>

      <td className="px-3 py-3 text-right">
        <p className="text-[10px] font-semibold text-slate-600">
          {formatMoney(
            item.saleExpenses
          )}
        </p>
      </td>

      <td className="px-3 py-3 text-right">
        <p className="text-[10px] font-bold text-[#0B5D3B]">
          {formatMoney(
            item.netRecovery
          )}
        </p>
      </td>

      <td className="px-3 py-3 text-right">
        <DifferenceBadge
          value={
            item.deficiencySurplus
          }
        />
      </td>

      <td className="px-3 py-3">
        <SaleStatusBadge
          status={
            item.lifecycleStatus
          }
        />
      </td>

      <td className="px-3 py-3">
        <SoldActions
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
          onViewDetails={
            onViewDetails
          }
          onStartSale={
            onStartSale
          }
        />
      </td>
    </tr>
  );
};

/* =========================================================
   SALE STATUS
========================================================= */

const SaleStatusBadge = ({
  status,
}) => {
  const normalized =
    normalize(status);

  if (
    normalized ===
    "pending sale"
  ) {
    return (
      <span
        className="
          inline-flex
          whitespace-nowrap
          rounded-full
          bg-orange-50
          px-2
          py-1
          text-[8px]
          font-semibold
          text-orange-700
        "
      >
        Pending Sale
      </span>
    );
  }

  return (
    <span
      className="
        inline-flex
        whitespace-nowrap
        rounded-full
        bg-emerald-50
        px-2
        py-1
        text-[8px]
        font-semibold
        text-emerald-700
      "
    >
      Sold
    </span>
  );
};

/* =========================================================
   DIFFERENCE
========================================================= */

const DifferenceBadge = ({
  value,
}) => {
  const amount =
    Number(value || 0);

  if (amount > 0) {
    return (
      <span
        className="
          inline-flex
          whitespace-nowrap
          rounded-full
          bg-emerald-50
          px-2
          py-1
          text-[8px]
          font-bold
          text-emerald-700
        "
      >
        +{formatMoney(amount)}
      </span>
    );
  }

  if (amount < 0) {
    return (
      <span
        className="
          inline-flex
          whitespace-nowrap
          rounded-full
          bg-red-50
          px-2
          py-1
          text-[8px]
          font-bold
          text-red-700
        "
      >
        {formatMoney(
          Math.abs(
            amount
          )
        )}
      </span>
    );
  }

  return (
    <span
      className="
        inline-flex
        whitespace-nowrap
        rounded-full
        bg-slate-100
        px-2
        py-1
        text-[8px]
        font-bold
        text-slate-600
      "
    >
      ₹0
    </span>
  );
};

/* =========================================================
   ACTION MENU
========================================================= */

const SoldActions = ({
  item,
  actionOpen,
  onToggleActions,
  onViewVehicle,
  onViewCustomer,
  onViewLoan,
  onViewDetails,
  onStartSale,
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

  const isPending =
    normalize(
      item?.lifecycleStatus
    ) === "pending sale";

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
        isPending
          ? 290
          : 235;

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

    const outsideClick =
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

    const viewportChange =
      () => {
        updatePosition();
      };

    document.addEventListener(
      "mousedown",
      outsideClick
    );

    window.addEventListener(
      "resize",
      viewportChange
    );

    window.addEventListener(
      "scroll",
      viewportChange,
      true
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        outsideClick
      );

      window.removeEventListener(
        "resize",
        viewportChange
      );

      window.removeEventListener(
        "scroll",
        viewportChange,
        true
      );
    };
  }, [
    actionOpen,
    onToggleActions,
    isPending,
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

          if (
            !actionOpen
          ) {
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
        aria-label="Vehicle sale actions"
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
              label="View Sale Details"
              icon={
                IndianRupee
              }
              onClick={
                onViewDetails
              }
            />

            {isPending && can("vehicles", "edit") && (
              <>
                <div className="my-1 border-t border-slate-100" />

                <ActionButton
                  label="Complete Sale"
                  icon={
                    CircleDollarSign
                  }
                  onClick={() => {
                    onToggleActions?.();
                    onStartSale?.();
                  }}
                  orange
                />
              </>
            )}
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
  orange = false,
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
        gap-2
        px-3
        py-2.5
        text-left
        text-[10px]
        font-semibold
        transition
        ${
          orange
            ? "text-orange-600 hover:bg-orange-50"
            : "text-[#253252] hover:bg-[#F6FBF8] hover:text-[#0B5D3B]"
        }
      `}
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

const SoldKpi = ({
  icon: Icon,
  label,
  value,
  note,
  tone = "blue",
}) => {
  const styles = {
    orange: {
      bg: "bg-orange-50",
      icon: "text-orange-600",
      value:
        "text-orange-700",
    },

    blue: {
      bg: "bg-blue-50",
      icon: "text-blue-600",
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

    red: {
      bg: "bg-red-50",
      icon: "text-red-600",
      value:
        "text-red-700",
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
   SALE DETAILS MODAL
========================================================= */

const SaleDetailsModal = ({
  item,
  onClose,
  onStartSale,
}) => {
  const isPending =
    normalize(
      item?.lifecycleStatus
    ) ===
    "pending sale";

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
              className={`
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                ${
                  isPending
                    ? "bg-orange-50 text-orange-600"
                    : "bg-emerald-50 text-emerald-600"
                }
              `}
            >
              {isPending ? (
                <CircleDollarSign
                  size={18}
                />
              ) : (
                <CheckCircle2
                  size={18}
                />
              )}
            </div>

            <div>
              <h2
                className="
                  text-[14px]
                  font-bold
                  text-[#17221D]
                "
              >
                {isPending
                  ? "Pending Sale"
                  : "Sale Details"}
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
              label="Outstanding"
              value={formatMoney(
                item.outstanding
              )}
              valueClass="text-red-600"
            />
          </DetailSection>

          <DetailSection title="Sale Details">
            <DetailField
              label="Sale Status"
              value={
                item.lifecycleStatus
              }
            />

            <DetailField
              label="Sale Date"
              value={
                isPending
                  ? "Not completed"
                  : formatDate(
                      item.saleDate
                    )
              }
            />

            <DetailField
              label="Sale Method"
              value={
                item.saleMethod
              }
            />

            <DetailField
              label="Buyer"
              value={
                item.buyerName
              }
            />

            <DetailField
              label="Sold By"
              value={
                item.soldBy
              }
            />

            <DetailField
              label="Sale Location"
              value={
                item.location
              }
            />
          </DetailSection>

          <div
            className="
              rounded-xl
              border
              border-[#CFE8D9]
              bg-[#F1FAF4]
              p-4
            "
          >
            <p
              className="
                text-[8px]
                font-bold
                uppercase
                tracking-wide
                text-[#0B6B43]
              "
            >
              Settlement Summary
            </p>

            <div
              className="
                mt-3
                grid
                grid-cols-2
                gap-4
                sm:grid-cols-4
              "
            >
              <MiniValue
                label="Sale Price"
                value={formatMoney(
                  item.salePrice
                )}
              />

              <MiniValue
                label="Sale Expenses"
                value={formatMoney(
                  item.saleExpenses
                )}
              />

              <MiniValue
                label="Net Recovery"
                value={formatMoney(
                  item.netRecovery
                )}
              />

              <MiniValue
                label="Deficiency / Surplus"
                value={formatMoney(
                  item.deficiencySurplus
                )}
              />
            </div>
          </div>

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
              Seizure Reference
            </p>

            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField
                label="Seizure Date"
                value={formatDate(
                  item.seizureDate
                )}
              />

              <DetailField
                label="Seizure Reason"
                value={
                  item.seizureReason
                }
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
                Sale Document
              </p>

              <div className="mt-2 flex items-center gap-2">
                <FileText
                  size={15}
                  className="text-slate-500"
                />

                <span className="text-[10px] font-semibold text-[#17221D]">
                  {
                    item.attachment.fileName ||
                    "Sale document"
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
            gap-2
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

          {isPending && can("vehicles", "edit") && (
            <button
              type="button"
              onClick={
                onStartSale
              }
              className="
                inline-flex
                h-9
                items-center
                gap-1.5
                rounded-lg
                bg-orange-500
                px-4
                text-[9px]
                font-bold
                text-white
                hover:bg-orange-600
              "
            >
              <CircleDollarSign
                size={12}
              />

              Complete Sale
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

/* =========================================================
   COMPLETE SALE MODAL
========================================================= */

const CompleteSaleModal = ({
  item,
  onCancel,
  onConfirm,
}) => {
  const [salePrice, setSalePrice] =
    useState(
      item?.salePrice || ""
    );

  const [saleExpenses, setSaleExpenses] =
    useState(
      item?.saleExpenses || ""
    );

  const [saleMethod, setSaleMethod] =
    useState(
      item?.saleMethod &&
        item.saleMethod !==
          "—"
        ? item.saleMethod
        : "Auction"
    );

  const [buyerName, setBuyerName] =
    useState(
      item?.buyerName &&
        item.buyerName !==
          "—"
        ? item.buyerName
        : ""
    );

  const [buyerId, setBuyerId] =
    useState(
      item?.buyerId || ""
    );

  const [soldBy, setSoldBy] =
    useState(
      item?.soldBy &&
        item.soldBy !==
          "—"
        ? item.soldBy
        : "Admin"
    );

  const [saleLocation, setSaleLocation] =
    useState(
      item?.location &&
        item.location !==
          "—"
        ? item.location
        : ""
    );

  const [notes, setNotes] =
    useState("");

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const outstanding =
    Number(
      item?.outstanding || 0
    );

  const price =
    Number(
      salePrice || 0
    );

  const expenses =
    Number(
      saleExpenses || 0
    );

  const netRecovery =
    Math.max(
      price -
        expenses,
      0
    );

  const deficiencySurplus =
    netRecovery -
    outstanding;

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    setError("");

    if (
      !price ||
      price <= 0
    ) {
      setError(
        "Please enter a valid sale price."
      );

      return;
    }

    if (
      !buyerName.trim()
    ) {
      setError(
        "Please enter the buyer name."
      );

      return;
    }

    if (
      !soldBy.trim()
    ) {
      setError(
        "Please enter who completed the sale."
      );

      return;
    }

    try {
      setSaving(true);

      onConfirm({
        salePrice:
          price,

        saleExpenses:
          expenses,

        saleMethod:
          saleMethod,

        buyerName:
          buyerName.trim(),

        buyerId:
          buyerId.trim(),

        soldBy:
          soldBy.trim(),

        saleLocation:
          saleLocation.trim(),

        notes:
          notes.trim(),

        outstandingAmount:
          outstanding,

        netRecovery,

        deficiencySurplus,
      });
    } catch (error) {
      console.error(
        "Complete sale submit failed:",
        error
      );

      setSaving(false);

      setError(
        error?.message ||
          "Unable to complete sale."
      );
    }
  };

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
          flex
          max-h-[92vh]
          w-full
          max-w-[700px]
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
                bg-orange-50
                text-orange-600
              "
            >
              <CircleDollarSign
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
                Complete Vehicle Sale
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
              onCancel
            }
            disabled={saving}
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              text-slate-400
              hover:bg-slate-100
              disabled:opacity-50
            "
          >
            <X size={16} />
          </button>
        </div>

        {/* BODY */}

        <form
          onSubmit={
            handleSubmit
          }
          className="
            min-h-0
            flex-1
            overflow-y-auto
            p-5
          "
        >
          {/* VEHICLE */}

          <div
            className="
              rounded-xl
              border
              border-orange-100
              bg-orange-50/60
              p-4
            "
          >
            <p className="text-[8px] font-bold uppercase tracking-wide text-orange-600">
              Vehicle
            </p>

            <p className="mt-1 text-[12px] font-bold text-[#17221D]">
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
                {
                  item.loanNumber
                }
              </span>

              <span className="text-[9px] text-slate-300">
                •
              </span>

              <span className="text-[9px] font-semibold text-red-600">
                Outstanding{" "}
                {formatMoney(
                  outstanding
                )}
              </span>
            </div>
          </div>

          {/* INPUTS */}

          <div
            className="
              mt-4
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-2
            "
          >
            <SaleFormField
              label="Sale Price *"
            >
              <MoneyInput
                value={
                  salePrice
                }
                onChange={
                  setSalePrice
                }
                placeholder="Enter sale price"
              />
            </SaleFormField>

            <SaleFormField
              label="Sale Expenses"
            >
              <MoneyInput
                value={
                  saleExpenses
                }
                onChange={
                  setSaleExpenses
                }
                placeholder="Enter sale expenses"
              />
            </SaleFormField>

            <SaleFormField
              label="Sale Method"
            >
              <select
                value={
                  saleMethod
                }
                onChange={(event) =>
                  setSaleMethod(
                    event.target.value
                  )
                }
                className={
                  saleInputClass
                }
              >
                <option value="Auction">
                  Auction
                </option>

                <option value="Direct Sale">
                  Direct Sale
                </option>

                <option value="Tender">
                  Tender
                </option>

                <option value="Dealer">
                  Dealer
                </option>

                <option value="Other">
                  Other
                </option>
              </select>
            </SaleFormField>

            <SaleFormField
              label="Buyer Name *"
            >
              <input
                type="text"
                value={
                  buyerName
                }
                onChange={(event) =>
                  setBuyerName(
                    event.target.value
                  )
                }
                placeholder="Buyer / purchaser name"
                className={
                  saleInputClass
                }
              />
            </SaleFormField>

            <SaleFormField
              label="Buyer ID"
            >
              <input
                type="text"
                value={
                  buyerId
                }
                onChange={(event) =>
                  setBuyerId(
                    event.target.value
                  )
                }
                placeholder="Optional buyer ID"
                className={
                  saleInputClass
                }
              />
            </SaleFormField>

            <SaleFormField
              label="Sold By *"
            >
              <input
                type="text"
                value={
                  soldBy
                }
                onChange={(event) =>
                  setSoldBy(
                    event.target.value
                  )
                }
                placeholder="Staff / admin"
                className={
                  saleInputClass
                }
              />
            </SaleFormField>

            <SaleFormField
              label="Sale Location"
            >
              <input
                type="text"
                value={
                  saleLocation
                }
                onChange={(event) =>
                  setSaleLocation(
                    event.target.value
                  )
                }
                placeholder="Sale location"
                className={
                  saleInputClass
                }
              />
            </SaleFormField>
          </div>

          {/* SUMMARY */}

          <div
            className="
              mt-4
              rounded-xl
              border
              border-[#CFE8D9]
              bg-[#F1FAF4]
              p-4
            "
          >
            <p className="text-[8px] font-bold uppercase tracking-wide text-[#0B6B43]">
              Live Settlement Preview
            </p>

            <div
              className="
                mt-3
                grid
                grid-cols-2
                gap-4
                sm:grid-cols-4
              "
            >
              <MiniValue
                label="Sale Price"
                value={formatMoney(
                  price
                )}
              />

              <MiniValue
                label="Expenses"
                value={formatMoney(
                  expenses
                )}
              />

              <MiniValue
                label="Net Recovery"
                value={formatMoney(
                  netRecovery
                )}
              />

              <MiniValue
                label={
                  deficiencySurplus <
                  0
                    ? "Deficiency"
                    : "Surplus"
                }
                value={formatMoney(
                  Math.abs(
                    deficiencySurplus
                  )
                )}
              />
            </div>
          </div>

          {/* NOTES */}

          <div className="mt-4">
            <label
              className="
                mb-1.5
                block
                text-[8px]
                font-bold
                uppercase
                tracking-wide
                text-slate-400
              "
            >
              Sale Remarks
            </label>

            <textarea
              rows={3}
              value={
                notes
              }
              onChange={(event) =>
                setNotes(
                  event.target.value
                )
              }
              placeholder="Optional remarks about the final sale..."
              className="
                w-full
                resize-none
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

          {/* FOOTER */}

          <div
            className="
              mt-5
              flex
              justify-end
              gap-2
              border-t
              border-slate-100
              pt-4
            "
          >
            <button
              type="button"
              onClick={
                onCancel
              }
              disabled={saving}
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
                bg-orange-500
                px-5
                text-[9px]
                font-bold
                text-white
                shadow-sm
                hover:bg-orange-600
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              <CheckCircle2
                size={12}
              />

              {saving
                ? "Saving..."
                : "Complete Sale"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/* =========================================================
   FORM FIELD
========================================================= */

const SaleFormField = ({
  label,
  children,
}) => {
  return (
    <div className="min-w-0">
      <label
        className="
          mb-1.5
          block
          text-[8px]
          font-bold
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </label>

      {children}
    </div>
  );
};

/* =========================================================
   INPUT
========================================================= */

const saleInputClass = `
  h-9
  w-full
  rounded-lg
  border
  border-slate-200
  bg-white
  px-3
  text-[10px]
  font-medium
  text-[#17221D]
  outline-none
  focus:border-[#9CCEB1]
  focus:ring-1
  focus:ring-[#DCEFE4]
`;

/* =========================================================
   MONEY INPUT
========================================================= */

const MoneyInput = ({
  value,
  onChange,
  placeholder,
}) => {
  return (
    <div className="relative">
      <span
        className="
          pointer-events-none
          absolute
          left-3
          top-1/2
          -translate-y-1/2
          text-[11px]
          text-slate-400
        "
      >
        ₹
      </span>

      <input
        type="number"
        min="0"
        step="0.01"
        value={
          value ?? ""
        }
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        className={`
          ${saleInputClass}
          pl-7
        `}
      />
    </div>
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
          bg-orange-50
          text-orange-600
        "
      >
        <CarFront
          size={20}
        />
      </div>

      <p
        className="
          mt-3
          text-[12px]
          font-semibold
          text-[#17221D]
        "
      >
        No vehicle sale records found
      </p>

      <p
        className="
          mt-1
          text-[9px]
          text-slate-400
        "
      >
        Vehicles moved into Pending Sale
        or completed as Sold will appear here.
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
  ).sort(
    (a, b) =>
      String(
        a
      ).localeCompare(
        String(
          b
        )
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

export default SoldVehicles;