#include "ai.hpp"
#include <future>

Move computeBestMoveParallel(const nlohmann::json& input) {
    Field field(input["field"]);
    std::string current = input["mino"];
    std::string hold = input["hold"];
    std::vector<std::string> next = input["next"];

    std::vector<std::future<Move>> futures;
    for (const std::string& piece : {current, hold}) {
        futures.emplace_back(std::async(std::launch::async, [&]() {
            return simulatePiece(field, piece, next);
        }));
    }

    Move best = {0, 0, 0, -1e9};
    for (auto& f : futures) {
        Move m = f.get();
        if (m.score > best.score) best = m;
    }
    return best;
}