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
