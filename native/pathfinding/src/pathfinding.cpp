#include "pathfinding.hpp"
#include <cstdlib>

namespace aeronav {
namespace pathfinding {

// Grid2D implementation
Grid2D::Grid2D(int width, int height) : w(width), h(height), blocked(width * height, false), costs(width * height, 1.0f) {}

void Grid2D::setBlocked(int x, int y, bool b) {
    if (isValid(x, y)) blocked[y * w + x] = b;
}

bool Grid2D::isBlocked(int x, int y) const {
    return !isValid(x, y) || blocked[y * w + x];
}

bool Grid2D::isValid(int x, int y) const {
    return x >= 0 && x < w && y >= 0 && y < h;
}

void Grid2D::setCost(int x, int y, float cost) {
    if (isValid(x, y)) costs[y * w + x] = cost;
}

float Grid2D::getCost(int x, int y) const {
    return isValid(x, y) ? costs[y * w + x] : std::numeric_limits<float>::infinity();
}

void Grid2D::clear() {
    std::fill(blocked.begin(), blocked.end(), false);
    std::fill(costs.begin(), costs.end(), 1.0f);
}

void Grid2D::fillRect(int rx, int ry, int rw, int rh, bool b) {
    for (int y = ry; y < ry + rh; y++)
        for (int x = rx; x < rx + rw; x++)
            setBlocked(x, y, b);
}

void Grid2D::fillCircle(int cx, int cy, int radius, bool b) {
    for (int y = cy - radius; y <= cy + radius; y++)
        for (int x = cx - radius; x <= cx + radius; x++)
            if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= radius * radius)
                setBlocked(x, y, b);
}

// NavGraph implementation
NavGraph::NavGraph() {}

int NavGraph::addNode(const NavPos& position) {
    int id = static_cast<int>(nodes.size());
    nodes.push_back(NavNode(id, position));
    return id;
}

void NavGraph::addEdge(int from, int to, float weight) {
    if (from < 0 || from >= (int)nodes.size() || to < 0 || to >= (int)nodes.size()) return;
    float w = weight < 0 ? nodes[from].position.distanceTo(nodes[to].position) : weight;
    nodes[from].neighbors.push_back(to);
    nodes[from].weights.push_back(w);
}

void NavGraph::addBidirectionalEdge(int a, int b, float weight) {
    addEdge(a, b, weight);
    addEdge(b, a, weight);
}

const NavNode& NavGraph::getNode(int id) const {
    static NavNode empty;
    return (id >= 0 && id < (int)nodes.size()) ? nodes[id] : empty;
}

void NavGraph::clear() { nodes.clear(); }

// A* on 2D grid
PathResult astar2D(const Grid2D& grid, const GridPos& start, const GridPos& goal, bool allowDiagonal) {
    PathResult result;
    if (grid.isBlocked(start.x, start.y) || grid.isBlocked(goal.x, goal.y)) return result;

    auto heuristic = [&](const GridPos& p) {
        int dx = std::abs(p.x - goal.x), dy = std::abs(p.y - goal.y);
        return allowDiagonal ? std::max(dx, dy) + 0.414f * std::min(dx, dy) : float(dx + dy);
    };

    struct Node { GridPos pos; float g, f; };
    auto cmp = [](const Node& a, const Node& b) { return a.f > b.f; };
    std::priority_queue<Node, std::vector<Node>, decltype(cmp)> open(cmp);
    std::unordered_map<GridPos, float, GridPosHash> gScore;
    std::unordered_map<GridPos, GridPos, GridPosHash> cameFrom;

    gScore[start] = 0;
    open.push({start, 0, heuristic(start)});

    int dx[] = {0, 1, 0, -1, 1, 1, -1, -1};
    int dy[] = {-1, 0, 1, 0, -1, 1, 1, -1};
    int neighbors = allowDiagonal ? 8 : 4;

    while (!open.empty()) {
        Node current = open.top(); open.pop();

        if (current.pos == goal) {
            result.found = true;
            result.cost = gScore[goal];
            GridPos p = goal;
            while (cameFrom.count(p)) {
                result.gridPath.push_back(p);
                p = cameFrom[p];
            }
            result.gridPath.push_back(start);
            std::reverse(result.gridPath.begin(), result.gridPath.end());
            return result;
        }

        if (current.g > gScore[current.pos]) continue;

        for (int i = 0; i < neighbors; i++) {
            GridPos next(current.pos.x + dx[i], current.pos.y + dy[i]);
            if (grid.isBlocked(next.x, next.y)) continue;

            float moveCost = (i >= 4) ? 1.414f : 1.0f;
            float tentativeG = gScore[current.pos] + moveCost * grid.getCost(next.x, next.y);

            if (!gScore.count(next) || tentativeG < gScore[next]) {
                gScore[next] = tentativeG;
                cameFrom[next] = current.pos;
                open.push({next, tentativeG, tentativeG + heuristic(next)});
            }
        }
    }
    return result;
}

// Dijkstra on 2D grid
PathResult dijkstra2D(const Grid2D& grid, const GridPos& start, const GridPos& goal, bool allowDiagonal) {
    PathResult result;
    if (grid.isBlocked(start.x, start.y) || grid.isBlocked(goal.x, goal.y)) return result;

    struct Node { GridPos pos; float dist; };
    auto cmp = [](const Node& a, const Node& b) { return a.dist > b.dist; };
    std::priority_queue<Node, std::vector<Node>, decltype(cmp)> pq(cmp);
    std::unordered_map<GridPos, float, GridPosHash> dist;
    std::unordered_map<GridPos, GridPos, GridPosHash> prev;

    dist[start] = 0;
    pq.push({start, 0});

    int dx[] = {0, 1, 0, -1, 1, 1, -1, -1};
    int dy[] = {-1, 0, 1, 0, -1, 1, 1, -1};
    int neighbors = allowDiagonal ? 8 : 4;

    while (!pq.empty()) {
        Node current = pq.top(); pq.pop();
        if (current.pos == goal) {
            result.found = true;
            result.cost = dist[goal];
            GridPos p = goal;
            while (prev.count(p)) {
                result.gridPath.push_back(p);
                p = prev[p];
            }
            result.gridPath.push_back(start);
            std::reverse(result.gridPath.begin(), result.gridPath.end());
            return result;
        }

        if (current.dist > dist[current.pos]) continue;

        for (int i = 0; i < neighbors; i++) {
            GridPos next(current.pos.x + dx[i], current.pos.y + dy[i]);
            if (grid.isBlocked(next.x, next.y)) continue;

            float moveCost = (i >= 4) ? 1.414f : 1.0f;
            float newDist = dist[current.pos] + moveCost * grid.getCost(next.x, next.y);

            if (!dist.count(next) || newDist < dist[next]) {
                dist[next] = newDist;
                prev[next] = current.pos;
                pq.push({next, newDist});
            }
        }
    }
    return result;
}

// A* on navigation graph
PathResult astarGraph(const NavGraph& graph, int startId, int goalId) {
    PathResult result;
    if (startId < 0 || startId >= graph.nodeCount() || goalId < 0 || goalId >= graph.nodeCount()) return result;

    const NavPos& goalPos = graph.getNode(goalId).position;
    auto heuristic = [&](int id) { return graph.getNode(id).position.distanceTo(goalPos); };

    struct Node { int id; float g, f; };
    auto cmp = [](const Node& a, const Node& b) { return a.f > b.f; };
    std::priority_queue<Node, std::vector<Node>, decltype(cmp)> open(cmp);
    std::unordered_map<int, float> gScore;
    std::unordered_map<int, int> cameFrom;

    gScore[startId] = 0;
    open.push({startId, 0, heuristic(startId)});

    while (!open.empty()) {
        Node current = open.top(); open.pop();

        if (current.id == goalId) {
            result.found = true;
            result.cost = gScore[goalId];
            int id = goalId;
            while (cameFrom.count(id)) {
                result.nodeIds.push_back(id);
                result.navPath.push_back(graph.getNode(id).position);
                id = cameFrom[id];
            }
            result.nodeIds.push_back(startId);
            result.navPath.push_back(graph.getNode(startId).position);
            std::reverse(result.nodeIds.begin(), result.nodeIds.end());
            std::reverse(result.navPath.begin(), result.navPath.end());
            return result;
        }

        if (current.g > gScore[current.id]) continue;

        const NavNode& node = graph.getNode(current.id);
        for (size_t i = 0; i < node.neighbors.size(); i++) {
            int next = node.neighbors[i];
            float tentativeG = gScore[current.id] + node.weights[i];

            if (!gScore.count(next) || tentativeG < gScore[next]) {
                gScore[next] = tentativeG;
                cameFrom[next] = current.id;
                open.push({next, tentativeG, tentativeG + heuristic(next)});
            }
        }
    }
    return result;
}

// Dijkstra on navigation graph
PathResult dijkstraGraph(const NavGraph& graph, int startId, int goalId) {
    PathResult result;
    if (startId < 0 || startId >= graph.nodeCount() || goalId < 0 || goalId >= graph.nodeCount()) return result;

    struct Node { int id; float dist; };
    auto cmp = [](const Node& a, const Node& b) { return a.dist > b.dist; };
    std::priority_queue<Node, std::vector<Node>, decltype(cmp)> pq(cmp);
    std::unordered_map<int, float> dist;
    std::unordered_map<int, int> prev;

    dist[startId] = 0;
    pq.push({startId, 0});

    while (!pq.empty()) {
        Node current = pq.top(); pq.pop();

        if (current.id == goalId) {
            result.found = true;
            result.cost = dist[goalId];
            int id = goalId;
            while (prev.count(id)) {
                result.nodeIds.push_back(id);
                result.navPath.push_back(graph.getNode(id).position);
                id = prev[id];
            }
            result.nodeIds.push_back(startId);
            result.navPath.push_back(graph.getNode(startId).position);
            std::reverse(result.nodeIds.begin(), result.nodeIds.end());
            std::reverse(result.navPath.begin(), result.navPath.end());
            return result;
        }

        if (current.dist > dist[current.id]) continue;

        const NavNode& node = graph.getNode(current.id);
        for (size_t i = 0; i < node.neighbors.size(); i++) {
            int next = node.neighbors[i];
            float newDist = dist[current.id] + node.weights[i];

            if (!dist.count(next) || newDist < dist[next]) {
                dist[next] = newDist;
                prev[next] = current.id;
                pq.push({next, newDist});
            }
        }
    }
    return result;
}

// BFS on 2D grid
PathResult bfs2D(const Grid2D& grid, const GridPos& start, const GridPos& goal, bool allowDiagonal) {
    PathResult result;
    if (grid.isBlocked(start.x, start.y) || grid.isBlocked(goal.x, goal.y)) return result;

    std::queue<GridPos> queue;
    std::unordered_map<GridPos, GridPos, GridPosHash> cameFrom;
    std::unordered_set<GridPos, GridPosHash> visited;

    queue.push(start);
    visited.insert(start);

    int dx[] = {0, 1, 0, -1, 1, 1, -1, -1};
    int dy[] = {-1, 0, 1, 0, -1, 1, 1, -1};
    int neighbors = allowDiagonal ? 8 : 4;

    while (!queue.empty()) {
        GridPos current = queue.front(); queue.pop();

        if (current == goal) {
            result.found = true;
            GridPos p = goal;
            while (cameFrom.count(p)) {
                result.gridPath.push_back(p);
                p = cameFrom[p];
            }
            result.gridPath.push_back(start);
            std::reverse(result.gridPath.begin(), result.gridPath.end());
            result.cost = static_cast<float>(result.gridPath.size() - 1);
            return result;
        }

        for (int i = 0; i < neighbors; i++) {
            GridPos next(current.x + dx[i], current.y + dy[i]);
            if (grid.isBlocked(next.x, next.y) || visited.count(next)) continue;

            visited.insert(next);
            cameFrom[next] = current;
            queue.push(next);
        }
    }
    return result;
}

// Jump Point Search
PathResult jps2D(const Grid2D& grid, const GridPos& start, const GridPos& goal) {
    // Simplified JPS - falls back to A* for now
    // Full JPS implementation requires jump point detection
    return astar2D(grid, start, goal, true);
}

// Potential Field implementation
PotentialField::PotentialField(int width, int height) : w(width), h(height), field(width * height, 0) {}

void PotentialField::addAttractor(float x, float y, float strength) {
    attractors.push_back({x, y, strength});
}

void PotentialField::addRepulsor(float x, float y, float strength, float radius) {
    repulsors.push_back({x, y, strength, radius});
}

void PotentialField::addObstacle(int x, int y) {
    obstacles.push_back({x, y});
}

float PotentialField::getPotential(float x, float y) const {
    float potential = 0;

    for (const auto& a : attractors) {
        float dx = x - a.x, dy = y - a.y;
        float dist = std::sqrt(dx*dx + dy*dy);
        potential -= a.strength / (dist + 0.1f);
    }

    for (const auto& r : repulsors) {
        float dx = x - r.x, dy = y - r.y;
        float dist = std::sqrt(dx*dx + dy*dy);
        if (dist < r.radius) {
            potential += r.strength * (1.0f / (dist + 0.1f) - 1.0f / r.radius);
        }
    }

    for (const auto& o : obstacles) {
        float dx = x - o.x, dy = y - o.y;
        float dist = std::sqrt(dx*dx + dy*dy);
        potential += 100.0f / (dist + 0.1f);
    }

    return potential;
}

NavPos PotentialField::getGradient(float x, float y) const {
    float eps = 0.1f;
    float px = (getPotential(x + eps, y) - getPotential(x - eps, y)) / (2 * eps);
    float py = (getPotential(x, y + eps) - getPotential(x, y - eps)) / (2 * eps);
    return NavPos(-px, -py, 0).normalized();
}

void PotentialField::clear() {
    attractors.clear();
    repulsors.clear();
    obstacles.clear();
    std::fill(field.begin(), field.end(), 0);
}

void PotentialField::compute() {
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            field[y * w + x] = getPotential(static_cast<float>(x), static_cast<float>(y));
        }
    }
}

