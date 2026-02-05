#pragma once

#include "vector3.hpp"
#include "quaternion.hpp"

namespace aeronav {

// Physical properties for a rigid body
struct RigidBodyConfig {
    float mass = 1000.0f;           // kg
    float linearDamping = 0.8f;     // Linear velocity damping (0-1)
    float angularDamping = 0.9f;    // Angular velocity damping (0-1)
    float dragCoefficient = 0.1f;   // Aerodynamic drag coefficient
    float maxAngularVelocity = 2.0f; // Maximum angular velocity (rad/s)
};

class RigidBody {
public:
    // Constructors
    RigidBody();
    explicit RigidBody(const RigidBodyConfig& config);

    // Position and velocity
    Vector3 getPosition() const { return position_; }
    void setPosition(const Vector3& pos) { position_ = pos; }

    Vector3 getVelocity() const { return velocity_; }
    void setVelocity(const Vector3& vel) { velocity_ = vel; }

    // Rotation
    Quaternion getRotation() const { return rotation_; }
    void setRotation(const Quaternion& rot) { rotation_ = rot.normalized(); }

    Vector3 getAngularVelocity() const { return angularVelocity_; }
    void setAngularVelocity(const Vector3& angVel) { angularVelocity_ = angVel; }

    // Configuration
    float getMass() const { return config_.mass; }
    void setMass(float mass) { config_.mass = mass; }

    float getLinearDamping() const { return config_.linearDamping; }
    void setLinearDamping(float damping) { config_.linearDamping = damping; }

    float getAngularDamping() const { return config_.angularDamping; }
    void setAngularDamping(float damping) { config_.angularDamping = damping; }

    float getDragCoefficient() const { return config_.dragCoefficient; }
    void setDragCoefficient(float drag) { config_.dragCoefficient = drag; }

    float getMaxAngularVelocity() const { return config_.maxAngularVelocity; }
    void setMaxAngularVelocity(float maxAngVel) { config_.maxAngularVelocity = maxAngVel; }

    // Force and torque application
    void applyForce(const Vector3& force);
    void applyForceAtPoint(const Vector3& force, const Vector3& point);
    void applyImpulse(const Vector3& impulse);
    void applyTorque(const Vector3& torque);
    void applyAngularImpulse(const Vector3& impulse);

    // Clear accumulated forces
    void clearForces();

    // Integration step
    void integrate(float deltaTime);

    // Speed helpers
    float getSpeed() const { return velocity_.length(); }
    Vector3 getForwardDirection() const { return rotation_.getForward(); }

    // Reset to initial state
    void reset();

private:
    // State
    Vector3 position_;
    Vector3 velocity_;
    Quaternion rotation_;
    Vector3 angularVelocity_;

    // Accumulated forces/torques (cleared each frame)
    Vector3 accumulatedForce_;
    Vector3 accumulatedTorque_;

    // Configuration
    RigidBodyConfig config_;

    // Apply damping
    void applyDamping(float deltaTime);
    void clampAngularVelocity();
};

} // namespace aeronav
