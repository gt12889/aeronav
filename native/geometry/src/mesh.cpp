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

Mesh OBJParser::parse(const std::string& content) {
    Mesh mesh;
    std::istringstream stream(content);
    std::string line;
    std::vector<Vec3> tempNormals;
    std::vector<Vec2> tempTexcoords;

    while (std::getline(stream, line)) {
        if (line.empty() || line[0] == '#') continue;
        std::istringstream ls(line);
        std::string cmd;
        ls >> cmd;

        if (cmd == "v") {
            Vec3 v; ls >> v.x >> v.y >> v.z;
            mesh.vertices.push_back(v);
        } else if (cmd == "vn") {
            Vec3 n; ls >> n.x >> n.y >> n.z;
            tempNormals.push_back(n);
        } else if (cmd == "vt") {
            Vec2 t; ls >> t.u >> t.v;
            tempTexcoords.push_back(t);
        } else if (cmd == "f") {
            Face face = {{0,0,0}, {0,0,0}, {0,0,0}};
            for (int i = 0; i < 3; i++) {
                std::string token; ls >> token;
                size_t p1 = token.find('/'), p2 = token.find('/', p1 + 1);
                face.v[i] = std::stoul(token.substr(0, p1)) - 1;
                if (p1 != std::string::npos && p2 != p1 + 1)
                    face.t[i] = std::stoul(token.substr(p1 + 1, p2 - p1 - 1)) - 1;
                if (p2 != std::string::npos)
                    face.n[i] = std::stoul(token.substr(p2 + 1)) - 1;
            }
            mesh.faces.push_back(face);
        }
    }
    mesh.normals = tempNormals;
    mesh.texcoords = tempTexcoords;
    return mesh;
}
