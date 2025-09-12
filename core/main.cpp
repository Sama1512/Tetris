#include "ai.hpp"
#include <iostream>
#include <nlohmann/json.hpp>
using json = nlohmann::json;

int main() {
    json input;
    std::cin >> input;
    Move best = computeBestMoveParallel(input);
    json output = {{"x", best.x}, {"y", best.y}, {"rotation", best.rotation}, {"score", best.score}};
    std::cout << output.dump();
    return 0;
}