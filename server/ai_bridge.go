package server

import (
    "bytes"
    "encoding/json"
    "os/exec"
)

type AIRequest struct {
    Field [][]int  `json:"field"`
    Mino  string   `json:"mino"`
    Hold  string   `json:"hold"`
    Next  []string `json:"next"`
}

type AIResponse struct {
    X        int     `json:"x"`
    Y        int     `json:"y"`
    Rotation int     `json:"rotation"`
    Score    float64 `json:"score"`
}

func ComputeBestMove(req AIRequest) (AIResponse, error) {
    jsonReq, _ := json.Marshal(req)
    cmd := exec.Command("./core/tetris_ai")
    cmd.Stdin = bytes.NewReader(jsonReq)
    var out bytes.Buffer
    cmd.Stdout = &out
    err := cmd.Run()
    if err != nil {
        return AIResponse{}, err
    }
    var res AIResponse
    json.Unmarshal(out.Bytes(), &res)
    return res, nil
}