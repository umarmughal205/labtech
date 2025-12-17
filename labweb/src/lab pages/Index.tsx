import { useState, useEffect } from "react";
import { UserRole } from "@/lab types/user";
import { Sidebar, SidebarHeader, SidebarProvider, SidebarInset } from "@/components/lab compoenents/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LabTopHeader from "@/components/lab compoenents/common/LabTopHeader";
import LoginForm from "@/components/lab compoenents/auth/LoginForm";
import SignupForm from "@/components/lab compoenents/auth/SignupForm";
import Navigation from "@/components/lab compoenents/Navigation";
import LabTechnicianDashboard from "@/components/lab compoenents/dashboards/LabTechnicianDashboard";
import Profiling from "@/components/lab compoenents/profiling/Profiling";
import TestCatalog from "@/components/lab compoenents/sample-management/TestCatalog";
import SampleIntake from "@/components/lab compoenents/sample-management/SampleIntake";
import UserManagement from "@/components/lab compoenents/admin/UserManagement";
import SampleTracking from "@/components/lab compoenents/sample-management/SampleTracking";
import ResultEntry from "@/components/lab compoenents/results/ResultEntry";
import ReportGenerator from "@/components/lab compoenents/results/ReportGenerator";
import ReportDesigner from "@/components/lab compoenents/reports/ReportDesigner";
import InventoryManagement from "@/components/lab compoenents/inventory/InventoryManagement";
import SuppliersPage from "@/components/lab compoenents/suppliers/SuppliersPage";
import PurchaseHistory from "@/components/lab compoenents/suppliers/PurchaseHistory";
import StaffAttendance from "@/components/lab compoenents/staff attendance/StaffAttendance";
import Settings from "@/components/lab compoenents/common/Settings";
import Notifications from "@/components/lab compoenents/common/Notifications";
import FinanceDashboard from "@/components/lab compoenents/finance/FinanceDashboard";
import LabExpenses from "@/components/lab compoenents/finance/LabExpenses";
import FinancialLedger from "@/components/lab compoenents/finance/FinancialLedger";
import Appointment from "@/components/lab compoenents/appointments/Appointment";
import AppointmentsHistory from "@/components/lab compoenents/appointments/AppointmentsHistory";
import SamplesPage from "@/components/lab compoenents/sample-management/SamplesPage";
import Barcodes from "@/components/lab compoenents/sample-management/Barcodes";
import { AuthProvider } from "@/lab context/AuthContext";

export type CurrentView = 
  | "dashboard" 
  | "test-catalog" 
  | "sample-intake" 
  | "sample-tracking" 
  | "result-entry" 
  | "report-generator"
  | "report-designer" 
  | "inventory" 
  | "suppliers"
  | "purchase-history"
  | "staff-attendance" 
  | "settings" 
  | "notifications"
  | "finance"
  | "ledger"
  | "expenses"
  | "appointments"
  | "appointments-history"
  | "user-management"
  | "samples"
  | "barcodes"
  | "profiling"
  

