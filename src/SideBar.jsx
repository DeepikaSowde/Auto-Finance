// src/SideBar.jsx

import { useEffect, useState } from "react";

import {
  LayoutDashboard,
  Users,
  HandCoins,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Receipt,
  CarFront,
  BarChart3,
  WalletCards,
  Menu,
  X,
  Search,
  UserRound,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { searchCustomers } from "./services/customerStorage";

/* =========================================================
   MAIN NAVIGATION
========================================================= */

const NAV_ITEMS = [
  /* =======================================================
     1. DASHBOARD
  ======================================================= */

  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },

  /* =======================================================
     2. CUSTOMERS
  ======================================================= */

  {
    id: "customers",
    label: "Customers",
    icon: Users,
  },

  /* =======================================================
     3. LOANS

     Loan Management removed.
     "All Loans" now points to the new Loan page.
  ======================================================= */

  {
    id: "loans",
    label: "Loans",
    icon: HandCoins,

    children: [
      {
        id: "loans-all",
        label: "Loan Management",
      },

      {
        id: "loans-new",
        label: "New Loan",
      },

      {
        id: "reloan",
        label: "Re-loan",
      },

      {
        id: "collections",
        label: "Collections",
      },
    ],
  },

  /* =======================================================
     4. VEHICLES
  ======================================================= */

  {
    id: "vehicles",
    label: "Vehicles",
    icon: CarFront,

    children: [
      {
        id: "vehicles-all",
        label: "All Vehicles",
      },

      {
        id: "vehicles-seized",
        label: "Seized Vehicles",
      },

      {
        id: "vehicles-released",
        label: "Released Vehicles",
      },

      {
        id: "vehicles-sold",
        label: "Sold Vehicles",
      },
    ],
  },

  /* =======================================================
     5. OPERATIONS & ACCOUNTS
  ======================================================= */

  {
    id: "operations-accounts",
    label: "Operations & Accounts",
    icon: WalletCards,

    children: [
      {
        id: "ledger",
        label: "Ledger",
      },

      {
        id: "investor",
        label: "Investor",
      },

      {
        id: "income",
        label: "Income",
      },

      {
        id: "expense-control",
        label: "Expense",
      },
    ],
  },
];

/* =========================================================
   BOTTOM NAVIGATION
========================================================= */

const BOTTOM_NAV_ITEMS = [
  {
    id: "reminders",
    label: "Reminders",
    icon: Receipt,
  },

  {
    id: "control-center",
    label: "Control Center",
    icon: BarChart3,
  },
];

/* =========================================================
   SETTINGS
========================================================= */

const SETTINGS_ITEM = {
  id: "settings",
  label: "Settings",
  icon: Settings,
};

/* =========================================================
   SIDEBAR
========================================================= */

