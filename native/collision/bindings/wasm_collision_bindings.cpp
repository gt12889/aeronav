#include <emscripten/bind.h>
#include "../src/collision.hpp"

using namespace emscripten;
using namespace aeronav::collision;

EMSCRIPTEN_BINDINGS(aeronav_collision) {
    // Vec3
    value_object<Vec3>("Vec3")
        .field("x", &Vec3::x)
        .field("y", &Vec3::y)
        .field("z", &Vec3::z);

    // Ray
    value_object<Ray>("Ray")
        .field("origin", &Ray::origin)
        .field("direction", &Ray::direction);

    // Plane
    value_object<Plane>("Plane")
        .field("normal", &Plane::normal)
        .field("d", &Plane::d);

    // Sphere
    value_object<Sphere>("Sphere")
        .field("center", &Sphere::center)
        .field("radius", &Sphere::radius);

    // AABB
    value_object<AABB>("AABB")
        .field("min", &AABB::min)
        .field("max", &AABB::max);

    // OBB
    value_object<OBB>("OBB")
        .field("center", &OBB::center)
        .field("halfExtents", &OBB::halfExtents)
        .field("axisX", &OBB::axisX)
        .field("axisY", &OBB::axisY)
        .field("axisZ", &OBB::axisZ);

    // Triangle
    value_object<Triangle>("Triangle")
        .field("v0", &Triangle::v0)
        .field("v1", &Triangle::v1)
        .field("v2", &Triangle::v2);

    // HitResult
    value_object<HitResult>("HitResult")
        .field("hit", &HitResult::hit)
        .field("distance", &HitResult::distance)
        .field("point", &HitResult::point)
        .field("normal", &HitResult::normal);

    // Collision tests
    function("sphereSphere", &sphereSphere);
    function("sphereAABB", &sphereAABB);
    function("spherePlane", &spherePlane);
    function("aabbAABB", &aabbAABB);
    function("aabbPlane", &aabbPlane);
    function("obbOBB", &obbOBB);
    function("obbAABB", &obbAABB);
    function("triangleAABB", &triangleAABB);

    // Raycast functions
    function("raySphere", &raySphere);
    function("rayAABB", &rayAABB);
    function("rayPlane", &rayPlane);
    function("rayTriangle", &rayTriangle);
    function("rayOBB", &rayOBB);

    // Distance functions
    function("pointToPlane", &pointToPlane);
    function("pointToSphere", &pointToSphere);
    function("pointToAABB", &pointToAABB);
    function("closestPointOnAABB", &closestPointOnAABB);
    function("closestPointOnTriangle", &closestPointOnTriangle);

    // Sweep tests
    function("sphereCastAABB", &sphereCastAABB);
    function("aabbCastAABB", &aabbCastAABB);
}
