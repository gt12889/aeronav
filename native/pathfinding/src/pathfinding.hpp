#pragma once

#include <vector>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <functional>
#include <cmath>
#include <limits>
#include <algorithm>

namespace aeronav {
namespace pathfinding {

// 2D Grid position
struct GridPos {
    int x, y;
    GridPos() : x(0), y(0) {}
    GridPos(int x, int y) : x(x), y(y) {}
    bool operator==(const GridPos& o) const { return x == o.x && y == o.y; }
    bool operator!=(const GridPos& o) const { return !(*this == o); }
};

// 3D position for navigation
struct NavPos {
    float x, y, z;
    NavPos() : x(0), y(0), z(0) {}
    NavPos(float x, float y, float z) : x(x), y(y), z(z) {}
    NavPos operator+(const NavPos& o) const { return {x + o.x, y + o.y, z + o.z}; }
    NavPos operator-(const NavPos& o) const { return {x - o.x, y - o.y, z - o.z}; }
    NavPos operator*(float s) const { return {x * s, y * s, z * s}; }
    float distanceTo(const NavPos& o) const {
        float dx = x - o.x, dy = y - o.y, dz = z - o.z;
        return std::sqrt(dx*dx + dy*dy + dz*dz);
    }
    float distanceSq(const NavPos& o) const {
        float dx = x - o.x, dy = y - o.y, dz = z - o.z;
        return dx*dx + dy*dy + dz*dz;
    }
    NavPos normalized() const {
        float len = std::sqrt(x*x + y*y + z*z);
        return len > 0 ? NavPos(x/len, y/len, z/len) : NavPos();
    }
};

// Hash functions for grid positions
struct GridPosHash {
    size_t operator()(const GridPos& p) const {
        return std::hash<int>()(p.x) ^ (std::hash<int>()(p.y) << 16);
    }
};

// Navigation node for graph-based pathfinding
struct NavNode {
    int id;
    NavPos position;
    std::vector<int> neighbors;
    std::vector<float> weights;
    NavNode() : id(-1) {}
    NavNode(int id, const NavPos& pos) : id(id), position(pos) {}
};

// Path result
struct PathResult {
    bool found;
    float cost;
    std::vector<GridPos> gridPath;
    std::vector<NavPos> navPath;
    std::vector<int> nodeIds;
    PathResult() : found(false), cost(0) {}
};

// 2D Grid for obstacle representation
class Grid2D {
public:
    Grid2D(int width, int height);
    void setBlocked(int x, int y, bool blocked);
    bool isBlocked(int x, int y) const;
    bool isValid(int x, int y) const;
    void setCost(int x, int y, float cost);
    float getCost(int x, int y) const;
    int width() const { return w; }
    int height() const { return h; }
    void clear();
    void fillRect(int x, int y, int w, int h, bool blocked);
    void fillCircle(int cx, int cy, int radius, bool blocked);

private:
    int w, h;
    std::vector<bool> blocked;
    std::vector<float> costs;
};

// Navigation mesh / graph
class NavGraph {
public:
    NavGraph();
    int addNode(const NavPos& position);
    void addEdge(int from, int to, float weight = -1);
    void addBidirectionalEdge(int a, int b, float weight = -1);
    const NavNode& getNode(int id) const;
    int nodeCount() const { return static_cast<int>(nodes.size()); }
    void clear();

private:
    std::vector<NavNode> nodes;
};

// A* pathfinding on 2D grid
PathResult astar2D(const Grid2D& grid, const GridPos& start, const GridPos& goal, bool allowDiagonal = true);

// Dijkstra on 2D grid
PathResult dijkstra2D(const Grid2D& grid, const GridPos& start, const GridPos& goal, bool allowDiagonal = true);

// A* on navigation graph
PathResult astarGraph(const NavGraph& graph, int startId, int goalId);

// Dijkstra on navigation graph
PathResult dijkstraGraph(const NavGraph& graph, int startId, int goalId);

// Breadth-first search (unweighted)
PathResult bfs2D(const Grid2D& grid, const GridPos& start, const GridPos& goal, bool allowDiagonal = true);

// Jump Point Search (optimized A* for uniform-cost grids)
PathResult jps2D(const Grid2D& grid, const GridPos& start, const GridPos& goal);

// Potential field navigation
class PotentialField {
public:
    PotentialField(int width, int height);
    void addAttractor(float x, float y, float strength);
    void addRepulsor(float x, float y, float strength, float radius);
    void addObstacle(int x, int y);
    NavPos getGradient(float x, float y) const;
    float getPotential(float x, float y) const;
    void clear();
    void compute();

private:
    int w, h;
    std::vector<float> field;
    struct Attractor { float x, y, strength; };
    struct Repulsor { float x, y, strength, radius; };
    std::vector<Attractor> attractors;
    std::vector<Repulsor> repulsors;
    std::vector<GridPos> obstacles;
};

// Flow field navigation
class FlowField {
public:
    FlowField(int width, int height);
    void setGoal(int x, int y);
    void setBlocked(int x, int y, bool blocked);
    void compute();
    NavPos getDirection(int x, int y) const;
    int getCost(int x, int y) const;
    void clear();

private:
    int w, h;
    int goalX, goalY;
    std::vector<bool> blocked;
    std::vector<int> costs;
    std::vector<NavPos> directions;
};

// RRT (Rapidly-exploring Random Trees) for continuous space
class RRT {
public:
    RRT(float minX, float minY, float minZ, float maxX, float maxY, float maxZ);
    void setStepSize(float size) { stepSize = size; }
    void setMaxIterations(int max) { maxIter = max; }
    void addObstacleSphere(const NavPos& center, float radius);
    PathResult findPath(const NavPos& start, const NavPos& goal);
    void clear();

private:
    float minBound[3], maxBound[3];
    float stepSize;
    int maxIter;
    struct Obstacle { NavPos center; float radius; };
    std::vector<Obstacle> obstacles;
    bool isColliding(const NavPos& p) const;
    bool lineCollides(const NavPos& a, const NavPos& b) const;
    NavPos randomPoint() const;
};

// Steering behaviors
NavPos seek(const NavPos& position, const NavPos& target, float maxSpeed);
NavPos flee(const NavPos& position, const NavPos& threat, float maxSpeed);
NavPos arrive(const NavPos& position, const NavPos& target, float maxSpeed, float slowRadius);
NavPos pursue(const NavPos& position, const NavPos& targetPos, const NavPos& targetVel, float maxSpeed);
NavPos evade(const NavPos& position, const NavPos& threatPos, const NavPos& threatVel, float maxSpeed);
NavPos wander(const NavPos& forward, float wanderRadius, float wanderDistance, float& wanderAngle);
NavPos separate(const NavPos& position, const std::vector<NavPos>& neighbors, float separationRadius);
NavPos align(const NavPos& velocity, const std::vector<NavPos>& neighborVelocities);
NavPos cohesion(const NavPos& position, const std::vector<NavPos>& neighborPositions);

} // namespace pathfinding
} // namespace aeronav
