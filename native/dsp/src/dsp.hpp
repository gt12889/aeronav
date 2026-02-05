#pragma once

#include <vector>
#include <cmath>
#include <complex>
#include <algorithm>

namespace aeronav {
namespace dsp {

constexpr float PI = 3.14159265358979f;
constexpr float TAU = 6.28318530717959f;

// Window functions
void windowHann(std::vector<float>& data);
void windowHamming(std::vector<float>& data);
void windowBlackman(std::vector<float>& data);
void windowBlackmanHarris(std::vector<float>& data);
void windowKaiser(std::vector<float>& data, float beta);
void windowTriangular(std::vector<float>& data);
void windowGaussian(std::vector<float>& data, float sigma);

// Generate window coefficients
std::vector<float> generateHannWindow(int size);
std::vector<float> generateHammingWindow(int size);
std::vector<float> generateBlackmanWindow(int size);

// Biquad filter coefficients
struct BiquadCoeffs {
    float b0, b1, b2, a1, a2;
    BiquadCoeffs() : b0(1), b1(0), b2(0), a1(0), a2(0) {}
};

// Biquad filter design
BiquadCoeffs designLowpass(float sampleRate, float cutoff, float Q);
BiquadCoeffs designHighpass(float sampleRate, float cutoff, float Q);
BiquadCoeffs designBandpass(float sampleRate, float center, float Q);
BiquadCoeffs designNotch(float sampleRate, float center, float Q);
BiquadCoeffs designPeakEQ(float sampleRate, float center, float Q, float gainDB);
BiquadCoeffs designLowShelf(float sampleRate, float cutoff, float gainDB);
BiquadCoeffs designHighShelf(float sampleRate, float cutoff, float gainDB);
BiquadCoeffs designAllpass(float sampleRate, float frequency, float Q);

// Biquad filter state
class BiquadFilter {
public:
    BiquadFilter();
    void setCoeffs(const BiquadCoeffs& coeffs);
    float process(float input);
    void processBlock(const float* input, float* output, int count);
    void reset();

private:
    BiquadCoeffs c;
    float x1, x2, y1, y2;
};

// FIR filter
class FIRFilter {
public:
    FIRFilter(int taps);
    void setCoeffs(const std::vector<float>& coeffs);
    float process(float input);
    void processBlock(const float* input, float* output, int count);
    void reset();
    static std::vector<float> designLowpass(int taps, float sampleRate, float cutoff);
    static std::vector<float> designHighpass(int taps, float sampleRate, float cutoff);
    static std::vector<float> designBandpass(int taps, float sampleRate, float low, float high);

private:
    std::vector<float> coeffs;
    std::vector<float> buffer;
    int bufferIndex;
};

// One-pole filter (simple smoothing)
class OnePoleFilter {
public:
    OnePoleFilter(float coefficient = 0.99f);
    void setCoefficient(float coeff);
    float process(float input);
    void reset();

private:
    float a, y1;
};

// DC blocker
class DCBlocker {
public:
    DCBlocker(float R = 0.995f);
    float process(float input);
    void reset();

private:
    float R, x1, y1;
};

// Envelope follower
class EnvelopeFollower {
public:
    EnvelopeFollower(float attackMs, float releaseMs, float sampleRate);
    void setAttack(float ms);
    void setRelease(float ms);
    float process(float input);
    void reset();

private:
    float attackCoeff, releaseCoeff;
    float sampleRate;
    float envelope;
};

// Simple compressor
class Compressor {
public:
    Compressor(float sampleRate);
    void setThreshold(float dB);
    void setRatio(float ratio);
    void setAttack(float ms);
    void setRelease(float ms);
    void setMakeupGain(float dB);
    float process(float input);
    void processBlock(const float* input, float* output, int count);
    void reset();

private:
    float threshold, ratio, makeupGain;
    float sampleRate;
    EnvelopeFollower envelope;
};

// Simple limiter
class Limiter {
public:
    Limiter(float sampleRate);
    void setThreshold(float dB);
    void setRelease(float ms);
    float process(float input);
    void reset();

private:
    float threshold;
    float sampleRate;
    EnvelopeFollower envelope;
};

// Delay line
class DelayLine {
public:
    DelayLine(int maxSamples);
    void setDelay(int samples);
    void setDelayFractional(float samples);
    float process(float input);
    float readDelay(int samples) const;
    float readDelayLinear(float samples) const;
    void reset();

private:
    std::vector<float> buffer;
    int writeIndex;
    int delaySamples;
    float delayFraction;
};

// All-pass delay for reverb
class AllpassDelay {
public:
    AllpassDelay(int samples, float feedback);
    float process(float input);
    void reset();

private:
    std::vector<float> buffer;
    int index;
    float feedback;
};

// Comb filter for reverb
class CombFilter {
public:
    CombFilter(int samples, float feedback, float damp);
    float process(float input);
    void reset();

private:
    std::vector<float> buffer;
    int index;
    float feedback, damp, filterStore;
};

// Simple reverb (Freeverb-style)
class SimpleReverb {
public:
    SimpleReverb(float sampleRate);
    void setRoomSize(float size);
    void setDamping(float damp);
    void setWet(float wet);
    void setDry(float dry);
    float process(float input);
    void reset();

private:
    std::vector<CombFilter> combs;
    std::vector<AllpassDelay> allpasses;
    float wet, dry;
};

// Oscillator
class Oscillator {
public:
    enum Waveform { Sine, Saw, Square, Triangle, Noise };
    Oscillator(float sampleRate);
    void setFrequency(float freq);
    void setWaveform(Waveform wf);
    float process();
    void reset();

private:
    float sampleRate, frequency, phase;
    Waveform waveform;
};

// LFO (Low Frequency Oscillator)
class LFO {
public:
    LFO(float sampleRate);
    void setFrequency(float freq);
    void setWaveform(Oscillator::Waveform wf);
    float process();
    void reset();

private:
    Oscillator osc;
};

// Analysis functions
float computeRMS(const float* data, int count);
float computePeak(const float* data, int count);
float computeZeroCrossings(const float* data, int count);
std::vector<float> computeAutocorrelation(const float* data, int count, int maxLag);
float estimatePitch(const float* data, int count, float sampleRate, float minFreq, float maxFreq);

// Utility functions
float dbToLinear(float db);
float linearToDb(float linear);
float midiToFrequency(int note);
int frequencyToMidi(float freq);

} // namespace dsp
} // namespace aeronav
