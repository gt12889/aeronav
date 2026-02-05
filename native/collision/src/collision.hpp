#pragma once

#include <cmath>
#include <vector>
#include <array>
#include <algorithm>
#include <limits>

namespace aeronav {
namespace collision {

// Forward declarations
struct Vec3;
struct Ray;
struct Plane;
struct Sphere;
struct AABB;
struct OBB;
struct Triangle;
struct HitResult;

// 3D Vector
struct Vec3 {
    float x, y, z;
    Vec3() : x(0), y(0), z(0) {}
    Vec3(float x, float y, float z) : x(x), y(y), z(z) {}
    Vec3 operator+(const Vec3& o) const { return {x + o.x, y + o.y, z + o.z}; }
    Vec3 operator-(const Vec3& o) const { return {x - o.x, y - o.y, z - o.z}; }
    Vec3 operator*(float s) const { return {x * s, y * s, z * s}; }
    Vec3 operator/(float s) const { return {x / s, y / s, z / s}; }
    float dot(const Vec3& o) const { return x * o.x + y * o.y + z * o.z; }
    Vec3 cross(const Vec3& o) const { return {y * o.z - z * o.y, z * o.x - x * o.z, x * o.y - y * o.x}; }
    float length() const { return std::sqrt(x * x + y * y + z * z); }
    float lengthSq() const { return x * x + y * y + z * z; }
    Vec3 normalized() const { float l = length(); return l > 0 ? *this / l : Vec3(); }
    static Vec3 min(const Vec3& a, const Vec3& b) { return {std::min(a.x, b.x), std::min(a.y, b.y), std::min(a.z, b.z)}; }
    static Vec3 max(const Vec3& a, const Vec3& b) { return {std::max(a.x, b.x), std::max(a.y, b.y), std::max(a.z, b.z)}; }
};

// Ray for raycasting
struct Ray {
    Vec3 origin;
    Vec3 direction;
    Ray() = default;
    Ray(const Vec3& o, const Vec3& d) : origin(o), direction(d.normalized()) {}
    Vec3 pointAt(float t) const { return origin + direction * t; }
};

// Plane
struct Plane {
    Vec3 normal;
    float d; // distance from origin
    Plane() : d(0) {}
    Plane(const Vec3& n, float dist) : normal(n.normalized()), d(dist) {}
    Plane(const Vec3& n, const Vec3& point) : normal(n.normalized()), d(-normal.dot(point)) {}
    float distanceToPoint(const Vec3& p) const { return normal.dot(p) + d; }
    Vec3 closestPoint(const Vec3& p) const { return p - normal * distanceToPoint(p); }
};

// Sphere
struct Sphere {
    Vec3 center;
    float radius;
    Sphere() : radius(1.0f) {}
    Sphere(const Vec3& c, float r) : center(c), radius(r) {}
    bool containsPoint(const Vec3& p) const { return (p - center).lengthSq() <= radius * radius; }
};

// Axis-Aligned Bounding Box
struct AABB {
    Vec3 min, max;
    AABB() : min(Vec3(-0.5f, -0.5f, -0.5f)), max(Vec3(0.5f, 0.5f, 0.5f)) {}
    AABB(const Vec3& minP, const Vec3& maxP) : min(minP), max(maxP) {}
    Vec3 center() const { return (min + max) * 0.5f; }
    Vec3 size() const { return max - min; }
    Vec3 halfExtents() const { return size() * 0.5f; }
    bool containsPoint(const Vec3& p) const {
        return p.x >= min.x && p.x <= max.x && p.y >= min.y && p.y <= max.y && p.z >= min.z && p.z <= max.z;
    }
    AABB expanded(float amount) const { Vec3 e(amount, amount, amount); return {min - e, max + e}; }
    static AABB fromCenterExtents(const Vec3& c, const Vec3& e) { return {c - e, c + e}; }
};

// Oriented Bounding Box
struct OBB {
    Vec3 center;
    Vec3 halfExtents;
    Vec3 axisX, axisY, axisZ; // Local axes
    OBB() : halfExtents(0.5f, 0.5f, 0.5f), axisX(1, 0, 0), axisY(0, 1, 0), axisZ(0, 0, 1) {}
    OBB(const Vec3& c, const Vec3& e, const Vec3& ax, const Vec3& ay, const Vec3& az)
        : center(c), halfExtents(e), axisX(ax), axisY(ay), axisZ(az) {}
    Vec3 localToWorld(const Vec3& local) const {
        return center + axisX * local.x + axisY * local.y + axisZ * local.z;
    }
    Vec3 worldToLocal(const Vec3& world) const {
        Vec3 d = world - center;
        return Vec3(d.dot(axisX), d.dot(axisY), d.dot(axisZ));
    }
};

// Triangle
struct Triangle {
    Vec3 v0, v1, v2;
    Triangle() = default;
    Triangle(const Vec3& a, const Vec3& b, const Vec3& c) : v0(a), v1(b), v2(c) {}
    Vec3 normal() const { return (v1 - v0).cross(v2 - v0).normalized(); }
    Vec3 centroid() const { return (v0 + v1 + v2) / 3.0f; }
    float area() const { return (v1 - v0).cross(v2 - v0).length() * 0.5f; }
};

// Hit result from collision tests
struct HitResult {
    bool hit;
    float distance;
    Vec3 point;
    Vec3 normal;
    HitResult() : hit(false), distance(std::numeric_limits<float>::max()) {}
    HitResult(bool h, float d, const Vec3& p, const Vec3& n) : hit(h), distance(d), point(p), normal(n) {}
};

// Collision test functions
bool sphereSphere(const Sphere& a, const Sphere& b);
bool sphereAABB(const Sphere& s, const AABB& box);
bool spherePlane(const Sphere& s, const Plane& p);
bool aabbAABB(const AABB& a, const AABB& b);
bool aabbPlane(const AABB& box, const Plane& p);
bool obbOBB(const OBB& a, const OBB& b);
bool obbAABB(const OBB& obb, const AABB& aabb);
bool triangleAABB(const Triangle& tri, const AABB& box);

// Raycast functions
HitResult raySphere(const Ray& ray, const Sphere& sphere);
HitResult rayAABB(const Ray& ray, const AABB& box);
HitResult rayPlane(const Ray& ray, const Plane& plane);
HitResult rayTriangle(const Ray& ray, const Triangle& tri);
HitResult rayOBB(const Ray& ray, const OBB& obb);

// Distance functions
float pointToPlane(const Vec3& p, const Plane& plane);
float pointToSphere(const Vec3& p, const Sphere& sphere);
float pointToAABB(const Vec3& p, const AABB& box);
Vec3 closestPointOnAABB(const Vec3& p, const AABB& box);
Vec3 closestPointOnTriangle(const Vec3& p, const Triangle& tri);

// Sweep tests
HitResult sphereCastAABB(const Sphere& sphere, const Vec3& velocity, const AABB& box);
HitResult aabbCastAABB(const AABB& moving, const Vec3& velocity, const AABB& stationary);

// Utility
AABB computeAABB(const std::vector<Vec3>& points);
Sphere computeBoundingSphere(const std::vector<Vec3>& points);

} // namespace collision
} // namespace aeronav
