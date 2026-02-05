#include "rigid_body.hpp"
#include <algorithm>
#include <cmath>

namespace aeronav {

RigidBody::RigidBody()
    : position_(Vector3::zero())
    , velocity_(Vector3::zero())
    , rotation_(Quaternion::identity())
    , angularVelocity_(Vector3::zero())
    , accumulatedForce_(Vector3::zero())
    , accumulatedTorque_(Vector3::zero())
    , config_()
{
}

RigidBody::RigidBody(const RigidBodyConfig& config)
    : position_(Vector3::zero())
    , velocity_(Vector3::zero())
    , rotation_(Quaternion::identity())
    , angularVelocity_(Vector3::zero())
    , accumulatedForce_(Vector3::zero())
    , accumulatedTorque_(Vector3::zero())
    , config_(config)
{
}

void RigidBody::applyForce(const Vector3& force) {
    accumulatedForce_ += force;
}

void RigidBody::applyForceAtPoint(const Vector3& force, const Vector3& point) {
    // Apply force at center of mass
    accumulatedForce_ += force;

    // Calculate torque from off-center force
    Vector3 r = point - position_;
    accumulatedTorque_ += r.cross(force);
}

void RigidBody::applyImpulse(const Vector3& impulse) {
    // Impulse directly changes velocity: delta_v = impulse / mass
    if (config_.mass > 0.0f) {
        velocity_ += impulse / config_.mass;
    }
}

void RigidBody::applyTorque(const Vector3& torque) {
    accumulatedTorque_ += torque;
}

void RigidBody::applyAngularImpulse(const Vector3& impulse) {
    // Angular impulse directly changes angular velocity
    // Simplified: assuming unit moment of inertia
    angularVelocity_ += impulse;
    clampAngularVelocity();
}

void RigidBody::clearForces() {
    accumulatedForce_ = Vector3::zero();
    accumulatedTorque_ = Vector3::zero();
}

void RigidBody::integrate(float deltaTime) {
    if (deltaTime <= 0.0f) return;

    // Clamp delta time to prevent instability
    deltaTime = std::min(deltaTime, 0.1f);

    // Calculate linear acceleration: F = ma, a = F/m
    Vector3 linearAcceleration = Vector3::zero();
    if (config_.mass > 0.0f) {
        linearAcceleration = accumulatedForce_ / config_.mass;
    }

    // Update velocity: v = v + a * dt
    velocity_ += linearAcceleration * deltaTime;

    // Calculate angular acceleration
    // Simplified: assuming unit moment of inertia tensor
    Vector3 angularAcceleration = accumulatedTorque_;

    // Update angular velocity
    angularVelocity_ += angularAcceleration * deltaTime;
    clampAngularVelocity();

    // Apply damping
    applyDamping(deltaTime);

    // Update position: x = x + v * dt
    position_ += velocity_ * deltaTime;

    // Update rotation from angular velocity
    // Using small angle approximation for quaternion integration
    if (angularVelocity_.lengthSquared() > 1e-10f) {
        float angVelMag = angularVelocity_.length();
        Vector3 axis = angularVelocity_ / angVelMag;
        float angle = angVelMag * deltaTime;

        Quaternion deltaRotation = Quaternion::fromAxisAngle(axis, angle);
        rotation_ = (rotation_ * deltaRotation).normalized();
    }

    // Clear accumulated forces for next frame
    clearForces();
}

void RigidBody::applyDamping(float deltaTime) {
    // Linear damping: velocity *= (1 - damping)^dt
    // Approximated as: velocity *= 1 - damping * dt for small dt
    float linearFactor = 1.0f - config_.linearDamping * deltaTime;
    linearFactor = std::max(linearFactor, 0.0f);
    velocity_ *= linearFactor;

    // Angular damping
    float angularFactor = 1.0f - config_.angularDamping * deltaTime;
    angularFactor = std::max(angularFactor, 0.0f);
    angularVelocity_ *= angularFactor;
}

void RigidBody::clampAngularVelocity() {
    float maxAngVel = config_.maxAngularVelocity;
    if (maxAngVel > 0.0f) {
        angularVelocity_ = angularVelocity_.clampMagnitude(maxAngVel);
    }
}

void RigidBody::reset() {
    position_ = Vector3::zero();
    velocity_ = Vector3::zero();
    rotation_ = Quaternion::identity();
    angularVelocity_ = Vector3::zero();
    clearForces();
}

} // namespace aeronav
