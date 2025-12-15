import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/lab types/user";
import { CurrentView } from "@/lab pages/Index";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/lab compoenents/ui/sidebar";
import { useNotifications } from "@/lab hooks/use-notifications";
import { 
  Menu, 
  X, 
  TestTube2, 
  FileText, 
  Package,
  Settings,
  Bell,
  LogOut,
  User,
  UserCircle,
  Activity,
  BarChart3,
  UserCheck,
  DollarSign,
  Beaker,
  QrCode,
  Computer,
  Shield,
  Calendar,
  CalendarDays,
  ChevronDown,
  Truck,
  Microscope,
  LayoutDashboard
} from "lucide-react";

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  link?: string;
}

interface NavigationProps {
  currentRole: UserRole;
  // Parent handles actual logout (and any confirmation UI)
  onLogout: () => void;
  onViewChange: (view: CurrentView) => void;
  currentView: CurrentView;
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({ 
  currentRole, 
  onLogout, 
  onViewChange, 
  currentView, 
  className 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAppointmentsOpen, setIsAppointmentsOpen] = useState(false);
  const [isSamplesOpen, setIsSamplesOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);
  const [isSuppliersOpen, setIsSuppliersOpen] = useState(false);
  const [labName, setLabName] = useState<string>("MedSync");
  const [labLogoUrl, setLabLogoUrl] = useState<string>("");

  React.useEffect(() => {
    const load = () => {
      try {
        const ls = typeof window !== 'undefined' ? localStorage.getItem('labSettings') : null;
        const parsed = ls ? JSON.parse(ls) : null;
        setLabName(parsed?.labName || "MedSync");
        const logo = typeof window !== 'undefined' ? localStorage.getItem('labLogoUrl') : '';
        setLabLogoUrl(logo || "");
      } catch {
        // ignore
      }
    };
    load();
    const onStorage = () => load();
    const onFocus = () => load();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, []);
  const { unreadCount } = useNotifications({ pollMs: 30000, limit: 20 });
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const isAdminUser = (): boolean => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
      const role = String(raw || '').trim().toLowerCase();
      return new Set(['admin', 'administrator', 'lab supervisor', 'lab-supervisor', 'supervisor']).has(role);
    } catch {
      return false;
    }
  };

  const getAllowedPermissionNames = (): Set<string> => {
    try {
      if (isAdminUser()) return new Set();
      const raw = typeof window !== 'undefined' ? localStorage.getItem('permissions') : null;
      const parsed = raw ? JSON.parse(raw) : null;
      if (!Array.isArray(parsed)) return new Set();
      return new Set(
        parsed
          .filter((p: any) => p && p.view)
          .map((p: any) => String(p.name || '').trim().toLowerCase())
          .filter(Boolean)
      );
    } catch {
      return new Set();
    }
  };

  const permissionNameForView = (viewId: string): string | null => {
    const map: Record<string, string> = {
      'dashboard': 'Dashboard',
      'test-catalog': 'Test Catalog',
      'sample-intake': 'Sample Intake',
      'sample-tracking': 'Sample Tracking',
      'samples': 'Samples',
      'barcodes': 'Barcodes',
      'result-entry': 'Result Entry',
      'report-designer': 'Report Designer',
      'report-generator': 'Report Generator',
      'inventory': 'Inventory',
      'appointments': 'Appointments',
      'appointments-history': 'Appointments History',
      'suppliers': 'Suppliers',
      'staff-attendance': 'Staff Attendance',
      'notifications': 'Notifications',
      'settings': 'Settings',
      'finance': 'Finance',
      'ledger': 'Financial Ledger',
      'expenses': 'Expenses',
      'user-management': 'User Management',
      'reports': 'Reports',
    };
    return map[String(viewId)] || null;
  };

  const isReportsAllowed = (allowed: Set<string>): boolean => {
    return (
      allowed.has('report designer') ||
      allowed.has('report generator')
    );
  };

