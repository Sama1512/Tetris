# ---- build engine (C++) ----
FROM alpine:3.20 AS build-cpp
RUN apk add --no-cache g++ make
WORKDIR /src
COPY cpp/engine.cpp .
# 静的リンクが通らない環境もあるのでフォールバック
RUN g++ -O3 -static -s -o engine engine.cpp || g++ -O3 -o engine engine.cpp

# ---- build go api ----
FROM golang:1.22-alpine AS build-go
WORKDIR /app
COPY server/go.mod ./
RUN go mod download
COPY server/*.go ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o api

# ---- final ----
FROM alpine:3.20
WORKDIR /app
COPY --from=build-go /app/api /app/api
COPY --from=build-cpp /src/engine /app/engine
ENV ENGINE_PATH=/app/engine
EXPOSE 8080
ENTRYPOINT ["/app/api"]