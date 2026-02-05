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
Mat4 Mat4::lookAt(float eyeX, float eyeY, float eyeZ, float atX, float atY, float atZ, float upX, float upY, float upZ) {
    float fx = atX - eyeX, fy = atY - eyeY, fz = atZ - eyeZ;
    float fLen = std::sqrt(fx*fx + fy*fy + fz*fz);
    fx /= fLen; fy /= fLen; fz /= fLen;
    float sx = fy * upZ - fz * upY, sy = fz * upX - fx * upZ, sz = fx * upY - fy * upX;
    float sLen = std::sqrt(sx*sx + sy*sy + sz*sz);
    sx /= sLen; sy /= sLen; sz /= sLen;
    float ux = sy * fz - sz * fy, uy = sz * fx - sx * fz, uz = sx * fy - sy * fx;
    Mat4 r = identity();
    r.m[0] = sx; r.m[4] = sy; r.m[8] = sz;
    r.m[1] = ux; r.m[5] = uy; r.m[9] = uz;
    r.m[2] = -fx; r.m[6] = -fy; r.m[10] = -fz;
    r.m[12] = -(sx*eyeX + sy*eyeY + sz*eyeZ);
    r.m[13] = -(ux*eyeX + uy*eyeY + uz*eyeZ);
    r.m[14] = fx*eyeX + fy*eyeY + fz*eyeZ;
    return r;
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

// Perlin Noise
PerlinNoise::PerlinNoise(uint32_t seed) : p(512) {
    std::vector<int> perm(256);
    std::iota(perm.begin(), perm.end(), 0);
    std::mt19937 gen(seed);
    std::shuffle(perm.begin(), perm.end(), gen);
    for (int i = 0; i < 256; i++) { p[i] = perm[i]; p[256 + i] = perm[i]; }
}
float PerlinNoise::fade(float t) const { return t * t * t * (t * (t * 6 - 15) + 10); }
float PerlinNoise::grad(int hash, float x, float y, float z) const {
    int h = hash & 15;
    float u = h < 8 ? x : y, v = h < 4 ? y : (h == 12 || h == 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}
float PerlinNoise::noise1D(float x) const { return noise3D(x, 0, 0); }
float PerlinNoise::noise2D(float x, float y) const { return noise3D(x, y, 0); }
float PerlinNoise::noise3D(float x, float y, float z) const {
    int X = (int)std::floor(x) & 255, Y = (int)std::floor(y) & 255, Z = (int)std::floor(z) & 255;
    x -= std::floor(x); y -= std::floor(y); z -= std::floor(z);
    float u = fade(x), v = fade(y), w = fade(z);
    int A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return lerp(lerp(lerp(grad(p[AA], x, y, z), grad(p[BA], x-1, y, z), u),
                     lerp(grad(p[AB], x, y-1, z), grad(p[BB], x-1, y-1, z), u), v),
                lerp(lerp(grad(p[AA+1], x, y, z-1), grad(p[BA+1], x-1, y, z-1), u),
                     lerp(grad(p[AB+1], x, y-1, z-1), grad(p[BB+1], x-1, y-1, z-1), u), v), w);
}
float PerlinNoise::octave2D(float x, float y, int octaves, float persistence) const {
    float total = 0, freq = 1, amp = 1, maxVal = 0;
    for (int i = 0; i < octaves; i++) {
        total += noise2D(x * freq, y * freq) * amp;
        maxVal += amp; amp *= persistence; freq *= 2;
    }
    return total / maxVal;
}
float PerlinNoise::octave1D(float x, int octaves, float persistence) const {
    return octave2D(x, 0, octaves, persistence);
}

// Random
Random::Random(uint32_t seed) : gen(seed), dist(0.0f, 1.0f) {}
float Random::nextFloat() { return dist(gen); }
float Random::range(float min, float max) { return min + dist(gen) * (max - min); }
int Random::rangeInt(int min, int max) { return min + static_cast<int>(dist(gen) * (max - min + 1)); }
float Random::gaussian(float mean, float stddev) {
    std::normal_distribution<float> nd(mean, stddev);
    return nd(gen);
}

// Color conversion
RGB hslToRgb(float h, float s, float l) {
    if (s == 0) return {l, l, l};
    auto hue2rgb = [](float p, float q, float t) {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1.0f/6) return p + (q - p) * 6 * t;
        if (t < 0.5f) return q;
        if (t < 2.0f/3) return p + (q - p) * (2.0f/3 - t) * 6;
        return p;
    };
    float q = l < 0.5f ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return {hue2rgb(p, q, h + 1.0f/3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1.0f/3)};
}
HSL rgbToHsl(float r, float g, float b) {
    float mx = std::max({r, g, b}), mn = std::min({r, g, b}), d = mx - mn;
    float l = (mx + mn) / 2, h = 0, s = 0;
    if (d > 0) {
        s = l > 0.5f ? d / (2 - mx - mn) : d / (mx + mn);
        if (mx == r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (mx == g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h /= 6;
    }
    return {h, s, l};
}

RGB hsvToRgb(float h, float s, float v) {
    if (s == 0) return {v, v, v};
    h = h * 6.0f;
    int i = static_cast<int>(h);
    float f = h - i;
    float p = v * (1 - s);
    float q = v * (1 - s * f);
    float t = v * (1 - s * (1 - f));
    switch (i % 6) {
        case 0: return {v, t, p};
        case 1: return {q, v, p};
        case 2: return {p, v, t};
        case 3: return {p, q, v};
        case 4: return {t, p, v};
        default: return {v, p, q};
    }
}

HSV rgbToHsv(float r, float g, float b) {
    float mx = std::max({r, g, b}), mn = std::min({r, g, b}), d = mx - mn;
    float h = 0, s = (mx == 0) ? 0 : d / mx;
    if (d > 0) {
        if (mx == r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (mx == g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h /= 6;
    }
    return {h, s, mx};
}

// Bezier
float bezierQuadratic(float p0, float p1, float p2, float t) {
    float t1 = 1 - t; return t1 * t1 * p0 + 2 * t1 * t * p1 + t * t * p2;
}
float bezierCubic(float p0, float p1, float p2, float p3, float t) {
    float t1 = 1 - t; return t1*t1*t1*p0 + 3*t1*t1*t*p1 + 3*t1*t*t*p2 + t*t*t*p3;
}

} // namespace math
} // namespace aeronav
