package server

func Clamp(x, min, max int) int {
    if x < min {
        return min
    }
    if x > max {
        return max
    }
    return x
}