#ifndef FIELD_HPP
#define FIELD_HPP

#include <vector>
#include <string>

class Field {
public:
    Field();
    Field(const std::vector<std::vector<int>>& data);
    bool place(const std::string& mino, int x, int y, int r);
    int getWidth() const;
    double countHoles() const;
    double aggregateHeight() const;
    double bumpiness() const;
    double getRen() const;
    double getB2B() const;
    std::vector<std::vector<int>> grid;
};

#endif