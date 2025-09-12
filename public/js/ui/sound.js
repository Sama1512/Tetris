let bgm;
export function playSound() {
    const path = new Audio('../assets/sounds/Korobeiniki8bit.m4a');
    fetch(path).then(res => {
        if (res.ok) {
        bgm = new Audio(path);
        bgm.loop = true;
        bgm.volume = 0.5;
        bgm.play();
        }
    }).catch(() => console.warn('BGM not found:', path));
}