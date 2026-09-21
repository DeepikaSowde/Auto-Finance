// src/pages/settings/Settings.jsx

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Settings as SettingsIcon,
  Building2,
  Banknote,
  CarFront,
  Repeat2,
  WalletCards,
  Users,
  FileCheck2,
  ShieldCheck,
  Receipt,
  Database,
  Save,
  RotateCcw,
  CheckCircle2,
  Info,
  ChevronRight,
  LockKeyhole,
  Tags,
  UserCog,
  Plus,
  Trash2,
} from "lucide-react";

import { getCategories, addCategory, deleteCategory } from "../../services/categoryStorage";
import { getUsers, createUser, deleteUser } from "../../services/userStorage";
import { useToast } from "../../context/ToastContext";

/* =========================================================
   DEFAULT DEMO SETTINGS
   UI ONLY — NEVER PERSISTED
========================================================= */

const DEFAULT_SETTINGS = {
  general: {
    companyName: "MotoLend",
    businessType: "Auto Finance",
    phone: "+91 98765 43210",
    email: "admin@example.com",
    address: "Dindigul, Tamil Nadu",
    currency: "₹ Indian Rupee",
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
  },

  loan: {
    interestType: "Reducing Balance",
    interestRate: "18",
    minLoanAmount: "10000",
    maxLoanAmount: "1000000",
    defaultTenure: "12",
    paymentFrequency: "Monthly",
    gracePeriod: "3",
    latePaymentCharge: "250",
    allowPartialPayment: true,
    allowAdvancePayment: true,
    adminApprovalRequired: true,
  },

  vehicle: {
    vehicleTypes: ["Car", "Bike", "Commercial Vehicle"],
    fuelTypes: ["Petrol", "Diesel", "Electric", "CNG"],
    transmission: ["Manual", "Automatic"],
    maximumAge: "10",
    rcRequired: true,
    insuranceRequired: true,
    inspectionRequired: true,
    seizedCollateral: false,
    soldCollateral: false,
    vehiclePrefix: "VH-",
  },

  reloan: {
    minimumPaidInstallments: "6",
    maximumOverdueAmount: "5000",
    maximumOverdueDays: "30",
    allowActiveLoan: true,
    allowClosedLoan: true,
    allowForeclosedLoan: false,
    allowSeizedVehicle: false,
    allowSoldVehicle: false,
    customerVerification: true,
    requiredDocuments: true,
    allowSameVehicle: true,
    allowDifferentVehicle: true,
  },

  repayment: {
    allowPartialPayment: true,
    allowAdvancePayment: true,
    allowExcessPayment: true,
    adminApprovalRequired: true,
    autoPosting: true,
    allocationPriority:
      "Overdue → Current Due → Future Due",
    gracePeriod: "3",
    lateHandling: "Apply Penalty",
    cash: true,
    bank: true,
    upi: true,
    card: true,
    cheque: true,
  },

  customer: {
    customerPrefix: "CUS-",
    loanPrefix: "LN-",
    vehiclePrefix: "VH-",
    requireMobile: true,
    requireAddress: true,
    preventDuplicateMobile: true,
    verificationRequired: true,
    allowCustomerPhoto: true,
    showLoanHistory: true,
    requiredName: true,
    requiredMobile: true,
    requiredAddress: true,
    requiredDob: true,
    requiredOccupation: false,
  },

  documents: {
    aadhaar: true,
    pan: true,
    addressProof: true,
    photo: true,
    rcBook: true,
    insurance: true,
    vehiclePhoto: true,
    guarantorDocuments: true,
    maxFileSize: "5",
    expiryReminder: true,
    reminderDays: "30",
  },

  security: {
    sessionTimeout: "30",
    maxLoginAttempts: "5",
    autoLogout: true,
    passwordExpiry: "90",
    twoFactor: false,
    loginTracking: true,
    auditLoginEvents: true,
    minimumPasswordLength: "8",
    uppercase: true,
    number: true,
    specialCharacter: true,
  },
};

const SECTIONS = [
  {
    id: "general",
    label: "General",
    description: "Company & application",
    icon: Building2,
  },
  {
    id: "loan",
    label: "Loan",
    description: "Loan defaults",
    icon: Banknote,
  },
  {
    id: "vehicle",
    label: "Vehicle",
    description: "Vehicle rules",
    icon: CarFront,
  },
  {
    id: "reloan",
    label: "Re-loan",
    description: "Repeat borrower rules",
    icon: Repeat2,
  },
  {
    id: "repayment",
    label: "Repayment",
    description: "Payment preferences",
    icon: WalletCards,
  },
  {
    id: "customer",
    label: "Customer",
    description: "Customer controls",
    icon: Users,
  },
  {
    id: "documents",
    label: "Documents & KYC",
    description: "Required documents",
    icon: FileCheck2,
  },
  {
    id: "security",
    label: "Security",
    description: "Account protection",
    icon: ShieldCheck,
  },
  {
    id: "categories",
    label: "Categories",
    description: "Income & expense categories",
    icon: Tags,
  },
  {
    id: "admins",
    label: "Admins",
    description: "Manage user accounts",
    icon: UserCog,
  },
];

/* =========================================================
   MAIN
========================================================= */

