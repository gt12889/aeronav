// Utility functions for exporting data in various formats

import type { LogEntry, ServiceStatus, AgentMetrics, RLMetrics, PerformanceMetrics, AudioData } from "../types/index.js";

export interface ExportableState {
  timestamp: string;
  services: ServiceStatus[];
  logs: LogEntry[];
  agentMetrics: AgentMetrics;
  rlMetrics: RLMetrics;
  performanceMetrics: PerformanceMetrics;
  audioData: AudioData;
  isTraining: boolean;
  isSimRunning: boolean;
}

/**
 * Export logs to CSV format
 */
export const exportLogsToCSV = (logs: LogEntry[]): void => {
  const headers = ["Timestamp", "Service", "Level", "Protocol", "Message"];
  const rows = logs.map(log => [
    log.timestamp,
    log.service,
    log.level,
    log.protocol || "",
    log.message.replace(/"/g, '""') // Escape quotes for CSV
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  downloadFile(csvContent, `logs-${getTimestamp()}.csv`, "text/csv");
};

/**
 * Export logs to JSON format
 */
export const exportLogsToJSON = (logs: LogEntry[]): void => {
  const jsonContent = JSON.stringify(logs, null, 2);
  downloadFile(jsonContent, `logs-${getTimestamp()}.json`, "application/json");
};

/**
 * Export metrics to CSV format
 */
export const exportMetricsToCSV = (rlMetrics: RLMetrics, agentMetrics: AgentMetrics): void => {
  const headers = ["Epoch", "Loss", "Reward", "Accuracy", "Action", "Confidence", "Reward_Agent", "Energy"];
  
  // Create rows for each epoch
  const maxLength = Math.max(
    rlMetrics.loss.length,
    rlMetrics.reward.length,
    1
  );

  const rows: string[][] = [];
  for (let i = 0; i < maxLength; i++) {
    rows.push([
      i === 0 ? rlMetrics.epoch.toString() : "",
      i < rlMetrics.loss.length ? rlMetrics.loss[i].toFixed(4) : "",
      i < rlMetrics.reward.length ? rlMetrics.reward[i].toFixed(4) : "",
      i === 0 ? rlMetrics.accuracy.toFixed(4) : "",
      i === 0 ? agentMetrics.action : "",
      i === 0 ? agentMetrics.confidence.toFixed(4) : "",
      i === 0 ? agentMetrics.reward.toFixed(4) : "",
      i === 0 ? agentMetrics.energy.toFixed(2) : "",
    ]);
  }

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  downloadFile(csvContent, `metrics-${getTimestamp()}.csv`, "text/csv");
};

/**
 * Export metrics to JSON format
 */
export const exportMetricsToJSON = (rlMetrics: RLMetrics, agentMetrics: AgentMetrics): void => {
  const data = {
    timestamp: new Date().toISOString(),
    rlMetrics,
    agentMetrics,
  };
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `metrics-${getTimestamp()}.json`, "application/json");
};

/**
 * Export full application state to JSON
 */
export const exportStateToJSON = (state: ExportableState): void => {
  const jsonContent = JSON.stringify(state, null, 2);
  downloadFile(jsonContent, `aeronavsim-state-${getTimestamp()}.json`, "application/json");
};

/**
 * Export scene state (for future USD/3D export integration)
 */
export const exportSceneState = (sceneData: {
  spaceship: { x: number; y: number; roll: number };
  particles: any[];
  nebula: any[];
  timestamp: string;
}): void => {
  const jsonContent = JSON.stringify(sceneData, null, 2);
  downloadFile(jsonContent, `scene-state-${getTimestamp()}.json`, "application/json");
};

/**
 * Export performance metrics to CSV
 */
export const exportPerformanceToCSV = (metrics: PerformanceMetrics[]): void => {
  if (metrics.length === 0) return;

  const headers = ["Timestamp", "FPS", "FrameTime", "RenderTime", "MemoryUsage", "AudioProcessingTime"];
  const rows = metrics.map(m => [
    new Date(m.lastUpdate).toISOString(),
    m.fps.toString(),
    m.frameTime.toFixed(2),
    m.renderTime.toFixed(2),
    m.memoryUsage?.toFixed(2) || "",
    m.audioProcessingTime?.toFixed(2) || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  downloadFile(csvContent, `performance-${getTimestamp()}.csv`, "text/csv");
};

/**
 * Helper function to download a file
 */
const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Get formatted timestamp for filenames
 */
const getTimestamp = (): string => {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
};

