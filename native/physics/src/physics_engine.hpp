#pragma once

#include "vector3.hpp"
#include "quaternion.hpp"
#include "rigid_body.hpp"

namespace aeronav {

// Thrust action types (matching JS implementation)
enum class ThrustAction {
    IDLE = 0,
    GLIDE = 1,
    BOOST = 2,
    STABILIZE = 3
};

// Configuration for the spaceship physics
struct SpaceshipConfig {
    float mass = 1000.0f;           // kg
    float maxThrust = 5000.0f;      // N
    float maxAngularVelocity = 2.0f; // rad/s
    float linearDamping = 0.8f;     // Linear velocity damping
    float angularDamping = 0.9f;    // Angular velocity damping
    float dragCoefficient = 0.1f;   // Aerodynamic drag
};

// Physics state output (matching JS PhysicsState interface)
struct PhysicsState {
    Vector3 position;
    Vector3 velocity;
    Vector3 rotation; // Euler angles for compatibility
    Vector3 angularVelocity;
};

class PhysicsEngine {
public:
    PhysicsEngine();
    explicit PhysicsEngine(const SpaceshipConfig& config);

    // Core simulation
    void step(float deltaTime);
    void reset(float x = 0.0f, float y = 0.0f, float z = 0.0f);

    // Target navigation
    void setTarget(float x, float y, float z);
    Vector3 getTarget() const { return targetPosition_; }

    // Force application (matching JS API)
    void applyThrust(ThrustAction action, float intensity = 1.0f);
    void applyThrustByName(int action, float intensity = 1.0f); // For WASM binding
    void applyBanking(float desiredRoll, float rollFactor = 0.1f);

    // State queries
    PhysicsState getState() const;
    float getRoll() const;
    float getPitch() const;
    float getYaw() const;
    float getSpeed() const;

    // Direct state access
    Vector3 getPosition() const { return body_.getPosition(); }
    Vector3 getVelocity() const { return body_.getVelocity(); }
    Quaternion getRotation() const { return body_.getRotation(); }
    Vector3 getAngularVelocity() const { return body_.getAngularVelocity(); }

    // Configuration
    void setConfig(const SpaceshipConfig& config);
    SpaceshipConfig getConfig() const { return config_; }

    // Individual config setters (for WASM binding)
    void setMass(float mass);
    void setMaxThrust(float thrust);
    void setMaxAngularVelocity(float maxAngVel);
    void setLinearDamping(float damping);
    void setAngularDamping(float damping);
    void setDragCoefficient(float drag);

private:
    RigidBody body_;
    SpaceshipConfig config_;
    Vector3 targetPosition_;

    void applyDragForce();
    Vector3 getDirectionToTarget() const;
    float getDistanceToTarget() const;
};

} // namespace aeronav
