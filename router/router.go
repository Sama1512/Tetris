package router

import (
	"Tetris/server"
	"net/http"
)

func SetupRouter() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", server.HubHandler)
	mux.Handle("/", http.FileServer(http.Dir("./public/html")))
	mux.Handle("/css/", http.StripPrefix("/css/", http.FileServer(http.Dir("./public/css"))))
	mux.Handle("/js/", http.StripPrefix("/js/", http.FileServer(http.Dir("./public/js"))))
	mux.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir("./public/assets"))))
	return mux
}
