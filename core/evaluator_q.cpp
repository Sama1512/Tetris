#include "evaluator.hpp"
#include <fstream>
#include <nlohmann/json.hpp>
using json = nlohmann::json;

Evaluator::Evaluator() {
    std::ifstream file("../config/ai_params.json");
    if (file.is_open()) {
        json j;
        file >> j;
        weights = j.get<std::vector<double>>();
    } else {
        weights = std::vector<double>(5, 1.0);
    }
}

double Evaluator::evaluate(const Field& field) {
    double holes = field.countHoles();
    double height = field.aggregateHeight();
    double bumpiness = field.bumpiness();
    double ren = field.getRen();
    double b2b = field.getB2B();
    return -weights[0] * holes - weights[1] * height - weights[2] * bumpiness + weights[3] * ren + weights[4] * b2b;
}