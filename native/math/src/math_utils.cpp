#include "math_utils.hpp"
#include <algorithm>
#include <numeric>

namespace aeronav {
namespace math {

// Easing functions
float easeInQuad(float t) { return t * t; }
float easeOutQuad(float t) { return t * (2.0f - t); }
float easeInOutQuad(float t) { return t < 0.5f ? 2.0f * t * t : -1.0f + (4.0f - 2.0f * t) * t; }
float easeInCubic(float t) { return t * t * t; }
float easeOutCubic(float t) { float t1 = t - 1.0f; return t1 * t1 * t1 + 1.0f; }
float easeInOutCubic(float t) { return t < 0.5f ? 4.0f * t * t * t : (t - 1.0f) * (2.0f * t - 2.0f) * (2.0f * t - 2.0f) + 1.0f; }

float easeOutBounce(float t) {
    if (t < 1.0f / 2.75f) return 7.5625f * t * t;
    if (t < 2.0f / 2.75f) { t -= 1.5f / 2.75f; return 7.5625f * t * t + 0.75f; }
    if (t < 2.5f / 2.75f) { t -= 2.25f / 2.75f; return 7.5625f * t * t + 0.9375f; }
    t -= 2.625f / 2.75f; return 7.5625f * t * t + 0.984375f;
}
float easeInBounce(float t) { return 1.0f - easeOutBounce(1.0f - t); }

float easeOutElastic(float t) {
    if (t == 0 || t == 1) return t;
    return std::pow(2.0f, -10.0f * t) * std::sin((t - 0.075f) * TAU / 0.3f) + 1.0f;
}
float easeInElastic(float t) { return 1.0f - easeOutElastic(1.0f - t); }
float easeInOutElastic(float t) { return t < 0.5f ? easeInElastic(t * 2.0f) * 0.5f : easeOutElastic(t * 2.0f - 1.0f) * 0.5f + 0.5f; }