const Index = () => {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [currentView, setCurrentView] = useState<CurrentView>("dashboard");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [phSupplier, setPhSupplier] = useState<{ id?: string; name?: string } | null>(null);

  const handleLogin = (role: UserRole) => {
    setCurrentRole(role);
    setCurrentView("dashboard");
    setIsAuthenticated(true);
  };

  const handleSignup = (role: UserRole) => {
    setCurrentRole(role);
    setCurrentView("dashboard");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setCurrentRole(null);
    setCurrentView("dashboard");
    setIsAuthenticated(false);
  };

  const handleViewChange = (view: CurrentView) => {
    if (view === "purchase-history") {
      // Clear any supplier filter when user navigates via menu
      setPhSupplier(null);
    }
    setCurrentView(view);
  };

  useEffect(() => {
    const onConfirmed = () => {
      setCurrentView("sample-intake");
    };
    window.addEventListener("appointmentConfirmed", onConfirmed);
    return () => {
      window.removeEventListener("appointmentConfirmed", onConfirmed);
    };
  }, []);

  useEffect(() => {
    const onOpenPh = (e: Event) => {
      try {
        const detail = (e as CustomEvent<{ supplierId: string; supplierName: string }>).detail;
        if (detail) {
          setPhSupplier({ id: detail.supplierId, name: detail.supplierName });
          setCurrentView("purchase-history");
        }
      } catch {
        // ignore malformed events
      }
    };
    window.addEventListener("openPurchaseHistoryForSupplier", onOpenPh as EventListener);
    return () => window.removeEventListener("openPurchaseHistoryForSupplier", onOpenPh as EventListener);
  }, []);

  const renderContent = () => {
    if (currentView === "settings") return <Settings />;
    if (currentView === "notifications") return <Notifications />;
    if (currentView === "finance") return <FinanceDashboard />;
    if (currentView === "ledger") return <FinancialLedger />;
    if (currentView === "expenses") return <LabExpenses />;
    if (currentView === "appointments") return <Appointment />;
    if (currentView === "appointments-history") return <AppointmentsHistory />;
    if (currentView === "profiling") return <Profiling />;
    if (currentView === "suppliers") return <SuppliersPage />;
    if (currentView === "purchase-history") return <PurchaseHistory supplierId={phSupplier?.id} supplierName={phSupplier?.name} />;
    if (currentView === "staff-attendance") return <StaffAttendance isUrdu={false} />;
    if (currentView === "user-management") return <UserManagement />;
    if (currentView === "samples") return <SamplesPage />;
    if (currentView === "barcodes") return <Barcodes />;
    if (currentView === "report-designer") return <ReportDesigner />;

    // Only lab-technician portal
    switch (currentView) {
      case "test-catalog": return <TestCatalog onNavigateBack={() => setCurrentView("dashboard")} />;
      case "sample-intake": return <SampleIntake onNavigateBack={() => setCurrentView("dashboard")} />;
      case "sample-tracking": return <SampleTracking />;
      case "result-entry": return <ResultEntry onNavigateBack={() => setCurrentView("dashboard")} />;
      case "report-generator": return <ReportGenerator />;
      case "inventory": return <InventoryManagement />;
      default: return <LabTechnicianDashboard onViewChange={handleViewChange} />;
    }
  };

  if (!isAuthenticated) {
    if (authMode === "signup") {
      return (
        <SignupForm 
          onSignup={handleSignup}
          onShowLogin={() => setAuthMode("login")}
        />
      );
    }
    return (
      <LoginForm 
        onLogin={handleLogin}
        onShowSignup={() => setAuthMode("signup")}
      />
    );
  }

  return (
    <SidebarProvider className="flex flex-col min-h-screen bg-background pt-14">
      <LabTopHeader currentRole={currentRole} onLogout={() => setShowLogoutConfirm(true)} />
      <div className="flex flex-1 bg-background">
        {/* Navigation Sidebar */}
        <Sidebar className="border-r" collapsible="icon">
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto sidebar-scroll sidebar-scroll-hover">
              <Navigation
                currentRole={currentRole}
                onLogout={() => setShowLogoutConfirm(true)}
                onViewChange={handleViewChange}
                currentView={currentView}
                className="p-2"
              />
            </div>
          </div>
        </Sidebar>

        {/* Page Content */}
        <SidebarInset className="flex-1 flex flex-col">
          {/* Mobile toggle button (visible < md) */}
          <header className="h-16 border-b flex items-center px-4 md:hidden">
            <Button variant="ghost" size="icon">
              <PanelLeft className="h-5 w-5" />
            </Button>
          </header>

          <main className="flex-1 overflow-y-auto overflow-x-hidden sidebar-scroll">{renderContent()}</main>
        </SidebarInset>
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to logout from the lab system?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowLogoutConfirm(false);
                handleLogout();
              }}
            >
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};
const IndexWithAuth = () => (
  <AuthProvider>
    <Index />
  </AuthProvider>
);

export default IndexWithAuth;
