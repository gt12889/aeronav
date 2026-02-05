#include "dsp.hpp"
#include <cstdlib>

namespace aeronav {
namespace dsp {

// Window functions
void windowHann(std::vector<float>& data) {
    int N = data.size();
    for (int n = 0; n < N; n++)
        data[n] *= 0.5f * (1.0f - std::cos(TAU * n / (N - 1)));
}

void windowHamming(std::vector<float>& data) {
    int N = data.size();
    for (int n = 0; n < N; n++)
        data[n] *= 0.54f - 0.46f * std::cos(TAU * n / (N - 1));
}

void windowBlackman(std::vector<float>& data) {
    int N = data.size();
    for (int n = 0; n < N; n++)
        data[n] *= 0.42f - 0.5f * std::cos(TAU * n / (N - 1)) + 0.08f * std::cos(2 * TAU * n / (N - 1));
}

void windowBlackmanHarris(std::vector<float>& data) {
    int N = data.size();
    float a0 = 0.35875f, a1 = 0.48829f, a2 = 0.14128f, a3 = 0.01168f;
    for (int n = 0; n < N; n++)
        data[n] *= a0 - a1 * std::cos(TAU * n / (N - 1)) + a2 * std::cos(2 * TAU * n / (N - 1)) - a3 * std::cos(3 * TAU * n / (N - 1));
}

void windowKaiser(std::vector<float>& data, float beta) {
    int N = data.size();
    auto bessel = [](float x) {
        float sum = 1.0f, term = 1.0f;
        for (int k = 1; k < 20; k++) {
            term *= (x * x) / (4.0f * k * k);
            sum += term;
        }
        return sum;
    };
    float denom = bessel(beta);
    for (int n = 0; n < N; n++) {
        float arg = beta * std::sqrt(1.0f - std::pow(2.0f * n / (N - 1) - 1.0f, 2.0f));
        data[n] *= bessel(arg) / denom;
    }
}

void windowTriangular(std::vector<float>& data) {
    int N = data.size();
    for (int n = 0; n < N; n++)
        data[n] *= 1.0f - std::abs(2.0f * n / (N - 1) - 1.0f);
}

void windowGaussian(std::vector<float>& data, float sigma) {
    int N = data.size();
    for (int n = 0; n < N; n++) {
        float x = (n - (N - 1) / 2.0f) / (sigma * (N - 1) / 2.0f);
        data[n] *= std::exp(-0.5f * x * x);
    }
}

std::vector<float> generateHannWindow(int size) {
    std::vector<float> w(size, 1.0f);
    windowHann(w);
    return w;
}

std::vector<float> generateHammingWindow(int size) {
    std::vector<float> w(size, 1.0f);
    windowHamming(w);
    return w;
}

std::vector<float> generateBlackmanWindow(int size) {
    std::vector<float> w(size, 1.0f);
    windowBlackman(w);
    return w;
}

// Biquad filter design
BiquadCoeffs designLowpass(float sampleRate, float cutoff, float Q) {
    BiquadCoeffs c;
    float w0 = TAU * cutoff / sampleRate;
    float alpha = std::sin(w0) / (2.0f * Q);
    float cosw0 = std::cos(w0);
    float a0 = 1.0f + alpha;
    c.b0 = (1.0f - cosw0) / 2.0f / a0;
    c.b1 = (1.0f - cosw0) / a0;
    c.b2 = (1.0f - cosw0) / 2.0f / a0;
    c.a1 = -2.0f * cosw0 / a0;
    c.a2 = (1.0f - alpha) / a0;
    return c;
}

BiquadCoeffs designHighpass(float sampleRate, float cutoff, float Q) {
    BiquadCoeffs c;
    float w0 = TAU * cutoff / sampleRate;
    float alpha = std::sin(w0) / (2.0f * Q);
    float cosw0 = std::cos(w0);
    float a0 = 1.0f + alpha;
    c.b0 = (1.0f + cosw0) / 2.0f / a0;
    c.b1 = -(1.0f + cosw0) / a0;
    c.b2 = (1.0f + cosw0) / 2.0f / a0;
    c.a1 = -2.0f * cosw0 / a0;
    c.a2 = (1.0f - alpha) / a0;
    return c;
}

BiquadCoeffs designBandpass(float sampleRate, float center, float Q) {
    BiquadCoeffs c;
    float w0 = TAU * center / sampleRate;
    float alpha = std::sin(w0) / (2.0f * Q);
    float cosw0 = std::cos(w0);
    float a0 = 1.0f + alpha;
    c.b0 = alpha / a0;
    c.b1 = 0;
    c.b2 = -alpha / a0;
    c.a1 = -2.0f * cosw0 / a0;
    c.a2 = (1.0f - alpha) / a0;
    return c;
}

BiquadCoeffs designNotch(float sampleRate, float center, float Q) {
    BiquadCoeffs c;
    float w0 = TAU * center / sampleRate;
    float alpha = std::sin(w0) / (2.0f * Q);
    float cosw0 = std::cos(w0);
    float a0 = 1.0f + alpha;
    c.b0 = 1.0f / a0;
    c.b1 = -2.0f * cosw0 / a0;
    c.b2 = 1.0f / a0;
    c.a1 = -2.0f * cosw0 / a0;
    c.a2 = (1.0f - alpha) / a0;
    return c;
}

BiquadCoeffs designPeakEQ(float sampleRate, float center, float Q, float gainDB) {
    BiquadCoeffs c;
    float A = std::pow(10.0f, gainDB / 40.0f);
    float w0 = TAU * center / sampleRate;
    float alpha = std::sin(w0) / (2.0f * Q);
    float cosw0 = std::cos(w0);
    float a0 = 1.0f + alpha / A;
    c.b0 = (1.0f + alpha * A) / a0;
    c.b1 = -2.0f * cosw0 / a0;
    c.b2 = (1.0f - alpha * A) / a0;
    c.a1 = -2.0f * cosw0 / a0;
    c.a2 = (1.0f - alpha / A) / a0;
    return c;
}

BiquadCoeffs designLowShelf(float sampleRate, float cutoff, float gainDB) {
    BiquadCoeffs c;
    float A = std::pow(10.0f, gainDB / 40.0f);
    float w0 = TAU * cutoff / sampleRate;
    float cosw0 = std::cos(w0), sinw0 = std::sin(w0);
    float alpha = sinw0 / 2.0f * std::sqrt((A + 1.0f / A) * 2.0f);
    float sqrtA = std::sqrt(A);
    float a0 = (A + 1) + (A - 1) * cosw0 + 2 * sqrtA * alpha;
    c.b0 = A * ((A + 1) - (A - 1) * cosw0 + 2 * sqrtA * alpha) / a0;
    c.b1 = 2 * A * ((A - 1) - (A + 1) * cosw0) / a0;
    c.b2 = A * ((A + 1) - (A - 1) * cosw0 - 2 * sqrtA * alpha) / a0;
    c.a1 = -2 * ((A - 1) + (A + 1) * cosw0) / a0;
    c.a2 = ((A + 1) + (A - 1) * cosw0 - 2 * sqrtA * alpha) / a0;
    return c;
}

BiquadCoeffs designHighShelf(float sampleRate, float cutoff, float gainDB) {
    BiquadCoeffs c;
    float A = std::pow(10.0f, gainDB / 40.0f);
    float w0 = TAU * cutoff / sampleRate;
    float cosw0 = std::cos(w0), sinw0 = std::sin(w0);
    float alpha = sinw0 / 2.0f * std::sqrt((A + 1.0f / A) * 2.0f);
    float sqrtA = std::sqrt(A);
    float a0 = (A + 1) - (A - 1) * cosw0 + 2 * sqrtA * alpha;
    c.b0 = A * ((A + 1) + (A - 1) * cosw0 + 2 * sqrtA * alpha) / a0;
    c.b1 = -2 * A * ((A - 1) + (A + 1) * cosw0) / a0;
    c.b2 = A * ((A + 1) + (A - 1) * cosw0 - 2 * sqrtA * alpha) / a0;
    c.a1 = 2 * ((A - 1) - (A + 1) * cosw0) / a0;
    c.a2 = ((A + 1) - (A - 1) * cosw0 - 2 * sqrtA * alpha) / a0;
    return c;
}

BiquadCoeffs designAllpass(float sampleRate, float frequency, float Q) {
    BiquadCoeffs c;
    float w0 = TAU * frequency / sampleRate;
    float alpha = std::sin(w0) / (2.0f * Q);
    float cosw0 = std::cos(w0);
    float a0 = 1.0f + alpha;
    c.b0 = (1.0f - alpha) / a0;
    c.b1 = -2.0f * cosw0 / a0;
    c.b2 = (1.0f + alpha) / a0;
    c.a1 = -2.0f * cosw0 / a0;
    c.a2 = (1.0f - alpha) / a0;
    return c;
}

// BiquadFilter implementation
BiquadFilter::BiquadFilter() : x1(0), x2(0), y1(0), y2(0) {}

void BiquadFilter::setCoeffs(const BiquadCoeffs& coeffs) { c = coeffs; }

float BiquadFilter::process(float input) {
    float output = c.b0 * input + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1; x1 = input;
    y2 = y1; y1 = output;
    return output;
}

void BiquadFilter::processBlock(const float* input, float* output, int count) {
    for (int i = 0; i < count; i++) output[i] = process(input[i]);
}

void BiquadFilter::reset() { x1 = x2 = y1 = y2 = 0; }

// FIRFilter implementation
FIRFilter::FIRFilter(int taps) : coeffs(taps, 0), buffer(taps, 0), bufferIndex(0) {
    coeffs[taps / 2] = 1.0f;
}

void FIRFilter::setCoeffs(const std::vector<float>& c) {
    coeffs = c;
    buffer.resize(coeffs.size(), 0);
}

float FIRFilter::process(float input) {
    buffer[bufferIndex] = input;
    float output = 0;
    int idx = bufferIndex;
    for (size_t i = 0; i < coeffs.size(); i++) {
        output += coeffs[i] * buffer[idx];
        if (--idx < 0) idx = coeffs.size() - 1;
    }
    if (++bufferIndex >= (int)buffer.size()) bufferIndex = 0;
    return output;
}

void FIRFilter::processBlock(const float* input, float* output, int count) {
    for (int i = 0; i < count; i++) output[i] = process(input[i]);
}

void FIRFilter::reset() {
    std::fill(buffer.begin(), buffer.end(), 0);
    bufferIndex = 0;
}

std::vector<float> FIRFilter::designLowpass(int taps, float sampleRate, float cutoff) {
    std::vector<float> h(taps);
    float fc = cutoff / sampleRate;
    int M = taps - 1;
    for (int n = 0; n <= M; n++) {
        if (n == M / 2) h[n] = 2.0f * fc;
        else h[n] = std::sin(TAU * fc * (n - M / 2.0f)) / (PI * (n - M / 2.0f));
        h[n] *= 0.54f - 0.46f * std::cos(TAU * n / M); // Hamming window
    }
    return h;
}

std::vector<float> FIRFilter::designHighpass(int taps, float sampleRate, float cutoff) {
    auto lp = designLowpass(taps, sampleRate, cutoff);
    for (size_t i = 0; i < lp.size(); i++) lp[i] = -lp[i];
    lp[taps / 2] += 1.0f;
    return lp;
}

std::vector<float> FIRFilter::designBandpass(int taps, float sampleRate, float low, float high) {
    auto lp1 = designLowpass(taps, sampleRate, high);
    auto lp2 = designLowpass(taps, sampleRate, low);
    for (size_t i = 0; i < lp1.size(); i++) lp1[i] -= lp2[i];
    return lp1;
}

// OnePoleFilter implementation
OnePoleFilter::OnePoleFilter(float coefficient) : a(coefficient), y1(0) {}
void OnePoleFilter::setCoefficient(float coeff) { a = coeff; }
float OnePoleFilter::process(float input) { return y1 = input + a * (y1 - input); }
void OnePoleFilter::reset() { y1 = 0; }

// DCBlocker implementation
DCBlocker::DCBlocker(float R) : R(R), x1(0), y1(0) {}
float DCBlocker::process(float input) {
    float output = input - x1 + R * y1;
    x1 = input;
    y1 = output;
    return output;
}
void DCBlocker::reset() { x1 = y1 = 0; }

// EnvelopeFollower implementation
EnvelopeFollower::EnvelopeFollower(float attackMs, float releaseMs, float sr)
    : sampleRate(sr), envelope(0) {
    setAttack(attackMs);
    setRelease(releaseMs);
}
void EnvelopeFollower::setAttack(float ms) {
    attackCoeff = std::exp(-1.0f / (ms * 0.001f * sampleRate));
}
void EnvelopeFollower::setRelease(float ms) {
    releaseCoeff = std::exp(-1.0f / (ms * 0.001f * sampleRate));
}
float EnvelopeFollower::process(float input) {
    float absIn = std::abs(input);
    float coeff = absIn > envelope ? attackCoeff : releaseCoeff;
    envelope = coeff * envelope + (1.0f - coeff) * absIn;
    return envelope;
}
void EnvelopeFollower::reset() { envelope = 0; }

// Compressor implementation
Compressor::Compressor(float sr) : threshold(-12.0f), ratio(4.0f), makeupGain(0),
    sampleRate(sr), envelope(10.0f, 100.0f, sr) {}
void Compressor::setThreshold(float dB) { threshold = dB; }
void Compressor::setRatio(float r) { ratio = r; }
void Compressor::setAttack(float ms) { envelope.setAttack(ms); }
void Compressor::setRelease(float ms) { envelope.setRelease(ms); }
void Compressor::setMakeupGain(float dB) { makeupGain = dB; }
float Compressor::process(float input) {
    float env = envelope.process(input);
    float envDb = linearToDb(env);
    float gainDb = 0;
    if (envDb > threshold) {
        float overDb = envDb - threshold;
        gainDb = -(overDb - overDb / ratio);
    }
    return input * dbToLinear(gainDb + makeupGain);
}
void Compressor::processBlock(const float* input, float* output, int count) {
    for (int i = 0; i < count; i++) output[i] = process(input[i]);
}
void Compressor::reset() { envelope.reset(); }

// Limiter implementation
Limiter::Limiter(float sr) : threshold(0), sampleRate(sr), envelope(0.1f, 50.0f, sr) {}
void Limiter::setThreshold(float dB) { threshold = dB; }
void Limiter::setRelease(float ms) { envelope.setRelease(ms); }
float Limiter::process(float input) {
    float env = envelope.process(input);
    float envDb = linearToDb(env);
    if (envDb > threshold) {
        float gainDb = threshold - envDb;
        return input * dbToLinear(gainDb);
    }
    return input;
}
void Limiter::reset() { envelope.reset(); }

// DelayLine implementation
DelayLine::DelayLine(int maxSamples) : buffer(maxSamples, 0), writeIndex(0), delaySamples(0), delayFraction(0) {}
void DelayLine::setDelay(int samples) { delaySamples = std::min(samples, (int)buffer.size() - 1); delayFraction = 0; }
void DelayLine::setDelayFractional(float samples) {
    delaySamples = (int)samples;
    delayFraction = samples - delaySamples;
    delaySamples = std::min(delaySamples, (int)buffer.size() - 2);
}
float DelayLine::process(float input) {
    float output = readDelayLinear(delaySamples + delayFraction);
    buffer[writeIndex] = input;
    if (++writeIndex >= (int)buffer.size()) writeIndex = 0;
    return output;
}
float DelayLine::readDelay(int samples) const {
    int idx = writeIndex - samples - 1;
    while (idx < 0) idx += buffer.size();
    return buffer[idx];
}
float DelayLine::readDelayLinear(float samples) const {
    int idx1 = writeIndex - (int)samples - 1;
    int idx2 = idx1 - 1;
    while (idx1 < 0) idx1 += buffer.size();
    while (idx2 < 0) idx2 += buffer.size();
    float frac = samples - (int)samples;
    return buffer[idx1] * (1.0f - frac) + buffer[idx2] * frac;
}
void DelayLine::reset() { std::fill(buffer.begin(), buffer.end(), 0); writeIndex = 0; }

// AllpassDelay implementation
AllpassDelay::AllpassDelay(int samples, float fb) : buffer(samples, 0), index(0), feedback(fb) {}
float AllpassDelay::process(float input) {
    float buffered = buffer[index];
    float output = -input + buffered;
    buffer[index] = input + feedback * buffered;
    if (++index >= (int)buffer.size()) index = 0;
    return output;
}
void AllpassDelay::reset() { std::fill(buffer.begin(), buffer.end(), 0); index = 0; }

// CombFilter implementation
CombFilter::CombFilter(int samples, float fb, float damp) : buffer(samples, 0), index(0), feedback(fb), damp(damp), filterStore(0) {}
float CombFilter::process(float input) {
    float output = buffer[index];
    filterStore = output * (1.0f - damp) + filterStore * damp;
    buffer[index] = input + filterStore * feedback;
    if (++index >= (int)buffer.size()) index = 0;
    return output;
}
void CombFilter::reset() { std::fill(buffer.begin(), buffer.end(), 0); index = 0; filterStore = 0; }

// SimpleReverb implementation
SimpleReverb::SimpleReverb(float sampleRate) : wet(0.3f), dry(0.7f) {
    int combDelays[] = {1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617};
    int allpassDelays[] = {556, 441, 341, 225};
    float scaleFactor = sampleRate / 44100.0f;
    for (int i = 0; i < 8; i++)
        combs.emplace_back(int(combDelays[i] * scaleFactor), 0.84f, 0.2f);
    for (int i = 0; i < 4; i++)
        allpasses.emplace_back(int(allpassDelays[i] * scaleFactor), 0.5f);
}
void SimpleReverb::setRoomSize(float size) {
    float fb = 0.28f + 0.7f * size;
    for (auto& c : combs) c = CombFilter(1116, fb, 0.2f);
}
void SimpleReverb::setDamping(float damp) {
    for (auto& c : combs) c = CombFilter(1116, 0.84f, damp);
}
void SimpleReverb::setWet(float w) { wet = w; }
void SimpleReverb::setDry(float d) { dry = d; }
float SimpleReverb::process(float input) {
    float output = 0;
    for (auto& c : combs) output += c.process(input);
    for (auto& a : allpasses) output = a.process(output);
    return dry * input + wet * output;
}
void SimpleReverb::reset() {
    for (auto& c : combs) c.reset();
    for (auto& a : allpasses) a.reset();
}

// Oscillator implementation
Oscillator::Oscillator(float sr) : sampleRate(sr), frequency(440), phase(0), waveform(Sine) {}
void Oscillator::setFrequency(float freq) { frequency = freq; }
void Oscillator::setWaveform(Waveform wf) { waveform = wf; }
float Oscillator::process() {
    float output;
    switch (waveform) {
        case Sine: output = std::sin(TAU * phase); break;
        case Saw: output = 2.0f * phase - 1.0f; break;
        case Square: output = phase < 0.5f ? 1.0f : -1.0f; break;
        case Triangle: output = 4.0f * std::abs(phase - 0.5f) - 1.0f; break;
        case Noise: output = 2.0f * (float(rand()) / RAND_MAX) - 1.0f; break;
        default: output = 0;
    }
    phase += frequency / sampleRate;
    if (phase >= 1.0f) phase -= 1.0f;
    return output;
}
void Oscillator::reset() { phase = 0; }

// LFO implementation
LFO::LFO(float sampleRate) : osc(sampleRate) {}
void LFO::setFrequency(float freq) { osc.setFrequency(freq); }
void LFO::setWaveform(Oscillator::Waveform wf) { osc.setWaveform(wf); }
float LFO::process() { return osc.process(); }
void LFO::reset() { osc.reset(); }

// Analysis functions
float computeRMS(const float* data, int count) {
    float sum = 0;
    for (int i = 0; i < count; i++) sum += data[i] * data[i];
    return std::sqrt(sum / count);
}

float computePeak(const float* data, int count) {
    float peak = 0;
    for (int i = 0; i < count; i++) peak = std::max(peak, std::abs(data[i]));
    return peak;
}

float computeZeroCrossings(const float* data, int count) {
    int crossings = 0;
    for (int i = 1; i < count; i++)
        if ((data[i-1] >= 0) != (data[i] >= 0)) crossings++;
    return float(crossings) / (count - 1);
}

std::vector<float> computeAutocorrelation(const float* data, int count, int maxLag) {
    std::vector<float> result(maxLag);
    for (int lag = 0; lag < maxLag; lag++) {
        float sum = 0;
        for (int i = 0; i < count - lag; i++) sum += data[i] * data[i + lag];
        result[lag] = sum / (count - lag);
    }
    return result;
}

float estimatePitch(const float* data, int count, float sampleRate, float minFreq, float maxFreq) {
    int minLag = int(sampleRate / maxFreq);
    int maxLag = int(sampleRate / minFreq);
    maxLag = std::min(maxLag, count / 2);
    auto acf = computeAutocorrelation(data, count, maxLag);

    float maxVal = 0;
    int bestLag = minLag;
    for (int lag = minLag; lag < maxLag; lag++) {
        if (acf[lag] > maxVal) {
            maxVal = acf[lag];
            bestLag = lag;
        }
    }
    return sampleRate / bestLag;
}

// Utility functions
float dbToLinear(float db) { return std::pow(10.0f, db / 20.0f); }
float linearToDb(float linear) { return 20.0f * std::log10(std::max(linear, 1e-10f)); }
float midiToFrequency(int note) { return 440.0f * std::pow(2.0f, (note - 69) / 12.0f); }
int frequencyToMidi(float freq) { return int(12.0f * std::log2(freq / 440.0f) + 69 + 0.5f); }

} // namespace dsp
} // namespace aeronav