  const getMenuItems = (): MenuItem[] => {
    // Full catalog of possible items
    const allItems: MenuItem[] = [
      { id: "dashboard" as CurrentView, label: "Dashboard", icon: LayoutDashboard },
      { id: "appointments" as CurrentView, label: "Appointments", icon: CalendarDays },
      { id: "test-catalog" as CurrentView, label: "Test Catalog", icon: TestTube2 },
      { id: "samples" as CurrentView, label: "Samples", icon: Beaker },
      { id: "barcodes" as CurrentView, label: "Barcodes", icon: QrCode },
      { id: "result-entry" as CurrentView, label: "Result Entry", icon: Microscope },
      { id: "reports", label: "Reports", icon: FileText },
      { id: "inventory" as CurrentView, label: "Inventory", icon: Package },
      { id: "suppliers" as CurrentView, label: "Suppliers", icon: Truck },
      { id: "staff-attendance" as CurrentView, label: "Staff Attendance", icon: UserCheck },
      { id: "user-management" as CurrentView, label: "User Management", icon: UserCircle },
      { id: "notifications" as CurrentView, label: "Notifications", icon: Bell },
      { id: "settings" as CurrentView, label: "Settings", icon: Settings },
      { id: "finance" as CurrentView, label: "Finance", icon: DollarSign },
    ];

    // Role based subsets
    if (currentRole === "receptionist") {
      const receptionistIds: CurrentView[] = [
        "appointments",
        "sample-intake",
        "samples",
        "barcodes",
        "sample-tracking",
      ];
      return allItems.filter(i => receptionistIds.includes(i.id as CurrentView));
    }

    if (currentRole === "researcher") {
      // researcher sees all except: user-management, settings, finance
      const excluded: CurrentView[] = [
        "user-management",
        "settings",
        "finance",
      ];
      return allItems.filter(i => !excluded.includes(i.id as CurrentView));
    }

    // lab-technician: no hidden items
    const hiddenForNow: CurrentView[] = [];
    const base = allItems.filter(i => !hiddenForNow.includes(i.id as CurrentView));

    const allowed = getAllowedPermissionNames();
    if (allowed.size === 0) return base;

    return base.filter((i) => {
      if (String(i.id) === 'reports') {
        return isReportsAllowed(allowed);
      }

      const required = permissionNameForView(String(i.id));
      if (!required) return false;
      return allowed.has(String(required).trim().toLowerCase());
    });
  };

