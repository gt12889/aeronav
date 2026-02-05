#include <emscripten/bind.h>
#include "../src/spatial.hpp"

using namespace emscripten;
using namespace aeronav::spatial;

EMSCRIPTEN_BINDINGS(aeronav_spatial) {
    // Vec3
    value_object<Vec3>("Vec3")
        .field("x", &Vec3::x)
        .field("y", &Vec3::y)
        .field("z", &Vec3::z);

    // AABB
    value_object<AABB>("AABB")
        .field("min", &AABB::min)
        .field("max", &AABB::max);

    // SpatialEntity
    value_object<SpatialEntity>("SpatialEntity")
        .field("id", &SpatialEntity::id)
        .field("position", &SpatialEntity::position)
        .field("radius", &SpatialEntity::radius);

    // QueryResult
    value_object<QueryResult>("QueryResult")
        .field("id", &QueryResult::id)
        .field("distance", &QueryResult::distance)
        .field("position", &QueryResult::position);

    register_vector<int>("VectorInt");
    register_vector<QueryResult>("VectorQueryResult");

    // Octree
    class_<Octree>("Octree")
        .constructor<const AABB&, int, int>()
        .function("insert", &Octree::insert)
        .function("remove", &Octree::remove)
        .function("clear", &Octree::clear)
        .function("queryRange", &Octree::queryRange)
        .function("queryRadius", &Octree::queryRadius)
        .function("queryNearest", &Octree::queryNearest)
        .function("queryKNearest", &Octree::queryKNearest)
        .function("size", &Octree::size);

    // SpatialHash
    class_<SpatialHash>("SpatialHash")
        .constructor<float>()
        .function("insert", &SpatialHash::insert)
        .function("remove", &SpatialHash::remove)
        .function("update", &SpatialHash::update)
        .function("clear", &SpatialHash::clear)
        .function("queryCell", &SpatialHash::queryCell)
        .function("queryRadius", &SpatialHash::queryRadius)
        .function("queryRange", &SpatialHash::queryRange)
        .function("size", &SpatialHash::size);

    // KDTree
    class_<KDTree>("KDTree")
        .constructor<>()
        .function("clear", &KDTree::clear)
        .function("queryNearest", &KDTree::queryNearest)
        .function("queryKNearest", &KDTree::queryKNearest)
        .function("queryRadius", &KDTree::queryRadius)
        .function("size", &KDTree::size);

    // BVH
    class_<BVH>("BVH")
        .constructor<>()
        .function("clear", &BVH::clear)
        .function("queryRange", &BVH::queryRange)
        .function("queryRadius", &BVH::queryRadius)
        .function("raycast", &BVH::raycast)
        .function("size", &BVH::size);

    // LooseOctree
    class_<LooseOctree>("LooseOctree")
        .constructor<const AABB&, int, float>()
        .function("insert", &LooseOctree::insert)
        .function("remove", &LooseOctree::remove)
        .function("update", &LooseOctree::update)
        .function("clear", &LooseOctree::clear)
        .function("queryRadius", &LooseOctree::queryRadius);

    // Grid2D
    class_<Grid2D>("Grid2D")
        .constructor<int, int, float>()
        .function("insert", &Grid2D::insert)
        .function("remove", &Grid2D::remove)
        .function("update", &Grid2D::update)
        .function("clear", &Grid2D::clear)
        .function("queryCell", &Grid2D::queryCell)
        .function("queryRadius", &Grid2D::queryRadius)
        .function("queryRect", &Grid2D::queryRect);
}
