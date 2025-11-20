import { useState, useEffect } from "react";
import { Settings, Save, RotateCcw, Download, Upload, Eye, EyeOff } from "lucide-react";
import { configManager, type AppConfig } from "../utils/config.js";

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfigPanel = ({ isOpen, onClose }: ConfigPanelProps) => {
  const [config, setConfig] = useState<AppConfig>(configManager.getConfig());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["simulation"]));
  const [hasChanges, setHasChanges] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(configManager.getConfig());
      setHasChanges(false);
    }
  }, [isOpen]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const updateValue = (path: string, value: any) => {
    const keys = path.split(".");
    const newConfig = { ...config };
    let current: any = newConfig;

    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setConfig(newConfig);
    setHasChanges(true);
  };

  const handleSave = () => {
    // Apply config changes
    Object.keys(config).forEach((key) => {
      const section = config[key as keyof AppConfig];
      if (typeof section === "object") {
        Object.keys(section).forEach((subKey) => {
          const path = `${key}.${subKey}`;
          const value = (section as any)[subKey];
          if (typeof value === "object" && !Array.isArray(value)) {
            Object.keys(value).forEach((nestedKey) => {
              configManager.updateConfig(`${path}.${nestedKey}`, value[nestedKey]);
            });
          } else {
            configManager.updateConfig(path, value);
          }
        });
      }
    });
    configManager.saveConfig();
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    configManager.resetConfig();
    setConfig(configManager.getConfig());
    setHasChanges(false);
  };

  const handleExport = () => {
    const blob = new Blob([configManager.exportConfig()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aeronavsim-config-${configManager.getEnvironment()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (configManager.importConfig(content)) {
            setConfig(configManager.getConfig());
            setHasChanges(false);
            alert("Config imported successfully!");
          } else {
            alert("Failed to import config. Please check the file format.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  if (!isOpen) return null;

  const renderValueInput = (path: string, value: any, label: string) => {
    if (typeof value === "number") {
      return (
        <div className="flex items-center justify-between py-1">
          <span className="text-xs text-slate-400">{label}:</span>
          <input
            type="number"
            value={value}
            onChange={(e) => updateValue(path, parseFloat(e.target.value) || 0)}
            className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
          />
        </div>
      );
    } else if (typeof value === "boolean") {
      return (
        <div className="flex items-center justify-between py-1">
          <span className="text-xs text-slate-400">{label}:</span>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => updateValue(path, e.target.checked)}
            className="w-4 h-4"
          />
        </div>
      );
    } else if (typeof value === "string") {
      return (
        <div className="flex items-center justify-between py-1">
          <span className="text-xs text-slate-400">{label}:</span>
          <select
            value={value}
            onChange={(e) => updateValue(path, e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
          >
            {["DEBUG", "INFO", "WARN", "ERROR"].includes(value) && (
              <>
                <option value="DEBUG">DEBUG</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
              </>
            )}
            {["json", "csv", "txt"].includes(value) && (
              <>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="txt">TXT</option>
              </>
            )}
          </select>
        </div>
      );
    }
    return null;
  };

  const renderSection = (title: string, sectionKey: string, data: any) => {
    const isExpanded = expandedSections.has(sectionKey);
    return (
      <div className="bg-slate-800 rounded p-3 border border-slate-700">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between text-left"
        >
          <h4 className="text-sm font-bold text-sky-400">{title}</h4>
          <span className="text-xs text-slate-500">{isExpanded ? "▼" : "▶"}</span>
        </button>
        {isExpanded && (
          <div className="mt-3 space-y-2">
            {Object.entries(data).map(([key, value]) => {
              if (typeof value === "object" && !Array.isArray(value)) {
                return (
                  <div key={key} className="ml-2 border-l border-slate-700 pl-2">
                    <div className="text-xs font-bold text-slate-500 mb-1">{key}:</div>
                    {Object.entries(value).map(([subKey, subValue]) => {
                      if (typeof subValue === "object" && !Array.isArray(subValue)) {
                        return (
                          <div key={subKey} className="ml-2 mt-1">
                            <div className="text-xs font-bold text-slate-500 mb-1">{subKey}:</div>
                            {Object.entries(subValue).map(([nestedKey, nestedValue]) => (
                              <div key={nestedKey}>
                                {renderValueInput(
                                  `${sectionKey}.${key}.${subKey}.${nestedKey}`,
                                  nestedValue,
                                  nestedKey
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return (
                        <div key={subKey}>
                          {renderValueInput(`${sectionKey}.${key}.${subKey}`, subValue, subKey)}
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return (
                <div key={key}>
                  {renderValueInput(`${sectionKey}.${key}`, value, key)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold text-slate-200">Configuration</h2>
            <span className="text-xs text-slate-500">
              Environment: {configManager.getEnvironment()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
              title="Toggle Raw JSON View"
            >
              {showRaw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {showRaw ? (
            <pre className="bg-slate-950 p-4 rounded border border-slate-800 text-xs text-slate-300 overflow-auto">
              {JSON.stringify(config, null, 2)}
            </pre>
          ) : (
            <div className="space-y-3">
              {renderSection("Simulation", "simulation", config.simulation)}
              {renderSection("UI", "ui", config.ui)}
              {renderSection("Logging", "logging", config.logging)}
              {renderSection("Export", "export", config.export)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded hover:bg-slate-700 flex items-center gap-2"
            >
              <RotateCcw size={14} /> Reset
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-xs bg-sky-900/30 border border-sky-700 text-sky-400 rounded hover:bg-sky-900/50 flex items-center gap-2"
            >
              <Download size={14} /> Export
            </button>
            <button
              onClick={handleImport}
              className="px-3 py-1.5 text-xs bg-sky-900/30 border border-sky-700 text-sky-400 rounded hover:bg-sky-900/50 flex items-center gap-2"
            >
              <Upload size={14} /> Import
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`px-4 py-1.5 text-xs border rounded flex items-center gap-2 ${
                hasChanges
                  ? "bg-sky-900/30 border-sky-700 text-sky-400 hover:bg-sky-900/50"
                  : "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
              }`}
            >
              <Save size={14} /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

