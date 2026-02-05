#include <emscripten/bind.h>
#include "../src/dsp.hpp"

using namespace emscripten;
using namespace aeronav::dsp;

EMSCRIPTEN_BINDINGS(aeronav_dsp) {
    // BiquadCoeffs
    value_object<BiquadCoeffs>("BiquadCoeffs")
        .field("b0", &BiquadCoeffs::b0)
        .field("b1", &BiquadCoeffs::b1)
        .field("b2", &BiquadCoeffs::b2)
        .field("a1", &BiquadCoeffs::a1)
        .field("a2", &BiquadCoeffs::a2);

    // Filter design functions
    function("designLowpass", &designLowpass);
    function("designHighpass", &designHighpass);
    function("designBandpass", &designBandpass);
    function("designNotch", &designNotch);
    function("designPeakEQ", &designPeakEQ);
    function("designLowShelf", &designLowShelf);
    function("designHighShelf", &designHighShelf);
    function("designAllpass", &designAllpass);

    // BiquadFilter
    class_<BiquadFilter>("BiquadFilter")
        .constructor<>()
        .function("setCoeffs", &BiquadFilter::setCoeffs)
        .function("process", &BiquadFilter::process)
        .function("reset", &BiquadFilter::reset);

    // OnePoleFilter
    class_<OnePoleFilter>("OnePoleFilter")
        .constructor<float>()
        .function("setCoefficient", &OnePoleFilter::setCoefficient)
        .function("process", &OnePoleFilter::process)
        .function("reset", &OnePoleFilter::reset);

    // DCBlocker
    class_<DCBlocker>("DCBlocker")
        .constructor<float>()
        .function("process", &DCBlocker::process)
        .function("reset", &DCBlocker::reset);

    // EnvelopeFollower
    class_<EnvelopeFollower>("EnvelopeFollower")
        .constructor<float, float, float>()
        .function("setAttack", &EnvelopeFollower::setAttack)
        .function("setRelease", &EnvelopeFollower::setRelease)
        .function("process", &EnvelopeFollower::process)
        .function("reset", &EnvelopeFollower::reset);

    // Compressor
    class_<Compressor>("Compressor")
        .constructor<float>()
        .function("setThreshold", &Compressor::setThreshold)
        .function("setRatio", &Compressor::setRatio)
        .function("setAttack", &Compressor::setAttack)
        .function("setRelease", &Compressor::setRelease)
        .function("setMakeupGain", &Compressor::setMakeupGain)
        .function("process", &Compressor::process)
        .function("reset", &Compressor::reset);

    // Limiter
    class_<Limiter>("Limiter")
        .constructor<float>()
        .function("setThreshold", &Limiter::setThreshold)
        .function("setRelease", &Limiter::setRelease)
        .function("process", &Limiter::process)
        .function("reset", &Limiter::reset);

    // DelayLine
    class_<DelayLine>("DelayLine")
        .constructor<int>()
        .function("setDelay", &DelayLine::setDelay)
        .function("setDelayFractional", &DelayLine::setDelayFractional)
        .function("process", &DelayLine::process)
        .function("reset", &DelayLine::reset);

    // SimpleReverb
    class_<SimpleReverb>("SimpleReverb")
        .constructor<float>()
        .function("setRoomSize", &SimpleReverb::setRoomSize)
        .function("setDamping", &SimpleReverb::setDamping)
        .function("setWet", &SimpleReverb::setWet)
        .function("setDry", &SimpleReverb::setDry)
        .function("process", &SimpleReverb::process)
        .function("reset", &SimpleReverb::reset);

    // Oscillator waveform enum
    enum_<Oscillator::Waveform>("Waveform")
        .value("Sine", Oscillator::Sine)
        .value("Saw", Oscillator::Saw)
        .value("Square", Oscillator::Square)
        .value("Triangle", Oscillator::Triangle)
        .value("Noise", Oscillator::Noise);

    // Oscillator
    class_<Oscillator>("Oscillator")
        .constructor<float>()
        .function("setFrequency", &Oscillator::setFrequency)
        .function("setWaveform", &Oscillator::setWaveform)
        .function("process", &Oscillator::process)
        .function("reset", &Oscillator::reset);

    // LFO
    class_<LFO>("LFO")
        .constructor<float>()
        .function("setFrequency", &LFO::setFrequency)
        .function("setWaveform", &LFO::setWaveform)
        .function("process", &LFO::process)
        .function("reset", &LFO::reset);

    // Utility functions
    function("dbToLinear", &dbToLinear);
    function("linearToDb", &linearToDb);
    function("midiToFrequency", &midiToFrequency);
    function("frequencyToMidi", &frequencyToMidi);
}
