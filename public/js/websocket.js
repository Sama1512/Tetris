export function setupWebSocket() {
    const socket = new WebSocket("ws://localhost:8080/ws");
    socket.onmessage = event => {
        console.log("WebSocket message:", event.data);
    };
}