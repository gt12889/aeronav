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

AudioData AudioAugmenter::applyFreqShift(const AudioData& data, float amount, ShiftDirection dir) {
    float shift = amount / 1000.0f;
    float shiftAmt = shift;
    if (dir == ShiftDirection::DOWN) shiftAmt = -shift;
    else if (dir == ShiftDirection::BOTH) shiftAmt = (randomFloat() > 0.5f ? 1.0f : -1.0f) * shift;
    float energyShift = std::abs(shiftAmt) * 0.1f;
    return {
        clamp01(data.bass + (shiftAmt < 0 ? energyShift : -energyShift)),
        clamp01(data.mid + shiftAmt * energyShift),
        clamp01(data.treble + (shiftAmt > 0 ? energyShift : -energyShift)),
        data.volume
    };
}

AudioData AudioAugmenter::applyTimeWarp(const AudioData& data, const AudioData& prev, float factor) {
    if (factor == 1.0f) return data;
    return {
        clamp01(prev.bass + (data.bass - prev.bass) * factor),
        clamp01(prev.mid + (data.mid - prev.mid) * factor),
        clamp01(prev.treble + (data.treble - prev.treble) * factor),
        clamp01(prev.volume + (data.volume - prev.volume) * factor)
    };
}
