#include <emscripten/bind.h>
#include "../src/mesh.hpp"

using namespace emscripten;
using namespace aeronav;

EMSCRIPTEN_BINDINGS(aeronav_geometry) {
    value_object<Vec3>("Vec3")
        .field("x", &Vec3::x).field("y", &Vec3::y).field("z", &Vec3::z);
    value_object<Vec2>("Vec2")
        .field("u", &Vec2::u).field("v", &Vec2::v);
    value_object<AABB>("AABB")
        .field("min", &AABB::min).field("max", &AABB::max);
    value_object<Face>("Face")
        .field("v", &Face::v).field("n", &Face::n).field("t", &Face::t);

    register_vector<Vec3>("VectorVec3");
    register_vector<Vec2>("VectorVec2");
    register_vector<Face>("VectorFace");

    class_<Mesh>("Mesh")
        .constructor<>()
        .property("name", &Mesh::name)
        .function("vertexCount", &Mesh::vertexCount)
        .function("faceCount", &Mesh::faceCount)
        .function("computeBoundingBox", &Mesh::computeBoundingBox)
        .function("computeNormals", &Mesh::computeNormals)
        .function("translate", &Mesh::translate)
        .function("scale", &Mesh::scale)
        .function("center", &Mesh::center);

    class_<OBJParser>("OBJParser")
        .class_function("parse", &OBJParser::parse)
        .class_function("serialize", &OBJParser::serialize);
}
