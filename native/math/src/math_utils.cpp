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

// Matrix operations
Mat4 Mat4::identity() {
    Mat4 r; for (int i = 0; i < 16; i++) r.m[i] = (i % 5 == 0) ? 1.0f : 0.0f;
    return r;
}
Mat4 Mat4::translation(float x, float y, float z) {
    Mat4 r = identity(); r.m[12] = x; r.m[13] = y; r.m[14] = z; return r;
}
Mat4 Mat4::scale(float sx, float sy, float sz) {
    Mat4 r = identity(); r.m[0] = sx; r.m[5] = sy; r.m[10] = sz; return r;
}
Mat4 Mat4::rotationX(float rad) {
    Mat4 r = identity(); float c = std::cos(rad), s = std::sin(rad);
    r.m[5] = c; r.m[6] = s; r.m[9] = -s; r.m[10] = c; return r;
}
Mat4 Mat4::rotationY(float rad) {
    Mat4 r = identity(); float c = std::cos(rad), s = std::sin(rad);
    r.m[0] = c; r.m[2] = -s; r.m[8] = s; r.m[10] = c; return r;
}
Mat4 Mat4::rotationZ(float rad) {
    Mat4 r = identity(); float c = std::cos(rad), s = std::sin(rad);
    r.m[0] = c; r.m[1] = s; r.m[4] = -s; r.m[5] = c; return r;
}
Mat4 Mat4::perspective(float fov, float aspect, float near, float far) {
    Mat4 r; for (int i = 0; i < 16; i++) r.m[i] = 0;
    float f = 1.0f / std::tan(fov * 0.5f);
    r.m[0] = f / aspect; r.m[5] = f; r.m[10] = (far + near) / (near - far);
    r.m[11] = -1.0f; r.m[14] = (2.0f * far * near) / (near - far); return r;
}
Mat4 Mat4::operator*(const Mat4& o) const {
    Mat4 r; for (int i = 0; i < 4; i++) for (int j = 0; j < 4; j++) {
        r.m[i * 4 + j] = 0;
        for (int k = 0; k < 4; k++) r.m[i * 4 + j] += m[i * 4 + k] * o.m[k * 4 + j];
    }
    return r;
}
void Mat4::transformPoint(float& x, float& y, float& z) const {
    float w = m[3] * x + m[7] * y + m[11] * z + m[15];
    float nx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    float ny = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    float nz = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    x = nx; y = ny; z = nz;
}
