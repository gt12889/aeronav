#include <emscripten/bind.h>
#include "../src/pathfinding.hpp"

using namespace emscripten;
using namespace aeronav::pathfinding;

EMSCRIPTEN_BINDINGS(aeronav_pathfinding) {
    // GridPos
    value_object<GridPos>("GridPos")
        .field("x", &GridPos::x)
        .field("y", &GridPos::y);

    // NavPos
    value_object<NavPos>("NavPos")
        .field("x", &NavPos::x)
        .field("y", &NavPos::y)
        .field("z", &NavPos::z);

    // PathResult
    value_object<PathResult>("PathResult")
        .field("found", &PathResult::found)
        .field("cost", &PathResult::cost);

    register_vector<GridPos>("VectorGridPos");
    register_vector<NavPos>("VectorNavPos");
    register_vector<int>("VectorInt");

    // Grid2D
    class_<Grid2D>("Grid2D")
        .constructor<int, int>()
        .function("setBlocked", &Grid2D::setBlocked)
        .function("isBlocked", &Grid2D::isBlocked)
        .function("isValid", &Grid2D::isValid)
        .function("setCost", &Grid2D::setCost)
        .function("getCost", &Grid2D::getCost)
        .function("width", &Grid2D::width)
        .function("height", &Grid2D::height)
        .function("clear", &Grid2D::clear)
        .function("fillRect", &Grid2D::fillRect)
        .function("fillCircle", &Grid2D::fillCircle);

    // NavGraph
    class_<NavGraph>("NavGraph")
        .constructor<>()
        .function("addNode", &NavGraph::addNode)
        .function("addEdge", &NavGraph::addEdge)
        .function("addBidirectionalEdge", &NavGraph::addBidirectionalEdge)
        .function("nodeCount", &NavGraph::nodeCount)
        .function("clear", &NavGraph::clear);

    // Pathfinding functions
    function("astar2D", &astar2D);
    function("dijkstra2D", &dijkstra2D);
    function("astarGraph", &astarGraph);
    function("dijkstraGraph", &dijkstraGraph);
    function("bfs2D", &bfs2D);
    function("jps2D", &jps2D);

    // PotentialField
    class_<PotentialField>("PotentialField")
        .constructor<int, int>()
        .function("addAttractor", &PotentialField::addAttractor)
        .function("addRepulsor", &PotentialField::addRepulsor)
        .function("addObstacle", &PotentialField::addObstacle)
        .function("getGradient", &PotentialField::getGradient)
        .function("getPotential", &PotentialField::getPotential)
        .function("clear", &PotentialField::clear)
        .function("compute", &PotentialField::compute);

    // FlowField
    class_<FlowField>("FlowField")
        .constructor<int, int>()
        .function("setGoal", &FlowField::setGoal)
        .function("setBlocked", &FlowField::setBlocked)
        .function("compute", &FlowField::compute)
        .function("getDirection", &FlowField::getDirection)
        .function("getCost", &FlowField::getCost)
        .function("clear", &FlowField::clear);

    // RRT
    class_<RRT>("RRT")
        .constructor<float, float, float, float, float, float>()
        .function("setStepSize", &RRT::setStepSize)
        .function("setMaxIterations", &RRT::setMaxIterations)
        .function("addObstacleSphere", &RRT::addObstacleSphere)
        .function("findPath", &RRT::findPath)
        .function("clear", &RRT::clear);

    // Steering behaviors
    function("seek", &seek);
    function("flee", &flee);
    function("arrive", &arrive);
    function("pursue", &pursue);
    function("evade", &evade);
}
