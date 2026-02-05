#include <emscripten/bind.h>
#include "../src/physics_engine.hpp"

using namespace emscripten;
using namespace aeronav;

// Helper class to expose Vector3 properties to JS
struct Vector3JS {
    float x, y, z;

    static Vector3JS fromVector3(const Vector3& v) {
        return { v.x, v.y, v.z };
    }
};

// Helper class to expose PhysicsState to JS
struct PhysicsStateJS {
    Vector3JS position;
    Vector3JS velocity;
    Vector3JS rotation;
    Vector3JS angularVelocity;

    static PhysicsStateJS fromPhysicsState(const PhysicsState& state) {
        return {
            Vector3JS::fromVector3(state.position),
            Vector3JS::fromVector3(state.velocity),
            Vector3JS::fromVector3(state.rotation),
            Vector3JS::fromVector3(state.angularVelocity)
        };
    }
};

// Wrapper class for PhysicsEngine with JS-friendly interface
class PhysicsEngineWrapper {
public:
    PhysicsEngineWrapper() : engine_() {}

    PhysicsEngineWrapper(float mass, float maxThrust, float maxAngularVelocity,
                         float linearDamping, float angularDamping, float dragCoefficient) {
        SpaceshipConfig config;
        config.mass = mass;
        config.maxThrust = maxThrust;
        config.maxAngularVelocity = maxAngularVelocity;
        config.linearDamping = linearDamping;
        config.angularDamping = angularDamping;
        config.dragCoefficient = dragCoefficient;
        engine_ = PhysicsEngine(config);
    }

    void step(float deltaTime) {
        engine_.step(deltaTime);
    }

    void reset(float x, float y, float z) {
        engine_.reset(x, y, z);
    }

    void setTarget(float x, float y, float z) {
        engine_.setTarget(x, y, z);
    }

    // Action as integer: 0=IDLE, 1=GLIDE, 2=BOOST, 3=STABILIZE
    void applyThrust(int action, float intensity) {
        engine_.applyThrustByName(action, intensity);
    }

    void applyBanking(float desiredRoll, float rollFactor) {
        engine_.applyBanking(desiredRoll, rollFactor);
    }

    PhysicsStateJS getState() const {
        return PhysicsStateJS::fromPhysicsState(engine_.getState());
    }

    Vector3JS getPosition() const {
        return Vector3JS::fromVector3(engine_.getPosition());
    }

    Vector3JS getVelocity() const {
        return Vector3JS::fromVector3(engine_.getVelocity());
    }

    Vector3JS getAngularVelocity() const {
        return Vector3JS::fromVector3(engine_.getAngularVelocity());
    }

    float getRoll() const { return engine_.getRoll(); }
    float getPitch() const { return engine_.getPitch(); }
    float getYaw() const { return engine_.getYaw(); }
    float getSpeed() const { return engine_.getSpeed(); }

    // Configuration setters
    void setMass(float mass) { engine_.setMass(mass); }
    void setMaxThrust(float thrust) { engine_.setMaxThrust(thrust); }
    void setMaxAngularVelocity(float maxAngVel) { engine_.setMaxAngularVelocity(maxAngVel); }
    void setLinearDamping(float damping) { engine_.setLinearDamping(damping); }
    void setAngularDamping(float damping) { engine_.setAngularDamping(damping); }
    void setDragCoefficient(float drag) { engine_.setDragCoefficient(drag); }

private:
    PhysicsEngine engine_;
};

EMSCRIPTEN_BINDINGS(aeronav_physics) {
    // Bind Vector3JS as a value object
    value_object<Vector3JS>("Vector3")
        .field("x", &Vector3JS::x)
        .field("y", &Vector3JS::y)
        .field("z", &Vector3JS::z);

    // Bind PhysicsStateJS
    value_object<PhysicsStateJS>("PhysicsState")
        .field("position", &PhysicsStateJS::position)
        .field("velocity", &PhysicsStateJS::velocity)
        .field("rotation", &PhysicsStateJS::rotation)
        .field("angularVelocity", &PhysicsStateJS::angularVelocity);

    // Bind the main PhysicsEngine wrapper class
    class_<PhysicsEngineWrapper>("PhysicsEngine")
        .constructor<>()
        .constructor<float, float, float, float, float, float>()
        .function("step", &PhysicsEngineWrapper::step)
        .function("reset", &PhysicsEngineWrapper::reset)
        .function("setTarget", &PhysicsEngineWrapper::setTarget)
        .function("applyThrust", &PhysicsEngineWrapper::applyThrust)
        .function("applyBanking", &PhysicsEngineWrapper::applyBanking)
        .function("getState", &PhysicsEngineWrapper::getState)
        .function("getPosition", &PhysicsEngineWrapper::getPosition)
        .function("getVelocity", &PhysicsEngineWrapper::getVelocity)
        .function("getAngularVelocity", &PhysicsEngineWrapper::getAngularVelocity)
        .function("getRoll", &PhysicsEngineWrapper::getRoll)
        .function("getPitch", &PhysicsEngineWrapper::getPitch)
        .function("getYaw", &PhysicsEngineWrapper::getYaw)
        .function("getSpeed", &PhysicsEngineWrapper::getSpeed)
        .function("setMass", &PhysicsEngineWrapper::setMass)
        .function("setMaxThrust", &PhysicsEngineWrapper::setMaxThrust)
        .function("setMaxAngularVelocity", &PhysicsEngineWrapper::setMaxAngularVelocity)
        .function("setLinearDamping", &PhysicsEngineWrapper::setLinearDamping)
        .function("setAngularDamping", &PhysicsEngineWrapper::setAngularDamping)
        .function("setDragCoefficient", &PhysicsEngineWrapper::setDragCoefficient);

    // Thrust action constants
    constant("THRUST_IDLE", 0);
    constant("THRUST_GLIDE", 1);
    constant("THRUST_BOOST", 2);
    constant("THRUST_STABILIZE", 3);
}
