#pragma once

#include <vector>
#include <string>
#include <cstdint>
#include <cmath>

namespace aeronav {

struct Vec3 { float x, y, z; };
struct Vec2 { float u, v; };
struct AABB { Vec3 min, max; };

struct Face {
    uint32_t v[3];   // vertex indices
    uint32_t n[3];   // normal indices
    uint32_t t[3];   // texcoord indices
};

class Mesh {
public:
    std::vector<Vec3> vertices;
    std::vector<Vec3> normals;
    std::vector<Vec2> texcoords;
    std::vector<Face> faces;
    std::string name;

    size_t vertexCount() const { return vertices.size(); }
    size_t faceCount() const { return faces.size(); }
    AABB computeBoundingBox() const;
    void computeNormals();
    void transform(const float* matrix4x4);
    void translate(float x, float y, float z);
    void scale(float sx, float sy, float sz);
    void center();
};

class OBJParser {
public:
    static Mesh parse(const std::string& content);
    static std::string serialize(const Mesh& mesh);
};

} // namespace aeronav
