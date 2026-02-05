#include "audio_augmentation.hpp"
#include <algorithm>
#include <cstdlib>
#include <ctime>

namespace aeronav {

AudioAugmenter::AudioAugmenter()
    : b0_(0), b1_(0), b2_(0), b3_(0), b4_(0), b5_(0), b6_(0), brownLast_(0) {
    std::srand(static_cast<unsigned>(std::time(nullptr)));
}

float AudioAugmenter::randomFloat() {
    return static_cast<float>(std::rand()) / static_cast<float>(RAND_MAX);
}

static float clamp01(float v) { return std::max(0.0f, std::min(1.0f, v)); }

AudioData AudioAugmenter::applyNoise(const AudioData& data, float intensity, NoiseType type) {
    float mult = 1.0f;
    if (type == NoiseType::PINK) mult = 0.8f;
    else if (type == NoiseType::BROWN) mult = 0.6f;
    float noise = intensity * mult;
    return {
        clamp01(data.bass + (randomFloat() - 0.5f) * noise),
        clamp01(data.mid + (randomFloat() - 0.5f) * noise),
        clamp01(data.treble + (randomFloat() - 0.5f) * noise),
        clamp01(data.volume + (randomFloat() - 0.5f) * noise)
    };
}
