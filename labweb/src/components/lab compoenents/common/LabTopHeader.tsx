import React, { useEffect, useState } from "react";
import { Bell, LogOut, User } from "lucide-react";
import { SidebarTrigger } from "@/components/lab compoenents/ui/sidebar";
import { UserRole } from "@/lab types/user";
import NotificationBell from "@/components/lab compoenents/common/NotificationBell";

interface LabTopHeaderProps {
  currentRole: UserRole | null;
  // Parent handles actual logout (and any confirmation UI)
  onLogout: () => void;
}

const LabTopHeader: React.FC<LabTopHeaderProps> = ({ currentRole, onLogout }) => {
  const roleLabel = currentRole === "receptionist"
    ? "Receptionist"
    : currentRole === "researcher"
    ? "Researcher"
    : "Lab Supervisor";

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [labName, setLabName] = useState<string>("MedLab LIS");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadLogo = () => {
      const stored = localStorage.getItem("labLogoUrl");
      setLogoUrl(stored || null);
    };

    loadLogo();

    const handleLogoChanged = () => {
      loadLogo();
    };

    window.addEventListener("labLogoChanged", handleLogoChanged as EventListener);
    window.addEventListener("storage", handleLogoChanged as EventListener);

    return () => {
      window.removeEventListener("labLogoChanged", handleLogoChanged as EventListener);
      window.removeEventListener("storage", handleLogoChanged as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadLabName = () => {
      try {
        const stored = localStorage.getItem("labSettings");
        if (stored) {
          const parsed = JSON.parse(stored) as { labName?: string };
          setLabName(parsed.labName && parsed.labName.trim() ? parsed.labName : "MedLab LIS");
        } else {
          setLabName("MedLab LIS");
        }
      } catch {
        setLabName("MedLab LIS");
      }
    };

    loadLabName();

    const handleLabSettingsChanged = () => {
      loadLabName();
    };

    window.addEventListener("labSettingsChanged", handleLabSettingsChanged as EventListener);
    window.addEventListener("storage", handleLabSettingsChanged as EventListener);

    return () => {
      window.removeEventListener("labSettingsChanged", handleLabSettingsChanged as EventListener);
      window.removeEventListener("storage", handleLabSettingsChanged as EventListener);
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-14 border-b border-blue-800 bg-blue-900 flex items-center justify-between px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex items-center pr-3 mr-2 border-r border-gray-200">
          <SidebarTrigger className="h-8 w-8 -ml-4 text-white" aria-label="Toggle sidebar" />
        </div>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Lab Logo"
            className="h-8 w-8 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
            <span>M</span>
          </div>
        )}
        <span className="text-sm md:text-base font-semibold text-white">{labName}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex flex-col leading-tight">
          <span className="text-sm font-medium text-white">Dr. John Doe</span>
          <span className="text-xs text-blue-50">{roleLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-blue-300 text-white hover:bg-blue-500 hover:border-blue-200"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default LabTopHeader;
