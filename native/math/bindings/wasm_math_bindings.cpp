#include <emscripten/bind.h>
#include "../src/math_utils.hpp"

using namespace emscripten;
using namespace aeronav::math;

EMSCRIPTEN_BINDINGS(aeronav_math) {
    // Constants exposed as functions
    function("PI", +[]() { return PI; });
    function("TAU", +[]() { return TAU; });
    function("DEG2RAD", +[]() { return DEG2RAD; });
    function("RAD2DEG", +[]() { return RAD2DEG; });

    // Clamping and mapping
    function("clamp", &clamp);
    function("clamp01", &clamp01);
    function("lerp", &lerp);
    function("inverseLerp", &inverseLerp);
    function("remap", &remap);
    function("smoothstep", &smoothstep);
    function("smootherstep", &smootherstep);

    // Trigonometry
    function("sinDeg", &sinDeg);
    function("cosDeg", &cosDeg);
    function("tanDeg", &tanDeg);

    // Easing functions
    function("easeInQuad", &easeInQuad);
    function("easeOutQuad", &easeOutQuad);
    function("easeInOutQuad", &easeInOutQuad);
    function("easeInCubic", &easeInCubic);
    function("easeOutCubic", &easeOutCubic);
    function("easeInOutCubic", &easeInOutCubic);
    function("easeInElastic", &easeInElastic);
    function("easeOutElastic", &easeOutElastic);
    function("easeInOutElastic", &easeInOutElastic);
    function("easeInBounce", &easeInBounce);
    function("easeOutBounce", &easeOutBounce);

    // Color structures
    value_object<RGB>("RGB")
        .field("r", &RGB::r)
        .field("g", &RGB::g)
        .field("b", &RGB::b);
    value_object<HSL>("HSL")
        .field("h", &HSL::h)
        .field("s", &HSL::s)
        .field("l", &HSL::l);
    value_object<HSV>("HSV")
        .field("h", &HSV::h)
        .field("s", &HSV::s)
        .field("v", &HSV::v);

    // Color conversion
    function("hslToRgb", &hslToRgb);
    function("rgbToHsl", &rgbToHsl);
    function("hsvToRgb", &hsvToRgb);
    function("rgbToHsv", &rgbToHsv);

    // Bezier curves
    function("bezierQuadratic", &bezierQuadratic);
    function("bezierCubic", &bezierCubic);

    // Mat4 class
    class_<Mat4>("Mat4")
        .constructor<>()
        .class_function("identity", &Mat4::identity)
        .class_function("translation", &Mat4::translation)
        .class_function("scale", &Mat4::scale)
        .class_function("rotationX", &Mat4::rotationX)
        .class_function("rotationY", &Mat4::rotationY)
        .class_function("rotationZ", &Mat4::rotationZ)
        .class_function("perspective", &Mat4::perspective)
        .class_function("lookAt", &Mat4::lookAt)
        .function("multiply", &Mat4::operator*);

    // PerlinNoise class
    class_<PerlinNoise>("PerlinNoise")
        .constructor<uint32_t>()
        .function("noise1D", &PerlinNoise::noise1D)
        .function("noise2D", &PerlinNoise::noise2D)
        .function("noise3D", &PerlinNoise::noise3D)
        .function("octave1D", &PerlinNoise::octave1D)
        .function("octave2D", &PerlinNoise::octave2D);

    // Random class
    class_<Random>("Random")
        .constructor<uint32_t>()
        .function("nextFloat", &Random::nextFloat)
        .function("range", &Random::range)
        .function("rangeInt", &Random::rangeInt)
        .function("gaussian", &Random::gaussian);
}
