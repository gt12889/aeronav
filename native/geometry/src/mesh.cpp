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
