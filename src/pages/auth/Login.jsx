// src/pages/auth/Login.jsx

import {
  LockKeyhole,
  UserRound,
  LogIn,
  ShieldCheck,
  WalletCards,
  CarFront,
  BarChart3,
  ArrowRight,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  login,
} from "../../services/authStorage";

const Login = () => {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const [
    username,
    setUsername,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  /* =========================================================
     EXISTING LOGIN LOGIC
  ========================================================= */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    const result =
      await login(
        username,
        password
      );

    if (!result.success) {
      setError(
        result.message
      );
      setLoading(false);
      return;
    }

    const requestedPath =
      location.state?.from;

    if (
      result.user.role ===
      "staff"
    ) {
      navigate(
        "/staff/collection",
        {
          replace: true,
        }
      );

      return;
    }

    navigate(
      requestedPath ||
        "/dashboard",
      {
        replace: true,
      }
    );
  };

  return (
    <div
      className="
        relative
        h-screen
        max-h-screen
        w-full
        overflow-hidden
        bg-[#F3F7F5]
      "
    >
      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          overflow-hidden
        "
      >
        <div
          className="
            absolute
            -left-32
            -top-32
            h-[420px]
            w-[420px]
            rounded-full
            bg-[#DDEFE5]
            opacity-70
            blur-[100px]
          "
        />

        <div
          className="
            absolute
            -bottom-32
            -right-32
            h-[420px]
            w-[420px]
            rounded-full
            bg-[#E3F0E8]
            opacity-70
            blur-[100px]
          "
        />

        <div
          className="
            absolute
            left-1/2
            top-1/2
            h-[700px]
            w-[700px]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            border
            border-[#DDEBE2]
            opacity-40
          "
        />
      </div>

      {/* =====================================================
          MAIN WRAPPER
      ====================================================== */}

      <div
        className="
          relative
          z-10
          h-full
          w-full
          p-2
          sm:p-3
          lg:p-5
        "
      >
        <div
          className="
            grid
            h-full
            w-full
            overflow-hidden
            rounded-[20px]
            border
            border-white
            bg-white
            shadow-[0_20px_70px_rgba(13,47,36,0.10)]
            lg:grid-cols-[45%_55%]
            lg:rounded-[24px]
          "
        >
          {/* =================================================
              LEFT BRAND PANEL
          ================================================== */}

          <section
            className="
              relative
              hidden
              overflow-hidden
              bg-[#0D2F24]
              lg:block
            "
          >
            {/* BACKGROUND GLOW */}

            <div
              className="
                pointer-events-none
                absolute
                -right-28
                -top-28
                h-[350px]
                w-[350px]
                rounded-full
                bg-[#2A7A57]
                opacity-20
                blur-[90px]
              "
            />

            <div
              className="
                pointer-events-none
                absolute
                -bottom-28
                -left-28
                h-[300px]
                w-[300px]
                rounded-full
                bg-[#67CB98]
                opacity-10
                blur-[80px]
              "
            />

            <div
              className="
                relative
                flex
                h-full
                flex-col
                justify-between
                p-7
                xl:p-9
                2xl:p-11
              "
            >
              {/* =================================================
                  BRAND
              ================================================== */}

              <div
                className="
                  flex
                  items-center
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-xl
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

                <div
                  className="
                    min-w-0
                  "
                >
                  <p
                    className="
                      text-[22px]
                      font-extrabold
                      tracking-[-0.04em]
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
                      mt-0.5
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-[0.08em]
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
              </div>

              {/* =================================================
                  HERO
              ================================================== */}

              <div
                className="
                  my-auto
                  max-w-[510px]
                  py-8
                  xl:py-10
                "
              >
                <div
                  className="
                    mb-4
                    inline-flex
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-[#285A46]
                    bg-[#12392D]
                    px-3
                    py-1.5
                  "
                >
                  <span
                    className="
                      h-1.5
                      w-1.5
                      rounded-full
                      bg-[#72D3A2]
                    "
                  />

                  <span
                    className="
                      text-[8px]
                      font-bold
                      uppercase
                      tracking-[0.08em]
                      text-[#B7CCBF]
                    "
                  >
                    Secure Finance Workspace
                  </span>
                </div>

                <h2
                  className="
                    text-[36px]
                    font-extrabold
                    leading-[1.08]
                    tracking-[-0.045em]
                    text-white
                    xl:text-[44px]
                  "
                >
                  Vehicle Finance
                  <br />
                  <span className="text-[#72D3A2]">
                    Management, Simplified.
                  </span>
                </h2>

                <p
                  className="
                    mt-4
                    max-w-[480px]
                    text-[13px]
                    font-medium
                    leading-6
                    text-[#ABC2B5]
                    xl:text-[14px]
                  "
                >
                  Manage customers, loans,
                  collections, vehicles and
                  repayments from one powerful
                  finance management platform.
                </p>

                {/* FEATURES */}

                <div
                  className="
                    mt-6
                    grid
                    grid-cols-2
                    gap-2.5
                  "
                >
                  <FeatureItem
                    icon={WalletCards}
                    title="Customer & Loan Management"
                  />

                  <FeatureItem
                    icon={BarChart3}
                    title="Smart Repayment Tracking"
                  />

                  <FeatureItem
                    icon={CarFront}
                    title="Vehicle Recovery & Management"
                  />

                  <FeatureItem
                    icon={ShieldCheck}
                    title="Collection & Financial Insights"
                  />
                </div>
              </div>

              {/* =================================================
                  FOOTER
              ================================================== */}

              <div
                className="
                  border-t
                  border-[#204839]
                  pt-4
                "
              >
                <p
                  className="
                    text-[8px]
                    font-bold
                    uppercase
                    tracking-[0.09em]
                    text-[#789688]
                  "
                >
                  POWERING SMARTER FINANCE
                </p>

                <p
                  className="
                    mt-1
                    text-[9px]
                    font-medium
                    text-[#9CB3A6]
                  "
                >
                  Professional vehicle finance management
                </p>
              </div>
            </div>
          </section>

          {/* =================================================
              RIGHT LOGIN AREA
          ================================================== */}

          <section
            className="
              flex
              h-full
              min-w-0
              items-center
              justify-center
              overflow-hidden
              bg-[#FCFDFC]
              px-3
              py-3
              sm:px-5
              sm:py-5
              md:px-8
              lg:px-10
              xl:px-14
              2xl:px-20
            "
          >
            <div
              className="
                w-full
                max-w-[455px]
              "
            >
              {/* =================================================
                  MOBILE BRAND
              ================================================== */}

              <div
                className="
                  mb-3
                  flex
                  items-center
                  gap-2.5
                  lg:hidden
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
                    overflow-hidden
                    rounded-xl
                    bg-[#EAF5EF]
                    ring-1
                    ring-[#D5E9DC]
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

                <div className="min-w-0">
                  <p
                    className="
                      text-[18px]
                      font-extrabold
                      tracking-[-0.04em]
                      text-[#17221D]
                    "
                  >
                    Moto
                    <span className="text-[#0B6B43]">
                      Lend
                    </span>
                  </p>

                  <p
                    className="
                      mt-0.5
                      text-[7px]
                      font-bold
                      uppercase
                      tracking-[0.08em]
                      text-slate-400
                    "
                  >
                    POWERING{" "}
                    <span className="text-[#0B6B43]">
                      SMARTER
                    </span>{" "}
                    FINANCE
                  </p>
                </div>
              </div>

              {/* =================================================
                  LOGIN CARD
              ================================================== */}

              <div
                className="
                  rounded-[18px]
                  border
                  border-slate-200
                  bg-white
                  p-4
                  shadow-[0_12px_40px_rgba(15,23,42,0.05)]
                  sm:p-5
                  md:p-6
                  lg:rounded-[22px]
                  lg:p-7
                "
              >
                {/* TOP BADGE */}

                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <span
                    className="
                      h-1.5
                      w-1.5
                      rounded-full
                      bg-[#0B6B43]
                    "
                  />

                  <span
                    className="
                      text-[8px]
                      font-extrabold
                      uppercase
                      tracking-[0.1em]
                      text-[#0B6B43]
                    "
                  >
                    Secure Sign In
                  </span>
                </div>

                {/* HEADING */}

                <div className="mt-3">
                  <h1
                    className="
                      text-[25px]
                      font-extrabold
                      tracking-[-0.04em]
                      text-[#17221D]
                      sm:text-[28px]
                      lg:text-[30px]
                    "
                  >
                    Welcome back
                  </h1>

                  <p
                    className="
                      mt-1.5
                      text-[11px]
                      font-medium
                      leading-5
                      text-slate-500
                      sm:text-[12px]
                    "
                  >
                    Sign in to continue to your finance
                    management dashboard.
                  </p>
                </div>

                {/* =================================================
                    FORM
                ================================================== */}

                <form
                  onSubmit={
                    handleSubmit
                  }
                  className="
                    mt-5
                    space-y-4
                    sm:mt-6
                  "
                >
                  {/* USERNAME */}

                  <div>
                    <label
                      htmlFor="username"
                      className="
                        mb-1.5
                        block
                        text-[10px]
                        font-extrabold
                        text-[#26352E]
                        sm:text-[11px]
                      "
                    >
                      Username
                    </label>

                    <div className="relative">
                      <UserRound
                        size={16}
                        className="
                          pointer-events-none
                          absolute
                          left-3.5
                          top-1/2
                          -translate-y-1/2
                          text-slate-400
                        "
                      />

                      <input
                        id="username"
                        value={
                          username
                        }
                        onChange={(
                          event
                        ) =>
                          setUsername(
                            event.target.value
                          )
                        }
                        placeholder="Enter username"
                        autoComplete="username"
                        required
                        className="
                          h-12
                          w-full
                          rounded-xl
                          border
                          border-slate-200
                          bg-[#FCFDFC]
                          pl-10
                          pr-3
                          text-[12px]
                          font-semibold
                          text-[#17221D]
                          outline-none
                          transition-all
                          duration-200
                          placeholder:text-slate-400
                          hover:border-slate-300
                          focus:border-[#78B493]
                          focus:bg-white
                          focus:ring-4
                          focus:ring-[#E3F2E9]
                          sm:text-[13px]
                        "
                      />
                    </div>
                  </div>

                  {/* PASSWORD */}

                  <div>
                    <label
                      htmlFor="password"
                      className="
                        mb-1.5
                        block
                        text-[10px]
                        font-extrabold
                        text-[#26352E]
                        sm:text-[11px]
                      "
                    >
                      Password
                    </label>

                    <div className="relative">
                      <LockKeyhole
                        size={16}
                        className="
                          pointer-events-none
                          absolute
                          left-3.5
                          top-1/2
                          -translate-y-1/2
                          text-slate-400
                        "
                      />

                      <input
                        id="password"
                        type="password"
                        value={
                          password
                        }
                        onChange={(
                          event
                        ) =>
                          setPassword(
                            event.target.value
                          )
                        }
                        placeholder="Enter password"
                        autoComplete="current-password"
                        required
                        className="
                          h-12
                          w-full
                          rounded-xl
                          border
                          border-slate-200
                          bg-[#FCFDFC]
                          pl-10
                          pr-3
                          text-[12px]
                          font-semibold
                          text-[#17221D]
                          outline-none
                          transition-all
                          duration-200
                          placeholder:text-slate-400
                          hover:border-slate-300
                          focus:border-[#78B493]
                          focus:bg-white
                          focus:ring-4
                          focus:ring-[#E3F2E9]
                          sm:text-[13px]
                        "
                      />
                    </div>
                  </div>

                  {/* ERROR */}

                  {error && (
                    <div
                      className="
                        flex
                        items-start
                        gap-2.5
                        rounded-xl
                        border
                        border-red-200
                        bg-red-50
                        px-3
                        py-2.5
                      "
                    >
                      <ShieldCheck
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
                          leading-4
                          text-red-600
                        "
                      >
                        {error}
                      </p>
                    </div>
                  )}

                  {/* LOGIN BUTTON */}

                  <button
                    type="submit"
                    disabled={
                      loading
                    }
                    className="
                      group
                      flex
                      h-12
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-[#0B6B43]
                      text-[12px]
                      font-extrabold
                      text-white
                      shadow-[0_9px_22px_rgba(11,107,67,0.17)]
                      transition-all
                      duration-200
                      hover:-translate-y-[1px]
                      hover:bg-[#095B3B]
                      hover:shadow-[0_12px_25px_rgba(11,107,67,0.20)]
                      active:translate-y-0
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                      sm:text-[13px]
                    "
                  >
                    <LogIn
                      size={16}
                    />

                    <span>
                      {loading
                        ? "Signing in..."
                        : "Sign In"}
                    </span>

                    {!loading && (
                      <ArrowRight
                        size={14}
                        className="
                          transition-transform
                          duration-200
                          group-hover:translate-x-0.5
                        "
                      />
                    )}
                  </button>
                </form>

                {/* =================================================
                    DEMO ACCESS
                ================================================== */}

                <div
                  className="
                    mt-5
                    border-t
                    border-slate-100
                    pt-4
                  "
                >
                  <div
                    className="
                      mb-2.5
                      flex
                      items-center
                      justify-between
                      gap-2
                    "
                  >
                    <div>
                      <p
                        className="
                          text-[10px]
                          font-extrabold
                          text-[#17221D]
                        "
                      >
                        Demo Access
                      </p>

                      <p
                        className="
                          mt-0.5
                          text-[8px]
                          font-medium
                          text-slate-400
                        "
                      >
                        Sample credentials
                      </p>
                    </div>

                    <div
                      className="
                        flex
                        h-7
                        w-7
                        items-center
                        justify-center
                        rounded-lg
                        bg-[#EAF5EF]
                        text-[#0B6B43]
                      "
                    >
                      <ShieldCheck
                        size={13}
                      />
                    </div>
                  </div>

                  <div
                    className="
                      grid
                      grid-cols-1
                      gap-2
                      sm:grid-cols-2
                    "
                  >
                    <DemoCredential
                      role="Admin"
                      username="admin"
                      password="admin123"
                    />

                    <DemoCredential
                      role="Staff"
                      username="staff"
                      password="staff123"
                    />
                  </div>
                </div>

                {/* SECURITY FOOTER */}

                <div
                  className="
                    mt-4
                    flex
                    items-center
                    justify-center
                    gap-1.5
                  "
                >
                  <LockKeyhole
                    size={10}
                    className="text-[#6A8B7B]"
                  />

                  <p
                    className="
                      text-[7px]
                      font-medium
                      text-slate-400
                    "
                  >
                    Secure access to your finance workspace
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   FEATURE ITEM
========================================================= */

const FeatureItem = ({
  icon: Icon,
  title,
}) => {
  return (
    <div
      className="
        group
        flex
        min-w-0
        items-center
        gap-2.5
        rounded-xl
        border
        border-[#214A3A]
        bg-[#11382C]
        px-3
        py-2.5
        transition-all
        duration-200
        hover:border-[#2B604B]
        hover:bg-[#174335]
      "
    >
      <div
        className="
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-lg
          bg-[#174D38]
          text-[#72D3A2]
        "
      >
        <Icon
          size={14}
          strokeWidth={2}
        />
      </div>

      <p
        className="
          min-w-0
          text-[9px]
          font-semibold
          leading-4
          text-[#C0D3C8]
        "
      >
        {title}
      </p>
    </div>
  );
};

/* =========================================================
   DEMO CREDENTIAL
========================================================= */

const DemoCredential = ({
  role,
  username,
  password,
}) => {
  return (
    <div
      className="
        rounded-xl
        border
        border-slate-100
        bg-[#FAFCFB]
        px-3
        py-2.5
        transition
        duration-200
        hover:border-[#CFE3D6]
        hover:bg-[#F7FBF8]
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-2
        "
      >
        <span
          className="
            inline-flex
            rounded-full
            bg-[#EAF5EF]
            px-2
            py-0.5
            text-[7px]
            font-extrabold
            text-[#0B6B43]
          "
        >
          {role}
        </span>

        <span
          className="
            text-[7px]
            font-semibold
            text-slate-400
          "
        >
          Demo
        </span>
      </div>

      <div
        className="
          mt-1.5
          space-y-0.5
        "
      >
        <p
          className="
            truncate
            text-[8px]
            font-semibold
            text-[#25352E]
          "
        >
          <span className="text-slate-400">
            User:
          </span>{" "}
          {username}
        </p>

        <p
          className="
            truncate
            text-[8px]
            font-semibold
            text-[#25352E]
          "
        >
          <span className="text-slate-400">
            Pass:
          </span>{" "}
          {password}
        </p>
      </div>
    </div>
  );
};

export default Login;