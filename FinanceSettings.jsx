import React, { useState, useMemo } from "react";
import {
  Settings,
  Link as LinkIcon,
  Check,
  AlertCircle,
  RefreshCw,
  Zap,
  FileText,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

// Static metadata for integrations
const INTEGRATIONS = [
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    description: "Sync revenue, expenses, and tax data automatically.",
    logo: "QB",
    features: [
      "Daily revenue sync",
      "Tax tracking",
      "Expense categorization",
      "Invoice generation",
    ],
    comingSoon: false,
  },
  {
    id: "xero",
    name: "Xero",
    description: "Connect your Xero account for seamless accounting.",
    logo: "X",
    features: [
      "Revenue reconciliation",
      "Bank feeds",
      "Financial reports",
      "Tax compliance",
    ],
    comingSoon: false,
  },
  {
    id: "sage",
    name: "Sage",
    description: "Integration coming soon.",
    logo: "S",
    features: ["Full accounting sync", "Multi-currency", "Advanced reporting"],
    comingSoon: true,
  },
];

// Tailwind-safe logo colors (no string interpolation)
const INTEGRATION_LOGO_BG = {
  quickbooks: "bg-green-600",
  xero: "bg-sky-600",
  sage: "bg-purple-600",
};

const SYNC_RULES_DEFAULT = [
  {
    category: "Revenue",
    driveeCategory: "Lesson Revenue",
    accountingCategory: "Sales - Driving Lessons",
    frequency: "Daily",
    active: true,
  },
  {
    category: "Revenue",
    driveeCategory: "Package Sales",
    accountingCategory: "Sales - Course Packages",
    frequency: "Daily",
    active: true,
  },
  {
    category: "Expense",
    driveeCategory: "Instructor Commissions",
    accountingCategory: "Cost of Sales - Instructor Pay",
    frequency: "Monthly",
    active: true,
  },
  {
    category: "Expense",
    driveeCategory: "Vehicle Maintenance",
    accountingCategory: "Operating Expenses - Fleet",
    frequency: "Weekly",
    active: true,
  },
  {
    category: "Tax",
    driveeCategory: "VAT Collected",
    accountingCategory: "Liabilities - VAT Payable",
    frequency: "Daily",
    active: true,
  },
];

const EXPORT_PRESETS_DEFAULT = [
  {
    name: "Monthly Accountant Pack",
    includes: ["P&L", "Tax Report", "Transaction CSV"],
    schedule: "Monthly",
    recipients: "accountant@firm.com",
  },
  {
    name: "Weekly Owner Summary",
    includes: ["Revenue Report", "Commission Report"],
    schedule: "Weekly",
    recipients: "owner@school.com",
  },
];

const COUNTRY_OPTIONS = ["United Kingdom", "Ireland", "France", "Germany"];
const REPORTING_PERIOD_OPTIONS = ["Monthly", "Quarterly", "Yearly"];

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
    </label>
  );
}

function SummaryCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">
          {label}
        </p>
        <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
        {helper && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{helper}</p>
        )}
      </div>
    </div>
  );
}

