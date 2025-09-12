#ifndef EVALUATOR_HPP
#define EVALUATOR_HPP

#include "field.hpp"
#include <vector>

class Evaluator {
    std::vector<double> weights;
public:
    Evaluator();
    double evaluate(const Field& field);
};

#endif