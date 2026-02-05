#pragma once

#include <cmath>
#include <cstdint>
#include <vector>
#include <random>

namespace aeronav {
namespace math {

// Constants
constexpr float PI = 3.14159265358979f;
constexpr float TAU = 6.28318530717959f;
constexpr float DEG2RAD = PI / 180.0f;
constexpr float RAD2DEG = 180.0f / PI;

// Clamping and mapping
inline float clamp(float v, float min, float max) { return v < min ? min : (v > max ? max : v); }
inline float clamp01(float v) { return clamp(v, 0.0f, 1.0f); }
inline float lerp(float a, float b, float t) { return a + (b - a) * t; }
inline float inverseLerp(float a, float b, float v) { return (v - a) / (b - a); }
inline float remap(float v, float inMin, float inMax, float outMin, float outMax) {
    return lerp(outMin, outMax, inverseLerp(inMin, inMax, v));
}
inline float smoothstep(float edge0, float edge1, float x) {
    float t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3.0f - 2.0f * t);
}
inline float smootherstep(float edge0, float edge1, float x) {
    float t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * t * (t * (t * 6.0f - 15.0f) + 10.0f);
}

// Trigonometry
inline float sinDeg(float deg) { return std::sin(deg * DEG2RAD); }
inline float cosDeg(float deg) { return std::cos(deg * DEG2RAD); }
inline float tanDeg(float deg) { return std::tan(deg * DEG2RAD); }

// Easing functions
float easeInQuad(float t);
float easeOutQuad(float t);
float easeInOutQuad(float t);
float easeInCubic(float t);
float easeOutCubic(float t);
float easeInOutCubic(float t);
float easeInElastic(float t);
float easeOutElastic(float t);
float easeInOutElastic(float t);
float easeInBounce(float t);
float easeOutBounce(float t);

// 4x4 Matrix operations
struct Mat4 {
    float m[16];
    static Mat4 identity();
    static Mat4 translation(float x, float y, float z);
    static Mat4 scale(float sx, float sy, float sz);
    static Mat4 rotationX(float rad);
    static Mat4 rotationY(float rad);
    static Mat4 rotationZ(float rad);
    static Mat4 perspective(float fov, float aspect, float near, float far);
    static Mat4 lookAt(float eyeX, float eyeY, float eyeZ, float atX, float atY, float atZ, float upX, float upY, float upZ);
    Mat4 operator*(const Mat4& other) const;
    void transformPoint(float& x, float& y, float& z) const;
};

// Noise generators
class PerlinNoise {
public:
    PerlinNoise(uint32_t seed = 0);
    float noise1D(float x) const;
    float noise2D(float x, float y) const;
    float noise3D(float x, float y, float z) const;
    float octave1D(float x, int octaves, float persistence) const;
    float octave2D(float x, float y, int octaves, float persistence) const;
private:
    std::vector<int> p;
    float fade(float t) const;
    float grad(int hash, float x, float y = 0, float z = 0) const;
};

// Random number utilities
class Random {
public:
    Random(uint32_t seed = 0);
    float nextFloat();
    float range(float min, float max);
    int rangeInt(int min, int max);
    float gaussian(float mean, float stddev);
private:
    std::mt19937 gen;
    std::uniform_real_distribution<float> dist;
};

// Color conversion
struct RGB { float r, g, b; };
struct HSL { float h, s, l; };
struct HSV { float h, s, v; };

RGB hslToRgb(float h, float s, float l);
HSL rgbToHsl(float r, float g, float b);
RGB hsvToRgb(float h, float s, float v);
HSV rgbToHsv(float r, float g, float b);

// Bezier curves
float bezierQuadratic(float p0, float p1, float p2, float t);
float bezierCubic(float p0, float p1, float p2, float p3, float t);

} // namespace math
} // namespace aeronav
