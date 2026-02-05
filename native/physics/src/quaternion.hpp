#pragma once

#include "vector3.hpp"
#include <cmath>

namespace aeronav {

struct alignas(16) Quaternion {
    float w, x, y, z;

    // Constructors
    Quaternion() : w(1.0f), x(0.0f), y(0.0f), z(0.0f) {}
    Quaternion(float w_, float x_, float y_, float z_) : w(w_), x(x_), y(y_), z(z_) {}

    // Identity quaternion
    static Quaternion identity() {
        return Quaternion(1.0f, 0.0f, 0.0f, 0.0f);
    }

    // Create from axis-angle representation
    static Quaternion fromAxisAngle(const Vector3& axis, float angle) {
        float halfAngle = angle * 0.5f;
        float s = std::sin(halfAngle);
        Vector3 normalizedAxis = axis.normalized();
        return Quaternion(
            std::cos(halfAngle),
            normalizedAxis.x * s,
            normalizedAxis.y * s,
            normalizedAxis.z * s
        );
    }

    // Create from Euler angles (roll, pitch, yaw in radians)
    // Uses ZYX convention (yaw-pitch-roll)
    static Quaternion fromEuler(float roll, float pitch, float yaw) {
        float cr = std::cos(roll * 0.5f);
        float sr = std::sin(roll * 0.5f);
        float cp = std::cos(pitch * 0.5f);
        float sp = std::sin(pitch * 0.5f);
        float cy = std::cos(yaw * 0.5f);
        float sy = std::sin(yaw * 0.5f);

        return Quaternion(
            cr * cp * cy + sr * sp * sy,
            sr * cp * cy - cr * sp * sy,
            cr * sp * cy + sr * cp * sy,
            cr * cp * sy - sr * sp * cy
        );
    }

    // Create from Euler angles as Vector3 (x=roll, y=pitch, z=yaw)
    static Quaternion fromEulerVec(const Vector3& euler) {
        return fromEuler(euler.x, euler.y, euler.z);
    }

    // Convert to Euler angles (returns Vector3 with x=roll, y=pitch, z=yaw)
    Vector3 toEuler() const {
        Vector3 euler;

        // Roll (x-axis rotation)
        float sinr_cosp = 2.0f * (w * x + y * z);
        float cosr_cosp = 1.0f - 2.0f * (x * x + y * y);
        euler.x = std::atan2(sinr_cosp, cosr_cosp);

        // Pitch (y-axis rotation)
        float sinp = 2.0f * (w * y - z * x);
        if (std::abs(sinp) >= 1.0f) {
            euler.y = std::copysign(3.14159265358979f * 0.5f, sinp); // Gimbal lock
        } else {
            euler.y = std::asin(sinp);
        }

        // Yaw (z-axis rotation)
        float siny_cosp = 2.0f * (w * z + x * y);
        float cosy_cosp = 1.0f - 2.0f * (y * y + z * z);
        euler.z = std::atan2(siny_cosp, cosy_cosp);

        return euler;
    }

    // Quaternion multiplication (Hamilton product)
    Quaternion operator*(const Quaternion& other) const {
        return Quaternion(
            w * other.w - x * other.x - y * other.y - z * other.z,
            w * other.x + x * other.w + y * other.z - z * other.y,
            w * other.y - x * other.z + y * other.w + z * other.x,
            w * other.z + x * other.y - y * other.x + z * other.w
        );
    }

    Quaternion& operator*=(const Quaternion& other) {
        *this = *this * other;
        return *this;
    }

    // Scalar multiplication
    Quaternion operator*(float scalar) const {
        return Quaternion(w * scalar, x * scalar, y * scalar, z * scalar);
    }

    // Addition
    Quaternion operator+(const Quaternion& other) const {
        return Quaternion(w + other.w, x + other.x, y + other.y, z + other.z);
    }

    // Conjugate (inverse rotation for unit quaternions)
    Quaternion conjugate() const {
        return Quaternion(w, -x, -y, -z);
    }

    // Magnitude
    float length() const {
        return std::sqrt(w * w + x * x + y * y + z * z);
    }

    float lengthSquared() const {
        return w * w + x * x + y * y + z * z;
    }

    // Normalize
    Quaternion normalized() const {
        float len = length();
        if (len > 1e-8f) {
            float inv = 1.0f / len;
            return Quaternion(w * inv, x * inv, y * inv, z * inv);
        }
        return Quaternion::identity();
    }

    void normalize() {
        *this = normalized();
    }

    // Inverse (for unit quaternions, this is the same as conjugate)
    Quaternion inverse() const {
        float sqrLen = lengthSquared();
        if (sqrLen > 1e-8f) {
            float inv = 1.0f / sqrLen;
            return Quaternion(w * inv, -x * inv, -y * inv, -z * inv);
        }
        return Quaternion::identity();
    }

