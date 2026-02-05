#include "spatial.hpp"
#include <queue>

namespace aeronav {
namespace spatial {

// Octree implementation
Octree::Octree(const AABB& bounds, int maxDepth, int maxEntities)
    : maxDepth(maxDepth), maxEntities(maxEntities) {
    root = std::make_unique<Node>();
    root->bounds = bounds;
}

void Octree::insert(const SpatialEntity& entity) {
    insertRecursive(root.get(), entity, 0);
}

void Octree::insertRecursive(Node* node, const SpatialEntity& entity, int depth) {
    if (!node->bounds.contains(entity.position)) return;

    if (node->isLeaf()) {
        node->entities.push_back(entity);
        if ((int)node->entities.size() > maxEntities && depth < maxDepth) {
            subdivide(node);
            auto entities = std::move(node->entities);
            for (const auto& e : entities) {
                int idx = getChildIndex(node, e.position);
                if (idx >= 0) insertRecursive(node->children[idx].get(), e, depth + 1);
            }
        }
    } else {
        int idx = getChildIndex(node, entity.position);
        if (idx >= 0) insertRecursive(node->children[idx].get(), entity, depth + 1);
    }
}

void Octree::subdivide(Node* node) {
    Vec3 c = node->bounds.center();
    Vec3 mn = node->bounds.min, mx = node->bounds.max;

    for (int i = 0; i < 8; i++) {
        Vec3 childMin(
            (i & 1) ? c.x : mn.x,
            (i & 2) ? c.y : mn.y,
            (i & 4) ? c.z : mn.z
        );
        Vec3 childMax(
            (i & 1) ? mx.x : c.x,
            (i & 2) ? mx.y : c.y,
            (i & 4) ? mx.z : c.z
        );
        node->children[i] = std::make_unique<Node>();
        node->children[i]->bounds = AABB(childMin, childMax);
    }
}

int Octree::getChildIndex(const Node* node, const Vec3& point) const {
    Vec3 c = node->bounds.center();
    int idx = 0;
    if (point.x >= c.x) idx |= 1;
    if (point.y >= c.y) idx |= 2;
    if (point.z >= c.z) idx |= 4;
    return idx;
}

void Octree::remove(int id) {
    std::function<bool(Node*)> removeRecursive = [&](Node* node) -> bool {
        for (auto it = node->entities.begin(); it != node->entities.end(); ++it) {
            if (it->id == id) { node->entities.erase(it); return true; }
        }
        for (auto& child : node->children) {
            if (child && removeRecursive(child.get())) return true;
        }
        return false;
    };
    removeRecursive(root.get());
}

void Octree::clear() {
    root = std::make_unique<Node>();
    root->bounds = root->bounds;
}

std::vector<int> Octree::queryRange(const AABB& range) const {
    std::vector<int> results;
    queryRangeRecursive(root.get(), range, results);
    return results;
}

void Octree::queryRangeRecursive(const Node* node, const AABB& range, std::vector<int>& results) const {
    if (!node->bounds.intersects(range)) return;
    for (const auto& e : node->entities) {
        if (range.contains(e.position)) results.push_back(e.id);
    }
    for (const auto& child : node->children) {
        if (child) queryRangeRecursive(child.get(), range, results);
    }
}

std::vector<int> Octree::queryRadius(const Vec3& center, float radius) const {
    std::vector<int> results;
    queryRadiusRecursive(root.get(), center, radius, results);
    return results;
}

void Octree::queryRadiusRecursive(const Node* node, const Vec3& center, float radius, std::vector<int>& results) const {
    if (!node->bounds.containsSphere(center, radius)) return;
    for (const auto& e : node->entities) {
        if ((e.position - center).lengthSq() <= radius * radius) results.push_back(e.id);
    }
    for (const auto& child : node->children) {
        if (child) queryRadiusRecursive(child.get(), center, radius, results);
    }
}

QueryResult Octree::queryNearest(const Vec3& point) const {
    QueryResult best;
    queryNearestRecursive(root.get(), point, best);
    return best;
}

void Octree::queryNearestRecursive(const Node* node, const Vec3& point, QueryResult& best) const {
    for (const auto& e : node->entities) {
        float dist = (e.position - point).length();
        if (dist < best.distance) {
            best.id = e.id;
            best.distance = dist;
            best.position = e.position;
        }
    }
    for (const auto& child : node->children) {
        if (child && child->bounds.containsSphere(point, best.distance)) {
            queryNearestRecursive(child.get(), point, best);
        }
    }
}

std::vector<QueryResult> Octree::queryKNearest(const Vec3& point, int k) const {
    auto results = queryRadius(point, std::numeric_limits<float>::max());
    std::vector<QueryResult> kResults;
    for (int id : results) {
        // Would need entity lookup - simplified version
        kResults.push_back(QueryResult(id, 0, point));
    }
    std::sort(kResults.begin(), kResults.end(), [](const QueryResult& a, const QueryResult& b) {
        return a.distance < b.distance;
    });
    if ((int)kResults.size() > k) kResults.resize(k);
    return kResults;
}

int Octree::size() const {
    int count = 0;
    std::function<void(const Node*)> countRecursive = [&](const Node* node) {
        count += node->entities.size();
        for (const auto& child : node->children) {
            if (child) countRecursive(child.get());
        }
    };
    countRecursive(root.get());
    return count;
}

// SpatialHash implementation
SpatialHash::SpatialHash(float cellSize) : cellSize(cellSize), entityCount(0) {}

std::array<int, 3> SpatialHash::getCell(const Vec3& pos) const {
    return {
        int(std::floor(pos.x / cellSize)),
        int(std::floor(pos.y / cellSize)),
        int(std::floor(pos.z / cellSize))
    };
}

void SpatialHash::insert(const SpatialEntity& entity) {
    auto cell = getCell(entity.position);
    cells[cell].push_back(entity);
    entityCells[entity.id] = cell;
    entityCount++;
}

void SpatialHash::remove(int id) {
    auto it = entityCells.find(id);
    if (it == entityCells.end()) return;
    auto& cellEntities = cells[it->second];
    cellEntities.erase(std::remove_if(cellEntities.begin(), cellEntities.end(),
        [id](const SpatialEntity& e) { return e.id == id; }), cellEntities.end());
    entityCells.erase(it);
    entityCount--;
}

void SpatialHash::update(const SpatialEntity& entity) {
    remove(entity.id);
    insert(entity);
}

void SpatialHash::clear() {
    cells.clear();
    entityCells.clear();
    entityCount = 0;
}

std::vector<int> SpatialHash::queryCell(int cx, int cy, int cz) const {
    std::vector<int> results;
    auto it = cells.find({cx, cy, cz});
    if (it != cells.end()) {
        for (const auto& e : it->second) results.push_back(e.id);
    }
    return results;
}

std::vector<int> SpatialHash::queryRadius(const Vec3& center, float radius) const {
    std::vector<int> results;
    int cellRadius = int(std::ceil(radius / cellSize));
    auto centerCell = getCell(center);

    for (int dz = -cellRadius; dz <= cellRadius; dz++) {
        for (int dy = -cellRadius; dy <= cellRadius; dy++) {
            for (int dx = -cellRadius; dx <= cellRadius; dx++) {
                std::array<int, 3> cell = {centerCell[0] + dx, centerCell[1] + dy, centerCell[2] + dz};
                auto it = cells.find(cell);
                if (it == cells.end()) continue;
                for (const auto& e : it->second) {
                    if ((e.position - center).lengthSq() <= radius * radius) {
                        results.push_back(e.id);
                    }
                }
            }
        }
    }
    return results;
}

std::vector<int> SpatialHash::queryRange(const AABB& range) const {
    std::vector<int> results;
    auto minCell = getCell(range.min);
    auto maxCell = getCell(range.max);

    for (int z = minCell[2]; z <= maxCell[2]; z++) {
        for (int y = minCell[1]; y <= maxCell[1]; y++) {
            for (int x = minCell[0]; x <= maxCell[0]; x++) {
                auto it = cells.find({x, y, z});
                if (it == cells.end()) continue;
                for (const auto& e : it->second) {
                    if (range.contains(e.position)) results.push_back(e.id);
                }
            }
        }
    }
    return results;
}

std::vector<std::pair<int, int>> SpatialHash::findCollisions() const {
    std::vector<std::pair<int, int>> collisions;
    for (const auto& [cell, entities] : cells) {
        for (size_t i = 0; i < entities.size(); i++) {
            for (size_t j = i + 1; j < entities.size(); j++) {
                float dist = (entities[i].position - entities[j].position).length();
                if (dist < entities[i].radius + entities[j].radius) {
                    collisions.push_back({entities[i].id, entities[j].id});
                }
            }
        }
    }
    return collisions;
}

// KDTree implementation
KDTree::KDTree() : nodeCount(0) {}

void KDTree::build(const std::vector<SpatialEntity>& entities) {
    clear();
    if (entities.empty()) return;
    auto sorted = entities;
    root = buildRecursive(sorted, 0, sorted.size(), 0);
}

std::unique_ptr<KDTree::Node> KDTree::buildRecursive(std::vector<SpatialEntity>& entities, int start, int end, int depth) {
    if (start >= end) return nullptr;

    int axis = depth % 3;
    auto cmp = [axis](const SpatialEntity& a, const SpatialEntity& b) {
        float va = (axis == 0) ? a.position.x : (axis == 1) ? a.position.y : a.position.z;
        float vb = (axis == 0) ? b.position.x : (axis == 1) ? b.position.y : b.position.z;
        return va < vb;
    };
    std::sort(entities.begin() + start, entities.begin() + end, cmp);

    int mid = start + (end - start) / 2;
    auto node = std::make_unique<Node>();
    node->entity = entities[mid];
    node->axis = axis;
    node->left = buildRecursive(entities, start, mid, depth + 1);
    node->right = buildRecursive(entities, mid + 1, end, depth + 1);
    nodeCount++;
    return node;
}

void KDTree::clear() {
    root.reset();
    nodeCount = 0;
}

QueryResult KDTree::queryNearest(const Vec3& point) const {
    QueryResult best;
    queryNearestRecursive(root.get(), point, best);
    return best;
}

void KDTree::queryNearestRecursive(const Node* node, const Vec3& point, QueryResult& best) const {
    if (!node) return;

    float dist = (node->entity.position - point).length();
    if (dist < best.distance) {
        best.id = node->entity.id;
        best.distance = dist;
        best.position = node->entity.position;
    }

    float nodeVal = (node->axis == 0) ? node->entity.position.x : (node->axis == 1) ? node->entity.position.y : node->entity.position.z;
    float pointVal = (node->axis == 0) ? point.x : (node->axis == 1) ? point.y : point.z;

    Node* first = pointVal < nodeVal ? node->left.get() : node->right.get();
    Node* second = pointVal < nodeVal ? node->right.get() : node->left.get();

    queryNearestRecursive(first, point, best);
    if (std::abs(pointVal - nodeVal) < best.distance) {
        queryNearestRecursive(second, point, best);
    }
}

std::vector<QueryResult> KDTree::queryKNearest(const Vec3& point, int k) const {
    std::vector<QueryResult> results;
    queryKNearestRecursive(root.get(), point, k, results);
    std::sort(results.begin(), results.end(), [](const QueryResult& a, const QueryResult& b) {
        return a.distance < b.distance;
    });
    if ((int)results.size() > k) results.resize(k);
    return results;
}

void KDTree::queryKNearestRecursive(const Node* node, const Vec3& point, int k, std::vector<QueryResult>& results) const {
    if (!node) return;

    float dist = (node->entity.position - point).length();
    results.push_back(QueryResult(node->entity.id, dist, node->entity.position));

    float maxDist = std::numeric_limits<float>::max();
    if ((int)results.size() >= k) {
        std::nth_element(results.begin(), results.begin() + k - 1, results.end(),
            [](const QueryResult& a, const QueryResult& b) { return a.distance < b.distance; });
        maxDist = results[k - 1].distance;
    }

    float nodeVal = (node->axis == 0) ? node->entity.position.x : (node->axis == 1) ? node->entity.position.y : node->entity.position.z;
    float pointVal = (node->axis == 0) ? point.x : (node->axis == 1) ? point.y : point.z;

    Node* first = pointVal < nodeVal ? node->left.get() : node->right.get();
    Node* second = pointVal < nodeVal ? node->right.get() : node->left.get();

    queryKNearestRecursive(first, point, k, results);
    if (std::abs(pointVal - nodeVal) < maxDist) {
        queryKNearestRecursive(second, point, k, results);
    }
}

std::vector<int> KDTree::queryRadius(const Vec3& center, float radius) const {
    std::vector<int> results;
    queryRadiusRecursive(root.get(), center, radius, results);
    return results;
}

void KDTree::queryRadiusRecursive(const Node* node, const Vec3& center, float radius, std::vector<int>& results) const {
    if (!node) return;

    float dist = (node->entity.position - center).length();
    if (dist <= radius) results.push_back(node->entity.id);

    float nodeVal = (node->axis == 0) ? node->entity.position.x : (node->axis == 1) ? node->entity.position.y : node->entity.position.z;
    float centerVal = (node->axis == 0) ? center.x : (node->axis == 1) ? center.y : center.z;

    if (centerVal - radius <= nodeVal) queryRadiusRecursive(node->left.get(), center, radius, results);
    if (centerVal + radius >= nodeVal) queryRadiusRecursive(node->right.get(), center, radius, results);
}

int KDTree::size() const { return nodeCount; }

// BVH implementation
BVH::BVH() : nodeCount(0) {}

void BVH::build(const std::vector<SpatialEntity>& ents) {
    clear();
    entities = ents;
    if (entities.empty()) return;
    std::vector<int> indices(entities.size());
    for (size_t i = 0; i < entities.size(); i++) indices[i] = i;
    root = buildRecursive(indices, 0, indices.size());
}

std::unique_ptr<BVH::Node> BVH::buildRecursive(std::vector<int>& indices, int start, int end) {
    if (start >= end) return nullptr;

    auto node = std::make_unique<Node>();
    nodeCount++;

    if (end - start == 1) {
        node->entityId = indices[start];
        const auto& e = entities[indices[start]];
        node->bounds = AABB(e.position - Vec3(e.radius, e.radius, e.radius), e.position + Vec3(e.radius, e.radius, e.radius));
        return node;
    }

    std::vector<Vec3> points;
    for (int i = start; i < end; i++) points.push_back(entities[indices[i]].position);
    node->bounds = AABB::fromPoints(points);
    node->entityId = -1;

    Vec3 size = node->bounds.size();
    int axis = (size.x >= size.y && size.x >= size.z) ? 0 : (size.y >= size.z ? 1 : 2);

    std::sort(indices.begin() + start, indices.begin() + end, [this, axis](int a, int b) {
        float va = (axis == 0) ? entities[a].position.x : (axis == 1) ? entities[a].position.y : entities[a].position.z;
        float vb = (axis == 0) ? entities[b].position.x : (axis == 1) ? entities[b].position.y : entities[b].position.z;
        return va < vb;
    });

    int mid = start + (end - start) / 2;
    node->left = buildRecursive(indices, start, mid);
    node->right = buildRecursive(indices, mid, end);
    return node;
}

void BVH::clear() {
    root.reset();
    entities.clear();
    nodeCount = 0;
}

std::vector<int> BVH::queryRange(const AABB& range) const {
    std::vector<int> results;
    queryRangeRecursive(root.get(), range, results);
    return results;
}

void BVH::queryRangeRecursive(const Node* node, const AABB& range, std::vector<int>& results) const {
    if (!node || !node->bounds.intersects(range)) return;
    if (node->isLeaf()) {
        if (range.contains(entities[node->entityId].position)) results.push_back(node->entityId);
    } else {
        queryRangeRecursive(node->left.get(), range, results);
        queryRangeRecursive(node->right.get(), range, results);
    }
}

std::vector<int> BVH::queryRadius(const Vec3& center, float radius) const {
    std::vector<int> results;
    queryRadiusRecursive(root.get(), center, radius, results);
    return results;
}

void BVH::queryRadiusRecursive(const Node* node, const Vec3& center, float radius, std::vector<int>& results) const {
    if (!node || !node->bounds.containsSphere(center, radius)) return;
    if (node->isLeaf()) {
        if ((entities[node->entityId].position - center).lengthSq() <= radius * radius) {
            results.push_back(node->entityId);
        }
    } else {
        queryRadiusRecursive(node->left.get(), center, radius, results);
        queryRadiusRecursive(node->right.get(), center, radius, results);
    }
}

bool BVH::rayAABBIntersect(const Vec3& origin, const Vec3& invDir, const AABB& box, float& tMin, float& tMax) const {
    float t1 = (box.min.x - origin.x) * invDir.x;
    float t2 = (box.max.x - origin.x) * invDir.x;
    tMin = std::min(t1, t2);
    tMax = std::max(t1, t2);

    t1 = (box.min.y - origin.y) * invDir.y;
    t2 = (box.max.y - origin.y) * invDir.y;
    tMin = std::max(tMin, std::min(t1, t2));
    tMax = std::min(tMax, std::max(t1, t2));

    t1 = (box.min.z - origin.z) * invDir.z;
    t2 = (box.max.z - origin.z) * invDir.z;
    tMin = std::max(tMin, std::min(t1, t2));
    tMax = std::min(tMax, std::max(t1, t2));

    return tMax >= tMin && tMax >= 0;
}

QueryResult BVH::raycast(const Vec3& origin, const Vec3& direction, float maxDist) const {
    QueryResult result;
    Vec3 invDir(1.0f / direction.x, 1.0f / direction.y, 1.0f / direction.z);
    raycastRecursive(root.get(), origin, direction, invDir, maxDist, result);
    return result;
}

void BVH::raycastRecursive(const Node* node, const Vec3& origin, const Vec3& direction, const Vec3& invDir, float maxDist, QueryResult& result) const {
    if (!node) return;
    float tMin, tMax;
    if (!rayAABBIntersect(origin, invDir, node->bounds, tMin, tMax) || tMin > maxDist || tMin > result.distance) return;

    if (node->isLeaf()) {
        const auto& e = entities[node->entityId];
        Vec3 oc = origin - e.position;
        float a = direction.dot(direction);
        float b = 2.0f * oc.dot(direction);
        float c = oc.dot(oc) - e.radius * e.radius;
        float disc = b * b - 4 * a * c;
        if (disc >= 0) {
            float t = (-b - std::sqrt(disc)) / (2.0f * a);
            if (t >= 0 && t < result.distance && t <= maxDist) {
                result.hit = true;
                result.distance = t;
                result.id = node->entityId;
                result.position = origin + direction * t;
            }
        }
    } else {
        raycastRecursive(node->left.get(), origin, direction, invDir, maxDist, result);
        raycastRecursive(node->right.get(), origin, direction, invDir, maxDist, result);
    }
}

int BVH::size() const { return nodeCount; }

// LooseOctree implementation
LooseOctree::LooseOctree(const AABB& bounds, int maxDepth, float looseness)
    : maxDepth(maxDepth), looseness(looseness) {
    root = std::make_unique<Node>();
    root->bounds = bounds;
    root->looseBounds = computeLooseBounds(bounds);
}

AABB LooseOctree::computeLooseBounds(const AABB& tight) const {
    Vec3 c = tight.center();
    Vec3 halfSize = tight.size() * 0.5f * looseness;
    return AABB(c - halfSize, c + halfSize);
}

void LooseOctree::insert(const SpatialEntity& entity) {
    insertRecursive(root.get(), entity, 0);
}

void LooseOctree::insertRecursive(Node* node, const SpatialEntity& entity, int depth) {
    if (!node->looseBounds.contains(entity.position)) return;

    if (node->isLeaf() && depth < maxDepth) {
        subdivide(node);
    }

    if (!node->isLeaf()) {
        int idx = getChildIndex(node, entity.position);
        if (node->children[idx]->looseBounds.contains(entity.position)) {
            insertRecursive(node->children[idx].get(), entity, depth + 1);
            return;
        }
    }

    node->entities.push_back(entity);
    entityNodes[entity.id] = node;
}

void LooseOctree::subdivide(Node* node) {
    Vec3 c = node->bounds.center();
    Vec3 mn = node->bounds.min, mx = node->bounds.max;

    for (int i = 0; i < 8; i++) {
        Vec3 childMin(
            (i & 1) ? c.x : mn.x,
            (i & 2) ? c.y : mn.y,
            (i & 4) ? c.z : mn.z
        );
        Vec3 childMax(
            (i & 1) ? mx.x : c.x,
            (i & 2) ? mx.y : c.y,
            (i & 4) ? mx.z : c.z
        );
        node->children[i] = std::make_unique<Node>();
        node->children[i]->bounds = AABB(childMin, childMax);
        node->children[i]->looseBounds = computeLooseBounds(node->children[i]->bounds);
    }
}

int LooseOctree::getChildIndex(const Node* node, const Vec3& point) const {
    Vec3 c = node->bounds.center();
    int idx = 0;
    if (point.x >= c.x) idx |= 1;
    if (point.y >= c.y) idx |= 2;
    if (point.z >= c.z) idx |= 4;
    return idx;
}

void LooseOctree::remove(int id) {
    auto it = entityNodes.find(id);
    if (it == entityNodes.end()) return;
    Node* node = it->second;
    node->entities.erase(std::remove_if(node->entities.begin(), node->entities.end(),
        [id](const SpatialEntity& e) { return e.id == id; }), node->entities.end());
    entityNodes.erase(it);
}

void LooseOctree::update(const SpatialEntity& entity) {
    remove(entity.id);
    insert(entity);
}

void LooseOctree::clear() {
    root = std::make_unique<Node>();
    entityNodes.clear();
}

std::vector<int> LooseOctree::queryRadius(const Vec3& center, float radius) const {
    std::vector<int> results;
    std::function<void(const Node*)> queryRecursive = [&](const Node* node) {
        if (!node->looseBounds.containsSphere(center, radius)) return;
        for (const auto& e : node->entities) {
            if ((e.position - center).lengthSq() <= radius * radius) results.push_back(e.id);
        }
        for (const auto& child : node->children) {
            if (child) queryRecursive(child.get());
        }
    };
    queryRecursive(root.get());
    return results;
}

std::vector<std::pair<int, int>> LooseOctree::findCollisions() const {
    std::vector<std::pair<int, int>> collisions;
    std::function<void(const Node*)> findRecursive = [&](const Node* node) {
        for (size_t i = 0; i < node->entities.size(); i++) {
            for (size_t j = i + 1; j < node->entities.size(); j++) {
                float dist = (node->entities[i].position - node->entities[j].position).length();
                if (dist < node->entities[i].radius + node->entities[j].radius) {
                    collisions.push_back({node->entities[i].id, node->entities[j].id});
                }
            }
        }
        for (const auto& child : node->children) {
            if (child) findRecursive(child.get());
        }
    };
    findRecursive(root.get());
    return collisions;
}

// Grid2D implementation
Grid2D::Grid2D(int w, int h, float cellSize) : width(w), height(h), cellSize(cellSize), cells(w * h) {}

void Grid2D::insert(int id, float x, float y) {
    int cx = int(x / cellSize), cy = int(y / cellSize);
    if (cx < 0 || cx >= width || cy < 0 || cy >= height) return;
    cells[getIndex(cx, cy)].push_back(id);
    entityCells[id] = {cx, cy};
}

void Grid2D::remove(int id) {
    auto it = entityCells.find(id);
    if (it == entityCells.end()) return;
    auto& cell = cells[getIndex(it->second.first, it->second.second)];
    cell.erase(std::remove(cell.begin(), cell.end(), id), cell.end());
    entityCells.erase(it);
}

void Grid2D::update(int id, float x, float y) {
    remove(id);
    insert(id, x, y);
}

void Grid2D::clear() {
    for (auto& c : cells) c.clear();
    entityCells.clear();
}

std::vector<int> Grid2D::queryCell(int cx, int cy) const {
    if (cx < 0 || cx >= width || cy < 0 || cy >= height) return {};
    return cells[getIndex(cx, cy)];
}

std::vector<int> Grid2D::queryRadius(float x, float y, float radius) const {
    std::vector<int> results;
    int cellRadius = int(std::ceil(radius / cellSize));
    int cx = int(x / cellSize), cy = int(y / cellSize);
    for (int dy = -cellRadius; dy <= cellRadius; dy++) {
        for (int dx = -cellRadius; dx <= cellRadius; dx++) {
            int nx = cx + dx, ny = cy + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                for (int id : cells[getIndex(nx, ny)]) results.push_back(id);
            }
        }
    }
    return results;
}

std::vector<int> Grid2D::queryRect(float x, float y, float w, float h) const {
    std::vector<int> results;
    int minCx = int(x / cellSize), minCy = int(y / cellSize);
    int maxCx = int((x + w) / cellSize), maxCy = int((y + h) / cellSize);
    for (int cy = minCy; cy <= maxCy; cy++) {
        for (int cx = minCx; cx <= maxCx; cx++) {
            if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
                for (int id : cells[getIndex(cx, cy)]) results.push_back(id);
            }
        }
    }
    return results;
}

} // namespace spatial
} // namespace aeronav
