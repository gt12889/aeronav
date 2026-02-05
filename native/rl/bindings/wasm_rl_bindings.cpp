#include <emscripten/bind.h>
#include "../src/multi_agent.hpp"

using namespace emscripten;
using namespace aeronav;

EMSCRIPTEN_BINDINGS(aeronav_rl) {
    enum_<AgentPolicy>("AgentPolicy")
        .value("BALANCED", AgentPolicy::BALANCED)
        .value("CONSERVATIVE", AgentPolicy::CONSERVATIVE)
        .value("AGGRESSIVE", AgentPolicy::AGGRESSIVE)
        .value("EXPLORATORY", AgentPolicy::EXPLORATORY)
        .value("EXPLOITATIVE", AgentPolicy::EXPLOITATIVE);

    enum_<ThrustAction>("ThrustAction")
        .value("IDLE", ThrustAction::IDLE)
        .value("GLIDE", ThrustAction::GLIDE)
        .value("BOOST", ThrustAction::BOOST)
        .value("STABILIZE", ThrustAction::STABILIZE);

    enum_<NoiseState>("NoiseState")
        .value("LOW_NOISE", NoiseState::LOW_NOISE)
        .value("HIGH_NOISE", NoiseState::HIGH_NOISE);

    enum_<CoordinationType>("CoordinationType")
        .value("COOPERATION", CoordinationType::COOPERATION)
        .value("CONFLICT", CoordinationType::CONFLICT)
        .value("INDEPENDENCE", CoordinationType::INDEPENDENCE);

    value_object<QValues>("QValues")
        .field("glide", &QValues::glide)
        .field("boost", &QValues::boost)
        .field("stabilize", &QValues::stabilize);

    value_object<QTable>("QTable")
        .field("lowNoise", &QTable::lowNoise)
        .field("highNoise", &QTable::highNoise);

    value_object<EnergyConfig>("EnergyConfig")
        .field("max", &EnergyConfig::max)
        .field("regen", &EnergyConfig::regen)
        .field("costGlide", &EnergyConfig::costGlide)
        .field("costBoost", &EnergyConfig::costBoost)
        .field("costStabilize", &EnergyConfig::costStabilize);

    value_object<AgentConfig>("AgentConfig")
        .field("policy", &AgentConfig::policy)
        .field("epsilonNormal", &AgentConfig::epsilonNormal)
        .field("epsilonTraining", &AgentConfig::epsilonTraining)
        .field("learningRate", &AgentConfig::learningRate)
        .field("energy", &AgentConfig::energy);

    value_object<AgentMetrics>("AgentMetrics")
        .field("id", &AgentMetrics::id)
        .field("policy", &AgentMetrics::policy)
        .field("action", &AgentMetrics::action)
        .field("confidence", &AgentMetrics::confidence)
        .field("reward", &AgentMetrics::reward)
        .field("energy", &AgentMetrics::energy)
        .field("qTable", &AgentMetrics::qTable)
        .field("totalSteps", &AgentMetrics::totalSteps)
        .field("coordinationScore", &AgentMetrics::coordinationScore);

    value_object<CoordinationEvent>("CoordinationEvent")
        .field("timestamp", &CoordinationEvent::timestamp)
        .field("agent1Id", &CoordinationEvent::agent1Id)
        .field("agent2Id", &CoordinationEvent::agent2Id)
        .field("type", &CoordinationEvent::type);
