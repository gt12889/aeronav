// Configuration management utility

import defaultConfig from "../config/default.json";
import devConfig from "../config/development.json";
import prodConfig from "../config/production.json";

export interface SimulationConfig {
  fps: {
    target: number;
    training: number;
  };
  audio: {
    fftSize: number;
    bassThreshold: {
      normal: number;
      training: number;
    };
    useMicrophone: boolean;
  };
  rl: {
    epsilon: {
      normal: number;
      training: number;
    };
    learningRate: number;
    energy: {
      max: number;
      regen: number;
      costs: {
        GLIDE: number;
        BOOST: number;
        STABILIZE: number;
      };
    };
  };
  services: {
    updateInterval: number;
    errorRate: number;
    recoveryRate: number;
    latencySpikeChance: number;
  };
  visualization: {
    particles: {
      count: number;
      types: {
        bit: number;
        block: number;
      };
    };
    nebula: {
      count: number;
      baseHue: {
        min: number;
        max: number;
      };
    };
    grid: {
      scrollSpeed: {
        base: number;
        multiplier: number;
      };
    };
  };
}

export interface UIConfig {
  maxLogs: number;
  maxGraphPoints: number;
  performance: {
    updateInterval: number;
    frameHistorySize: number;
  };
}

export interface LoggingConfig {
  minLevel: "DEBUG" | "INFO" | "WARN" | "ERROR";
  enableConsole: boolean;
  enableStorage: boolean;
  maxStoredLogs: number;
}

export interface ExportConfig {
  defaultFormat: "json" | "csv" | "txt";
  includeMetadata: boolean;
}

export interface AppConfig {
  simulation: SimulationConfig;
  ui: UIConfig;
  logging: LoggingConfig;
  export: ExportConfig;
}

class ConfigManager {
  private config: AppConfig;
  private environment: string;

  constructor() {
    this.environment = this.detectEnvironment();
    this.config = this.loadConfig();
    this.applyConfig();
  }

  private detectEnvironment(): string {
    // Check for environment variable or URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const envParam = urlParams.get("env");
    if (envParam) {
      return envParam;
    }

    // Check localStorage for override
    const storedEnv = localStorage.getItem("aeronavsim_environment");
    if (storedEnv) {
      return storedEnv;
    }

    // Default to development if localhost, production otherwise
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "development";
    }

    return process.env.NODE_ENV === "production" ? "production" : "development";
  }

  private loadConfig(): AppConfig {
    const baseConfig = defaultConfig as AppConfig;
    const envConfig = this.environment === "production" ? prodConfig : devConfig;

    // Deep merge configurations
    return this.deepMerge(baseConfig, envConfig) as AppConfig;
  }

  private deepMerge(target: any, source: any): any {
    const output = { ...target };

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }

    return output;
  }

  private isObject(item: any): boolean {
    return item && typeof item === "object" && !Array.isArray(item);
  }

  private applyConfig(): void {
    // Apply logging configuration will be done after logger is imported
    // This is called from the module initialization
  }

  applyLoggingConfig(): void {
    // This method should be called after logger is available
    import("./logger.js").then(({ logger }) => {
      const logLevelMap = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
      };
      logger.setConfig({
        minLevel: logLevelMap[this.config.logging.minLevel],
        enableConsole: this.config.logging.enableConsole,
        enableStorage: this.config.logging.enableStorage,
        maxStoredLogs: this.config.logging.maxStoredLogs,
      });
    }).catch(() => {
      // Logger not available yet, will be applied later
    });
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  getSimulationConfig(): SimulationConfig {
    return { ...this.config.simulation };
  }

  getUIConfig(): UIConfig {
    return { ...this.config.ui };
  }

  getLoggingConfig(): LoggingConfig {
    return { ...this.config.logging };
  }

  getExportConfig(): ExportConfig {
    return { ...this.config.export };
  }

  getEnvironment(): string {
    return this.environment;
  }

  setEnvironment(env: string): void {
    this.environment = env;
    localStorage.setItem("aeronavsim_environment", env);
    this.config = this.loadConfig();
    this.applyConfig();
  }

  updateConfig(path: string, value: any): void {
    const keys = path.split(".");
    let current: any = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    this.saveConfig();
  }

  getConfigValue(path: string): any {
    const keys = path.split(".");
    let current: any = this.config;

    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  resetConfig(): void {
    localStorage.removeItem("aeronavsim_config");
    localStorage.removeItem("aeronavsim_environment");
    this.environment = this.detectEnvironment();
    this.config = this.loadConfig();
    this.applyConfig();
  }

  saveConfig(): void {
    try {
      localStorage.setItem("aeronavsim_config", JSON.stringify(this.config));
    } catch (e) {
      console.error("Failed to save config:", e);
    }
  }

  loadUserConfig(): void {
    try {
      const stored = localStorage.getItem("aeronavsim_config");
      if (stored) {
        const userConfig = JSON.parse(stored);
        this.config = this.deepMerge(this.config, userConfig);
        this.applyConfig();
      }
    } catch (e) {
      console.error("Failed to load user config:", e);
    }
  }

  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  importConfig(configJson: string): boolean {
    try {
      const imported = JSON.parse(configJson);
      this.config = this.deepMerge(this.loadConfig(), imported);
      this.saveConfig();
      this.applyConfig();
      return true;
    } catch (e) {
      console.error("Failed to import config:", e);
      return false;
    }
  }
}

// Singleton instance
export const configManager = new ConfigManager();

// Load any user-saved config on initialization and apply logging config
if (typeof window !== "undefined") {
  configManager.loadUserConfig();
  // Apply logging config after a short delay to ensure logger is loaded
  setTimeout(() => {
    configManager.applyLoggingConfig();
  }, 100);
}