const SideBar = ({
  activeItem,
  onNavigate,
}) => {
  const navigate = useNavigate();

  const [
    collapsed,
    setCollapsed,
  ] = useState(false);

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  /* =======================================================
     CUSTOMER SEARCH STATE
  ====================================================== */

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [searching, setSearching] = useState(false);

  /* =======================================================
     DETERMINE OPEN PARENT
     
     Loan Management has been removed, so the Loans group
     now contains only:
     All Loans / New Loan / Re-loan / Collections
  ====================================================== */

  const [
    openMenu,
    setOpenMenu,
  ] = useState(
    activeItem === "loans-all" ||
      activeItem === "loans-new" ||
      activeItem === "reloan" ||
      activeItem === "collections"
      ? "loans"
      : activeItem === "investor" ||
          activeItem ===
            "expense-control" ||
          activeItem === "income" ||
          activeItem === "ledger"
        ? "operations-accounts"
        : activeItem?.startsWith?.(
              "vehicles-"
            )
          ? "vehicles"
          : null
  );

  /* =======================================================
     ESCAPE KEY CLOSES SEARCH MODAL
  ====================================================== */

  useEffect(() => {
    if (!searchModalOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSearchModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [searchModalOpen]);

  /* =======================================================
     SEARCH MODAL
  ====================================================== */

  const openSearchModal = () => {
    setSearchModalOpen(true);
    setSearchQuery("");
    setSearchResults([]);
    setSearchPerformed(false);
    setMobileOpen(false);
  };

  const closeSearchModal = () => {
    setSearchModalOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchPerformed(false);
  };

  const handleCustomerSearch = async () => {
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults([]);
      setSearchPerformed(false);
      return;
    }

    setSearching(true);

    try {
      const results = await searchCustomers(query);

      setSearchResults(results);
      setSearchPerformed(true);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleCustomerSearch();
    }
  };

  const handleCustomerResultClick = (customer) => {
    const customerId = customer?.customerId;

    if (!customerId) return;

    closeSearchModal();

    navigate(`/customers/${encodeURIComponent(customerId)}`);
  };

  /* =======================================================
     NAVIGATION
  ====================================================== */

  const handleItemClick = (
    item
  ) => {
    if (
      item.children?.length
    ) {
      setOpenMenu(
        (previous) =>
          previous === item.id
            ? null
            : item.id
      );

      return;
    }

    onNavigate(item.id);
    setMobileOpen(false);
  };

  /* =======================================================
     CHILD NAVIGATION
  ====================================================== */

  const handleChildClick = (
    child
  ) => {
    onNavigate(child.id);
    setMobileOpen(false);
  };

  /* =======================================================
     NAV BUTTON
  ====================================================== */

  const renderNavButton = (
    item
  ) => {
    const Icon = item.icon;

    const hasChildren =
      Array.isArray(
        item.children
      ) &&
      item.children.length > 0;

    const childActive =
      hasChildren
        ? item.children.some(
            (child) =>
              activeItem ===
              child.id
          )
        : false;

    const isActive =
      activeItem === item.id ||
      childActive;

    const isOpen =
      openMenu === item.id;

    return (
      <div
        key={item.id}
        className="w-full"
      >
        {/* =================================================
            PARENT BUTTON
        ================================================== */}

        <button
          type="button"
          title={
            collapsed
              ? item.label
              : undefined
          }
          onClick={() =>
            handleItemClick(
              item
            )
          }
          className={`
            group
            relative
            flex
            w-full
            items-center
            rounded-lg
            text-left
            transition-all
            duration-200
            ease-out

            ${
              collapsed
                ? "justify-center px-2.5"
                : "justify-start px-3"
            }

            py-2.5

            ${
              isActive
                ? "bg-[#1C6848] text-white shadow-sm"
                : "text-[#A8C2B3] hover:bg-[#174D38] hover:text-white"
            }
          `}
        >
          {/* ACTIVE INDICATOR */}

          {isActive && (
            <span
              className="
                absolute
                left-0
                top-1/2
                h-6
                w-[3px]
                -translate-y-1/2
                rounded-r-full
                bg-[#72D3A2]
              "
            />
          )}

          {/* ICON */}

          <span
            className="
              flex
              h-6
              w-6
              shrink-0
              items-center
              justify-center
            "
          >
            <Icon
              size={19}
              strokeWidth={2}
              className={
                isActive
                  ? "text-white"
                  : "text-[#A8C2B3]"
              }
            />
          </span>

          {/* LABEL */}

          {!collapsed && (
            <>
              <span
                className="
                  ml-3
                  min-w-0
                  flex-1
                  whitespace-normal
                  break-words
                  text-[13px]
                  font-medium
                  leading-5
                  text-inherit
                "
              >
                {item.label}
              </span>

              {/* CHEVRON */}

              {hasChildren && (
                <span
                  className="
                    ml-2
                    flex
                    h-5
                    w-5
                    shrink-0
                    items-center
                    justify-center
                    text-[#A8C2B3]
                  "
                >
                  {isOpen ? (
                    <ChevronDown
                      size={15}
                      strokeWidth={2}
                    />
                  ) : (
                    <ChevronRight
                      size={15}
                      strokeWidth={2}
                    />
                  )}
                </span>
              )}
            </>
          )}
        </button>

        {/* =================================================
            CHILDREN
        ================================================== */}

        {!collapsed &&
          hasChildren &&
          isOpen && (
            <div
              className="
                relative
                ml-4
                mt-1
                space-y-0.5
                border-l
                border-[#2A5A47]
                pl-2.5
              "
            >
              {item.children.map(
                (child) => {
                  const childIsActive =
                    activeItem ===
                    child.id;

                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() =>
                        handleChildClick(
                          child
                        )
                      }
                      className={`
                        relative
                        flex
                        w-full
                        items-center
                        rounded-md
                        px-3
                        py-2
                        text-left
                        text-[11px]
                        font-medium
                        transition
                        duration-150

                        ${
                          childIsActive
                            ? "bg-[#174D38] text-white"
                            : "text-[#A8C2B3] hover:bg-[#174D38] hover:text-white"
                        }
                      `}
                    >
                      {/* CHILD ACTIVE LINE */}

                      {childIsActive && (
                        <span
                          className="
                            absolute
                            -left-[13px]
                            top-1/2
                            h-5
                            w-[2px]
                            -translate-y-1/2
                            rounded-full
                            bg-[#72D3A2]
                          "
                        />
                      )}

                      <span className="truncate">
                        {
                          child.label
                        }
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          )}
      </div>
    );
  };

  /* =======================================================
     SEARCH CUSTOMER BUTTON
  ====================================================== */

  const renderSearchButton = () => {
    return (
      <button
        type="button"
        onClick={openSearchModal}
        title={collapsed ? "Search Customer" : undefined}
        className={`
          group relative flex w-full items-center rounded-lg
          border border-[#367C5D]
          bg-[#1A4F3A]
          py-2.5 text-left text-white shadow-sm
          transition-all duration-200 ease-out
          hover:border-[#4B9672]
          hover:bg-[#226247]
          hover:shadow-md
          ${collapsed ? "justify-center px-2.5" : "justify-start px-3"}
        `}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center">
          <Search
            size={18}
            strokeWidth={2.2}
            className="text-[#9BE2BA] transition-colors group-hover:text-white"
          />
        </span>

        {!collapsed && (
          <span className="ml-3 min-w-0 flex-1 text-[13px] font-semibold leading-5 text-white">
            Search Customer
          </span>
        )}
      </button>
    );
  };

  /* =======================================================
     SIDEBAR
  ====================================================== */

  return (
    <>
      {/* =================================================
          MOBILE TOP BAR
      ================================================== */}

      <div
        className="
          fixed
          left-0
          right-0
          top-0
          z-40
          flex
          h-14
          items-center
          justify-between
          border-b
          border-[#174D38]
          bg-[#0D2F24]
          px-3
          lg:hidden
        "
      >
        <button
          type="button"
          onClick={() =>
            setMobileOpen(
              (previous) =>
                !previous
            )
          }
          aria-label="Open menu"
          className="
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-lg
            text-[#A8C2B3]
            transition-colors
            hover:bg-[#174D38]
            hover:text-white
          "
        >
          <Menu
            size={20}
            strokeWidth={2}
          />
        </button>

        <div className="flex items-center">
          <div
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              overflow-hidden
              rounded-lg
              bg-[#174D38]
              ring-1
              ring-[#2B7655]
            "
          >
            <img
              src="/Auto-Finance-Logo.png"
              alt="MotoLend"
              className="
                h-full
                w-full
                object-contain
              "
            />
          </div>

          <p
            className="
              ml-2
              text-[14px]
              font-bold
              tracking-[-0.02em]
              text-white
            "
          >
            Moto
            <span className="text-[#78D6A4]">
              Lend
            </span>
          </p>
        </div>

        <div className="h-9 w-9" />
      </div>

      {/* =================================================
          OVERLAY
      ================================================== */}

      {mobileOpen && (
        <div
          onClick={() =>
            setMobileOpen(false)
          }
          className="
            fixed
            inset-0
            z-40
            bg-black/50
            lg:hidden
          "
        />
      )}

      {/* =================================================
          CUSTOMER SEARCH MODAL
      ================================================== */}

      {searchModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeSearchModal();
            }
          }}
        >
          <div
            className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#D8E8DE] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-[#E4EEE8] bg-[#F6FAF8] px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5F4EB] text-[#0B5D3B]">
                  <Search size={20} strokeWidth={2} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-[16px] font-bold text-[#173226]">Search Customer</h2>

                  <p className="mt-0.5 text-[11px] text-[#789086]">
                    Aadhaar, customer name, customer number or loan number
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeSearchModal}
                aria-label="Close search"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#71877C] transition-colors hover:bg-[#E6F1EB] hover:text-[#173226]"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* SEARCH INPUT */}

            <div className="p-5">
              <div className="flex items-center overflow-hidden rounded-xl border border-[#CFE0D7] bg-white transition focus-within:border-[#4C9B73] focus-within:ring-4 focus-within:ring-[#DFF1E7]">
                <Search size={19} strokeWidth={2} className="ml-3.5 shrink-0 text-[#7C9588]" />

                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Enter Aadhaar / Name / Customer No. / Loan No."
                  className="min-w-0 flex-1 border-0 bg-transparent px-3 py-3.5 text-[13px] text-[#173226] outline-none placeholder:text-[#9AAFA4]"
                />

                <button
                  type="button"
                  onClick={handleCustomerSearch}
                  disabled={!searchQuery.trim() || searching}
                  aria-label="Search customer"
                  className="m-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0B5D3B] text-white transition hover:bg-[#084A30] disabled:cursor-not-allowed disabled:bg-[#C7D5CE]"
                >
                  <Search size={18} strokeWidth={2} />
                </button>
              </div>

              {/* RESULTS */}

              {searching && (
                <p className="mt-4 text-center text-[10px] text-[#91A69B]">Searching...</p>
              )}

              {!searching && searchPerformed && (
                <div className="mt-4 border-t border-[#E7EFEA] pt-4">
                  {searchResults.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#D6E5DC] bg-[#F8FCFA] px-4 py-8 text-center">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF5EF] text-[#648777]">
                        <Users size={20} strokeWidth={2} />
                      </div>

                      <p className="mt-3 text-[13px] font-semibold text-[#30483D]">No customer found</p>

                      <p className="mt-1 text-[11px] text-[#82988D]">
                        Try another Aadhaar, name, customer number or loan number.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6D877A]">
                          Matching Customers
                        </p>

                        <span className="rounded-full bg-[#EAF5EF] px-2 py-1 text-[10px] font-semibold text-[#0B5D3B]">
                          {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                        {searchResults.map((customer) => (
                          <button
                            key={customer.customerId}
                            type="button"
                            onClick={() => handleCustomerResultClick(customer)}
                            className="group flex w-full items-start gap-3 rounded-xl border border-[#E1ECE6] bg-white p-3.5 text-left transition hover:border-[#A9CFBB] hover:bg-[#F7FBF9] hover:shadow-sm"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E9F5EF] text-[#0B5D3B]">
                              <UserRound size={19} strokeWidth={2} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-semibold text-[#203B30]">
                                {customer.customerName || "Unnamed Customer"}
                              </p>

                              <div className="mt-1 grid grid-cols-1 gap-1 text-[10px] text-[#71877C] sm:grid-cols-2">
                                <span className="truncate">
                                  Customer No:{" "}
                                  <span className="font-medium text-[#40584C]">
                                    {customer.customerNumber || "—"}
                                  </span>
                                </span>

                                <span className="truncate">
                                  Customer ID:{" "}
                                  <span className="font-medium text-[#40584C]">
                                    {customer.customerId || "—"}
                                  </span>
                                </span>

                                <span className="truncate sm:col-span-2">
                                  Aadhaar:{" "}
                                  <span className="font-medium text-[#40584C]">
                                    {customer.maskedAadhaar || "XXXX XXXX XXXX"}
                                  </span>
                                </span>
                              </div>

                              {customer.matchingLoans?.length > 0 && (
                                <p className="mt-1 truncate text-[10px] text-[#7B9185]">
                                  Loan:{" "}
                                  <span className="font-medium text-[#40584C]">
                                    {customer.matchingLoans
                                      .slice(0, 3)
                                      .map((loan) => loan?.loanNumber || loan?.id || "—")
                                      .join(", ")}
                                  </span>
                                </p>
                              )}
                            </div>

                            <ChevronRight
                              size={16}
                              strokeWidth={2}
                              className="mt-2 shrink-0 text-[#9AB1A5] transition group-hover:translate-x-0.5 group-hover:text-[#0B5D3B]"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!searchPerformed && (
                <p className="mt-3 text-center text-[10px] text-[#91A69B]">
                  Press Enter or click the search icon to find an existing customer.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          SIDEBAR
      ================================================== */}

      <aside
        className={`
          fixed
          inset-y-0
          left-0
          z-50
          flex
          h-screen
          w-[240px]
          shrink-0
          flex-col
          overflow-hidden
          border-r
          border-[#174D38]
          bg-[#0D2F24]
          transition-transform
          duration-300
          ease-out

          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }

          lg:static
          lg:translate-x-0
          lg:transition-[width]
          lg:duration-200

          ${
            collapsed
              ? "lg:w-[68px]"
              : "lg:w-[220px]"
          }
        `}
      >
        {/* =================================================
            BRAND
        ================================================== */}

        <div
          className={`
            hidden
            shrink-0
            border-b
            border-[#174D38]
            lg:block

            ${
              collapsed
                ? "px-2 py-3"
                : "px-3.5 py-3"
            }
          `}
        >
          <div
            className={`
              flex
              min-w-0
              items-center

              ${
                collapsed
                  ? "justify-center"
                  : "justify-start"
              }
            `}
          >
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                overflow-hidden
                rounded-lg
                bg-[#174D38]
                ring-1
                ring-[#2B7655]
              "
              title="MotoLend logo"
            >
              <img
                src="/Auto-Finance-Logo.png"
                alt="MotoLend"
                className="
                  h-full
                  w-full
                  object-contain
                "
              />
            </div>

            {!collapsed && (
              <div
                className="
                  ml-2.5
                  min-w-0
                  leading-tight
                "
              >
                <p
                  className="
                    truncate
                    text-[15px]
                    font-bold
                    tracking-[-0.02em]
                    text-white
                  "
                >
                  Moto
                  <span className="text-[#78D6A4]">
                    Lend
                  </span>
                </p>

                <p
                  className="
                    text-[9px]
                    font-semibold
                    uppercase
                    tracking-[0.06em]
                    text-white
                  "
                >
                  POWERING{" "}
                  <span className="text-[#78D6A4]">
                    SMARTER
                  </span>{" "}
                  FINANCE
                </p>
              </div>
            )}
          </div>
        </div>

        {/* =================================================
            MOBILE DRAWER HEADER
        ================================================== */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-[#174D38]
            px-3.5
            py-3
            lg:hidden
          "
        >
          <div className="flex min-w-0 items-center">
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                overflow-hidden
                rounded-lg
                bg-[#174D38]
                ring-1
                ring-[#2B7655]
              "
            >
              <img
                src="/Auto-Finance-Logo.png"
                alt="MotoLend"
                className="
                  h-full
                  w-full
                  object-contain
                "
              />
            </div>

            <p
              className="
                ml-2.5
                text-[15px]
                font-bold
                tracking-[-0.02em]
                text-white
              "
            >
              Moto
              <span className="text-[#78D6A4]">
                Lend
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setMobileOpen(false)
            }
            aria-label="Close menu"
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-[#A8C2B3]
              transition-colors
              hover:bg-[#174D38]
              hover:text-white
            "
          >
            <X
              size={18}
              strokeWidth={2}
            />
          </button>
        </div>

        {/* =================================================
            MAIN NAVIGATION
        ================================================== */}

        <nav
          className="
            min-h-0
            flex-1
            overflow-y-auto
            overflow-x-hidden
            px-2
            py-3
          "
        >
          <div className="flex min-h-full flex-col">
            <div className="space-y-1">
              {NAV_ITEMS.map(
                renderNavButton
              )}
            </div>

            {/* SEARCH CUSTOMER */}

            <div className="mt-auto pt-4">
              {renderSearchButton()}
            </div>
          </div>
        </nav>

        {/* =================================================
            BOTTOM AREA
        ================================================== */}

        <div
          className="
            shrink-0
            border-t
            border-[#174D38]
            px-2
            py-2.5
          "
        >
          {/* ALERTS / REMINDERS / CONTROL CENTER */}

          <div className="space-y-1">
            {BOTTOM_NAV_ITEMS.map(
              renderNavButton
            )}
          </div>

          {/* SETTINGS */}

          <div className="mt-1">
            {renderNavButton(
              SETTINGS_ITEM
            )}
          </div>

          {/* COLLAPSE */}

          <button
            type="button"
            onClick={() =>
              setCollapsed(
                (previous) =>
                  !previous
              )
            }
            title={
              collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
            className="
              mt-1
              hidden
              w-full
              items-center
              justify-center
              gap-2
              rounded-lg
              px-2
              py-2
              text-[#8EAF9E]
              transition-all
              duration-200
              hover:bg-[#174D38]
              hover:text-white
              lg:flex
            "
          >
            {collapsed ? (
              <ChevronRight
                size={18}
                strokeWidth={2}
              />
            ) : (
              <>
                <ChevronLeft
                  size={18}
                  strokeWidth={2}
                />

                <span className="text-[12px] font-medium">
                  Collapse
                </span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default SideBar;