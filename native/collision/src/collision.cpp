#include "collision.hpp"

namespace aeronav {
namespace collision {

// Sphere-Sphere collision
bool sphereSphere(const Sphere& a, const Sphere& b) {
    float radiusSum = a.radius + b.radius;
    return (a.center - b.center).lengthSq() <= radiusSum * radiusSum;
}

// Sphere-AABB collision
bool sphereAABB(const Sphere& s, const AABB& box) {
    Vec3 closest = closestPointOnAABB(s.center, box);
    return (closest - s.center).lengthSq() <= s.radius * s.radius;
}

// Sphere-Plane collision
bool spherePlane(const Sphere& s, const Plane& p) {
    float dist = std::abs(p.distanceToPoint(s.center));
    return dist <= s.radius;
}

// AABB-AABB collision
bool aabbAABB(const AABB& a, const AABB& b) {
    return a.min.x <= b.max.x && a.max.x >= b.min.x &&
           a.min.y <= b.max.y && a.max.y >= b.min.y &&
           a.min.z <= b.max.z && a.max.z >= b.min.z;
}

// AABB-Plane collision
bool aabbPlane(const AABB& box, const Plane& p) {
    Vec3 c = box.center();
    Vec3 e = box.halfExtents();
    float r = e.x * std::abs(p.normal.x) + e.y * std::abs(p.normal.y) + e.z * std::abs(p.normal.z);
    float s = p.distanceToPoint(c);
    return std::abs(s) <= r;
}

// OBB-OBB collision using Separating Axis Theorem
bool obbOBB(const OBB& a, const OBB& b) {
    Vec3 axes[15] = {
        a.axisX, a.axisY, a.axisZ,
        b.axisX, b.axisY, b.axisZ,
        a.axisX.cross(b.axisX), a.axisX.cross(b.axisY), a.axisX.cross(b.axisZ),
        a.axisY.cross(b.axisX), a.axisY.cross(b.axisY), a.axisY.cross(b.axisZ),
        a.axisZ.cross(b.axisX), a.axisZ.cross(b.axisY), a.axisZ.cross(b.axisZ)
    };

    Vec3 d = b.center - a.center;

    for (int i = 0; i < 15; i++) {
        Vec3& axis = axes[i];
        if (axis.lengthSq() < 1e-6f) continue;
        axis = axis.normalized();

        float projA = std::abs(a.halfExtents.x * a.axisX.dot(axis)) +
                      std::abs(a.halfExtents.y * a.axisY.dot(axis)) +
                      std::abs(a.halfExtents.z * a.axisZ.dot(axis));
        float projB = std::abs(b.halfExtents.x * b.axisX.dot(axis)) +
                      std::abs(b.halfExtents.y * b.axisY.dot(axis)) +
                      std::abs(b.halfExtents.z * b.axisZ.dot(axis));
        float dist = std::abs(d.dot(axis));

        if (dist > projA + projB) return false;
    }
    return true;
}

// OBB-AABB collision
bool obbAABB(const OBB& obb, const AABB& aabb) {
    OBB aabbOBB;
    aabbOBB.center = aabb.center();
    aabbOBB.halfExtents = aabb.halfExtents();
    aabbOBB.axisX = Vec3(1, 0, 0);
    aabbOBB.axisY = Vec3(0, 1, 0);
    aabbOBB.axisZ = Vec3(0, 0, 1);
    return obbOBB(obb, aabbOBB);
}

// Triangle-AABB collision using SAT
bool triangleAABB(const Triangle& tri, const AABB& box) {
    Vec3 c = box.center();
    Vec3 e = box.halfExtents();

    Vec3 v0 = tri.v0 - c, v1 = tri.v1 - c, v2 = tri.v2 - c;
    Vec3 f0 = v1 - v0, f1 = v2 - v1, f2 = v0 - v2;

    // Test 9 edge cross-products
    Vec3 axes[9] = {
        Vec3(0, -f0.z, f0.y), Vec3(f0.z, 0, -f0.x), Vec3(-f0.y, f0.x, 0),
        Vec3(0, -f1.z, f1.y), Vec3(f1.z, 0, -f1.x), Vec3(-f1.y, f1.x, 0),
        Vec3(0, -f2.z, f2.y), Vec3(f2.z, 0, -f2.x), Vec3(-f2.y, f2.x, 0)
    };

    for (int i = 0; i < 9; i++) {
        float p0 = v0.dot(axes[i]), p1 = v1.dot(axes[i]), p2 = v2.dot(axes[i]);
        float r = e.x * std::abs(Vec3(1, 0, 0).dot(axes[i])) +
                  e.y * std::abs(Vec3(0, 1, 0).dot(axes[i])) +
                  e.z * std::abs(Vec3(0, 0, 1).dot(axes[i]));
        if (std::max(-std::max({p0, p1, p2}), std::min({p0, p1, p2})) > r) return false;
    }

    // Test box normals
    float minT, maxT;
    minT = std::min({v0.x, v1.x, v2.x}); maxT = std::max({v0.x, v1.x, v2.x});
    if (minT > e.x || maxT < -e.x) return false;
    minT = std::min({v0.y, v1.y, v2.y}); maxT = std::max({v0.y, v1.y, v2.y});
    if (minT > e.y || maxT < -e.y) return false;
    minT = std::min({v0.z, v1.z, v2.z}); maxT = std::max({v0.z, v1.z, v2.z});
    if (minT > e.z || maxT < -e.z) return false;

    // Test triangle normal
    Vec3 n = f0.cross(f1);
    float d = n.dot(v0);
    float r = e.x * std::abs(n.x) + e.y * std::abs(n.y) + e.z * std::abs(n.z);
    return std::abs(d) <= r;
}

// Ray-Sphere intersection
HitResult raySphere(const Ray& ray, const Sphere& sphere) {
    Vec3 oc = ray.origin - sphere.center;
    float a = ray.direction.dot(ray.direction);
    float b = 2.0f * oc.dot(ray.direction);
    float c = oc.dot(oc) - sphere.radius * sphere.radius;
    float disc = b * b - 4 * a * c;

    if (disc < 0) return HitResult();

    float t = (-b - std::sqrt(disc)) / (2.0f * a);
    if (t < 0) {
        t = (-b + std::sqrt(disc)) / (2.0f * a);
        if (t < 0) return HitResult();
    }

    Vec3 point = ray.pointAt(t);
    Vec3 normal = (point - sphere.center).normalized();
    return HitResult(true, t, point, normal);
}

// Ray-AABB intersection (slab method)
HitResult rayAABB(const Ray& ray, const AABB& box) {
    float tmin = 0, tmax = std::numeric_limits<float>::max();
    Vec3 normal;

    for (int i = 0; i < 3; i++) {
        float origin = (i == 0) ? ray.origin.x : (i == 1) ? ray.origin.y : ray.origin.z;
        float dir = (i == 0) ? ray.direction.x : (i == 1) ? ray.direction.y : ray.direction.z;
        float minB = (i == 0) ? box.min.x : (i == 1) ? box.min.y : box.min.z;
        float maxB = (i == 0) ? box.max.x : (i == 1) ? box.max.y : box.max.z;

        if (std::abs(dir) < 1e-8f) {
            if (origin < minB || origin > maxB) return HitResult();
        } else {
            float t1 = (minB - origin) / dir;
            float t2 = (maxB - origin) / dir;
            Vec3 n1 = (i == 0) ? Vec3(-1, 0, 0) : (i == 1) ? Vec3(0, -1, 0) : Vec3(0, 0, -1);
            Vec3 n2 = (i == 0) ? Vec3(1, 0, 0) : (i == 1) ? Vec3(0, 1, 0) : Vec3(0, 0, 1);

            if (t1 > t2) { std::swap(t1, t2); std::swap(n1, n2); }
            if (t1 > tmin) { tmin = t1; normal = n1; }
            if (t2 < tmax) tmax = t2;
            if (tmin > tmax) return HitResult();
        }
    }

    if (tmin < 0) return HitResult();
    return HitResult(true, tmin, ray.pointAt(tmin), normal);
}

// Ray-Plane intersection
HitResult rayPlane(const Ray& ray, const Plane& plane) {
    float denom = plane.normal.dot(ray.direction);
    if (std::abs(denom) < 1e-6f) return HitResult();

    float t = -(plane.normal.dot(ray.origin) + plane.d) / denom;
    if (t < 0) return HitResult();

    return HitResult(true, t, ray.pointAt(t), plane.normal);
}

// Ray-Triangle intersection (Moller-Trumbore)
HitResult rayTriangle(const Ray& ray, const Triangle& tri) {
    Vec3 e1 = tri.v1 - tri.v0;
    Vec3 e2 = tri.v2 - tri.v0;
    Vec3 h = ray.direction.cross(e2);
    float a = e1.dot(h);

    if (std::abs(a) < 1e-6f) return HitResult();

    float f = 1.0f / a;
    Vec3 s = ray.origin - tri.v0;
    float u = f * s.dot(h);
    if (u < 0 || u > 1) return HitResult();

    Vec3 q = s.cross(e1);
    float v = f * ray.direction.dot(q);
    if (v < 0 || u + v > 1) return HitResult();

    float t = f * e2.dot(q);
    if (t < 0) return HitResult();

    return HitResult(true, t, ray.pointAt(t), tri.normal());
}

// Ray-OBB intersection
HitResult rayOBB(const Ray& ray, const OBB& obb) {
    Vec3 localOrigin = obb.worldToLocal(ray.origin);
    Vec3 localDir = Vec3(
        ray.direction.dot(obb.axisX),
        ray.direction.dot(obb.axisY),
        ray.direction.dot(obb.axisZ)
    );

    AABB localBox = AABB::fromCenterExtents(Vec3(), obb.halfExtents);
    Ray localRay(localOrigin, localDir);
    HitResult result = rayAABB(localRay, localBox);

    if (result.hit) {
        result.point = obb.localToWorld(result.point);
        result.normal = obb.axisX * result.normal.x + obb.axisY * result.normal.y + obb.axisZ * result.normal.z;
    }
    return result;
}

// Point to plane distance
float pointToPlane(const Vec3& p, const Plane& plane) {
    return plane.distanceToPoint(p);
}

// Point to sphere distance
float pointToSphere(const Vec3& p, const Sphere& sphere) {
    return std::max(0.0f, (p - sphere.center).length() - sphere.radius);
}

// Point to AABB distance
float pointToAABB(const Vec3& p, const AABB& box) {
    return (closestPointOnAABB(p, box) - p).length();
}

// Closest point on AABB
Vec3 closestPointOnAABB(const Vec3& p, const AABB& box) {
    return Vec3(
        std::clamp(p.x, box.min.x, box.max.x),
        std::clamp(p.y, box.min.y, box.max.y),
        std::clamp(p.z, box.min.z, box.max.z)
    );
}

// Closest point on triangle
Vec3 closestPointOnTriangle(const Vec3& p, const Triangle& tri) {
    Vec3 ab = tri.v1 - tri.v0;
    Vec3 ac = tri.v2 - tri.v0;
    Vec3 ap = p - tri.v0;

    float d1 = ab.dot(ap), d2 = ac.dot(ap);
    if (d1 <= 0 && d2 <= 0) return tri.v0;

    Vec3 bp = p - tri.v1;
    float d3 = ab.dot(bp), d4 = ac.dot(bp);
    if (d3 >= 0 && d4 <= d3) return tri.v1;

    float vc = d1 * d4 - d3 * d2;
    if (vc <= 0 && d1 >= 0 && d3 <= 0) {
        float v = d1 / (d1 - d3);
        return tri.v0 + ab * v;
    }

    Vec3 cp = p - tri.v2;
    float d5 = ab.dot(cp), d6 = ac.dot(cp);
    if (d6 >= 0 && d5 <= d6) return tri.v2;

    float vb = d5 * d2 - d1 * d6;
    if (vb <= 0 && d2 >= 0 && d6 <= 0) {
        float w = d2 / (d2 - d6);
        return tri.v0 + ac * w;
    }

    float va = d3 * d6 - d5 * d4;
    if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
        float w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
        return tri.v1 + (tri.v2 - tri.v1) * w;
    }

