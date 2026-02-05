#pragma once

#include <cmath>
#include <cstdint>

// SIMD support detection
#if defined(__EMSCRIPTEN__)
    #include <wasm_simd128.h>
    #define USE_WASM_SIMD 1
#elif defined(__SSE__)
    #include <xmmintrin.h>
    #define USE_SSE 1
#endif

namespace aeronav {

struct alignas(16) Vector3 {
    float x, y, z;
    float _pad; // Padding for 16-byte alignment (SIMD friendly)

    // Constructors
    Vector3() : x(0.0f), y(0.0f), z(0.0f), _pad(0.0f) {}
    Vector3(float x_, float y_, float z_) : x(x_), y(y_), z(z_), _pad(0.0f) {}

    // Static factory methods
    static Vector3 zero() { return Vector3(0.0f, 0.0f, 0.0f); }
    static Vector3 one() { return Vector3(1.0f, 1.0f, 1.0f); }
    static Vector3 up() { return Vector3(0.0f, 1.0f, 0.0f); }
    static Vector3 forward() { return Vector3(0.0f, 0.0f, 1.0f); }
    static Vector3 right() { return Vector3(1.0f, 0.0f, 0.0f); }

    // Basic operations
    Vector3 operator+(const Vector3& other) const {
#if USE_WASM_SIMD
        v128_t a = wasm_v128_load(reinterpret_cast<const float*>(this));
        v128_t b = wasm_v128_load(reinterpret_cast<const float*>(&other));
        v128_t result = wasm_f32x4_add(a, b);
        Vector3 out;
        wasm_v128_store(reinterpret_cast<float*>(&out), result);
        return out;
#elif USE_SSE
        __m128 a = _mm_load_ps(reinterpret_cast<const float*>(this));
        __m128 b = _mm_load_ps(reinterpret_cast<const float*>(&other));
        __m128 result = _mm_add_ps(a, b);
        Vector3 out;
        _mm_store_ps(reinterpret_cast<float*>(&out), result);
        return out;
#else
        return Vector3(x + other.x, y + other.y, z + other.z);
#endif
    }

    Vector3 operator-(const Vector3& other) const {
#if USE_WASM_SIMD
        v128_t a = wasm_v128_load(reinterpret_cast<const float*>(this));
        v128_t b = wasm_v128_load(reinterpret_cast<const float*>(&other));
        v128_t result = wasm_f32x4_sub(a, b);
        Vector3 out;
        wasm_v128_store(reinterpret_cast<float*>(&out), result);
        return out;
#elif USE_SSE
        __m128 a = _mm_load_ps(reinterpret_cast<const float*>(this));
        __m128 b = _mm_load_ps(reinterpret_cast<const float*>(&other));
        __m128 result = _mm_sub_ps(a, b);
        Vector3 out;
        _mm_store_ps(reinterpret_cast<float*>(&out), result);
        return out;
#else
        return Vector3(x - other.x, y - other.y, z - other.z);
#endif
    }

    Vector3 operator*(float scalar) const {
#if USE_WASM_SIMD
        v128_t a = wasm_v128_load(reinterpret_cast<const float*>(this));
        v128_t s = wasm_f32x4_splat(scalar);
        v128_t result = wasm_f32x4_mul(a, s);
        Vector3 out;
        wasm_v128_store(reinterpret_cast<float*>(&out), result);
        return out;
#elif USE_SSE
        __m128 a = _mm_load_ps(reinterpret_cast<const float*>(this));
        __m128 s = _mm_set1_ps(scalar);
        __m128 result = _mm_mul_ps(a, s);
        Vector3 out;
        _mm_store_ps(reinterpret_cast<float*>(&out), result);
        return out;
#else
        return Vector3(x * scalar, y * scalar, z * scalar);
#endif
    }

    Vector3 operator/(float scalar) const {
        float inv = 1.0f / scalar;
        return (*this) * inv;
    }

    Vector3 operator-() const {
        return Vector3(-x, -y, -z);
    }

    Vector3& operator+=(const Vector3& other) {
        *this = *this + other;
        return *this;
    }

    Vector3& operator-=(const Vector3& other) {
        *this = *this - other;
        return *this;
    }

    Vector3& operator*=(float scalar) {
        *this = *this * scalar;
        return *this;
    }

    Vector3& operator/=(float scalar) {
        *this = *this / scalar;
        return *this;
    }

