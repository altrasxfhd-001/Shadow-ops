// ─ التكوين الأساسي ─
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.FogExp2(0x020205, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

// ─ حالة اللعبة والتحكم ─
const gs = {
    running: false, hp: 100, ammo: 30, reserve: 120, score: 0, wave: 1,
    keys: { w: false, a: false, s: false, d: false },
    isMobile: /Android|iPhone/i.test(navigator.userAgent),
    reloading: false
};

// ─ بناء البيئة (من كودك الأصلي) ─
function initWorld() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x050505 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const ambient = new THREE.AmbientLight(0x111122, 0.5);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0x0088ff, 0.8);
    sun.position.set(20, 50, 10);
    sun.castShadow = true;
    scene.add(sun);
}

// ─ نظام التحكم للكمبيوتر ─
if (!gs.isMobile) {
    window.addEventListener('keydown', (e) => { if(e.key.toLowerCase() in gs.keys) gs.keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', (e) => { if(e.key.toLowerCase() in gs.keys) gs.keys[e.key.toLowerCase()] = false; });
    
    window.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === renderer.domElement && gs.running) {
            camera.rotation.y -= e.movementX * 0.002;
            camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x - e.movementY * 0.002));
        }
    });

    window.addEventListener('mousedown', () => { if(gs.running) shoot(); });
}

function shoot() {
    if (gs.ammo > 0 && !gs.reloading) {
        gs.ammo--;
        updateHUD();
        // هنا يتم إضافة منطق الرصاصة الفعلي من الكود الأصلي
    }
}

function updateMovement() {
    if (!gs.running) return;
    const speed = 0.15;
    if (!gs.isMobile) {
        if (gs.keys.w) camera.translateZ(-speed);
        if (gs.keys.s) camera.translateZ(speed);
        if (gs.keys.a) camera.translateX(-speed);
        if (gs.keys.d) camera.translateX(speed);
    }
    camera.position.y = 1.7; // تثبيت الارتفاع
}

function startGame() {
    document.getElementById('menu').style.display = 'none';
    gs.running = true;
    initWorld();
    if (!gs.isMobile) renderer.domElement.requestPointerLock();
}

function updateHUD() {
    document.getElementById('hp-fill').style.width = gs.hp + "%";
    document.getElementById('hp-num').innerText = Math.round(gs.hp);
    document.getElementById('ammo-main').innerText = gs.ammo;
    document.getElementById('score-num').innerText = gs.score;
}

function animate() {
    requestAnimationFrame(animate);
    if (gs.running) {
        updateMovement();
    }
    renderer.render(scene, camera);
}

animate();

// التعامل مع تغيير حجم الشاشة
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
