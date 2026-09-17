// src/App.jsx

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import SideBar from "./SideBar";

/* =========================================================
   ADMIN PAGES
========================================================= */

import CustomerPage from "./pages/customers/CustomerPage";
import CustomerOnboarding from "./pages/customers/CustomerOnboarding";
import LoanPage from "./pages/loan/Loan";
import CustomerDetails from "./pages/customers/CustomerDetails";
import Dashboard from "./pages/dashboard/Dashboard";
import RecentActivities from "./pages/activities/RecentActivities";
import Settings from "./pages/settings/Settings";
import ExpenseControl from "./pages/expense/ExpenseControl";
import Investor from "./pages/investor/Investor";
import Ledger from "./pages/ledger/Ledger";

import ReLoanEligibility from "./pages/reloan/ReLoanEligibility";
import ReLoan from "./pages/reloan/ReLoan";

/* =========================================================
   CONTROL CENTER
========================================================= */

import ControlCenter from "./pages/controlcenter/ControlCenter";

/* =========================================================
   REMINDERS
========================================================= */

import Reminder from "./pages/reminder/Reminder";

/* =========================================================
   AUTH
========================================================= */

import Login from "./pages/auth/Login";
import ProtectedRoute from "./components/auth/ProtectedRoute";

/* =========================================================
   STAFF
========================================================= */

import StaffCollection from "./pages/staff/StaffCollection";

/* =========================================================
   COLLECTION
========================================================= */

import CollectionManagement from "./pages/collection/CollectionManagement";

/* =========================================================
   REPAYMENT
========================================================= */

import Repayment from "./pages/repayment/Repayment";

/* =========================================================
   VEHICLES
========================================================= */

import Vehicle from "./pages/vehicle/Vehicle";
import SeizedVehicles from "./pages/vehicle/SeizedVehicles";
import ReleasedVehicles from "./pages/vehicle/ReleasedVehicles";
import SoldVehicles from "./pages/vehicle/SoldVehicles";

/* =========================================================
   AUTH STORAGE
========================================================= */

import {
  getSession,
} from "./services/authStorage";

