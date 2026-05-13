// ─ التكوين الأساسي ─
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.FogExp2(0x020205, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ─ حالة اللعبة والتحكم ─
const gs = {
    running: false, hp: 100, ammo: 30, score: 0,
    keys: { w: false, a: false, s: false, d: false }
};

// ─ بناء العالم ─
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const light = new THREE.PointLight(0xffffff, 1, 100);
light.position.set(0, 10, 0);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

camera.position.set(0, 1.7, 5);

// ─ دعم الكمبيوتر (Keyboard) ─
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() in gs.keys) gs.keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'r') reload();
});
window.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() in gs.keys) gs.keys[e.key.toLowerCase()] = false;
});

// ─ دعم الماوس (Mouse Look) ─
window.addEventListener('mousemove', (e) => {
    if (gs.running) {
        camera.rotation.y -= e.movementX * 0.002;
        camera.rotation.x -= e.movementY * 0.002;
    }
});

// ─ إصلاح الأزرار (Event Listeners) ─
function startGame() {
    document.getElementById('menu').style.display = 'none';
    gs.running = true;
    // طلب قفل الماوس عشان التجربة تبقا زي ألعاب الـ FPS
    renderer.domElement.requestPointerLock(); 
}

function reload() {
    console.log("Reloading...");
}

// إضافة وظائف المتجر المفقودة
window.buyAmmo = () => { console.log("Ammo bought"); };
window.buyHealth = () => { gs.hp = 100; updateHUD(); };
window.openShop = () => { gs.running = false; document.getElementById('shop-ui').style.display = 'flex'; document.exitPointerLock(); };
window.closeShop = () => { gs.running = true; document.getElementById('shop-ui').style.display = 'none'; };

function updateHUD() {
    document.getElementById('hp-num').innerText = gs.hp;
}

// ─ حلقة التحريك ─
function animate() {
    requestAnimationFrame(animate);
    if (gs.running) {
        const speed = 0.1;
        if (gs.keys.w) camera.translateZ(-speed);
        if (gs.keys.s) camera.translateZ(speed);
        if (gs.keys.a) camera.translateX(-speed);
        if (gs.keys.d) camera.translateX(speed);
    }
    renderer.render(scene, camera);
}
animate();