const Settings = () => {
  const [activeSection, setActiveSection] =
    useState("general");

  const [settings, setSettings] =
    useState(() =>
      cloneDefaults()
    );

  const [toast, setToast] =
    useState("");

  const activeMeta =
    useMemo(
      () =>
        SECTIONS.find(
          (section) =>
            section.id ===
            activeSection
        ) ||
        SECTIONS[0],
      [activeSection]
    );

  const updateValue = (
    section,
    key,
    value
  ) => {
    setSettings(
      (current) => ({
        ...current,
        [section]: {
          ...current[section],
          [key]: value,
        },
      })
    );
  };

  const saveSection = () => {
    setToast(
      `${activeMeta.label} settings updated for this demo session.`
    );

    window.setTimeout(
      () => setToast(""),
      2500
    );
  };

  const resetSection = () => {
    setSettings(
      (current) => ({
        ...current,
        [activeSection]:
          cloneDefaults()[
            activeSection
          ],
      })
    );

    setToast(
      `${activeMeta.label} restored to default demo values.`
    );

    window.setTimeout(
      () => setToast(""),
      2500
    );
  };

  return (
    <div className="min-h-full bg-[#F7F9F8] p-3 sm:p-4 lg:p-5">
      {/* =================================================
          HEADER
      ================================================== */}

      <div className="mb-4">
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
              bg-[#EAF5EF]
              text-[#0B5D3B]
            "
          >
            <SettingsIcon
              size={19}
              strokeWidth={2}
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className="
                  text-[22px]
                  font-extrabold
                  tracking-tight
                  text-[#17221D]
                  sm:text-[24px]
                "
              >
                Settings
              </h1>

              <span
                className="
                  rounded-full
                  bg-[#EAF5EF]
                  px-2
                  py-1
                  text-[7px]
                  font-extrabold
                  uppercase
                  tracking-wide
                  text-[#0B5D3B]
                "
              >
                Admin
              </span>
            </div>

            <p className="mt-1 text-[10px] text-slate-400 sm:text-[11px]">
              Manage your application and business configuration.
            </p>
          </div>
        </div>
      </div>

      {/* =================================================
          TOAST
      ================================================== */}

      {toast && (
        <div
          className="
            mb-3
            flex
            items-center
            gap-2
            rounded-xl
            border
            border-[#CFE8D9]
            bg-[#F0FAF4]
            px-3.5
            py-3
            shadow-sm
          "
        >
          <CheckCircle2
            size={14}
            className="shrink-0 text-[#0B6B43]"
          />

          <p className="text-[9px] font-bold text-[#0B6B43]">
            {toast}
          </p>
        </div>
      )}

      {/* =================================================
          MAIN SETTINGS LAYOUT
      ================================================== */}

      <div
        className="
          grid
          grid-cols-1
          gap-4
          xl:grid-cols-[245px_minmax(0,1fr)]
        "
      >
        {/* =================================================
            SETTINGS NAVIGATION
        ================================================== */}

        <aside
          className="
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-2
            shadow-sm
          "
        >
          <div className="px-2.5 pb-2.5 pt-2">
            <p
              className="
                text-[8px]
                font-extrabold
                uppercase
                tracking-[0.08em]
                text-slate-400
              "
            >
              Configuration
            </p>
          </div>

          <div className="space-y-1">
            {SECTIONS.map(
              (section) => {
                const Icon =
                  section.icon;

                const active =
                  activeSection ===
                  section.id;

                return (
                  <button
                    key={
                      section.id
                    }
                    type="button"
                    onClick={() =>
                      setActiveSection(
                        section.id
                      )
                    }
                    className={`
                      group
                      flex
                      w-full
                      items-center
                      gap-2.5
                      rounded-xl
                      px-2.5
                      py-2.5
                      text-left
                      transition-all
                      duration-200
                      ${
                        active
                          ? "bg-[#EAF5EF] text-[#0B5D3B]"
                          : "text-slate-600 hover:bg-slate-50"
                      }
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
                        ${
                          active
                            ? "bg-[#D7EFE1] text-[#0B5D3B]"
                            : "bg-slate-50 text-slate-400 group-hover:text-slate-600"
                        }
                      `}
                    >
                      <Icon
                        size={14}
                        strokeWidth={2}
                      />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className={`
                          block
                          truncate
                          text-[9px]
                          font-extrabold
                          ${
                            active
                              ? "text-[#0B5D3B]"
                              : "text-[#253252]"
                          }
                        `}
                      >
                        {
                          section.label
                        }
                      </span>

                      <span className="mt-0.5 block truncate text-[7px] text-slate-400">
                        {
                          section.description
                        }
                      </span>
                    </span>

                    <ChevronRight
                      size={13}
                      className={`
                        shrink-0
                        ${
                          active
                            ? "text-[#0B5D3B]"
                            : "text-slate-300"
                        }
                      `}
                    />
                  </button>
                );
              }
            )}
          </div>
        </aside>

        {/* =================================================
            CONTENT
        ================================================== */}

        <section className="min-w-0">
          <div
            className="
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-sm
            "
          >
            {/* CONTENT HEADER */}

            <div
              className="
                border-b
                border-slate-100
                px-4
                py-4
                sm:px-5
              "
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className="
                      text-[7px]
                      font-extrabold
                      uppercase
                      tracking-[0.08em]
                      text-[#0B6B43]
                    "
                  >
                    Configuration
                  </p>

                  <h2
                    className="
                      mt-1
                      text-[16px]
                      font-extrabold
                      tracking-tight
                      text-[#17221D]
                      sm:text-[18px]
                    "
                  >
                    {
                      activeMeta.label
                    }{" "}
                    Settings
                  </h2>

                  <p className="mt-1 max-w-2xl text-[9px] leading-4 text-slate-400">
                    {
                      activeMeta.description
                    }
                  </p>
                </div>

                <div
                  className="
                    hidden
                    shrink-0
                    items-center
                    gap-1.5
                    rounded-lg
                    border
                    border-slate-200
                    bg-slate-50
                    px-2.5
                    py-1.5
                    sm:flex
                  "
                >
                  <LockKeyhole
                    size={11}
                    className="text-slate-400"
                  />

                  <span className="text-[7px] font-bold text-slate-500">
                    Admin
                  </span>
                </div>
              </div>
            </div>

            {/* MOBILE NAV */}

            <div className="border-b border-slate-100 p-3 xl:hidden">
              <select
                value={
                  activeSection
                }
                onChange={(event) =>
                  setActiveSection(
                    event.target.value
                  )
                }
                className="
                  h-10
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-3
                  text-[10px]
                  font-bold
                  text-[#253252]
                  outline-none
                  focus:border-[#9CCEB1]
                  focus:ring-1
                  focus:ring-[#DCEFE4]
                "
              >
                {SECTIONS.map(
                  (
                    section
                  ) => (
                    <option
                      key={
                        section.id
                      }
                      value={
                        section.id
                      }
                    >
                      {
                        section.label
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* SECTION */}

            <div className="p-4 sm:p-5">
              {activeSection ===
                "general" && (
                <GeneralSection
                  values={
                    settings.general
                  }
                  update={(
                    key,
                    value
                  ) =>
                    updateValue(
                      "general",
                      key,
                      value
                    )
                  }
                />
              )}

              {activeSection ===
                "loan" && (
                <LoanSection
                  values={
                    settings.loan
                  }
                  update={(
                    key,
                    value
                  ) =>
                    updateValue(
                      "loan",
                      key,
                      value
                    )
                  }
                />
              )}

              {activeSection ===
                "vehicle" && (
                <VehicleSection
                  values={
                    settings.vehicle
                  }
                  update={(
                    key,
                    value
                  ) =>
                    updateValue(
                      "vehicle",
                      key,
                      value
                    )
                  }
                />
              )}

              {activeSection ===
                "reloan" && (
                <ReloanSection
                  values={
                    settings.reloan
                  }
                  update={(
                    key,
                    value
                  ) =>
                    updateValue(
                      "reloan",
                      key,
                      value
                    )
                  }
                />
              )}

              {activeSection ===
                "repayment" && (
                <RepaymentSection
                  values={
                    settings.repayment
                  }
                  update={(
                    key,
                    value
                  ) =>
                    updateValue(
                      "repayment",
                      key,
                      value
                    )
                  }
                />
              )}

              {activeSection ===
                "customer" && (
                <CustomerSection
                  values={
                    settings.customer
                  }
                  update={(
                    key,
                    value
                  ) =>
                    updateValue(
                      "customer",
                      key,
                      value
                    )
                  }
                />
              )}

              {activeSection ===
                "documents" && (
                <DocumentsSection
                  values={
                    settings.documents
                  }
                  update={(
                    key,
                    value
                  ) =>
                    updateValue(
                      "documents",
                      key,
                      value
                    )
                  }
                />
              )}

              {activeSection ===
                "security" && (
                <SecuritySection
                  values={
                    settings.security
                  }
                  update={(
                    key,
                    value
                  ) =>
                    updateValue(
                      "security",
                      key,
                      value
                    )
                  }
                />
              )}

              {activeSection === "categories" && <CategoriesSection />}

              {activeSection === "admins" && <AdminsSection />}

              {/* =================================================
                  INFO
              ================================================== */}

              {activeSection !== "categories" && activeSection !== "admins" && (
                <div
                  className="
                    mt-5
                    flex
                    items-start
                    gap-2
                    rounded-xl
                    border
                    border-blue-100
                    bg-blue-50
                    px-3.5
                    py-3
                  "
                >
                  <Info
                    size={13}
                    className="mt-0.5 shrink-0 text-blue-600"
                  />

                  <p className="text-[8px] leading-4 text-blue-700/80">
                    These settings are currently
                    demo controls only. Changes
                    are available during this
                    session but are not stored and
                    do not affect the application's
                    business logic.
                  </p>
                </div>
              )}
            </div>

            {/* SAVE BAR */}

            {activeSection !== "categories" && activeSection !== "admins" && (
            <div
              className="
                flex
                flex-col
                gap-2
                border-t
                border-slate-100
                bg-slate-50/70
                px-4
                py-3
                sm:flex-row
                sm:items-center
                sm:justify-between
                sm:px-5
              "
            >
              <button
                type="button"
                onClick={
                  resetSection
                }
                className="
                  inline-flex
                  h-9
                  items-center
                  gap-1.5
                  self-start
                  rounded-lg
                  border
                  border-slate-200
                  bg-white
                  px-3
                  text-[8px]
                  font-bold
                  text-slate-500
                  transition
                  hover:bg-slate-50
                  hover:text-[#0B5D3B]
                  sm:self-auto
                "
              >
                <RotateCcw
                  size={11}
                />

                Reset to Default
              </button>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={
                    resetSection
                  }
                  className="
                    h-9
                    rounded-lg
                    border
                    border-slate-200
                    bg-white
                    px-3.5
                    text-[8px]
                    font-bold
                    text-slate-500
                    hover:bg-slate-50
                  "
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    saveSection
                  }
                  className="
                    inline-flex
                    h-9
                    items-center
                    gap-1.5
                    rounded-lg
                    bg-[#0B5D3B]
                    px-4
                    text-[8px]
                    font-extrabold
                    text-white
                    shadow-sm
                    transition
                    hover:bg-[#084A30]
                  "
                >
                  <Save
                    size={11}
                  />

                  Save Changes
                </button>
              </div>
            </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

/* =========================================================
   CATEGORIES — real, persisted (unlike the rest of this page)
========================================================= */

const CategoriesSection = () => {
  const toast = useToast();

  const [type, setType] = useState("expense");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async (activeType) => {
    setLoading(true);
    setCategories(await getCategories(activeType));
    setLoading(false);
  };

  useEffect(() => {
    load(type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const handleAdd = async (event) => {
    event.preventDefault();

    const cleanName = name.trim();

    if (!cleanName) return;

    setSaving(true);

    try {
      await addCategory(type, cleanName);
      setName("");
      await load(type);
      toast.success(`Category "${cleanName}" added.`);
    } catch (error) {
      toast.error(error.message || "Couldn't add category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    try {
      await deleteCategory(category.id);
      await load(type);
      toast.success(`Category "${category.name}" removed.`);
    } catch (error) {
      toast.error(error.message || "Couldn't remove category.");
    }
  };

  return (
    <SettingsGroup
      title="Income & Expense Categories"
      description="Categories offered on the Income and Expense forms. Changes here are saved immediately."
    >
      <div className="mb-4 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit">
        {["expense", "income"].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setType(option)}
            className={`rounded-md px-3 py-1.5 text-[9px] font-bold capitalize ${
              type === option ? "bg-[#EAF5EF] text-[#0B6B43]" : "text-slate-500"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={`New ${type} category name...`}
          className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-[#9CCEB1]"
        />

        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#0B5D3B] px-3.5 text-[10px] font-bold text-white disabled:opacity-50"
        >
          <Plus size={13} /> Add
        </button>
      </form>

      {loading ? (
        <p className="text-[10px] text-slate-400">Loading...</p>
      ) : categories.length === 0 ? (
        <p className="text-[10px] text-slate-400">No {type} categories yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <span
              key={category.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1.5 text-[10px] font-semibold text-slate-600"
            >
              {category.name}

              <button
                type="button"
                onClick={() => handleDelete(category)}
                className="rounded-full p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Remove ${category.name}`}
              >
                <Trash2 size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </SettingsGroup>
  );
};

/* =========================================================
   ADMINS — real, persisted (unlike the rest of this page)
========================================================= */

const AdminsSection = () => {
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username: "", password: "", name: "", role: "staff" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setUsers(await getUsers());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleCreate = async (event) => {
    event.preventDefault();

    setSaving(true);

    try {
      await createUser(form);
      setForm({ username: "", password: "", name: "", role: "staff" });
      await load();
      toast.success(`${form.name} added as ${form.role}.`);
    } catch (error) {
      toast.error(error.message || "Couldn't add this user.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    try {
      await deleteUser(user.id);
      await load();
      toast.success(`${user.name} removed.`);
    } catch (error) {
      toast.error(error.message || "Couldn't remove this user.");
    }
  };

  return (
    <SettingsGroup
      title="Admin & Staff Accounts"
      description="Users who can sign in to this app. Changes here are saved immediately."
    >
      <form onSubmit={handleCreate} className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          required
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="Full name"
          className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-[#9CCEB1]"
        />

        <input
          required
          value={form.username}
          onChange={(event) => update("username", event.target.value)}
          placeholder="Username"
          className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-[#9CCEB1]"
        />

        <input
          required
          type="password"
          value={form.password}
          onChange={(event) => update("password", event.target.value)}
          placeholder="Password"
          className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-[#9CCEB1]"
        />

        <div className="flex gap-2">
          <select
            value={form.role}
            onChange={(event) => update("role", event.target.value)}
            className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-[#9CCEB1]"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#0B5D3B] px-3 text-[10px] font-bold text-white disabled:opacity-50"
          >
            <Plus size={13} /> Add
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-[10px] text-slate-400">Loading...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-400">
              <tr>
                {["Name", "Username", "Role", ""].map((header) => (
                  <th key={header} className="px-3 py-2">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-3 py-2.5 text-xs font-semibold text-[#17221D]">{user.name}</td>

                  <td className="px-3 py-2.5 text-xs text-slate-500">{user.username}</td>

                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${
                        user.role === "admin" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>

                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(user)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove ${user.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SettingsGroup>
  );
};

/* =========================================================
   GENERAL
========================================================= */

const GeneralSection = ({
  values,
  update,
}) => {
  return (
    <SettingsGroup
      title="Company Information"
      description="Basic business and application information."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SettingInput
          label="Company Name"
          value={
            values.companyName
          }
          onChange={(value) =>
            update(
              "companyName",
              value
            )
          }
        />

        <SettingInput
          label="Business Type"
          value={
            values.businessType
          }
          onChange={(value) =>
            update(
              "businessType",
              value
            )
          }
        />

        <SettingInput
          label="Phone Number"
          value={
            values.phone
          }
          onChange={(value) =>
            update(
              "phone",
              value
            )
          }
        />

        <SettingInput
          label="Email"
          value={
            values.email
          }
          onChange={(value) =>
            update(
              "email",
              value
            )
          }
        />

        <SettingInput
          label="Address"
          value={
            values.address
          }
          onChange={(value) =>
            update(
              "address",
              value
            )
          }
          wide
        />

        <SettingSelect
          label="Currency"
          value={
            values.currency
          }
          onChange={(value) =>
            update(
              "currency",
              value
            )
          }
          options={[
            "₹ Indian Rupee",
            "$ US Dollar",
          ]}
        />

        <SettingSelect
          label="Timezone"
          value={
            values.timezone
          }
          onChange={(value) =>
            update(
              "timezone",
              value
            )
          }
          options={[
            "Asia/Kolkata",
            "Asia/Dubai",
            "Asia/Singapore",
          ]}
        />

        <SettingSelect
          label="Date Format"
          value={
            values.dateFormat
          }
          onChange={(value) =>
            update(
              "dateFormat",
              value
            )
          }
          options={[
            "DD/MM/YYYY",
            "MM/DD/YYYY",
            "YYYY-MM-DD",
          ]}
        />
      </div>
    </SettingsGroup>
  );
};

/* =========================================================
   LOAN
========================================================= */

const LoanSection = ({
  values,
  update,
}) => {
  return (
    <SettingsGroup
      title="Loan Configuration"
      description="Default values displayed for new loan setup."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SettingSelect
          label="Default Interest Type"
          value={
            values.interestType
          }
          onChange={(value) =>
            update(
              "interestType",
              value
            )
          }
          options={[
            "Reducing Balance",
            "Flat Rate",
          ]}
        />

        <SettingInput
          label="Default Interest Rate"
          value={
            values.interestRate
          }
          suffix="%"
          onChange={(value) =>
            update(
              "interestRate",
              value
            )
          }
        />

        <SettingInput
          label="Minimum Loan Amount"
          value={
            values.minLoanAmount
          }
          prefix="₹"
          onChange={(value) =>
            update(
              "minLoanAmount",
              value
            )
          }
        />

        <SettingInput
          label="Maximum Loan Amount"
          value={
            values.maxLoanAmount
          }
          prefix="₹"
          onChange={(value) =>
            update(
              "maxLoanAmount",
              value
            )
          }
        />

        <SettingInput
          label="Default Tenure"
          value={
            values.defaultTenure
          }
          suffix="Months"
          onChange={(value) =>
            update(
              "defaultTenure",
              value
            )
          }
        />

        <SettingSelect
          label="Payment Frequency"
          value={
            values.paymentFrequency
          }
          onChange={(value) =>
            update(
              "paymentFrequency",
              value
            )
          }
          options={[
            "Monthly",
            "Daily",
            "Weekly",
            "Fortnightly",
          ]}
        />

        <SettingInput
          label="Grace Period"
          value={
            values.gracePeriod
          }
          suffix="Days"
          onChange={(value) =>
            update(
              "gracePeriod",
              value
            )
          }
        />

        <SettingInput
          label="Late Payment Charge"
          value={
            values.latePaymentCharge
          }
          prefix="₹"
          onChange={(value) =>
            update(
              "latePaymentCharge",
              value
            )
          }
        />

        <SettingToggle
          label="Allow Partial Payment"
          description="Allow customers to pay less than the current payable amount."
          value={
            values.allowPartialPayment
          }
          onChange={(value) =>
            update(
              "allowPartialPayment",
              value
            )
          }
        />

        <SettingToggle
          label="Allow Advance Payment"
          description="Allow excess amounts to move into future installments."
          value={
            values.allowAdvancePayment
          }
          onChange={(value) =>
            update(
              "allowAdvancePayment",
              value
            )
          }
        />

        <SettingToggle
          label="Admin Approval Required"
          description="Require approval before a submitted payment is posted."
          value={
            values.adminApprovalRequired
          }
          onChange={(value) =>
            update(
              "adminApprovalRequired",
              value
            )
          }
        />
      </div>
    </SettingsGroup>
  );
};

/* =========================================================
   VEHICLE
========================================================= */

const VehicleSection = ({
  values,
  update,
}) => {
  return (
    <SettingsGroup
      title="Vehicle & Collateral"
      description="Default vehicle and collateral preferences."
    >
      <div className="space-y-3">
        <TagSetting
          label="Vehicle Types"
          values={
            values.vehicleTypes
          }
        />

        <TagSetting
          label="Fuel Types"
          values={
            values.fuelTypes
          }
        />

        <TagSetting
          label="Transmission"
          values={
            values.transmission
          }
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <SettingInput
            label="Maximum Vehicle Age"
            value={
              values.maximumAge
            }
            suffix="Years"
            onChange={(value) =>
              update(
                "maximumAge",
                value
              )
            }
          />

          <SettingInput
            label="Vehicle ID Prefix"
            value={
              values.vehiclePrefix
            }
            onChange={(value) =>
              update(
                "vehiclePrefix",
                value
              )
            }
          />

          <SettingToggle
            label="RC Book Required"
            value={
              values.rcRequired
            }
            onChange={(value) =>
              update(
                "rcRequired",
                value
              )
            }
          />

          <SettingToggle
            label="Insurance Required"
            value={
              values.insuranceRequired
            }
            onChange={(value) =>
              update(
                "insuranceRequired",
                value
              )
            }
          />

          <SettingToggle
            label="Vehicle Inspection Required"
            value={
              values.inspectionRequired
            }
            onChange={(value) =>
              update(
                "inspectionRequired",
                value
              )
            }
          />

          <SettingToggle
            label="Allow Seized Vehicle as Collateral"
            value={
              values.seizedCollateral
            }
            onChange={(value) =>
              update(
                "seizedCollateral",
                value
              )
            }
          />

          <SettingToggle
            label="Allow Sold Vehicle as Collateral"
            value={
              values.soldCollateral
            }
            onChange={(value) =>
              update(
                "soldCollateral",
                value
              )
            }
          />
        </div>
      </div>
    </SettingsGroup>
  );
};

/* =========================================================
   RELOAN
========================================================= */

const ReloanSection = ({
  values,
  update,
}) => {
  return (
    <SettingsGroup
      title="Re-loan Eligibility"
      description="Demo values for repeat-borrower eligibility and collateral rules."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SettingInput
          label="Minimum Paid Installments"
          value={
            values.minimumPaidInstallments
          }
          onChange={(value) =>
            update(
              "minimumPaidInstallments",
              value
            )
          }
        />

        <SettingInput
          label="Maximum Overdue Amount"
          value={
            values.maximumOverdueAmount
          }
          prefix="₹"
          onChange={(value) =>
            update(
              "maximumOverdueAmount",
              value
            )
          }
        />

        <SettingInput
          label="Maximum Overdue Days"
          value={
            values.maximumOverdueDays
          }
          suffix="Days"
          onChange={(value) =>
            update(
              "maximumOverdueDays",
              value
            )
          }
        />

        <SettingToggle
          label="Allow Active Loan"
          value={
            values.allowActiveLoan
          }
          onChange={(value) =>
            update(
              "allowActiveLoan",
              value
            )
          }
        />

        <SettingToggle
          label="Allow Closed Loan"
          value={
            values.allowClosedLoan
          }
          onChange={(value) =>
            update(
              "allowClosedLoan",
              value
            )
          }
        />

        <SettingToggle
          label="Allow Foreclosed Loan"
          value={
            values.allowForeclosedLoan
          }
          onChange={(value) =>
            update(
              "allowForeclosedLoan",
              value
            )
          }
        />

        <SettingToggle
          label="Allow Seized Vehicle"
          value={
            values.allowSeizedVehicle
          }
          onChange={(value) =>
            update(
              "allowSeizedVehicle",
              value
            )
          }
        />

        <SettingToggle
          label="Allow Sold Vehicle"
          value={
            values.allowSoldVehicle
          }
          onChange={(value) =>
            update(
              "allowSoldVehicle",
              value
            )
          }
        />

        <SettingToggle
          label="Customer Verification Required"
          value={
            values.customerVerification
          }
          onChange={(value) =>
            update(
              "customerVerification",
              value
            )
          }
        />

        <SettingToggle
          label="Required Documents"
          value={
            values.requiredDocuments
          }
          onChange={(value) =>
            update(
              "requiredDocuments",
              value
            )
          }
        />

        <SettingToggle
          label="Allow Same Vehicle"
          value={
            values.allowSameVehicle
          }
          onChange={(value) =>
            update(
              "allowSameVehicle",
              value
            )
          }
        />

        <SettingToggle
          label="Allow Different Vehicle"
          value={
            values.allowDifferentVehicle
          }
          onChange={(value) =>
            update(
              "allowDifferentVehicle",
              value
            )
          }
        />
      </div>

      <DemoNotice>
        These values are for the Settings UI only and are not connected to the existing re-loan eligibility engine.
      </DemoNotice>
    </SettingsGroup>
  );
};

/* =========================================================
   REPAYMENT
========================================================= */

const RepaymentSection = ({
  values,
  update,
}) => {
  return (
    <SettingsGroup
      title="Repayment & Collection"
      description="Payment collection and repayment preferences."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SettingToggle
          label="Allow Partial Payment"
          value={
            values.allowPartialPayment
          }
          onChange={(value) =>
            update(
              "allowPartialPayment",
              value
            )
          }
        />

        <SettingToggle
          label="Allow Advance Payment"
          value={
            values.allowAdvancePayment
          }
          onChange={(value) =>
            update(
              "allowAdvancePayment",
              value
            )
          }
        />

        <SettingToggle
          label="Allow Excess Payment"
          value={
            values.allowExcessPayment
          }
          onChange={(value) =>
            update(
              "allowExcessPayment",
              value
            )
          }
        />

        <SettingToggle
          label="Admin Approval Required"
          value={
            values.adminApprovalRequired
          }
          onChange={(value) =>
            update(
              "adminApprovalRequired",
              value
            )
          }
        />

        <SettingToggle
          label="Auto Repayment Posting"
          value={
            values.autoPosting
          }
          onChange={(value) =>
            update(
              "autoPosting",
              value
            )
          }
        />

        <SettingSelect
          label="Payment Allocation Priority"
          value={
            values.allocationPriority
          }
          onChange={(value) =>
            update(
              "allocationPriority",
              value
            )
          }
          options={[
            "Overdue → Current Due → Future Due",
            "Current Due → Overdue → Future Due",
          ]}
        />

        <SettingInput
          label="Grace Period"
          value={
            values.gracePeriod
          }
          suffix="Days"
          onChange={(value) =>
            update(
              "gracePeriod",
              value
            )
          }
        />

        <SettingSelect
          label="Late Payment Handling"
          value={
            values.lateHandling
          }
          onChange={(value) =>
            update(
              "lateHandling",
              value
            )
          }
          options={[
            "Apply Penalty",
            "Warning Only",
            "Block Payment",
          ]}
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[9px] font-extrabold text-[#17221D]">
          Payment Methods
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Cash", "cash"],
            ["Bank Transfer", "bank"],
            ["UPI", "upi"],
            ["Card", "card"],
            ["Cheque", "cheque"],
          ].map(
            ([label, key]) => (
              <SettingToggle
                key={key}
                label={label}
                value={
                  values[key]
                }
                onChange={(value) =>
                  update(
                    key,
                    value
                  )
                }
              />
            )
          )}
        </div>
      </div>
    </SettingsGroup>
  );
};

/* =========================================================
   CUSTOMER
========================================================= */

const CustomerSection = ({
  values,
  update,
}) => {
  return (
    <SettingsGroup
      title="Customer Settings"
      description="Customer identification, validation and required information."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SettingInput
          label="Customer ID Prefix"
          value={
            values.customerPrefix
          }
          onChange={(value) =>
            update(
              "customerPrefix",
              value
            )
          }
        />

        <SettingInput
          label="Loan ID Prefix"
          value={
            values.loanPrefix
          }
          onChange={(value) =>
            update(
              "loanPrefix",
              value
            )
          }
        />

        <SettingInput
          label="Vehicle ID Prefix"
          value={
            values.vehiclePrefix
          }
          onChange={(value) =>
            update(
              "vehiclePrefix",
              value
            )
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <SettingToggle
          label="Require Customer Mobile Number"
          value={
            values.requireMobile
          }
          onChange={(value) =>
            update(
              "requireMobile",
              value
            )
          }
        />

        <SettingToggle
          label="Require Customer Address"
          value={
            values.requireAddress
          }
          onChange={(value) =>
            update(
              "requireAddress",
              value
            )
          }
        />

        <SettingToggle
          label="Prevent Duplicate Mobile Number"
          value={
            values.preventDuplicateMobile
          }
          onChange={(value) =>
            update(
              "preventDuplicateMobile",
              value
            )
          }
        />

        <SettingToggle
          label="Customer Verification Required"
          value={
            values.verificationRequired
          }
          onChange={(value) =>
            update(
              "verificationRequired",
              value
            )
          }
        />

        <SettingToggle
          label="Allow Customer Photo"
          value={
            values.allowCustomerPhoto
          }
          onChange={(value) =>
            update(
              "allowCustomerPhoto",
              value
            )
          }
        />

        <SettingToggle
          label="Show Customer Loan History"
          value={
            values.showLoanHistory
          }
          onChange={(value) =>
            update(
              "showLoanHistory",
              value
            )
          }
        />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[9px] font-extrabold text-[#17221D]">
          Required Customer Information
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SettingToggle
            label="Name"
            value={
              values.requiredName
            }
            onChange={(value) =>
              update(
                "requiredName",
                value
              )
            }
          />

          <SettingToggle
            label="Mobile Number"
            value={
              values.requiredMobile
            }
            onChange={(value) =>
              update(
                "requiredMobile",
                value
              )
            }
          />

          <SettingToggle
            label="Address"
            value={
              values.requiredAddress
            }
            onChange={(value) =>
              update(
                "requiredAddress",
                value
              )
            }
          />

          <SettingToggle
            label="Date of Birth"
            value={
              values.requiredDob
            }
            onChange={(value) =>
              update(
                "requiredDob",
                value
              )
            }
          />

          <SettingToggle
            label="Occupation"
            value={
              values.requiredOccupation
            }
            onChange={(value) =>
              update(
                "requiredOccupation",
                value
              )
            }
          />
        </div>
      </div>
    </SettingsGroup>
  );
};

/* =========================================================
   DOCUMENTS
========================================================= */

const DocumentsSection = ({
  values,
  update,
}) => {
  return (
    <SettingsGroup
      title="Documents & KYC"
      description="Required customer, vehicle and guarantor documents."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SettingToggle
          label="Aadhaar"
          value={
            values.aadhaar
          }
          onChange={(value) =>
            update(
              "aadhaar",
              value
            )
          }
        />

        <SettingToggle
          label="PAN"
          value={
            values.pan
          }
          onChange={(value) =>
            update(
              "pan",
              value
            )
          }
        />

        <SettingToggle
          label="Address Proof"
          value={
            values.addressProof
          }
          onChange={(value) =>
            update(
              "addressProof",
              value
            )
          }
        />

        <SettingToggle
          label="Customer Photo"
          value={
            values.photo
          }
          onChange={(value) =>
            update(
              "photo",
              value
            )
          }
        />

        <SettingToggle
          label="RC Book"
          value={
            values.rcBook
          }
          onChange={(value) =>
            update(
              "rcBook",
              value
            )
          }
        />

        <SettingToggle
          label="Insurance"
          value={
            values.insurance
          }
          onChange={(value) =>
            update(
              "insurance",
              value
            )
          }
        />

        <SettingToggle
          label="Vehicle Photo"
          value={
            values.vehiclePhoto
          }
          onChange={(value) =>
            update(
              "vehiclePhoto",
              value
            )
          }
        />

        <SettingToggle
          label="Guarantor Documents Required"
          value={
            values.guarantorDocuments
          }
          onChange={(value) =>
            update(
              "guarantorDocuments",
              value
            )
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <SettingInput
          label="Maximum File Size"
          value={
            values.maxFileSize
          }
          suffix="MB"
          onChange={(value) =>
            update(
              "maxFileSize",
              value
            )
          }
        />

        <SettingInput
          label="Reminder Before Expiry"
          value={
            values.reminderDays
          }
          suffix="Days"
          onChange={(value) =>
            update(
              "reminderDays",
              value
            )
          }
        />

        <SettingToggle
          label="Document Expiry Reminder"
          value={
            values.expiryReminder
          }
          onChange={(value) =>
            update(
              "expiryReminder",
              value
            )
          }
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[9px] font-extrabold text-[#17221D]">
          Allowed File Types
        </p>

        <div className="flex flex-wrap gap-2">
          {[
            "PDF",
            "JPG",
            "JPEG",
            "PNG",
          ].map(
            (type) => (
              <span
                key={type}
                className="
                  rounded-lg
                  border
                  border-slate-200
                  bg-slate-50
                  px-3
                  py-2
                  text-[8px]
                  font-bold
                  text-slate-600
                "
              >
                {type}
              </span>
            )
          )}
        </div>
      </div>
    </SettingsGroup>
  );
};

/* =========================================================
   SECURITY
========================================================= */

const SecuritySection = ({
  values,
  update,
}) => {
  return (
    <SettingsGroup
      title="Security Settings"
      description="Account protection and login security preferences."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SettingInput
          label="Session Timeout"
          value={
            values.sessionTimeout
          }
          suffix="Minutes"
          onChange={(value) =>
            update(
              "sessionTimeout",
              value
            )
          }
        />

        <SettingInput
          label="Maximum Login Attempts"
          value={
            values.maxLoginAttempts
          }
          onChange={(value) =>
            update(
              "maxLoginAttempts",
              value
            )
          }
        />

        <SettingToggle
          label="Auto Logout"
          value={
            values.autoLogout
          }
          onChange={(value) =>
            update(
              "autoLogout",
              value
            )
          }
        />

        <SettingInput
          label="Password Expiry"
          value={
            values.passwordExpiry
          }
          suffix="Days"
          onChange={(value) =>
            update(
              "passwordExpiry",
              value
            )
          }
        />

        <SettingToggle
          label="Two-Factor Authentication"
          value={
            values.twoFactor
          }
          onChange={(value) =>
            update(
              "twoFactor",
              value
            )
          }
        />

        <SettingToggle
          label="Login Activity Tracking"
          value={
            values.loginTracking
          }
          onChange={(value) =>
            update(
              "loginTracking",
              value
            )
          }
        />

        <SettingToggle
          label="Audit Login Events"
          value={
            values.auditLoginEvents
          }
          onChange={(value) =>
            update(
              "auditLoginEvents",
              value
            )
          }
        />

        <SettingInput
          label="Minimum Password Length"
          value={
            values.minimumPasswordLength
          }
          onChange={(value) =>
            update(
              "minimumPasswordLength",
              value
            )
          }
        />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[9px] font-extrabold text-[#17221D]">
          Password Policy
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <SettingToggle
            label="Require Uppercase"
            value={
              values.uppercase
            }
            onChange={(value) =>
              update(
                "uppercase",
                value
              )
            }
          />

          <SettingToggle
            label="Require Number"
            value={
              values.number
            }
            onChange={(value) =>
              update(
                "number",
                value
              )
            }
          />

          <SettingToggle
            label="Require Special Character"
            value={
              values.specialCharacter
            }
            onChange={(value) =>
              update(
                "specialCharacter",
                value
              )
            }
          />
        </div>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={() => {
            setDemoToast(
              "Change Password is currently a demo action."
            );
          }}
          className="
            inline-flex
            h-9
            items-center
            gap-1.5
            rounded-lg
            border
            border-slate-200
            bg-white
            px-3.5
            text-[8px]
            font-bold
            text-slate-600
            transition
            hover:bg-slate-50
          "
        >
          <LockKeyhole
            size={11}
          />
          Change Password
        </button>
      </div>
    </SettingsGroup>
  );
};

/* =========================================================
   GENERIC GROUP
========================================================= */

const SettingsGroup = ({
  title,
  description,
  children,
}) => {
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-[11px] font-extrabold text-[#17221D] sm:text-[12px]">
          {title}
        </h3>

        <p className="mt-1 text-[8px] leading-4 text-slate-400">
          {description}
        </p>
      </div>

      {children}
    </div>
  );
};

/* =========================================================
   INPUT
========================================================= */

const SettingInput = ({
  label,
  value,
  onChange,
  prefix,
  suffix,
  wide = false,
}) => {
  return (
    <label
      className={
        wide
          ? "block md:col-span-2"
          : "block"
      }
    >
      <span className="mb-1.5 block text-[7px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>

      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
            {prefix}
          </span>
        )}

        <input
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className={`
            h-10
            w-full
            rounded-xl
            border
            border-slate-200
            bg-white
            px-3
            text-[10px]
            font-semibold
            text-[#253252]
            outline-none
            transition
            focus:border-[#9CCEB1]
            focus:ring-1
            focus:ring-[#DCEFE4]
            ${
              prefix
                ? "pl-7"
                : ""
            }
            ${
              suffix
                ? "pr-16"
                : ""
            }
          `}
        />

        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
};

/* =========================================================
   SELECT
========================================================= */

const SettingSelect = ({
  label,
  value,
  onChange,
  options,
}) => {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[7px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="
          h-10
          w-full
          rounded-xl
          border
          border-slate-200
          bg-white
          px-3
          text-[10px]
          font-semibold
          text-[#253252]
          outline-none
          transition
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
    </label>
  );
};

/* =========================================================
   TOGGLE
========================================================= */

const SettingToggle = ({
  label,
  description,
  value,
  onChange,
}) => {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-4
        rounded-xl
        border
        border-slate-200
        bg-white
        px-3.5
        py-3
      "
    >
      <div className="min-w-0">
        <p className="text-[9px] font-extrabold text-[#253252]">
          {label}
        </p>

        {description && (
          <p className="mt-1 text-[7px] leading-4 text-slate-400">
            {description}
          </p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() =>
          onChange(!value)
        }
        className={`
          relative
          h-6
          w-11
          shrink-0
          rounded-full
          transition
          duration-200
          ${
            value
              ? "bg-[#0B6B43]"
              : "bg-slate-300"
          }
        `}
      >
        <span
          className={`
            absolute
            top-1
            h-4
            w-4
            rounded-full
            bg-white
            shadow-sm
            transition
            duration-200
            ${
              value
                ? "left-6"
                : "left-1"
            }
          `}
        />
      </button>
    </div>
  );
};

/* =========================================================
   TAG SETTING
========================================================= */

const TagSetting = ({
  label,
  values,
}) => {
  return (
    <div
      className="
        rounded-xl
        border
        border-slate-200
        bg-slate-50/60
        px-3.5
        py-3
      "
    >
      <p className="mb-2 text-[7px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <div className="flex flex-wrap gap-2">
        {values.map(
          (value) => (
            <span
              key={value}
              className="
                rounded-lg
                border
                border-slate-200
                bg-white
                px-2.5
                py-1.5
                text-[8px]
                font-bold
                text-slate-600
              "
            >
              {value}
            </span>
          )
        )}
      </div>
    </div>
  );
};

/* =========================================================
   DEMO NOTICE
========================================================= */

const DemoNotice = ({
  children,
}) => {
  return (
    <div
      className="
        mt-4
        flex
        items-start
        gap-2
        rounded-xl
        border
        border-blue-100
        bg-blue-50
        px-3.5
        py-3
      "
    >
      <Info
        size={13}
        className="mt-0.5 shrink-0 text-blue-600"
      />

      <p className="text-[8px] leading-4 text-blue-700/80">
        {children}
      </p>
    </div>
  );
};

/* =========================================================
   SECURITY DEMO TOAST HELPER
========================================================= */

const setDemoToast = (
  message
) => {
  /*
   * UI-only helper.
   * Use a temporary browser notification.
   */
  window.alert(message);
};

/* =========================================================
   CLONE
========================================================= */

const cloneDefaults = () => {
  return JSON.parse(
    JSON.stringify(
      DEFAULT_SETTINGS
    )
  );
};

export default Settings;