    // Rotate a vector by this quaternion
    Vector3 rotateVector(const Vector3& v) const {
        // Optimized quaternion-vector rotation
        // q * v * q^-1 = v + 2*w*(qv x v) + 2*(qv x (qv x v))
        Vector3 qv(x, y, z);
        Vector3 uv = qv.cross(v);
        Vector3 uuv = qv.cross(uv);
        return v + (uv * w + uuv) * 2.0f;
    }

    // Get the forward direction (local Z-axis after rotation)
    Vector3 getForward() const {
        return rotateVector(Vector3::forward());
    }

    // Get the up direction (local Y-axis after rotation)
    Vector3 getUp() const {
        return rotateVector(Vector3::up());
    }

    // Get the right direction (local X-axis after rotation)
    Vector3 getRight() const {
        return rotateVector(Vector3::right());
    }

    // Spherical linear interpolation
    static Quaternion slerp(const Quaternion& a, const Quaternion& b, float t) {
        // Compute the dot product
        float dot = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;

        // If the dot product is negative, negate one quaternion
        // to ensure the shortest path is taken
        Quaternion bCopy = b;
        if (dot < 0.0f) {
            bCopy = Quaternion(-b.w, -b.x, -b.y, -b.z);
            dot = -dot;
        }

        // If quaternions are nearly identical, use linear interpolation
        const float DOT_THRESHOLD = 0.9995f;
        if (dot > DOT_THRESHOLD) {
            Quaternion result = Quaternion(
                a.w + t * (bCopy.w - a.w),
                a.x + t * (bCopy.x - a.x),
                a.y + t * (bCopy.y - a.y),
                a.z + t * (bCopy.z - a.z)
            );
            return result.normalized();
        }

        // Calculate spherical interpolation
        float theta0 = std::acos(dot);
        float theta = theta0 * t;
        float sinTheta = std::sin(theta);
        float sinTheta0 = std::sin(theta0);

        float s0 = std::cos(theta) - dot * sinTheta / sinTheta0;
        float s1 = sinTheta / sinTheta0;

        return Quaternion(
            a.w * s0 + bCopy.w * s1,
            a.x * s0 + bCopy.x * s1,
            a.y * s0 + bCopy.y * s1,
            a.z * s0 + bCopy.z * s1
        );
    }

    // Normalized linear interpolation (faster but less accurate than slerp)
    static Quaternion nlerp(const Quaternion& a, const Quaternion& b, float t) {
        float dot = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;
        Quaternion bCopy = (dot < 0.0f) ? Quaternion(-b.w, -b.x, -b.y, -b.z) : b;

        return Quaternion(
            a.w + t * (bCopy.w - a.w),
            a.x + t * (bCopy.x - a.x),
            a.y + t * (bCopy.y - a.y),
            a.z + t * (bCopy.z - a.z)
        ).normalized();
    }

    // Angle between two quaternions (in radians)
    static float angle(const Quaternion& a, const Quaternion& b) {
        float dot = std::abs(a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z);
        return 2.0f * std::acos(std::fmin(dot, 1.0f));
    }

    // Create a rotation that looks in the specified direction
    static Quaternion lookRotation(const Vector3& forward, const Vector3& up = Vector3::up()) {
        Vector3 f = forward.normalized();
        Vector3 r = up.cross(f).normalized();
        Vector3 u = f.cross(r);

        float m00 = r.x, m01 = r.y, m02 = r.z;
        float m10 = u.x, m11 = u.y, m12 = u.z;
        float m20 = f.x, m21 = f.y, m22 = f.z;

        float trace = m00 + m11 + m22;
        Quaternion q;

        if (trace > 0.0f) {
            float s = 0.5f / std::sqrt(trace + 1.0f);
            q.w = 0.25f / s;
            q.x = (m12 - m21) * s;
            q.y = (m20 - m02) * s;
            q.z = (m01 - m10) * s;
        } else if (m00 > m11 && m00 > m22) {
            float s = 2.0f * std::sqrt(1.0f + m00 - m11 - m22);
            q.w = (m12 - m21) / s;
            q.x = 0.25f * s;
            q.y = (m10 + m01) / s;
            q.z = (m20 + m02) / s;
        } else if (m11 > m22) {
            float s = 2.0f * std::sqrt(1.0f + m11 - m00 - m22);
            q.w = (m20 - m02) / s;
            q.x = (m10 + m01) / s;
            q.y = 0.25f * s;
            q.z = (m21 + m12) / s;
        } else {
            float s = 2.0f * std::sqrt(1.0f + m22 - m00 - m11);
            q.w = (m01 - m10) / s;
            q.x = (m20 + m02) / s;
            q.y = (m21 + m12) / s;
            q.z = 0.25f * s;
        }

        return q.normalized();
    }
};

// Non-member operators
inline Quaternion operator*(float scalar, const Quaternion& q) {
    return q * scalar;
}

} // namespace aeronav
