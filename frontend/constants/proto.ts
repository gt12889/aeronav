// Protocol Buffer definitions for simulated gRPC contracts

// These constants are now managed by config, but kept here for backward compatibility
// Import configManager to get current values
export const FFT_SIZE = 512; // Must be power of 2 (default, use config for actual value)
export const MAX_LOGS = 50; // Default, use config for actual value
export const MAX_GRAPH_POINTS = 30; // Default, use config for actual value

export const PROTO_DEFINITION = `syntax = "proto3";

package beatsync;

// Controller -> Nav Agent
service FlightController {
  // Adjust thrust vectors
  rpc ApplyThrust (ThrustRequest) returns (ThrustResponse);
  
  // Set navigation waypoint
  rpc SetWaypoint (WaypointRequest) returns (WaypointResponse);
}

// Controller -> System Agent
service SystemController {
  // Update Shield/HUD
  rpc UpdateSystems (SystemRequest) returns (SystemResponse);
}

// RL Optimizer -> Autopilot
service Optimizer {
  // Update flight path parameters
  rpc UpdateModel (ModelUpdate) returns (Ack);
  
  // Send batch experience
  rpc SendExperience (BatchExperience) returns (Ack);
}

message ThrustRequest {
  float intensity = 1;
  Vector3 vector = 2;
  int64 timestamp_ms = 3;
}

message WaypointRequest {
  string id = 1;
  Vector3 coordinates = 2;
  float velocity_limit = 3;
}

message Vector3 {
  float x = 1;
  float y = 2;
  float z = 3;
}`;

