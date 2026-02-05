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