// Flow Field implementation
FlowField::FlowField(int width, int height) : w(width), h(height), goalX(0), goalY(0),
    blocked(width * height, false), costs(width * height, INT_MAX), directions(width * height) {}

void FlowField::setGoal(int x, int y) { goalX = x; goalY = y; }

void FlowField::setBlocked(int x, int y, bool b) {
    if (x >= 0 && x < w && y >= 0 && y < h) blocked[y * w + x] = b;
}

void FlowField::compute() {
    std::fill(costs.begin(), costs.end(), INT_MAX);
    std::fill(directions.begin(), directions.end(), NavPos());

    if (goalX < 0 || goalX >= w || goalY < 0 || goalY >= h) return;

    std::queue<GridPos> queue;
    costs[goalY * w + goalX] = 0;
    queue.push({goalX, goalY});

    int dx[] = {0, 1, 0, -1, 1, 1, -1, -1};
    int dy[] = {-1, 0, 1, 0, -1, 1, 1, -1};

    while (!queue.empty()) {
        GridPos current = queue.front(); queue.pop();
        int currentCost = costs[current.y * w + current.x];

        for (int i = 0; i < 8; i++) {
            int nx = current.x + dx[i], ny = current.y + dy[i];
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            if (blocked[ny * w + nx]) continue;

            int newCost = currentCost + ((i >= 4) ? 14 : 10);
            if (newCost < costs[ny * w + nx]) {
                costs[ny * w + nx] = newCost;
                queue.push({nx, ny});
            }
        }
    }

    // Compute directions
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            if (blocked[y * w + x] || costs[y * w + x] == INT_MAX) continue;

            int bestCost = costs[y * w + x];
            int bestDx = 0, bestDy = 0;

            for (int i = 0; i < 8; i++) {
                int nx = x + dx[i], ny = y + dy[i];
                if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                if (costs[ny * w + nx] < bestCost) {
                    bestCost = costs[ny * w + nx];
                    bestDx = dx[i];
                    bestDy = dy[i];
                }
            }

            float len = std::sqrt(float(bestDx * bestDx + bestDy * bestDy));
            directions[y * w + x] = len > 0 ? NavPos(bestDx / len, bestDy / len, 0) : NavPos();
        }
    }
}

