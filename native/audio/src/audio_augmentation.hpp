#pragma once

#include <cstdint>
#include <cstddef>
#include <cmath>

namespace aeronav {

enum class NoiseType : uint8_t { WHITE = 0, PINK = 1, BROWN = 2 };
enum class FilterType : uint8_t { LOWPASS = 0, HIGHPASS = 1, BANDPASS = 2 };
enum class ShiftDirection : uint8_t { UP = 0, DOWN = 1, BOTH = 2 };

struct AudioData {
    float bass;
    float mid;
    float treble;
    float volume;
};

struct AugmentationConfig {
    bool noiseEnabled;
    float noiseIntensity;
    NoiseType noiseType;
    bool freqShiftEnabled;
    float freqShiftAmount;
    ShiftDirection freqShiftDir;
    bool timeWarpEnabled;
    float timeWarpFactor;
    bool gainEnabled;
    float gainMultiplier;
    bool filterEnabled;
    FilterType filterType;
    float filterCutoff;
};

class AudioAugmenter {
public:
    AudioAugmenter();
    AudioData applyNoise(const AudioData& data, float intensity, NoiseType type);
    AudioData applyFreqShift(const AudioData& data, float amount, ShiftDirection dir);
    AudioData applyTimeWarp(const AudioData& data, const AudioData& prev, float factor);
    AudioData applyGain(const AudioData& data, float multiplier);
    AudioData applyFilter(const AudioData& data, FilterType type, float cutoff);
    AudioData applyAll(const AudioData& data, const AugmentationConfig& cfg, const AudioData* prev);
private:
    float randomFloat();
    // Pink noise state
    float b0_, b1_, b2_, b3_, b4_, b5_, b6_;
    // Brown noise state
    float brownLast_;
};

} // namespace aeronav
