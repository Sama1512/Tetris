#ifndef AI_HPP
#define AI_HPP

#include "field.hpp"
#include <string>
#include <vector>
#include <nlohmann/json.hpp>

struct Move {
    int x;
    int y;
    int rotation;
    double score;
};

Move simulatePiece(const Field& field, const std::string& mino, const std::vector<std::string>& next);
Move computeBestMoveParallel(const nlohmann::json& input);

#endif