NavPos FlowField::getDirection(int x, int y) const {
    if (x < 0 || x >= w || y < 0 || y >= h) return NavPos();
    return directions[y * w + x];
}

int FlowField::getCost(int x, int y) const {
    if (x < 0 || x >= w || y < 0 || y >= h) return INT_MAX;
    return costs[y * w + x];
}

void FlowField::clear() {
    std::fill(blocked.begin(), blocked.end(), false);
    std::fill(costs.begin(), costs.end(), INT_MAX);
    std::fill(directions.begin(), directions.end(), NavPos());
}

// RRT implementation
RRT::RRT(float minX, float minY, float minZ, float maxX, float maxY, float maxZ)
    : stepSize(1.0f), maxIter(1000) {
    minBound[0] = minX; minBound[1] = minY; minBound[2] = minZ;
    maxBound[0] = maxX; maxBound[1] = maxY; maxBound[2] = maxZ;
}

void RRT::addObstacleSphere(const NavPos& center, float radius) {
    obstacles.push_back({center, radius});
}

bool RRT::isColliding(const NavPos& p) const {
    for (const auto& o : obstacles) {
        if (p.distanceSq(o.center) < o.radius * o.radius) return true;
    }
    return false;
}

bool RRT::lineCollides(const NavPos& a, const NavPos& b) const {
    NavPos dir = b - a;
    float len = std::sqrt(dir.x*dir.x + dir.y*dir.y + dir.z*dir.z);
    int steps = static_cast<int>(len / (stepSize * 0.5f)) + 1;
    for (int i = 0; i <= steps; i++) {
        NavPos p = a + dir * (float(i) / steps);
        if (isColliding(p)) return true;
    }
    return false;
}

