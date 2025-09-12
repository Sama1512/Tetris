#include "ai.hpp"
#include "evaluator.hpp"
#include "field.hpp"
#include "mino.hpp"
#include <vector>
#include <limits>

Move simulatePiece(const Field& field, const std::string& mino, const std::vector<std::string>& next) {
    Evaluator evaluator;
    Move bestMove = {0, 0, 0, -1e9};

    for (int r = 0; r < 4; ++r) {
        for (int x = -2; x < field.getWidth() + 2; ++x) {
            Field temp = field;
            if (temp.place(mino, x, 0, r)) {
                double score = evaluator.evaluate(temp);
                if (score > bestMove.score) {
                    bestMove = {x, 0, r, score};
                }
            }
        }
    }
    return bestMove;
}