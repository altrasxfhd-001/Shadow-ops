// ─ التكوين الأساسي ─
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.FogExp2(0x020205, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

// ─ نظام الصوت المبسط ─
let actx;
function initAudio() { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); }
function beep(type, freq, dur, vol) {
    if (!actx) return;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur);
}

// ─ حالة اللعبة ─
const gs = {
    running: false, hp: 100, maxHp: 100, ammo: 30, reserve: 120, score: 0, 
    wave: 1, kills: 0, reloading: false, cd: 0, camYaw: 0, camPitch: 0,
    speedBoost: false, speedBoostTimer: 0, armorActive: false, armorTimer: 0,
    mercenaries: []
};

// ─ بناء العالم ─
const AR = 50, WH = 12;
const floorGeo = new THREE.PlaneGeometry(AR * 2.5, AR * 2.5);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.8 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// إضاءة
const sun = new THREE.DirectionalLight(0x0088ff, 0.8);
sun.position.set(20, 50, 10);
sun.castShadow = true;
scene.add(sun);
scene.add(new THREE.AmbientLight(0x111122, 0.5));

// (أضف هنا بقية دوال اللعبة: startGame, animate, shoot, buyAmmo, الخ...)
// ملاحظة: بسبب حجم الكود الكبير، تأكد من نقل كل الدوال من النص الأصلي إلى هذا الملف.

function startGame() {
    initAudio();
    document.getElementById('menu').style.display = 'none';
    resetGame();
    gs.running = true;
}

function animate() {
    requestAnimationFrame(animate);
    if (gs.running) {
        // منطق الحركة والتحديث هنا
    }
    renderer.render(scene, camera);
}

animate();

// دالة فتح المتجر
function openShop() {
    if (!gs.running) return;
    gs.running = false;
    document.getElementById('shop-ui').style.display = 'flex';
}

function closeShop() {
    gs.running = true;
    document.getElementById('shop-ui').style.display = 'none';
}
// ... وبقية الدوال ...
