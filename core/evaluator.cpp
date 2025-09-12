#include "evaluator.hpp"

double Evaluator::evaluate(const Field& field) {
    return -field.countHoles() - 0.5 * field.aggregateHeight();
}