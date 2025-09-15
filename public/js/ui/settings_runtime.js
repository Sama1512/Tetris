// localStorage を最優先に読み、無ければ /config/settings.json をフォールバック
export async function getSettings() {
  const raw = localStorage.getItem("settings");
  if (raw) {
    try { return JSON.parse(raw); } catch (e) {}
  }
  try {
    const res = await fetch("/config/settings.json", { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch (e) {}
  return {};
}