/* =========================================================
   APP LAYOUT
========================================================= */

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const session = getSession();

  /* =====================================================
     LOGIN PAGE
  ====================================================== */

  if (location.pathname === "/login") {
    return (
      <Routes>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />
      </Routes>
    );
  }

  /* =====================================================
     STAFF AREA

     Staff receives ONLY the Staff Collection page.
     Admin sidebar is never rendered for staff.
  ====================================================== */

  if (
    session?.role === "staff" &&
    location.pathname.startsWith("/staff")
  ) {
    return (
      <Routes>
        <Route
          path="/staff/collection"
          element={
            <ProtectedRoute role="staff">
              <StaffCollection />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/staff/collection"
              replace
            />
          }
        />
      </Routes>
    );
  }

  /* =====================================================
     ACTIVE SIDEBAR ITEM
  ====================================================== */

  const getActiveItem = () => {
    const path = location.pathname;

    if (
      path ===
      "/customers/onboarding"
    ) {
      return "loans-new";
    }

    if (
      path.startsWith(
        "/customers"
      )
    ) {
      return "customers";
    }

    /*
     * New Loan page.
     * All Loans now uses src/pages/loan/Loan.jsx
     */
    if (
      path === "/loan"
    ) {
      return "loans-all";
    }

    /*
     * Old Loan Management path is no longer
     * a sidebar item.
     *
     * It is kept here only as a compatibility
     * fallback while the route redirects to /loan.
     */
    if (
      path.startsWith(
        "/loan-management"
      )
    ) {
      return "loans-all";
    }

    if (
      path.startsWith(
        "/reloan"
      )
    ) {
      return "reloan";
    }

    if (
      path.startsWith(
        "/collections"
      )
    ) {
      return "collections";
    }

    if (
      path.startsWith(
        "/investor"
      )
    ) {
      return "investor";
    }

    if (
      path.startsWith(
        "/ledger"
      )
    ) {
      return "ledger";
    }

    /*
     * Repayment route remains available
     * for existing application flows,
     * but is not shown in the sidebar.
     */
    if (
      path.startsWith(
        "/repayment"
      )
    ) {
      return null;
    }

    if (
      path.startsWith(
        "/reminders"
      )
    ) {
      return "reminders";
    }

    if (
      path.startsWith(
        "/control-center"
      )
    ) {
      return "control-center";
    }

    if (
      path.startsWith(
        "/expense-control"
      )
    ) {
      return "expense-control";
    }

    if (
      path === "/vehicles" ||
      path === "/vehicles/all"
    ) {
      return path ===
        "/vehicles/all"
        ? "vehicles-all"
        : "vehicles";
    }

    if (
      path.startsWith(
        "/vehicles/seized"
      )
    ) {
      return "vehicles-seized";
    }

    if (
      path.startsWith(
        "/vehicles/released"
      )
    ) {
      return "vehicles-released";
    }

    if (
      path.startsWith(
        "/vehicles/sold"
      )
    ) {
      return "vehicles-sold";
    }

    if (
      path.startsWith(
        "/settings"
      )
    ) {
      return "settings";
    }

    if (
      path.startsWith(
        "/activities"
      )
    ) {
      return "dashboard";
    }

    return "dashboard";
  };

  /* =====================================================
     NAVIGATION
  ====================================================== */

  const handleNavigate = (
    id
  ) => {
    switch (id) {
      case "dashboard":
        navigate(
          "/dashboard"
        );
        break;

      case "customers":
        navigate(
          "/customers"
        );
        break;

      case "loans":
      case "loans-all":
        /*
         * New consolidated Loans page.
         */
        navigate(
          "/loan"
        );
        break;

      case "loans-new":
        navigate(
          "/customers/onboarding"
        );
        break;

      case "reloan":
        navigate(
          "/reloan"
        );
        break;

      case "collections":
        navigate(
          "/collections"
        );
        break;

      case "investor":
        navigate(
          "/investor"
        );
        break;

      case "ledger":
        navigate(
          "/ledger"
        );
        break;

      /*
       * Repayment remains supported internally,
       * but is not exposed through the sidebar.
       */
      case "repayment":
        navigate(
          "/repayment"
        );
        break;

      case "reminders":
        navigate(
          "/reminders"
        );
        break;

      case "control-center":
        navigate(
          "/control-center"
        );
        break;

      case "expense-control":
        navigate(
          "/expense-control"
        );
        break;

      case "vehicles":
        navigate(
          "/vehicles"
        );
        break;

      case "vehicles-all":
        navigate(
          "/vehicles/all"
        );
        break;

      case "vehicles-seized":
        navigate(
          "/vehicles/seized"
        );
        break;

      case "vehicles-released":
        navigate(
          "/vehicles/released"
        );
        break;

      case "vehicles-sold":
        navigate(
          "/vehicles/sold"
        );
        break;

      case "settings":
        navigate(
          "/settings"
        );
        break;

      default:
        break;
    }
  };

  /* =====================================================
     ADMIN LAYOUT
  ====================================================== */

  return (
    <div
      className="
        flex
        h-screen
        min-h-0
        overflow-hidden
        bg-[#F8FAF9]
      "
    >
      {/* =================================================
          SIDEBAR
      ================================================== */}

      <SideBar
        activeItem={
          getActiveItem()
        }
        onNavigate={
          handleNavigate
        }
      />

      {/* =================================================
          MAIN APPLICATION AREA
      ================================================== */}

      <main
        className="
          min-w-0
          min-h-0
          flex-1
          overflow-auto
        "
      >
        <Routes>
          {/* =================================================
              ROOT
          ================================================== */}

          <Route
            path="/"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          {/* =================================================
              DASHBOARD
          ================================================== */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="admin">
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              CUSTOMERS
          ================================================== */}

          <Route
            path="/customers"
            element={
              <ProtectedRoute role="admin">
                <CustomerPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers/onboarding"
            element={
              <ProtectedRoute role="admin">
                <CustomerOnboarding />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers/:customerId"
            element={
              <ProtectedRoute role="admin">
                <CustomerDetails />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              LOANS
              
              New consolidated Loans page.
          ================================================== */}

          <Route
            path="/loan"
            element={
              <ProtectedRoute role="admin">
                <LoanPage />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              OLD LOAN MANAGEMENT COMPATIBILITY
              
              Old LoanManagement.jsx is no longer used.
              Existing links/bookmarks to /loan-management
              are redirected to the new Loans page.
          ================================================== */}

          <Route
            path="/loan-management"
            element={
              <Navigate
                to="/loan"
                replace
              />
            }
          />

          <Route
            path="/loan-management/*"
            element={
              <Navigate
                to="/loan"
                replace
              />
            }
          />

          {/* =================================================
              RE-LOAN
          ================================================== */}

          <Route
            path="/reloan"
            element={
              <ProtectedRoute role="admin">
                <ReLoan />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reloan/eligibility/:loanId"
            element={
              <ProtectedRoute role="admin">
                <ReLoanEligibility />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              COLLECTION MANAGEMENT
          ================================================== */}

          <Route
            path="/collections"
            element={
              <ProtectedRoute role="admin">
                <CollectionManagement />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              REPAYMENT

              Hidden from sidebar, but routes remain
              functional for existing application flow.
          ================================================== */}

          <Route
            path="/repayment"
            element={
              <ProtectedRoute role="admin">
                <Repayment />
              </ProtectedRoute>
            }
          />

          <Route
            path="/repayment/*"
            element={
              <ProtectedRoute role="admin">
                <Repayment />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              REMINDERS
          ================================================== */}

          <Route
            path="/reminders"
            element={
              <ProtectedRoute role="admin">
                <Reminder />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reminders/*"
            element={
              <ProtectedRoute role="admin">
                <Reminder />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              CONTROL CENTER
          ================================================== */}

          <Route
            path="/control-center"
            element={
              <ProtectedRoute role="admin">
                <ControlCenter />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              EXPENSE CONTROL
          ================================================== */}

          <Route
            path="/expense-control"
            element={
              <ProtectedRoute role="admin">
                <ExpenseControl />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              INVESTOR FUNDING
          ================================================== */}

          <Route
            path="/investor"
            element={
              <ProtectedRoute role="admin">
                <Investor />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              LEDGER
          ================================================== */}

          <Route
            path="/ledger"
            element={
              <ProtectedRoute role="admin">
                <Ledger />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              ACTIVITIES
          ================================================== */}

          <Route
            path="/activities"
            element={
              <ProtectedRoute role="admin">
                <RecentActivities />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              SETTINGS
          ================================================== */}

          <Route
            path="/settings"
            element={
              <ProtectedRoute role="admin">
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              VEHICLES
          ================================================== */}

          <Route
            path="/vehicles"
            element={
              <ProtectedRoute role="admin">
                <Vehicle />
              </ProtectedRoute>
            }
          />

          <Route
            path="/vehicles/all"
            element={
              <ProtectedRoute role="admin">
                <Vehicle />
              </ProtectedRoute>
            }
          />

          <Route
            path="/vehicles/seized"
            element={
              <ProtectedRoute role="admin">
                <SeizedVehicles />
              </ProtectedRoute>
            }
          />

          <Route
            path="/vehicles/released"
            element={
              <ProtectedRoute role="admin">
                <ReleasedVehicles />
              </ProtectedRoute>
            }
          />

          <Route
            path="/vehicles/sold"
            element={
              <ProtectedRoute role="admin">
                <SoldVehicles />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              STAFF
          ================================================== */}

          <Route
            path="/staff/collection"
            element={
              <ProtectedRoute role="staff">
                <StaffCollection />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              UNKNOWN
          ================================================== */}

          <Route
            path="*"
            element={
              <Navigate
                to={
                  session?.role ===
                  "staff"
                    ? "/staff/collection"
                    : "/dashboard"
                }
                replace
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
};

/* =========================================================
   APP
========================================================= */

const App = () => {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
};

export default App;