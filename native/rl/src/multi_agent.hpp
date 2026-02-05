#pragma once

#include <cstdint>
#include <cstddef>
#include <cmath>
#include <cstdlib>
#include <vector>
#include <string>

namespace aeronav {

// Agent policy types
enum class AgentPolicy : uint8_t {
    BALANCED = 0,
    CONSERVATIVE = 1,
    AGGRESSIVE = 2,
    EXPLORATORY = 3,
    EXPLOITATIVE = 4
};

// Thrust actions
enum class ThrustAction : uint8_t {
    IDLE = 0,
    GLIDE = 1,
    BOOST = 2,
    STABILIZE = 3
};

// Noise state
enum class NoiseState : uint8_t {
    LOW_NOISE = 0,
    HIGH_NOISE = 1
};

// Coordination event types
enum class CoordinationType : uint8_t {
    COOPERATION = 0,
    CONFLICT = 1,
    INDEPENDENCE = 2
};

// Q-values for a single noise state
struct QValues {
    float glide;
    float boost;
    float stabilize;

    QValues() : glide(0.5f), boost(0.5f), stabilize(0.5f) {}
    QValues(float g, float b, float s) : glide(g), boost(b), stabilize(s) {}
};

// Q-table with both noise states
struct QTable {
    QValues lowNoise;
    QValues highNoise;
};

// Agent energy configuration
struct EnergyConfig {
    float max;
    float regen;
    float costGlide;
    float costBoost;
    float costStabilize;

    EnergyConfig()
        : max(100.0f), regen(1.5f)
        , costGlide(0.5f), costBoost(5.0f), costStabilize(3.0f) {}
};

// Agent configuration
struct AgentConfig {
    AgentPolicy policy;
    float epsilonNormal;
    float epsilonTraining;
    float learningRate;
    EnergyConfig energy;

    AgentConfig()
        : policy(AgentPolicy::BALANCED)
        , epsilonNormal(0.05f)
        , epsilonTraining(0.3f)
        , learningRate(0.1f)
        , energy() {}
};

// Agent metrics/state
struct AgentMetrics {
    uint32_t id;
    AgentPolicy policy;
    ThrustAction action;
    float confidence;
    float reward;
    float energy;
    QTable qTable;
    uint32_t totalSteps;
    float coordinationScore;
};

// Coordination event
struct CoordinationEvent {
    uint32_t timestamp;
    uint32_t agent1Id;
    uint32_t agent2Id;
    CoordinationType type;
};

/**
 * Multi-agent reinforcement learning system
 */
class MultiAgentSystem {
public:
    MultiAgentSystem();

    // Agent management
    uint32_t createAgent(const AgentConfig& config);
    void removeAgent(uint32_t id);
    AgentMetrics* getAgent(uint32_t id);
    size_t getAgentCount() const { return agents_.size(); }

    // Core RL operations
    ThrustAction selectAction(uint32_t agentId, NoiseState noiseState, bool isTraining);
    float calculateReward(uint32_t agentId, NoiseState noiseState, ThrustAction action, float energyLevel);
    void updateQTable(uint32_t agentId, NoiseState noiseState, ThrustAction action, float reward);

    // Step all agents
    void stepAll(NoiseState noiseState, bool isTraining);

    // Coordination
    void detectCoordination(uint32_t timestamp);
    float calculateCoordinationScore(uint32_t agentId);
    size_t getCoordinationEventCount() const { return recentEvents_.size(); }
    CoordinationEvent getCoordinationEvent(size_t index) const;
    void clearCoordinationEvents();

    // Energy management
    void regenEnergy(uint32_t agentId, float deltaTime);
    void consumeEnergy(uint32_t agentId, ThrustAction action);

    // Getters for all agents (for WASM binding)
    std::vector<AgentMetrics>& getAgents() { return agents_; }

private:
    std::vector<AgentMetrics> agents_;
    std::vector<AgentConfig> configs_;
    std::vector<CoordinationEvent> recentEvents_;
    uint32_t nextAgentId_;

    // Initialize Q-table based on policy
    QTable initializeQTable(AgentPolicy policy);

    // Random number generation
    float randomFloat();
    int randomInt(int max);
};

// Standalone utility functions
QTable getDefaultQTable(AgentPolicy policy);
float getEnergyCost(ThrustAction action, const EnergyConfig& config);

} // namespace aeronav