  const navigate = useNavigate();
  const menuItems = getMenuItems();

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case "receptionist":
        return "Receptionist";
      case "researcher":
        return "Researcher";
      default:
        return "Lab Technician";
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "receptionist":
        return "bg-amber-100 text-amber-800";
      case "researcher":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <nav className={cn("flex flex-col w-full px-2 py-4", className)}>
      {/* Sidebar Vertical Menu (header removed per design) */}
      <div className="flex flex-col space-y-1 w-full">
        {menuItems.map((item) => {
          const Icon = item.icon;

          // Custom rendering for Appointments with collapsible submenu
          if (item.id === "appointments") {
            return (
              <div key={item.id} className="flex flex-col w-full">
                <Button
                  // Parent row is just a toggle when expanded; navigation happens via submenu
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isCollapsed) {
                      // In collapsed mode, direct navigation (no submenu UI)
                      onViewChange("appointments");
                    } else {
                      // In expanded mode, only toggle submenu
                      setIsAppointmentsOpen((prev) => !prev);
                    }
                  }}
                  className={cn(
                    "flex items-center w-full",
                    isCollapsed ? "justify-center px-0" : "justify-start gap-2"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {!isCollapsed && (
                    <>
                      <span>Appointments</span>
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 ml-auto transition-transform duration-300 ease-in-out",
                          isAppointmentsOpen ? "rotate-180" : "rotate-0"
                        )}
                      />
                    </>
                  )}
                </Button>

                {/* Submenu: only visible (and animated) when sidebar expanded */}
                {!isCollapsed && (
                  <div
                    className={cn(
                      "ml-6 flex flex-col space-y-1 overflow-hidden transition-all duration-300 ease-in-out",
                      isAppointmentsOpen ? "max-h-24 mt-1 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <Button
                      variant={currentView === "appointments" ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center justify-start text-sm"
                      onClick={() => onViewChange("appointments")}
                    >
                      <span>Appointments</span>
                    </Button>
                    <Button
                      variant={currentView === "appointments-history" ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center justify-start text-sm"
                      onClick={() => onViewChange("appointments-history")}
                    >
                      <span>Appointments History</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          }

          // Custom rendering for Suppliers with collapsible submenu
          if (item.id === "suppliers") {
            return (
              <div key={item.id} className="flex flex-col w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isCollapsed) {
                      // In collapsed mode, direct navigation (no submenu UI)
                      onViewChange("suppliers");
                    } else {
                      // In expanded mode, only toggle submenu
                      setIsSuppliersOpen((prev) => !prev);
                    }
                  }}
                  className={cn(
                    "flex items-center w-full",
                    isCollapsed ? "justify-center px-0" : "justify-start gap-2"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {!isCollapsed && (
                    <>
                      <span>Suppliers</span>
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 ml-auto transition-transform duration-300 ease-in-out",
                          isSuppliersOpen ? "rotate-180" : "rotate-0"
                        )}
                      />
                    </>
                  )}
                </Button>

                {/* Submenu: only visible (and animated) when sidebar expanded */}
                {!isCollapsed && (
                  <div
                    className={cn(
                      "ml-6 flex flex-col space-y-1 overflow-hidden transition-all duration-300 ease-in-out",
                      isSuppliersOpen ? "max-h-24 mt-1 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <Button
                      variant={currentView === "suppliers" ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center justify-start text-sm"
                      onClick={() => onViewChange("suppliers")}
                    >
                      <span>Suppliers</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          }

          // Custom rendering for Reports with collapsible submenu
          if (item.id === "reports") {
            return (
              <div key={item.id} className="flex flex-col w-full">
                <Button
                  // Parent row is just a toggle when expanded; navigation happens via submenu
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isCollapsed) {
                      // In collapsed mode, open main report designer by default
                      onViewChange("report-designer");
                    } else {
                      // In expanded mode, only toggle submenu
                      setIsReportsOpen((prev) => !prev);
                    }
                  }}
                  className={cn(
                    "flex items-center w-full",
                    isCollapsed ? "justify-center px-0" : "justify-start gap-2"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {!isCollapsed && (
                    <>
                      <span>Reports</span>
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 ml-auto transition-transform duration-300 ease-in-out",
                          isReportsOpen ? "rotate-180" : "rotate-0"
                        )}
                      />
                    </>
                  )}
                </Button>

                {/* Submenu: only visible (and animated) when sidebar expanded */}
                {!isCollapsed && (
                  <div
                    className={cn(
                      "ml-6 flex flex-col space-y-1 overflow-hidden transition-all duration-300 ease-in-out",
                      isReportsOpen ? "max-h-24 mt-1 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <Button
                      variant={currentView === "report-designer" ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center justify-start text-sm"
                      onClick={() => onViewChange("report-designer")}
                    >
                      <span>Report Designer</span>
                    </Button>
                    <Button
                      variant={currentView === "report-generator" ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center justify-start text-sm"
                      onClick={() => onViewChange("report-generator")}
                    >
                      <span>Report Generator</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          }

          // Custom rendering for Finance with collapsible submenu
          if (item.id === "finance") {
            return (
              <div key={item.id} className="flex flex-col w-full">
                <Button
                  // Parent row is just a toggle when expanded; navigation happens via submenu
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isCollapsed) {
                      // In collapsed mode, open main Finance dashboard by default
                      onViewChange("finance");
                    } else {
                      // In expanded mode, only toggle submenu
                      setIsFinanceOpen((prev) => !prev);
                    }
                  }}
                  className={cn(
                    "flex items-center w-full",
                    isCollapsed ? "justify-center px-0" : "justify-start gap-2"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {!isCollapsed && (
                    <>
                      <span>Finance</span>
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 ml-auto transition-transform duration-300 ease-in-out",
                          isFinanceOpen ? "rotate-180" : "rotate-0"
                        )}
                      />
                    </>
                  )}
                </Button>

                {/* Submenu: only visible (and animated) when sidebar expanded */}
                {!isCollapsed && (
                  <div
                    className={cn(
                      "ml-6 flex flex-col space-y-1 overflow-hidden transition-all duration-300 ease-in-out",
                      isFinanceOpen ? "max-h-32 mt-1 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <Button
                      variant={currentView === "finance" ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center justify-start text-sm"
                      onClick={() => onViewChange("finance")}
                    >
                      <span>Finance</span>
                    </Button>
                    <Button
                      variant={currentView === "ledger" ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center justify-start text-sm"
                      onClick={() => onViewChange("ledger")}
                    >
                      <span>Financial Ledger</span>
                    </Button>
                    <Button
                      variant={currentView === "expenses" ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center justify-start text-sm"
                      onClick={() => onViewChange("expenses")}
                    >
                      <span>Expenses</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          }

          // Custom rendering for Samples with collapsible submenu
          if (item.id === "samples") {
            return (
              <div key={item.id} className="flex flex-col w-full">
                <Button
                  // Parent row is just a toggle when expanded; navigation happens via submenu
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isCollapsed) {
                      // In collapsed mode, direct navigation (no submenu UI)
                      onViewChange("samples");
                    } else {
                      // In expanded mode, only toggle submenu
                      setIsSamplesOpen((prev) => !prev);
                    }
                  }}
                  className={cn(
                    "flex items-center w-full",
                    isCollapsed ? "justify-center px-0" : "justify-start gap-2"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {!isCollapsed && (
                    <>
                      <span>Samples</span>
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 ml-auto transition-transform duration-300 ease-in-out",
                          isSamplesOpen ? "rotate-180" : "rotate-0"
                        )}
                      />
                    </>
                  )}
                </Button>

                {/* Submenu: only visible (and animated) when sidebar expanded */}
                {!isCollapsed && (
                  <div
                    className={cn(
                      "ml-6 flex flex-col space-y-1 overflow-hidden transition-all duration-300 ease-in-out",
                      isSamplesOpen ? "max-h-24 mt-1 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <Button
                      variant={currentView === "sample-intake" ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center justify-start text-sm"
                      onClick={() => onViewChange("sample-intake")}
                    >
                      <span>Sample Intake</span>
                    </Button>
                    <Button
                      variant={currentView === "samples" ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center justify-start text-sm"
                      onClick={() => onViewChange("samples")}
                    >
                      <span>Samples</span>
                    </Button>
                    <Button
                      variant={currentView === "sample-tracking" ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center justify-start text-sm"
                      onClick={() => onViewChange("sample-tracking")}
                    >
                      <span>Sample Tracking</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          }

          return (
            false ? (
              <Link
                key={item.id}
                to="/"
                className="hidden"
                onClick={() => {}}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ) : (
              <Button
                key={item.id}
                variant={currentView === item.id ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange(item.id as CurrentView)}
                className={cn(
                  "flex items-center w-full",
                  isCollapsed ? "justify-center px-0" : "justify-start gap-2"
                )}
              >
                {item.id === "notifications" ? (
                  <span className="relative inline-block">
                    <Icon className={cn("w-4 h-4", unreadCount > 0 && "text-red-600")} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </span>
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                {!isCollapsed && item.label}
              </Button>
            )
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className={cn(
            "flex items-center text-red-600 hover:text-red-700 w-full",
            isCollapsed ? "justify-center px-0" : "justify-start gap-2"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && "Logout"}
        </Button>
      </div>
    </nav>
  );
}
;

export default Navigation;
