CXX = g++
CXXFLAGS = -std=c++17 -O3 -pthread

SRCS = main.cpp ai.cpp ai_parallel.cpp evaluator_q.cpp field.cpp mino.cpp
OBJS = $(SRCS:.cpp=.o)
TARGET = tetris_ai

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CXX) $(CXXFLAGS) -o $@ $^

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $<

clean:
	rm -f $(OBJS) $(TARGET)