    // Dot product
    float dot(const Vector3& other) const {
#if USE_WASM_SIMD
        v128_t a = wasm_v128_load(reinterpret_cast<const float*>(this));
        v128_t b = wasm_v128_load(reinterpret_cast<const float*>(&other));
        v128_t mul = wasm_f32x4_mul(a, b);
        // Sum first 3 components (x, y, z), ignore w
        float result[4];
        wasm_v128_store(result, mul);
        return result[0] + result[1] + result[2];
#elif USE_SSE
        __m128 a = _mm_load_ps(reinterpret_cast<const float*>(this));
        __m128 b = _mm_load_ps(reinterpret_cast<const float*>(&other));
        __m128 mul = _mm_mul_ps(a, b);
        float result[4];
        _mm_store_ps(result, mul);
        return result[0] + result[1] + result[2];
#else
        return x * other.x + y * other.y + z * other.z;
#endif
    }

    // Cross product
    Vector3 cross(const Vector3& other) const {
        return Vector3(
            y * other.z - z * other.y,
            z * other.x - x * other.z,
            x * other.y - y * other.x
        );
    }

    // Magnitude (length)
    float length() const {
        return std::sqrt(dot(*this));
    }

    float lengthSquared() const {
        return dot(*this);
    }

    // Normalize
    Vector3 normalized() const {
        float len = length();
        if (len > 1e-8f) {
            return *this / len;
        }
        return Vector3::zero();
    }

    void normalize() {
        *this = normalized();
    }

    // Distance
    float distanceTo(const Vector3& other) const {
        return (*this - other).length();
    }

    float distanceSquaredTo(const Vector3& other) const {
        return (*this - other).lengthSquared();
    }

    // Linear interpolation
    static Vector3 lerp(const Vector3& a, const Vector3& b, float t) {
        return a + (b - a) * t;
    }

    // Clamp magnitude
    Vector3 clampMagnitude(float maxLength) const {
        float sqrLen = lengthSquared();
        if (sqrLen > maxLength * maxLength) {
            float len = std::sqrt(sqrLen);
            return *this * (maxLength / len);
        }
        return *this;
    }

    // Reflect
    Vector3 reflect(const Vector3& normal) const {
        return *this - normal * (2.0f * dot(normal));
    }

    // Project onto another vector
    Vector3 projectOnto(const Vector3& other) const {
        float sqrLen = other.lengthSquared();
        if (sqrLen < 1e-8f) return Vector3::zero();
        return other * (dot(other) / sqrLen);
    }

    // Component-wise min/max
    static Vector3 min(const Vector3& a, const Vector3& b) {
#if USE_WASM_SIMD
        v128_t va = wasm_v128_load(reinterpret_cast<const float*>(&a));
        v128_t vb = wasm_v128_load(reinterpret_cast<const float*>(&b));
        v128_t result = wasm_f32x4_min(va, vb);
        Vector3 out;
        wasm_v128_store(reinterpret_cast<float*>(&out), result);
        return out;
#elif USE_SSE
        __m128 va = _mm_load_ps(reinterpret_cast<const float*>(&a));
        __m128 vb = _mm_load_ps(reinterpret_cast<const float*>(&b));
        __m128 result = _mm_min_ps(va, vb);
        Vector3 out;
        _mm_store_ps(reinterpret_cast<float*>(&out), result);
        return out;
#else
        return Vector3(
            std::fmin(a.x, b.x),
            std::fmin(a.y, b.y),
            std::fmin(a.z, b.z)
        );
#endif
    }

    static Vector3 max(const Vector3& a, const Vector3& b) {
#if USE_WASM_SIMD
        v128_t va = wasm_v128_load(reinterpret_cast<const float*>(&a));
        v128_t vb = wasm_v128_load(reinterpret_cast<const float*>(&b));
        v128_t result = wasm_f32x4_max(va, vb);
        Vector3 out;
        wasm_v128_store(reinterpret_cast<float*>(&out), result);
        return out;
#elif USE_SSE
        __m128 va = _mm_load_ps(reinterpret_cast<const float*>(&a));
        __m128 vb = _mm_load_ps(reinterpret_cast<const float*>(&b));
        __m128 result = _mm_max_ps(va, vb);
        Vector3 out;
        _mm_store_ps(reinterpret_cast<float*>(&out), result);
        return out;
#else
        return Vector3(
            std::fmax(a.x, b.x),
            std::fmax(a.y, b.y),
            std::fmax(a.z, b.z)
        );
#endif
    }
};

// Non-member operators
inline Vector3 operator*(float scalar, const Vector3& v) {
    return v * scalar;
}

} // namespace aeronav
