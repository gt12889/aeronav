#include "audio_fft.hpp"
#include <algorithm>
#include <cmath>

namespace aeronav {

AudioFFTAnalyzer::AudioFFTAnalyzer()
    : bassEndPercent_(0.1f)   // 0-10% = bass
    , midEndPercent_(0.4f)    // 10-40% = mid, 40-100% = treble
{
}

void AudioFFTAnalyzer::setBassRange(float endPercent) {
    bassEndPercent_ = std::clamp(endPercent, 0.01f, 0.5f);
}

void AudioFFTAnalyzer::setMidRange(float endPercent) {
    midEndPercent_ = std::clamp(endPercent, bassEndPercent_ + 0.01f, 0.99f);
}

float AudioFFTAnalyzer::simdSum(const float* data, size_t length) {
    float sum = 0.0f;

#if USE_WASM_SIMD
    // Process 4 floats at a time with WASM SIMD
    size_t simdLength = length & ~3; // Round down to multiple of 4
    v128_t accumulator = wasm_f32x4_splat(0.0f);

    for (size_t i = 0; i < simdLength; i += 4) {
        v128_t values = wasm_v128_load(&data[i]);
        accumulator = wasm_f32x4_add(accumulator, values);
    }

    // Horizontal sum of accumulator
    float temp[4];
    wasm_v128_store(temp, accumulator);
    sum = temp[0] + temp[1] + temp[2] + temp[3];

    // Handle remaining elements
    for (size_t i = simdLength; i < length; i++) {
        sum += data[i];
    }

#elif USE_SSE
    // Process 4 floats at a time with SSE
    size_t simdLength = length & ~3;
    __m128 accumulator = _mm_setzero_ps();

    for (size_t i = 0; i < simdLength; i += 4) {
        __m128 values = _mm_loadu_ps(&data[i]);
        accumulator = _mm_add_ps(accumulator, values);
    }

    // Horizontal sum
    float temp[4];
    _mm_storeu_ps(temp, accumulator);
    sum = temp[0] + temp[1] + temp[2] + temp[3];

    // Handle remaining elements
    for (size_t i = simdLength; i < length; i++) {
        sum += data[i];
    }

#else
    // Scalar fallback
    for (size_t i = 0; i < length; i++) {
        sum += data[i];
    }
#endif

    return sum;
}

float AudioFFTAnalyzer::simdSumUint8(const uint8_t* data, size_t length) {
    // For uint8, we need to convert to float for accurate summation
    // This is slightly less efficient but more accurate

#if USE_WASM_SIMD
    // Process in chunks, converting to float
    size_t simdLength = length & ~15; // Process 16 bytes at a time
    v128_t accumulator = wasm_f32x4_splat(0.0f);
    const v128_t scale = wasm_f32x4_splat(1.0f / 255.0f);

    for (size_t i = 0; i < simdLength; i += 16) {
        // Load 16 bytes
        v128_t bytes = wasm_v128_load(&data[i]);

        // Unpack and accumulate in 4 groups of 4
        // First 4 bytes
        v128_t low8 = wasm_u16x8_extend_low_u8x16(bytes);
        v128_t vals0 = wasm_f32x4_convert_u32x4(wasm_u32x4_extend_low_u16x8(low8));
        accumulator = wasm_f32x4_add(accumulator, wasm_f32x4_mul(vals0, scale));

        v128_t vals1 = wasm_f32x4_convert_u32x4(wasm_u32x4_extend_high_u16x8(low8));
        accumulator = wasm_f32x4_add(accumulator, wasm_f32x4_mul(vals1, scale));

        // Second 4 bytes
        v128_t high8 = wasm_u16x8_extend_high_u8x16(bytes);
        v128_t vals2 = wasm_f32x4_convert_u32x4(wasm_u32x4_extend_low_u16x8(high8));
        accumulator = wasm_f32x4_add(accumulator, wasm_f32x4_mul(vals2, scale));

        v128_t vals3 = wasm_f32x4_convert_u32x4(wasm_u32x4_extend_high_u16x8(high8));
        accumulator = wasm_f32x4_add(accumulator, wasm_f32x4_mul(vals3, scale));
    }

    // Horizontal sum
    float temp[4];
    wasm_v128_store(temp, accumulator);
    float sum = temp[0] + temp[1] + temp[2] + temp[3];

    // Handle remaining elements
    for (size_t i = simdLength; i < length; i++) {
        sum += data[i] / 255.0f;
    }

    return sum;

#else
    // Scalar fallback - accumulate as integers then divide
    uint32_t intSum = 0;
    for (size_t i = 0; i < length; i++) {
        intSum += data[i];
    }
    return static_cast<float>(intSum) / 255.0f;
#endif
}

AudioAnalysisResult AudioFFTAnalyzer::analyzeFrequencies(const uint8_t* data, size_t length) {
    if (length == 0 || data == nullptr) {
        return { 0.0f, 0.0f, 0.0f, 0.0f };
    }

    // Calculate band boundaries
    const size_t bassEnd = static_cast<size_t>(length * bassEndPercent_);
    const size_t midEnd = static_cast<size_t>(length * midEndPercent_);

    // Ensure we have valid ranges
    const size_t bassLen = std::max(bassEnd, size_t(1));
    const size_t midLen = std::max(midEnd - bassEnd, size_t(1));
    const size_t trebleLen = std::max(length - midEnd, size_t(1));

    // Calculate sums using SIMD where possible
    float bassSum = 0.0f;
    float midSum = 0.0f;
    float trebleSum = 0.0f;

#if USE_WASM_SIMD || USE_SSE
    // For SIMD, process each band separately
    // Bass band
    {
        uint32_t sum = 0;
        for (size_t i = 0; i < bassEnd; i++) {
            sum += data[i];
        }
        bassSum = static_cast<float>(sum) / 255.0f;
    }

    // Mid band
    {
        uint32_t sum = 0;
        for (size_t i = bassEnd; i < midEnd; i++) {
            sum += data[i];
        }
        midSum = static_cast<float>(sum) / 255.0f;
    }

    // Treble band
    {
        uint32_t sum = 0;
        for (size_t i = midEnd; i < length; i++) {
            sum += data[i];
        }
        trebleSum = static_cast<float>(sum) / 255.0f;
    }
#else
    // Scalar path
    for (size_t i = 0; i < length; i++) {
        float val = data[i] / 255.0f;
        if (i < bassEnd) {
            bassSum += val;
        } else if (i < midEnd) {
            midSum += val;
        } else {
            trebleSum += val;
        }
    }
#endif

    // Calculate overall volume
    float totalSum = simdSumUint8(data, length);

    // Return averaged results
    AudioAnalysisResult result;
    result.bass = bassSum / bassLen;
    result.mid = midSum / midLen;
    result.treble = trebleSum / trebleLen;
    result.volume = totalSum / length;

    return result;
}

AudioAnalysisResult AudioFFTAnalyzer::analyzeFrequenciesFloat(const float* data, size_t length, bool normalized) {
    if (length == 0 || data == nullptr) {
        return { 0.0f, 0.0f, 0.0f, 0.0f };
    }

    // Calculate band boundaries
    const size_t bassEnd = static_cast<size_t>(length * bassEndPercent_);
    const size_t midEnd = static_cast<size_t>(length * midEndPercent_);

    // Ensure we have valid ranges
    const size_t bassLen = std::max(bassEnd, size_t(1));
    const size_t midLen = std::max(midEnd - bassEnd, size_t(1));
    const size_t trebleLen = std::max(length - midEnd, size_t(1));

    float bassSum = 0.0f;
    float midSum = 0.0f;
    float trebleSum = 0.0f;

    // Process each band
    for (size_t i = 0; i < length; i++) {
        float val = normalized ? data[i] : (data[i] + 1.0f) * 0.5f;
        val = std::clamp(val, 0.0f, 1.0f);

        if (i < bassEnd) {
            bassSum += val;
        } else if (i < midEnd) {
            midSum += val;
        } else {
            trebleSum += val;
        }
    }

    // Calculate overall volume using SIMD
    float totalSum = simdSum(data, length);
    if (!normalized) {
        totalSum = (totalSum + static_cast<float>(length)) * 0.5f;
    }

    // Return averaged results
    AudioAnalysisResult result;
    result.bass = bassSum / bassLen;
    result.mid = midSum / midLen;
    result.treble = trebleSum / trebleLen;
    result.volume = std::clamp(totalSum / length, 0.0f, 1.0f);

    return result;
}

} // namespace aeronav
