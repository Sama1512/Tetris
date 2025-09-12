package main

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"Tetris/router"
)

func main() {
	// .env 読み込み
	err := godotenv.Load()
	if err != nil {
		log.Println(".envファイルが見つかりません（環境変数が設定されていない可能性があります）")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // デフォルト
	}

	r := router.SetupRouter()
	log.Println("Server started at :" + port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