    float denom = 1.0f / (va + vb + vc);
    float v = vb * denom, w = vc * denom;
    return tri.v0 + ab * v + ac * w;
}

// Sphere cast against AABB
HitResult sphereCastAABB(const Sphere& sphere, const Vec3& velocity, const AABB& box) {
    AABB expanded = box.expanded(sphere.radius);
    Ray ray(sphere.center, velocity.normalized());
    HitResult result = rayAABB(ray, expanded);

    if (result.hit && result.distance <= velocity.length()) {
        return result;
    }
    return HitResult();
}

// AABB cast against AABB (Minkowski sum)
HitResult aabbCastAABB(const AABB& moving, const Vec3& velocity, const AABB& stationary) {
    Vec3 e = moving.halfExtents();
    AABB expanded(stationary.min - e, stationary.max + e);
    Ray ray(moving.center(), velocity.normalized());
    HitResult result = rayAABB(ray, expanded);

    if (result.hit && result.distance <= velocity.length()) {
        return result;
    }
    return HitResult();
}

// Compute AABB from points
AABB computeAABB(const std::vector<Vec3>& points) {
    if (points.empty()) return AABB();

    Vec3 minP = points[0], maxP = points[0];
    for (const Vec3& p : points) {
        minP = Vec3::min(minP, p);
        maxP = Vec3::max(maxP, p);
    }
    return AABB(minP, maxP);
}

// Compute bounding sphere (Ritter's algorithm)
Sphere computeBoundingSphere(const std::vector<Vec3>& points) {
    if (points.empty()) return Sphere();
    if (points.size() == 1) return Sphere(points[0], 0);

    // Find extreme points
    int minX = 0, maxX = 0, minY = 0, maxY = 0, minZ = 0, maxZ = 0;
    for (size_t i = 1; i < points.size(); i++) {
        if (points[i].x < points[minX].x) minX = i;
        if (points[i].x > points[maxX].x) maxX = i;
        if (points[i].y < points[minY].y) minY = i;
        if (points[i].y > points[maxY].y) maxY = i;
        if (points[i].z < points[minZ].z) minZ = i;
        if (points[i].z > points[maxZ].z) maxZ = i;
    }

    float distX = (points[maxX] - points[minX]).lengthSq();
    float distY = (points[maxY] - points[minY]).lengthSq();
    float distZ = (points[maxZ] - points[minZ]).lengthSq();

    int min = minX, max = maxX;
    if (distY > distX && distY > distZ) { min = minY; max = maxY; }
    else if (distZ > distX && distZ > distY) { min = minZ; max = maxZ; }

    Vec3 center = (points[min] + points[max]) * 0.5f;
    float radius = (points[max] - center).length();

    // Expand to contain all points
    for (const Vec3& p : points) {
        Vec3 d = p - center;
        float dist = d.length();
        if (dist > radius) {
            float newRadius = (radius + dist) * 0.5f;
            float k = (newRadius - radius) / dist;
            radius = newRadius;
            center = center + d * k;
        }
    }

    return Sphere(center, radius);
}

} // namespace collision
} // namespace aeronav