NavPos RRT::randomPoint() const {
    return NavPos(
        minBound[0] + (float(rand()) / RAND_MAX) * (maxBound[0] - minBound[0]),
        minBound[1] + (float(rand()) / RAND_MAX) * (maxBound[1] - minBound[1]),
        minBound[2] + (float(rand()) / RAND_MAX) * (maxBound[2] - minBound[2])
    );
}

PathResult RRT::findPath(const NavPos& start, const NavPos& goal) {
    PathResult result;
    if (isColliding(start) || isColliding(goal)) return result;

    struct TreeNode { NavPos pos; int parent; };
    std::vector<TreeNode> tree;
    tree.push_back({start, -1});

    for (int iter = 0; iter < maxIter; iter++) {
        NavPos sample = (rand() % 10 == 0) ? goal : randomPoint();

        int nearest = 0;
        float nearestDist = tree[0].pos.distanceSq(sample);
        for (size_t i = 1; i < tree.size(); i++) {
            float d = tree[i].pos.distanceSq(sample);
            if (d < nearestDist) { nearest = i; nearestDist = d; }
        }

        NavPos dir = (sample - tree[nearest].pos).normalized();
        NavPos newPos = tree[nearest].pos + dir * stepSize;

        if (!lineCollides(tree[nearest].pos, newPos)) {
            tree.push_back({newPos, nearest});

            if (newPos.distanceTo(goal) < stepSize && !lineCollides(newPos, goal)) {
                tree.push_back({goal, static_cast<int>(tree.size()) - 1});
                result.found = true;

                int idx = static_cast<int>(tree.size()) - 1;
                while (idx >= 0) {
                    result.navPath.push_back(tree[idx].pos);
                    idx = tree[idx].parent;
                }
                std::reverse(result.navPath.begin(), result.navPath.end());

                result.cost = 0;
                for (size_t i = 1; i < result.navPath.size(); i++) {
                    result.cost += result.navPath[i].distanceTo(result.navPath[i-1]);
                }
                return result;
            }
        }
    }
    return result;
}

