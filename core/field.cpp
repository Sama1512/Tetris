#include "field.hpp"

Field::Field() : grid(20, std::vector<int>(10, 0)) {}

Field::Field(const std::vector<std::vector<int>>& data) : grid(data) {}

bool Field::place(const std::string&, int, int, int) { return true; }
int Field::getWidth() const { return 10; }
double Field::countHoles() const { return 0; }
double Field::aggregateHeight() const { return 0; }
double Field::bumpiness() const { return 0; }
double Field::getRen() const { return 0; }
double Field::getB2B() const { return 0; }