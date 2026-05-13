// ─ التكوين الأساسي ─
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.FogExp2(0x020205, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

// ─ نظام الصوت ─
let actx;
function initAudio() { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); }

// ─ حالة اللعبة ─
const gs = {
    running: false, hp: 100, maxHp: 100, ammo: 30, reserve: 120, score: 0, 
    wave: 1, kills: 0, reloading: false, auto: false
};

// ─ بناء العالم ─
const floorGeo = new THREE.PlaneGeometry(125, 125);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x050505 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const sun = new THREE.DirectionalLight(0x0088ff, 0.8);
sun.position.set(20, 50, 10);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x111122, 0.5));

camera.position.set(0, 1.7, 5);

// ─ الدوال الناقصة (التي تم إصلاحها) ─

function resetGame() {
    gs.hp = 100;
    gs.score = 0;
    gs.ammo = 30;
    gs.running = true;
    updateHUD();
}

function startGame() {
    initAudio();
    document.getElementById('menu').style.display = 'none';
    resetGame();
}

function retryGame() {
    document.getElementById('gameover').style.display = 'none';
    startGame();
}

function updateHUD() {
    document.getElementById('hp-num').innerText = gs.hp;
    document.getElementById('hp-fill').style.width = gs.hp + "%";
    document.getElementById('ammo-main').innerText = gs.ammo;
    document.getElementById('score-num').innerText = gs.score;
}

// دوال المتجر والأزرار
function buyAmmo() { if(gs.score >= 400) { gs.reserve += 30; gs.score -= 400; updateHUD(); } }
function buyHealth() { if(gs.score >= 600) { gs.hp = 100; gs.score -= 600; updateHUD(); } }
function throwGrenade() { console.log("Grenade Thrown!"); }
function deployMercenary() { console.log("Mercenary Deployed!"); }
function toggleAuto() { 
    gs.auto = !gs.auto; 
    const btn = document.getElementById('auto-btn');
    btn.innerText = gs.auto ? "AUTO ON" : "AUTO OFF";
    btn.classList.toggle('on');
}

function openShop() {
    gs.running = false;
    document.getElementById('shop-ui').style.display = 'flex';
}

function closeShop() {
    gs.running = true;
    document.getElementById('shop-ui').style.display = 'none';
}

// ─ حلقة التحريك ─
function animate() {
    requestAnimationFrame(animate);
    if (gs.running) {
        // هنا تضيف حركة الأعداء واللاعب لاحقاً
    }
    renderer.render(scene, camera);
}

animate();

// معالجة تغيير حجم النافذة
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
