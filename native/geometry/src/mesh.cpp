#include "mesh.hpp"
#include <sstream>
#include <algorithm>
#include <limits>

namespace aeronav {

AABB Mesh::computeBoundingBox() const {
    AABB box;
    box.min = {std::numeric_limits<float>::max(), std::numeric_limits<float>::max(), std::numeric_limits<float>::max()};
    box.max = {std::numeric_limits<float>::lowest(), std::numeric_limits<float>::lowest(), std::numeric_limits<float>::lowest()};
    for (const auto& v : vertices) {
        box.min.x = std::min(box.min.x, v.x);
        box.min.y = std::min(box.min.y, v.y);
        box.min.z = std::min(box.min.z, v.z);
        box.max.x = std::max(box.max.x, v.x);
        box.max.y = std::max(box.max.y, v.y);
        box.max.z = std::max(box.max.z, v.z);
    }
    return box;
}

void Mesh::translate(float x, float y, float z) {
    for (auto& v : vertices) { v.x += x; v.y += y; v.z += z; }
}

void Mesh::scale(float sx, float sy, float sz) {
    for (auto& v : vertices) { v.x *= sx; v.y *= sy; v.z *= sz; }
}

void Mesh::center() {
    AABB box = computeBoundingBox();
    float cx = (box.min.x + box.max.x) * 0.5f;
    float cy = (box.min.y + box.max.y) * 0.5f;
    float cz = (box.min.z + box.max.z) * 0.5f;
    translate(-cx, -cy, -cz);
}

void Mesh::computeNormals() {
    normals.clear();
    normals.resize(vertices.size(), {0, 0, 0});
    for (const auto& f : faces) {
        Vec3& v0 = vertices[f.v[0]]; Vec3& v1 = vertices[f.v[1]]; Vec3& v2 = vertices[f.v[2]];
        Vec3 e1 = {v1.x - v0.x, v1.y - v0.y, v1.z - v0.z};
        Vec3 e2 = {v2.x - v0.x, v2.y - v0.y, v2.z - v0.z};
        Vec3 n = {e1.y * e2.z - e1.z * e2.y, e1.z * e2.x - e1.x * e2.z, e1.x * e2.y - e1.y * e2.x};
        for (int i = 0; i < 3; i++) {
            normals[f.v[i]].x += n.x; normals[f.v[i]].y += n.y; normals[f.v[i]].z += n.z;
        }
    }
    for (auto& n : normals) {
        float len = std::sqrt(n.x*n.x + n.y*n.y + n.z*n.z);
        if (len > 0) { n.x /= len; n.y /= len; n.z /= len; }
    }
}