void RRT::clear() { obstacles.clear(); }

// Steering behaviors
NavPos seek(const NavPos& position, const NavPos& target, float maxSpeed) {
    NavPos desired = (target - position).normalized() * maxSpeed;
    return desired;
}

NavPos flee(const NavPos& position, const NavPos& threat, float maxSpeed) {
    NavPos desired = (position - threat).normalized() * maxSpeed;
    return desired;
}

NavPos arrive(const NavPos& position, const NavPos& target, float maxSpeed, float slowRadius) {
    NavPos toTarget = target - position;
    float dist = std::sqrt(toTarget.x*toTarget.x + toTarget.y*toTarget.y + toTarget.z*toTarget.z);
    if (dist < 0.001f) return NavPos();

    float speed = (dist < slowRadius) ? maxSpeed * (dist / slowRadius) : maxSpeed;
    return toTarget.normalized() * speed;
}

NavPos pursue(const NavPos& position, const NavPos& targetPos, const NavPos& targetVel, float maxSpeed) {
    NavPos toTarget = targetPos - position;
    float dist = std::sqrt(toTarget.x*toTarget.x + toTarget.y*toTarget.y + toTarget.z*toTarget.z);
    float lookAhead = dist / maxSpeed;
    NavPos futurePos = targetPos + targetVel * lookAhead;
    return seek(position, futurePos, maxSpeed);
}

