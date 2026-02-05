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
