// Tetris/server/main.go
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"
)

// ==== リクエスト／レスポンス構造体 ====

// フロントから C++ エンジンに渡す Request
type MoveRequest struct {
	Level     int    `json:"level"`
	Piece     string `json:"piece"`
	CurrentY  int    `json:"current_y"`
	BoardFlat string `json:"board_flat"`
	Hold      string `json:"hold,omitempty"`
	Next      string `json:"next,omitempty"`
	CanHold   bool   `json:"canHold"`
	B2b       int    `json:"b2b"`
	Combo     int    `json:"combo"`
	Debug     bool   `json:"debug,omitempty"`
}

// C++ エンジンから返ってくる JSON
type MoveResponse struct {
	Rotation int    `json:"rotation"`
	TargetX  int    `json:"targetX"`
	UseHold  bool   `json:"useHold"`
	Engine   string `json:"engine"`
}

func main() {
	mux := http.NewServeMux()

	// ヘルスチェック
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	// CPU API
	mux.HandleFunc("/move", handleMove)

	// 静的ファイル: コンテナ内の ./public をそのまま配信
	// → Dockerfile で /app/public にコピーする想定
	fs := http.FileServer(http.Dir("./public"))
	mux.Handle("/", fs)

	addr := ":8080"
	log.Printf("CPU+Static server listening on %s", addr)

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

// ==== /move ハンドラ ====
//
// フロント(JS) → POST /move に JSON を投げる
// ここで C++ engine を起動し、その標準出力(JSON)をそのまま返す。
func handleMove(w http.ResponseWriter, r *http.Request) {
	log.Printf("[HTTP] %s %s", r.Method, r.URL.Path)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "use POST /move"})
		return
	}

	var req MoveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "bad json"})
		return
	}

	// 軽いバリデーション
	if len(req.BoardFlat) != 200 {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "board_flat must be 200 chars"})
		return
	}
	if req.Level < 1 || req.Level > 10 {
		req.Level = 5
	}
	req.Piece = strings.ToUpper(strings.TrimSpace(req.Piece))
	if req.Piece == "" {
		req.Piece = "T"
	}

	// C++ エンジンのパス（ENV ENGINE_PATH で上書き可）
	eng := os.Getenv("ENGINE_PATH")
	if eng == "" {
		eng = "./engine" // コンテナ内: /app/engine を想定
	}

	// MoveRequest 全体を JSON にして C++ に渡す
	payload, _ := json.Marshal(req)

	ctx, cancel := context.WithTimeout(r.Context(), 300*time.Millisecond)
	defer cancel()

	cmd := exec.CommandContext(ctx, eng)
	cmd.Stdin = bytes.NewReader(payload)

	var out bytes.Buffer
	cmd.Stdout = &out
	var errBuf bytes.Buffer
	cmd.Stderr = &errBuf

	if err := cmd.Run(); err != nil {
		log.Printf("engine error: %v, stderr=%s", err, errBuf.String())
		resp := MoveResponse{
			Rotation: 0,
			TargetX:  3,
			UseHold:  false,
			Engine:   "fallback",
		}
		_ = json.NewEncoder(w).Encode(resp)
		return
	}

	body, _ := io.ReadAll(&out)
	if !json.Valid(body) {
		log.Printf("engine invalid json: %s", string(body))
		resp := MoveResponse{
			Rotation: 0,
			TargetX:  3,
			UseHold:  false,
			Engine:   "invalid-json",
		}
		_ = json.NewEncoder(w).Encode(resp)
		return
	}

	if errBuf.Len() > 0 {
		log.Printf("engine debug: %s", errBuf.String())
	}

	_, _ = w.Write(body)
}
