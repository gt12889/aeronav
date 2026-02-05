#include "multi_agent.hpp"
#include <algorithm>
#include <ctime>

namespace aeronav {

MultiAgentSystem::MultiAgentSystem() : nextAgentId_(0) {
    std::srand(static_cast<unsigned>(std::time(nullptr)));
}

float MultiAgentSystem::randomFloat() {
    return static_cast<float>(std::rand()) / static_cast<float>(RAND_MAX);
}

int MultiAgentSystem::randomInt(int max) {
    return std::rand() % max;
}

uint32_t MultiAgentSystem::createAgent(const AgentConfig& config) {
    AgentMetrics agent;
    agent.id = nextAgentId_++;
    agent.policy = config.policy;
    agent.action = ThrustAction::IDLE;
    agent.confidence = 0.0f;
    agent.reward = 0.0f;
    agent.energy = config.energy.max;
    agent.qTable = initializeQTable(config.policy);
    agent.totalSteps = 0;
    agent.coordinationScore = 0.5f;

    agents_.push_back(agent);
    configs_.push_back(config);
    return agent.id;
}

void MultiAgentSystem::removeAgent(uint32_t id) {
    for (size_t i = 0; i < agents_.size(); i++) {
        if (agents_[i].id == id) {
            agents_.erase(agents_.begin() + i);
            configs_.erase(configs_.begin() + i);
            return;
        }
    }
}

AgentMetrics* MultiAgentSystem::getAgent(uint32_t id) {
    for (auto& agent : agents_) {
        if (agent.id == id) return &agent;
    }
    return nullptr;
}

QTable MultiAgentSystem::initializeQTable(AgentPolicy policy) {
    QTable qt;
    switch (policy) {
        case AgentPolicy::CONSERVATIVE:
            qt.lowNoise = QValues(0.9f, 0.3f, 0.7f);
            qt.highNoise = QValues(0.5f, 0.2f, 0.95f);
            break;
        case AgentPolicy::AGGRESSIVE:
            qt.lowNoise = QValues(0.6f, 0.9f, 0.4f);
            qt.highNoise = QValues(0.3f, 0.7f, 0.8f);
            break;
        case AgentPolicy::EXPLORATORY:
            qt.lowNoise = QValues(0.7f, 0.6f, 0.5f);
            qt.highNoise = QValues(0.4f, 0.5f, 0.7f);
            break;
        case AgentPolicy::EXPLOITATIVE:
            qt.lowNoise = QValues(0.95f, 0.4f, 0.6f);
            qt.highNoise = QValues(0.3f, 0.2f, 0.98f);
            break;
        default: // BALANCED
            qt.lowNoise = QValues(0.8f, 0.6f, 0.2f);
            qt.highNoise = QValues(0.1f, 0.3f, 0.9f);
            break;
    }
    return qt;
}

ThrustAction MultiAgentSystem::selectAction(uint32_t agentId, NoiseState noiseState, bool isTraining) {
    size_t idx = 0;
    for (; idx < agents_.size(); idx++) {
        if (agents_[idx].id == agentId) break;
    }
    if (idx >= agents_.size()) return ThrustAction::IDLE;

    AgentMetrics& agent = agents_[idx];
    const AgentConfig& config = configs_[idx];
    float epsilon = isTraining ? config.epsilonTraining : config.epsilonNormal;
    const QValues& qv = (noiseState == NoiseState::LOW_NOISE) ? agent.qTable.lowNoise : agent.qTable.highNoise;

    // Epsilon-greedy exploration
    if (randomFloat() < epsilon) {
        if (config.policy == AgentPolicy::CONSERVATIVE) {
            return (randomInt(2) == 0) ? ThrustAction::GLIDE : ThrustAction::STABILIZE;
        } else if (config.policy == AgentPolicy::AGGRESSIVE) {
            return (randomInt(2) == 0) ? ThrustAction::BOOST : ThrustAction::STABILIZE;
        }
        return static_cast<ThrustAction>(randomInt(3) + 1); // GLIDE, BOOST, or STABILIZE
    }

    // Exploitation: pick best Q-value
    if (qv.glide >= qv.boost && qv.glide >= qv.stabilize) return ThrustAction::GLIDE;
    if (qv.boost >= qv.stabilize) return ThrustAction::BOOST;
    return ThrustAction::STABILIZE;
}

float MultiAgentSystem::calculateReward(uint32_t agentId, NoiseState noiseState, ThrustAction action, float energyLevel) {
    size_t idx = 0;
    for (; idx < agents_.size(); idx++) {
        if (agents_[idx].id == agentId) break;
    }
    if (idx >= agents_.size()) return 0.0f;

    const AgentConfig& config = configs_[idx];
    float reward = 0.0f;

    // Base reward logic
    if (noiseState == NoiseState::HIGH_NOISE) {
        if (action == ThrustAction::STABILIZE) reward = 0.9f;
        else if (action == ThrustAction::BOOST) reward = 0.3f;
        else reward = 0.1f;
    } else {
        if (action == ThrustAction::BOOST) reward = 0.8f;
        else if (action == ThrustAction::GLIDE) reward = 0.7f;
        else reward = 0.2f;
    }

    // Policy adjustments
    if (config.policy == AgentPolicy::CONSERVATIVE) {
        if (action == ThrustAction::BOOST) reward -= 0.2f;
        if (energyLevel > 70.0f) reward += 0.1f;
    } else if (config.policy == AgentPolicy::AGGRESSIVE) {
        if (action == ThrustAction::BOOST) reward += 0.1f;
        if (energyLevel < 20.0f) reward -= 0.2f;
    }

    // Energy penalty
    if (energyLevel < 20.0f) reward -= 0.5f;
    if (energyLevel > 80.0f) reward += 0.1f;

    return std::max(-1.0f, std::min(1.0f, reward));
}

void MultiAgentSystem::updateQTable(uint32_t agentId, NoiseState noiseState, ThrustAction action, float reward) {
    size_t idx = 0;
    for (; idx < agents_.size(); idx++) {
        if (agents_[idx].id == agentId) break;
    }
    if (idx >= agents_.size()) return;

    AgentMetrics& agent = agents_[idx];
    const AgentConfig& config = configs_[idx];
    QValues& qv = (noiseState == NoiseState::LOW_NOISE) ? agent.qTable.lowNoise : agent.qTable.highNoise;

    float* qPtr = nullptr;
    switch (action) {
        case ThrustAction::GLIDE: qPtr = &qv.glide; break;
        case ThrustAction::BOOST: qPtr = &qv.boost; break;
        case ThrustAction::STABILIZE: qPtr = &qv.stabilize; break;
        default: return;
    }

    float currentQ = *qPtr;
    float newQ = currentQ + config.learningRate * (reward - currentQ);
    *qPtr = std::max(0.0f, std::min(1.0f, newQ));
    agent.totalSteps++;
}
