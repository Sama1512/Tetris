export async function requestAIAction(gameState) {
    const response = await fetch("/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameState)
    });
    return await response.json();
}