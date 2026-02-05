#include "physics_engine.hpp"
#include <algorithm>
#include <cmath>

namespace aeronav {

PhysicsEngine::PhysicsEngine()
    : body_()
    , config_()
    , targetPosition_(Vector3::zero())
{
    // Apply default config to body
    body_.setMass(config_.mass);
    body_.setLinearDamping(config_.linearDamping);
    body_.setAngularDamping(config_.angularDamping);
    body_.setDragCoefficient(config_.dragCoefficient);
    body_.setMaxAngularVelocity(config_.maxAngularVelocity);
}

PhysicsEngine::PhysicsEngine(const SpaceshipConfig& config)
    : body_()
    , config_(config)
    , targetPosition_(Vector3::zero())
{
    // Apply config to body
    body_.setMass(config_.mass);
    body_.setLinearDamping(config_.linearDamping);
    body_.setAngularDamping(config_.angularDamping);
    body_.setDragCoefficient(config_.dragCoefficient);
    body_.setMaxAngularVelocity(config_.maxAngularVelocity);
}

void PhysicsEngine::step(float deltaTime) {
    // Clamp delta time to prevent instability (matching JS: max 0.1s)
    deltaTime = std::min(deltaTime, 0.1f);

    if (deltaTime <= 0.0f) return;

    // Integrate physics
    body_.integrate(deltaTime);
}

void PhysicsEngine::reset(float x, float y, float z) {
    body_.reset();
    body_.setPosition(Vector3(x, y, z));
    targetPosition_ = Vector3::zero();
}

void PhysicsEngine::setTarget(float x, float y, float z) {
    targetPosition_ = Vector3(x, y, z);
}

Vector3 PhysicsEngine::getDirectionToTarget() const {
    Vector3 direction = targetPosition_ - body_.getPosition();
    float length = direction.length();
    if (length > 1e-6f) {
        return direction / length;
    }
    return Vector3::zero();
}

float PhysicsEngine::getDistanceToTarget() const {
    return (targetPosition_ - body_.getPosition()).length();
}

void PhysicsEngine::applyDragForce() {
    Vector3 velocity = body_.getVelocity();
    float speed = velocity.length();
    if (speed > 1e-6f) {
        // Drag force proportional to velocity squared (magnitude) in opposite direction
        float dragMagnitude = config_.dragCoefficient * speed;
        Vector3 dragForce = velocity.normalized() * (-dragMagnitude);
        body_.applyForce(dragForce);
    }
}

void PhysicsEngine::applyThrust(ThrustAction action, float intensity) {
    float distance = getDistanceToTarget();

    // Don't apply thrust if very close to target (matching JS: 0.1)
    if (distance <= 0.1f) return;

    Vector3 direction = getDirectionToTarget();
    Vector3 force = Vector3::zero();

    switch (action) {
        case ThrustAction::BOOST:
            // Maximum thrust towards target (1.5x multiplier)
            {
                float boostForce = config_.maxThrust * intensity * 1.5f;
                force = direction * boostForce;
            }
            break;

        case ThrustAction::GLIDE:
            // Minimal thrust, mostly coasting (0.3x multiplier)
            {
                float glideForce = config_.maxThrust * intensity * 0.3f;
                force = direction * glideForce;
                // Apply additional drag during glide
                applyDragForce();
            }
            break;

        case ThrustAction::STABILIZE:
            // Stabilizing thrust with angular damping (0.5x multiplier)
            {
                float stabilizeForce = config_.maxThrust * intensity * 0.5f;
                force = direction * stabilizeForce;

                // Apply extra angular damping for stabilization
                Vector3 angVel = body_.getAngularVelocity();
                body_.setAngularVelocity(angVel * 0.7f);
            }
            break;

        case ThrustAction::IDLE:
        default:
            // Just apply drag
            applyDragForce();
            break;
    }

    if (force.lengthSquared() > 1e-6f) {
        body_.applyForce(force);
    }
}

void PhysicsEngine::applyThrustByName(int action, float intensity) {
    ThrustAction thrustAction;
    switch (action) {
        case 0: thrustAction = ThrustAction::IDLE; break;
        case 1: thrustAction = ThrustAction::GLIDE; break;
        case 2: thrustAction = ThrustAction::BOOST; break;
        case 3: thrustAction = ThrustAction::STABILIZE; break;
        default: thrustAction = ThrustAction::IDLE; break;
    }
    applyThrust(thrustAction, intensity);
}

void PhysicsEngine::applyBanking(float desiredRoll, float rollFactor) {
    float currentRoll = getRoll();
    float rollDifference = desiredRoll - currentRoll;

    // Apply torque to achieve desired roll (matching JS implementation)
    Vector3 torque(0.0f, 0.0f, rollDifference * rollFactor * 100.0f);
    body_.applyTorque(torque);
}

PhysicsState PhysicsEngine::getState() const {
    PhysicsState state;
    state.position = body_.getPosition();
    state.velocity = body_.getVelocity();

    // Convert quaternion to Euler for compatibility with JS frontend
    // Note: JS stores quaternion x,y,z in rotation (not w), so we match that
    Quaternion q = body_.getRotation();
    state.rotation = Vector3(q.x, q.y, q.z);

    state.angularVelocity = body_.getAngularVelocity();
    return state;
}

float PhysicsEngine::getRoll() const {
    Quaternion q = body_.getRotation();
    float sinr_cosp = 2.0f * (q.w * q.x + q.y * q.z);
    float cosr_cosp = 1.0f - 2.0f * (q.x * q.x + q.y * q.y);
    return std::atan2(sinr_cosp, cosr_cosp);
}

float PhysicsEngine::getPitch() const {
    Quaternion q = body_.getRotation();
    float sinp = 2.0f * (q.w * q.y - q.z * q.x);
    if (std::abs(sinp) >= 1.0f) {
        return std::copysign(3.14159265358979f * 0.5f, sinp);
    }
    return std::asin(sinp);
}

float PhysicsEngine::getYaw() const {
    Quaternion q = body_.getRotation();
    float siny_cosp = 2.0f * (q.w * q.z + q.x * q.y);
    float cosy_cosp = 1.0f - 2.0f * (q.y * q.y + q.z * q.z);
    return std::atan2(siny_cosp, cosy_cosp);
}

float PhysicsEngine::getSpeed() const {
    return body_.getVelocity().length();
}

void PhysicsEngine::setConfig(const SpaceshipConfig& config) {
    config_ = config;
    body_.setMass(config_.mass);
    body_.setLinearDamping(config_.linearDamping);
    body_.setAngularDamping(config_.angularDamping);
    body_.setDragCoefficient(config_.dragCoefficient);
    body_.setMaxAngularVelocity(config_.maxAngularVelocity);
}

void PhysicsEngine::setMass(float mass) {
    config_.mass = mass;
    body_.setMass(mass);
}

void PhysicsEngine::setMaxThrust(float thrust) {
    config_.maxThrust = thrust;
}

void PhysicsEngine::setMaxAngularVelocity(float maxAngVel) {
    config_.maxAngularVelocity = maxAngVel;
    body_.setMaxAngularVelocity(maxAngVel);
}

void PhysicsEngine::setLinearDamping(float damping) {
    config_.linearDamping = damping;
    body_.setLinearDamping(damping);
}

void PhysicsEngine::setAngularDamping(float damping) {
    config_.angularDamping = damping;
    body_.setAngularDamping(damping);
}

void PhysicsEngine::setDragCoefficient(float drag) {
    config_.dragCoefficient = drag;
    body_.setDragCoefficient(drag);
}

} // namespace aeronav