NavPos evade(const NavPos& position, const NavPos& threatPos, const NavPos& threatVel, float maxSpeed) {
    NavPos toThreat = threatPos - position;
    float dist = std::sqrt(toThreat.x*toThreat.x + toThreat.y*toThreat.y + toThreat.z*toThreat.z);
    float lookAhead = dist / maxSpeed;
    NavPos futurePos = threatPos + threatVel * lookAhead;
    return flee(position, futurePos, maxSpeed);
}

NavPos wander(const NavPos& forward, float wanderRadius, float wanderDistance, float& wanderAngle) {
    wanderAngle += (float(rand()) / RAND_MAX - 0.5f) * 0.5f;
    NavPos circleCenter = forward.normalized() * wanderDistance;
    NavPos displacement(std::cos(wanderAngle) * wanderRadius, std::sin(wanderAngle) * wanderRadius, 0);
    return (circleCenter + displacement).normalized();
}

NavPos separate(const NavPos& position, const std::vector<NavPos>& neighbors, float separationRadius) {
    NavPos steering;
    int count = 0;
    for (const auto& n : neighbors) {
        float dist = position.distanceTo(n);
        if (dist > 0 && dist < separationRadius) {
            NavPos diff = (position - n).normalized() * (1.0f / dist);
            steering = steering + diff;
            count++;
        }
    }
    if (count > 0) steering = steering * (1.0f / count);
    return steering;
}

NavPos align(const NavPos& velocity, const std::vector<NavPos>& neighborVelocities) {
    if (neighborVelocities.empty()) return NavPos();
    NavPos avg;
    for (const auto& v : neighborVelocities) avg = avg + v;
    return (avg * (1.0f / neighborVelocities.size()) - velocity).normalized();
}

NavPos cohesion(const NavPos& position, const std::vector<NavPos>& neighborPositions) {
    if (neighborPositions.empty()) return NavPos();
    NavPos center;
    for (const auto& p : neighborPositions) center = center + p;
    center = center * (1.0f / neighborPositions.size());
    return (center - position).normalized();
}

} // namespace pathfinding
} // namespace aeronav
