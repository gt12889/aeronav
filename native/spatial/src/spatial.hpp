#pragma once

#include <vector>
#include <array>
#include <memory>
#include <functional>
#include <algorithm>
#include <cmath>
#include <unordered_map>
#include <limits>

namespace aeronav {
namespace spatial {

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
    float lengthSq() const { return x * x + y * y + z * z; }
    float length() const { return std::sqrt(lengthSq()); }
    static Vec3 min(const Vec3& a, const Vec3& b) { return {std::min(a.x, b.x), std::min(a.y, b.y), std::min(a.z, b.z)}; }
    static Vec3 max(const Vec3& a, const Vec3& b) { return {std::max(a.x, b.x), std::max(a.y, b.y), std::max(a.z, b.z)}; }
};

// Axis-Aligned Bounding Box
struct AABB {
    Vec3 min, max;
    AABB() : min(-1, -1, -1), max(1, 1, 1) {}
    AABB(const Vec3& minP, const Vec3& maxP) : min(minP), max(maxP) {}
    Vec3 center() const { return (min + max) * 0.5f; }
    Vec3 size() const { return max - min; }
    bool contains(const Vec3& p) const {
        return p.x >= min.x && p.x <= max.x && p.y >= min.y && p.y <= max.y && p.z >= min.z && p.z <= max.z;
    }
    bool intersects(const AABB& o) const {
        return min.x <= o.max.x && max.x >= o.min.x && min.y <= o.max.y && max.y >= o.min.y && min.z <= o.max.z && max.z >= o.min.z;
    }
    bool containsSphere(const Vec3& center, float radius) const {
        float sqDist = 0;
        for (int i = 0; i < 3; i++) {
            float v = (i == 0) ? center.x : (i == 1) ? center.y : center.z;
            float mn = (i == 0) ? min.x : (i == 1) ? min.y : min.z;
            float mx = (i == 0) ? max.x : (i == 1) ? max.y : max.z;
            if (v < mn) sqDist += (mn - v) * (mn - v);
            else if (v > mx) sqDist += (v - mx) * (v - mx);
        }
        return sqDist <= radius * radius;
    }
    static AABB fromPoints(const std::vector<Vec3>& points) {
        if (points.empty()) return AABB();
        Vec3 mn = points[0], mx = points[0];
        for (const auto& p : points) { mn = Vec3::min(mn, p); mx = Vec3::max(mx, p); }
        return AABB(mn, mx);
    }
};

// Spatial entity with ID and position
struct SpatialEntity {
    int id;
    Vec3 position;
    float radius;
    SpatialEntity() : id(-1), radius(0) {}
    SpatialEntity(int id, const Vec3& pos, float r = 0) : id(id), position(pos), radius(r) {}
};

// Query result
struct QueryResult {
    int id;
    float distance;
    Vec3 position;
    QueryResult() : id(-1), distance(std::numeric_limits<float>::max()) {}
    QueryResult(int id, float dist, const Vec3& pos) : id(id), distance(dist), position(pos) {}
};

// Octree for spatial partitioning
class Octree {
public:
    Octree(const AABB& bounds, int maxDepth = 8, int maxEntities = 8);
    void insert(const SpatialEntity& entity);
    void remove(int id);
    void clear();
    std::vector<int> queryRange(const AABB& range) const;
    std::vector<int> queryRadius(const Vec3& center, float radius) const;
    QueryResult queryNearest(const Vec3& point) const;
    std::vector<QueryResult> queryKNearest(const Vec3& point, int k) const;
    int size() const;

private:
    struct Node {
        AABB bounds;
        std::vector<SpatialEntity> entities;
        std::array<std::unique_ptr<Node>, 8> children;
        bool isLeaf() const { return children[0] == nullptr; }
    };
    std::unique_ptr<Node> root;
    int maxDepth, maxEntities;
    void insertRecursive(Node* node, const SpatialEntity& entity, int depth);
    void subdivide(Node* node);
    int getChildIndex(const Node* node, const Vec3& point) const;
    void queryRangeRecursive(const Node* node, const AABB& range, std::vector<int>& results) const;
    void queryRadiusRecursive(const Node* node, const Vec3& center, float radius, std::vector<int>& results) const;
    void queryNearestRecursive(const Node* node, const Vec3& point, QueryResult& best) const;
};

// Spatial hash grid for uniform distribution
class SpatialHash {
public:
    SpatialHash(float cellSize);
    void insert(const SpatialEntity& entity);
    void remove(int id);
    void update(const SpatialEntity& entity);
    void clear();
    std::vector<int> queryCell(int cx, int cy, int cz) const;
    std::vector<int> queryRadius(const Vec3& center, float radius) const;
    std::vector<int> queryRange(const AABB& range) const;
    std::vector<std::pair<int, int>> findCollisions() const;
    int size() const { return entityCount; }

private:
    float cellSize;
    int entityCount;
    struct HashFunc {
        size_t operator()(const std::array<int, 3>& k) const {
            return std::hash<int>()(k[0]) ^ (std::hash<int>()(k[1]) << 10) ^ (std::hash<int>()(k[2]) << 20);
        }
    };
    std::unordered_map<std::array<int, 3>, std::vector<SpatialEntity>, HashFunc> cells;
    std::unordered_map<int, std::array<int, 3>> entityCells;
    std::array<int, 3> getCell(const Vec3& pos) const;
};

// K-D Tree for efficient nearest neighbor queries
class KDTree {
public:
    KDTree();
    void build(const std::vector<SpatialEntity>& entities);
    void clear();
    QueryResult queryNearest(const Vec3& point) const;
    std::vector<QueryResult> queryKNearest(const Vec3& point, int k) const;
    std::vector<int> queryRadius(const Vec3& center, float radius) const;
    int size() const;

private:
    struct Node {
        SpatialEntity entity;
        int axis;
        std::unique_ptr<Node> left, right;
    };
    std::unique_ptr<Node> root;
    int nodeCount;
    std::unique_ptr<Node> buildRecursive(std::vector<SpatialEntity>& entities, int start, int end, int depth);
    void queryNearestRecursive(const Node* node, const Vec3& point, QueryResult& best) const;
    void queryKNearestRecursive(const Node* node, const Vec3& point, int k, std::vector<QueryResult>& results) const;
    void queryRadiusRecursive(const Node* node, const Vec3& center, float radius, std::vector<int>& results) const;
};

// Bounding Volume Hierarchy
class BVH {
public:
    BVH();
    void build(const std::vector<SpatialEntity>& entities);
    void clear();
    std::vector<int> queryRange(const AABB& range) const;
    std::vector<int> queryRadius(const Vec3& center, float radius) const;
    QueryResult raycast(const Vec3& origin, const Vec3& direction, float maxDist) const;
    int size() const;

private:
    struct Node {
        AABB bounds;
        int entityId;
        std::unique_ptr<Node> left, right;
        bool isLeaf() const { return left == nullptr && right == nullptr; }
    };
    std::unique_ptr<Node> root;
    std::vector<SpatialEntity> entities;
    int nodeCount;
    std::unique_ptr<Node> buildRecursive(std::vector<int>& indices, int start, int end);
    void queryRangeRecursive(const Node* node, const AABB& range, std::vector<int>& results) const;
    void queryRadiusRecursive(const Node* node, const Vec3& center, float radius, std::vector<int>& results) const;
    bool rayAABBIntersect(const Vec3& origin, const Vec3& invDir, const AABB& box, float& tMin, float& tMax) const;
    void raycastRecursive(const Node* node, const Vec3& origin, const Vec3& direction, const Vec3& invDir, float maxDist, QueryResult& result) const;
};

// Loose octree (better for moving objects)
class LooseOctree {
public:
    LooseOctree(const AABB& bounds, int maxDepth = 6, float looseness = 2.0f);
    void insert(const SpatialEntity& entity);
    void remove(int id);
    void update(const SpatialEntity& entity);
    void clear();
    std::vector<int> queryRadius(const Vec3& center, float radius) const;
    std::vector<std::pair<int, int>> findCollisions() const;

private:
    struct Node {
        AABB bounds;
        AABB looseBounds;
        std::vector<SpatialEntity> entities;
        std::array<std::unique_ptr<Node>, 8> children;
        bool isLeaf() const { return children[0] == nullptr; }
    };
    std::unique_ptr<Node> root;
    int maxDepth;
    float looseness;
    std::unordered_map<int, Node*> entityNodes;
    void insertRecursive(Node* node, const SpatialEntity& entity, int depth);
    void subdivide(Node* node);
    int getChildIndex(const Node* node, const Vec3& point) const;
    AABB computeLooseBounds(const AABB& tight) const;
};

// Grid for 2D spatial queries
class Grid2D {
public:
    Grid2D(int width, int height, float cellSize);
    void insert(int id, float x, float y);
    void remove(int id);
    void update(int id, float x, float y);
    void clear();
    std::vector<int> queryCell(int cx, int cy) const;
    std::vector<int> queryRadius(float x, float y, float radius) const;
    std::vector<int> queryRect(float x, float y, float w, float h) const;

private:
    int width, height;
    float cellSize;
    std::vector<std::vector<int>> cells;
    std::unordered_map<int, std::pair<int, int>> entityCells;
    int getIndex(int cx, int cy) const { return cy * width + cx; }
};

} // namespace spatial
} // namespace aeronav
