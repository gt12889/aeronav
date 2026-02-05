#pragma once

#include <cstdint>
#include <cstddef>

// SIMD support detection
#if defined(__EMSCRIPTEN__)
    #include <wasm_simd128.h>
    #define USE_WASM_SIMD 1
#elif defined(__SSE__)
    #include <xmmintrin.h>
    #define USE_SSE 1
#endif

namespace aeronav {

// Audio analysis result (matching JS AudioAnalysisResult interface)
struct AudioAnalysisResult {
    float bass;
    float mid;
    float treble;
    float volume;
};

/**
 * SIMD-accelerated audio frequency analyzer
 * Processes FFT data to calculate frequency band energies
 */
class AudioFFTAnalyzer {
public:
    AudioFFTAnalyzer();

    /**
     * Analyze frequency data from Web Audio API AnalyserNode
     * Input is Uint8Array from getByteFrequencyData (0-255 range)
     *
     * @param data Frequency data array (Uint8Array values)
     * @param length Number of frequency bins
     * @return AudioAnalysisResult with bass, mid, treble, volume (0.0-1.0)
     */
    AudioAnalysisResult analyzeFrequencies(const uint8_t* data, size_t length);

    /**
     * Analyze frequency data from Float32Array (normalized -1 to 1 or 0-1)
     *
     * @param data Frequency data array (float values)
     * @param length Number of frequency bins
     * @param normalized If true, data is in 0-1 range; if false, -1 to 1
     * @return AudioAnalysisResult with bass, mid, treble, volume (0.0-1.0)
     */
    AudioAnalysisResult analyzeFrequenciesFloat(const float* data, size_t length, bool normalized = true);

    // Configuration
    void setBassRange(float endPercent);   // Default: 0.1 (10%)
    void setMidRange(float endPercent);    // Default: 0.4 (40%)
    // Treble is implicitly: midRange to 100%

private:
    float bassEndPercent_;
    float midEndPercent_;

    // SIMD-optimized sum calculation
    float simdSum(const float* data, size_t length);
    float simdSumUint8(const uint8_t* data, size_t length);
};

} // namespace aeronav