export default function FinanceSettings() {
  // Integration connection state
  const [qbConnected, setQbConnected] = useState(false);
  const [xeroConnected, setXeroConnected] = useState(false);
  const [lastSync, setLastSync] = useState({
    quickbooks: null,
    xero: null,
  });

  // Sync rules and presets (in-memory for now; ready for API wiring)
  const [syncRules] = useState(SYNC_RULES_DEFAULT);
  const [exportPresets, setExportPresets] = useState(EXPORT_PRESETS_DEFAULT);

  // Tax configuration
  const [taxConfig, setTaxConfig] = useState({
    country: COUNTRY_OPTIONS[0],
    vatNumber: "",
    vatRate: "20",
    reportingPeriod: REPORTING_PERIOD_OPTIONS[0],
  });

  // Alert preferences
  const [alerts, setAlerts] = useState({
    revenueBelowTarget: true,
    instructorUnderPerformance: true,
    vehicleMaintenanceDue: true,
    overduePayments: true,
  });

  const connectedCount = (qbConnected ? 1 : 0) + (xeroConnected ? 1 : 0);
  const totalConnectable = INTEGRATIONS.filter((i) => !i.comingSoon).length;
  const revenueRuleCount = useMemo(
    () => syncRules.filter((r) => r.category === "Revenue").length,
    [syncRules]
  );
  const alertEnabledCount = useMemo(
    () => Object.values(alerts).filter(Boolean).length,
    [alerts]
  );
  const hasAnyIntegrationConnected = qbConnected || xeroConnected;

  const handleConnect = (id) => {
    if (id === "quickbooks") {
      setQbConnected(true);
    } else if (id === "xero") {
      setXeroConnected(true);
    }

    setLastSync((prev) => ({
      ...prev,
      [id]: new Date().toLocaleString(),
    }));

    const integration = INTEGRATIONS.find((i) => i.id === id);
    toast.success(
      `${integration?.name || "Integration"} connected. Automatic sync is now enabled.`
    );
  };

  const handleDisconnect = (id) => {
    if (id === "quickbooks") {
      setQbConnected(false);
    } else if (id === "xero") {
      setXeroConnected(false);
    }

    setLastSync((prev) => ({
      ...prev,
      [id]: null,
    }));

    const integration = INTEGRATIONS.find((i) => i.id === id);
    toast(`Disconnected`, {
      description: integration?.name || "Accounting integration",
    });
  };

  const handleSyncNow = (id) => {
    const isConnected =
      (id === "quickbooks" && qbConnected) ||
      (id === "xero" && xeroConnected);

    if (!isConnected) {
      toast.error("Connect the integration before syncing.");
      return;
    }

    setLastSync((prev) => ({
      ...prev,
      [id]: new Date().toLocaleString(),
    }));

    const integration = INTEGRATIONS.find((i) => i.id === id);
    toast.success(
      `Sync started for ${integration?.name || "integration"}. This may take a few minutes.`
    );
  };

  const handleConfigureIntegration = (id) => {
    const integration = INTEGRATIONS.find((i) => i.id === id);
    toast(
      `Configure ${integration?.name || "integration"}`,
      {
        description:
          "Account mapping and advanced settings will be handled here once your accountant has confirmed the structure.",
      }
    );
  };

  const handleSaveTaxSettings = () => {
    // In a real app this would call an API and persist per-school settings
    toast.success("Tax settings saved for this school.");
  };

  const handleToggleAlert = (key, value) => {
    setAlerts((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAddPreset = () => {
    const newPreset = {
      name: "Custom Export Preset",
      includes: ["Revenue Report"],
      schedule: "Monthly",
      recipients: "",
    };
    setExportPresets((prev) => [newPreset, ...prev]);
    toast.success("New export preset created. Edit it to fine-tune reports.");
  };

  const handleEditPreset = (preset) => {
    toast("Editing presets", {
      description:
        `You will be able to choose exact reports, formats and recipients for "${preset.name}".`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Settings className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Finance settings & integrations
            </h1>
            <p className="text-gray-600 mt-1">
              Connect accounting tools, control sync rules, tax and alerts for
              your school.
            </p>
          </div>
        </div>

        {/* Quick summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
          <SummaryCard
            icon={LinkIcon}
            label="Accounting integrations"
            value={`${connectedCount}/${totalConnectable} connected`}
            helper={
              connectedCount === 0
                ? "Connect QuickBooks or Xero to enable automatic sync."
                : "Automatic sync is active for your accounting system."
            }
          />
          <SummaryCard
            icon={DollarSign}
            label="Revenue mappings"
            value={`${revenueRuleCount} categories mapped`}
            helper="Lesson and package revenue mapped to your chart of accounts."
          />
          <SummaryCard
            icon={AlertCircle}
            label="Financial alerts"
            value={`${alertEnabledCount}/4 alerts active`}
            helper="Drivee monitors revenue, instructors, fleet and overdue invoices."
          />
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">
          Accounting software
        </h3>

        <div className="space-y-4">
          {INTEGRATIONS.map((integration) => {
            const isQuickBooks = integration.id === "quickbooks";
            const isXero = integration.id === "xero";
            const isConnected = isQuickBooks
              ? qbConnected
              : isXero
              ? xeroConnected
              : false;

            const lastSyncedAt =
              lastSync[integration.id] || (isConnected ? "Recently synced" : null);

            const logoBgClass =
              INTEGRATION_LOGO_BG[integration.id] || "bg-slate-900";

            const cardClassNames = integration.comingSoon
              ? "border-gray-200 bg-gray-50"
              : isConnected
              ? "border-green-200 bg-green-50"
              : "border-gray-200 hover:border-indigo-600 hover:bg-indigo-50/40";

            return (
              <div
                key={integration.id}
                className={`border-2 rounded-xl p-6 transition ${cardClassNames}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Logo */}
                    <div
                      className={`w-14 h-14 ${logoBgClass} rounded-xl flex items-center justify-center flex-shrink-0`}
                    >
                      <span className="text-white text-xl font-bold">
                        {integration.logo}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h4 className="text-lg font-bold text-gray-900">
                          {integration.name}
                        </h4>
                        {integration.comingSoon && (
                          <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-semibold">
                            Coming soon
                          </span>
                        )}
                        {isConnected && !integration.comingSoon && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                            <Check className="w-3 h-3" />
                            Connected
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-4">
                        {integration.description}
                      </p>

                      {/* Features */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {integration.features.map((feature, idx) => (
                          <span
                            key={idx}
                            className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>

                      {/* Connection Status */}
                      {isConnected && lastSyncedAt && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Zap className="w-4 h-4 text-green-600" />
                          <span>Last synced: {lastSyncedAt}</span>
                        </div>
                      )}
                      {!isConnected && !integration.comingSoon && (
                        <p className="text-xs text-gray-500">
                          Connection handled via secure OAuth. You decide which
                          data Drivee can access.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {integration.comingSoon ? (
                      <button
                        type="button"
                        disabled
                        className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg text-sm font-semibold cursor-not-allowed"
                      >
                        Coming soon
                      </button>
                    ) : isConnected ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSyncNow(integration.id)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Sync now
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfigureIntegration(integration.id)}
                          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-semibold transition"
                        >
                          Configure
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDisconnect(integration.id)}
                          className="px-4 py-2 text-red-600 hover:text-red-700 text-sm font-semibold"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConnect(integration.id)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sync Rules */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">
            Sync rules & category mapping
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Define how Drivee categories map to your accounting software.
          </p>
          {!hasAnyIntegrationConnected && (
            <div className="mt-3 inline-flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span>
                Automatic sync is paused until you connect QuickBooks or Xero
                above. You can still export reports manually.
              </span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Drivee category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Accounting category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Sync frequency
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {syncRules.map((rule, index) => (
                <tr key={`${rule.driveeCategory}-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        rule.category === "Revenue"
                          ? "bg-green-100 text-green-800"
                          : rule.category === "Expense"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {rule.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {rule.driveeCategory}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {rule.accountingCategory}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {rule.frequency}
                  </td>
                  <td className="px-6 py-4">
                    {rule.active ? (
                      <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
                        <Check className="w-4 h-4" />
                        Active
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">Inactive</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        toast("Category mapping editing", {
                          description:
                            "You will be able to map Drivee categories to specific accounts per integration.",
                        })
                      }
                      className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Presets */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Export presets</h3>
            <p className="text-sm text-gray-600 mt-1">
              Save custom export configurations for your accountant and owners.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddPreset}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition"
          >
            + New preset
          </button>
        </div>

        {exportPresets.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-sm text-gray-600">
            No presets yet. Create your first preset to send recurring reports
            to your accountant.
          </div>
        ) : (
          <div className="space-y-4">
            {exportPresets.map((preset, index) => (
              <div
                key={`${preset.name}-${index}`}
                className="border-2 border-gray-200 rounded-xl p-4 hover:border-indigo-600 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 mb-2">
                      {preset.name}
                    </h4>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {preset.includes.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium"
                        >
                          <FileText className="w-3 h-3" />
                          {item}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
                      <span>📅 {preset.schedule}</span>
                      <span>✉️ {preset.recipients || "No recipients yet"}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEditPreset(preset)}
                    className="text-indigo-600 hover:text-indigo-700 font-medium text-sm whitespace-nowrap"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tax Configuration */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">
          Tax configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              value={taxConfig.country}
              onChange={(e) =>
                setTaxConfig((prev) => ({
                  ...prev,
                  country: e.target.value,
                }))
              }
            >
              {COUNTRY_OPTIONS.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              VAT registration number
            </label>
            <input
              type="text"
              placeholder="GB123456789"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              value={taxConfig.vatNumber}
              onChange={(e) =>
                setTaxConfig((prev) => ({
                  ...prev,
                  vatNumber: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Standard VAT rate (%)
            </label>
            <input
              type="number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              value={taxConfig.vatRate}
              onChange={(e) =>
                setTaxConfig((prev) => ({
                  ...prev,
                  vatRate: e.target.value,
                }))
              }
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reporting period
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              value={taxConfig.reportingPeriod}
              onChange={(e) =>
                setTaxConfig((prev) => ({
                  ...prev,
                  reportingPeriod: e.target.value,
                }))
              }
            >
              {REPORTING_PERIOD_OPTIONS.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 text-xs text-gray-600">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
          <p>
            Drivee calculates VAT reports based on these settings, but this does
            not constitute tax advice. Always confirm with your accountant.
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSaveTaxSettings}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition"
          >
            Save tax settings
          </button>
        </div>
      </div>

      {/* Alert Configuration */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">
          Alert preferences
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Revenue below target
              </p>
              <p className="text-xs text-gray-600">
                Alert when monthly revenue is below 80% of target.
              </p>
            </div>
            <ToggleSwitch
              checked={alerts.revenueBelowTarget}
              onChange={(value) =>
                handleToggleAlert("revenueBelowTarget", value)
              }
              label="Toggle revenue below target alert"
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Instructor underperformance
              </p>
              <p className="text-xs text-gray-600">
                Alert when instructor revenue drops by 25% or more.
              </p>
            </div>
            <ToggleSwitch
              checked={alerts.instructorUnderPerformance}
              onChange={(value) =>
                handleToggleAlert("instructorUnderPerformance", value)
              }
              label="Toggle instructor underperformance alert"
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Vehicle maintenance due
              </p>
              <p className="text-xs text-gray-600">
                Alert 7 days before maintenance is due.
              </p>
            </div>
            <ToggleSwitch
              checked={alerts.vehicleMaintenanceDue}
              onChange={(value) =>
                handleToggleAlert("vehicleMaintenanceDue", value)
              }
              label="Toggle vehicle maintenance alert"
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Overdue payments
              </p>
              <p className="text-xs text-gray-600">
                Alert when invoices are 30+ days overdue.
              </p>
            </div>
            <ToggleSwitch
              checked={alerts.overduePayments}
              onChange={(value) =>
                handleToggleAlert("overduePayments", value)
              }
              label="Toggle overdue payments alert"
            />
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Changes to alert preferences are applied immediately and will be used
          across dashboards and email notifications.
        </p>
      </div>
    </div>
  );
}
