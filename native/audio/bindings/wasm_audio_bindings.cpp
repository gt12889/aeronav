#include <emscripten/bind.h>
#include <emscripten/val.h>
#include "../src/audio_fft.hpp"

using namespace emscripten;
using namespace aeronav;

// Helper struct for returning result to JS
struct AudioResultJS {
    float bass;
    float mid;
    float treble;
    float volume;

    static AudioResultJS fromResult(const AudioAnalysisResult& result) {
        return { result.bass, result.mid, result.treble, result.volume };
    }
};

// Wrapper class for AudioFFTAnalyzer with JS-friendly interface
class AudioAnalyzerWrapper {
public:
    AudioAnalyzerWrapper() : analyzer_() {}

    // Analyze Uint8Array from Web Audio API
    AudioResultJS analyzeUint8(const val& data) {
        // Get the typed array length and data
        unsigned int length = data["length"].as<unsigned int>();
        if (length == 0) {
            return { 0.0f, 0.0f, 0.0f, 0.0f };
        }

        // Copy data from JS Uint8Array to C++ buffer
        // This is necessary because we can't directly access JS typed array memory
        std::vector<uint8_t> buffer(length);

        // Use the [] operator to access elements
        for (unsigned int i = 0; i < length; i++) {
            buffer[i] = data[i].as<uint8_t>();
        }

        AudioAnalysisResult result = analyzer_.analyzeFrequencies(buffer.data(), length);
        return AudioResultJS::fromResult(result);
    }

    // Analyze Float32Array
    AudioResultJS analyzeFloat32(const val& data, bool normalized) {
        unsigned int length = data["length"].as<unsigned int>();
        if (length == 0) {
            return { 0.0f, 0.0f, 0.0f, 0.0f };
        }

        std::vector<float> buffer(length);
        for (unsigned int i = 0; i < length; i++) {
            buffer[i] = data[i].as<float>();
        }

        AudioAnalysisResult result = analyzer_.analyzeFrequenciesFloat(buffer.data(), length, normalized);
        return AudioResultJS::fromResult(result);
    }

    void setBassRange(float endPercent) {
        analyzer_.setBassRange(endPercent);
    }

    void setMidRange(float endPercent) {
        analyzer_.setMidRange(endPercent);
    }

private:
    AudioFFTAnalyzer analyzer_;
};

// Standalone function for simple one-shot analysis (no instance needed)
AudioResultJS analyzeFrequenciesQuick(const val& data) {
    unsigned int length = data["length"].as<unsigned int>();
    if (length == 0) {
        return { 0.0f, 0.0f, 0.0f, 0.0f };
    }

    std::vector<uint8_t> buffer(length);
    for (unsigned int i = 0; i < length; i++) {
        buffer[i] = data[i].as<uint8_t>();
    }

    AudioFFTAnalyzer analyzer;
    AudioAnalysisResult result = analyzer.analyzeFrequencies(buffer.data(), length);
    return AudioResultJS::fromResult(result);
}

EMSCRIPTEN_BINDINGS(aeronav_audio) {
    // Bind the result struct as a value object
    value_object<AudioResultJS>("AudioAnalysisResult")
        .field("bass", &AudioResultJS::bass)
        .field("mid", &AudioResultJS::mid)
        .field("treble", &AudioResultJS::treble)
        .field("volume", &AudioResultJS::volume);

    // Bind the analyzer class
    class_<AudioAnalyzerWrapper>("AudioAnalyzer")
        .constructor<>()
        .function("analyzeUint8", &AudioAnalyzerWrapper::analyzeUint8)
        .function("analyzeFloat32", &AudioAnalyzerWrapper::analyzeFloat32)
        .function("setBassRange", &AudioAnalyzerWrapper::setBassRange)
        .function("setMidRange", &AudioAnalyzerWrapper::setMidRange);

    // Bind standalone function for quick analysis
    function("analyzeFrequencies", &analyzeFrequenciesQuick);
}
