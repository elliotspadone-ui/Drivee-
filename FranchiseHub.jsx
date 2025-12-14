import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  DollarSign,
  Shield,
  Users,
  MapPin,
  FileText,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import MultiLocationDashboard from "@/components/franchise/MultiLocationDashboard";
import FranchiseFeeCalculator from "@/components/franchise/FranchiseFeeCalculator";
import ComplianceMonitor from "@/components/franchise/ComplianceMonitor";
import BrandAssetLibrary from "@/components/franchise/BrandAssetLibrary";
import TerritoryMapper from "@/components/franchise/TerritoryMapper";
import InstructorSharingHub from "@/components/franchise/InstructorSharingHub";
import PricingControls from "@/components/franchise/PricingControls";

export default function FranchiseHub() {
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (err) {
        console.error("Failed to load current user", err);
        setUserError("Could not load user profile.");
      } finally {
        setUserLoading(false);
      }
    };
    loadUser();
  }, []);

  // Core franchise data
  const {
    data: franchises = [],
    isLoading: franchisesLoading,
    isError: franchisesError,
  } = useQuery({
    queryKey: ["franchises"],
    queryFn: () => base44.entities.Franchise.list(),
  });

  const {
    data: schools = [],
    isLoading: schoolsLoading,
    isError: schoolsError,
  } = useQuery({
    queryKey: ["schools"],
    queryFn: () => base44.entities.School.list(),
  });

  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    isError: bookingsError,
  } = useQuery({
    queryKey: ["allBookings"],
    queryFn: () => base44.entities.Booking.list(),
  });

  const {
    data: payments = [],
    isLoading: paymentsLoading,
    isError: paymentsError,
  } = useQuery({
    queryKey: ["allPayments"],
    queryFn: () => base44.entities.Payment.list(),
  });

  // Compliance and assets
  const {
    data: complianceChecks = [],
    isLoading: complianceLoading,
    isError: complianceError,
  } = useQuery({
    queryKey: ["complianceChecks"],
    queryFn: () => base44.entities.ComplianceCheck.list(),
  });

  const {
    data: brandAssets = [],
    isLoading: assetsLoading,
    isError: assetsError,
  } = useQuery({
    queryKey: ["brandAssets"],
    queryFn: () => base44.entities.BrandAsset.list(),
  });

  // Instructor sharing
  const {
    data: sharingAgreements = [],
    isLoading: sharingLoading,
    isError: sharingError,
  } = useQuery({
    queryKey: ["instructorSharing"],
    queryFn: () => base44.entities.InstructorSharing.list(),
  });

  const {
    data: instructors = [],
    isLoading: instructorsLoading,
    isError: instructorsError,
  } = useQuery({
    queryKey: ["instructors"],
    queryFn: () => base44.entities.Instructor.list(),
  });

  // Pricing templates
  const {
    data: serviceTemplates = [],
    isLoading: templatesLoading,
    isError: templatesError,
  } = useQuery({
    queryKey: ["serviceTemplates"],
    queryFn: () => base44.entities.ServiceTemplate.list(),
  });

  const {
    data: packages = [],
    isLoading: packagesLoading,
    isError: packagesError,
  } = useQuery({
    queryKey: ["packages"],
    queryFn: () => base44.entities.Package.list(),
  });

  const createFeeMutation = useMutation({
    mutationFn: (data) => base44.entities.FranchiseFee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franchiseFees"] });
      toast.success("Franchise fee invoice generated.");
    },
    onError: () => {
      toast.error("Could not generate franchise fee invoice. Please try again.");
    },
  });

  const anyLoading =
    userLoading ||
    franchisesLoading ||
    schoolsLoading ||
    bookingsLoading ||
    paymentsLoading ||
    complianceLoading ||
    assetsLoading ||
    sharingLoading ||
    instructorsLoading ||
    templatesLoading ||
    packagesLoading;

  const anyError =
    userError ||
    franchisesError ||
    schoolsError ||
    bookingsError ||
    paymentsError ||
    complianceError ||
    assetsError ||
    sharingError ||
    instructorsError ||
    templatesError ||
    packagesError;

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Building2 },
    { id: "fees", label: "Fees & Billing", icon: DollarSign },
    { id: "compliance", label: "Compliance", icon: Shield },
    { id: "assets", label: "Brand Assets", icon: FileText },
    { id: "territory", label: "Territories", icon: MapPin },
    { id: "instructors", label: "Instructor Sharing", icon: Users },
    { id: "pricing", label: "Pricing Controls", icon: Settings },
  ];

  // Simple “role hint” for future: if you later add a franchise-specific role
  const isFranchiseUser =
    currentUser && ["admin", "franchise_admin", "owner"].includes(currentUser.role);

  return (
    <div className="max-w-7xl mx-auto pb-24 md:pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="neo-surface p-8 mb-6"
      >
        <div className="flex items-center gap-4 justify-between flex-wrap">
          <div className="flex items-center gap-4">
            <div className="neo-inset w-16 h-16 rounded-2xl flex items-center justify-center">
              <Building2 className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                Franchise Management Hub
              </h1>
              <p className="text-muted">
                Enterprise multi-location control center for your driving school network.
              </p>
            </div>
          </div>
          {currentUser && (
            <div className="text-right text-sm text-gray-500">
              <p className="font-medium text-gray-700">
                {currentUser.name || currentUser.email}
              </p>
              <p className="text-xs">
                Role: <span className="uppercase">{currentUser.role}</span>
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Error banner */}
      {anyError && (
        <div className="neo-surface px-4 py-3 mb-4 rounded-2xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
          Some franchise data could not be loaded. Numbers may be incomplete. Refresh the
          page if this persists.
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="neo-surface p-2 mb-6 rounded-2xl">
        <div className="flex overflow-x-auto gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`neo-button px-6 py-3 rounded-xl flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id ? "active bg-indigo-50" : ""
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {anyLoading && (
        <div className="neo-surface p-6 rounded-2xl mb-6 text-sm text-gray-500">
          Loading franchise data…
        </div>
      )}

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <>
            {franchises.length === 0 && !anyLoading ? (
              <div className="neo-surface p-8 rounded-2xl text-center text-gray-500">
                <p className="font-medium text-gray-700 mb-1">
                  No franchise structures configured yet.
                </p>
                <p className="text-sm">
                  Add your first franchise in the admin back office to unlock the
                  multi-location dashboard.
                </p>
              </div>
            ) : (
              <MultiLocationDashboard
                franchises={franchises}
                schools={schools}
                bookings={bookings}
                payments={payments}
              />
            )}
          </>
        )}

        {/* Fees & Billing */}
        {activeTab === "fees" && (
          <>
            {franchises.length === 0 && !anyLoading ? (
              <div className="neo-surface p-8 rounded-2xl text-center text-gray-500">
                <p className="font-medium text-gray-700 mb-1">
                  No franchises found.
                </p>
                <p className="text-sm">
                  Create at least one franchise to start generating fees and billing
                  reports.
                </p>
              </div>
            ) : (
              <FranchiseFeeCalculator
                // For now we pass the first franchise; you can later extend this
                franchise={franchises[0]}
                // Placeholder revenue: in future use a computed revenue from payments
                revenue={50000}
                onGenerate={(data) => createFeeMutation.mutate(data)}
                isSubmitting={createFeeMutation.isLoading}
              />
            )}
          </>
        )}

        {/* Compliance */}
        {activeTab === "compliance" && (
          <>
            {franchises.length === 0 && !anyLoading ? (
              <div className="neo-surface p-8 rounded-2xl text-center text-gray-500">
                <p className="font-medium text-gray-700 mb-1">
                  No franchises configured.
                </p>
                <p className="text-sm">
                  Compliance tracking will appear here once you define franchise
                  locations.
                </p>
              </div>
            ) : (
              <ComplianceMonitor checks={complianceChecks} franchises={franchises} />
            )}
          </>
        )}

        {/* Brand Assets */}
        {activeTab === "assets" && (
          <>
            {brandAssets.length === 0 && !anyLoading ? (
              <div className="neo-surface p-8 rounded-2xl text-center text-gray-500">
                <p className="font-medium text-gray-700 mb-1">
                  No brand assets uploaded yet.
                </p>
                <p className="text-sm">
                  Upload logos, templates, and brand guidelines to share with franchise
                  owners.
                </p>
              </div>
            ) : (
              <BrandAssetLibrary assets={brandAssets} />
            )}
          </>
        )}

        {/* Territories */}
        {activeTab === "territory" && (
          <>
            {franchises.length === 0 && !anyLoading ? (
              <div className="neo-surface p-8 rounded-2xl text-center text-gray-500">
                <p className="font-medium text-gray-700 mb-1">
                  No territories assigned yet.
                </p>
                <p className="text-sm">
                  Define franchise territories to manage exclusivity and coverage.
                </p>
              </div>
            ) : (
              <TerritoryMapper franchises={franchises} onUpdate={() => {}} />
            )}
          </>
        )}

        {/* Instructor Sharing */}
        {activeTab === "instructors" && (
          <>
            {schools.length === 0 && !anyLoading ? (
              <div className="neo-surface p-8 rounded-2xl text-center text-gray-500">
                <p className="font-medium text-gray-700 mb-1">
                  No schools found in your network.
                </p>
                <p className="text-sm">
                  Add schools to your franchise network to start sharing instructors.
                </p>
              </div>
            ) : (
              <InstructorSharingHub
                instructors={instructors}
                schools={schools}
                sharingAgreements={sharingAgreements}
                onCreateSharing={() => {}}
                onApprove={() => {}}
              />
            )}
          </>
        )}

        {/* Pricing Controls */}
        {activeTab === "pricing" && (
          <>
            {(serviceTemplates.length === 0 || packages.length === 0) &&
            !anyLoading ? (
              <div className="neo-surface p-8 rounded-2xl text-center text-gray-500">
                <p className="font-medium text-gray-700 mb-1">
                  Pricing data incomplete.
                </p>
                <p className="text-sm">
                  Add service templates and packages to control pricing across your
                  franchise network.
                </p>
              </div>
            ) : (
              <PricingControls
                serviceTemplates={serviceTemplates}
                packages={packages}
                franchises={franchises}
                onUpdatePricing={() => {}}
              />
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
