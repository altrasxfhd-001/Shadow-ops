// Three.js FPS - Modularized & refactored from original "shadow ops original.txt"
// All gameplay logic preserved and reorganized into classes and modules.
// Exposes global functions used by index.html buttons (startGame, openShop, buyAmmo, etc.)

// ----------------------------- THREE.JS SETUP -----------------------------
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.6;
renderer.setClearColor(0x0a0a1a);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.02);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 160);
camera.position.set(0, 1.8, 0);

// Performance tweak: cap max updates per second for heavy updates
let lastUpdate = performance.now();
const UPDATE_INTERVAL = 1000 / 60; // 60 UPS target for game logic

// lighting (preserve original atmosphere)
scene.add(new THREE.AmbientLight(0x304060, 2.0));
const sun = new THREE.DirectionalLight(0xffeedd, 2.5);
sun.position.set(10, 20, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -40; sun.shadow.camera.right = 40; sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
sun.shadow.camera.far = 120; sun.shadow.bias = -0.0001;
scene.add(sun);

const pl1 = new THREE.PointLight(0xff4400, 4.0, 25); pl1.position.set(8,4,8); scene.add(pl1);
const pl2 = new THREE.PointLight(0x3366ff, 4.0, 25); pl2.position.set(-8,4,-8); scene.add(pl2);
const pl3 = new THREE.PointLight(0x00ff88, 2.0, 20); pl3.position.set(0,3,15); scene.add(pl3);

// floor and helpers (from original)
const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0a15, roughness: 0.85, metalness: 0.2 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(90,90,60,60), floorMat);
floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; scene.add(floor);
const grid = new THREE.GridHelper(90, 50, 0x1a1a2e, 0x151525); grid.position.y = 0.015; scene.add(grid);

// arena walls & pillars helper
const AR = 36, WH = 10;
function box(w,h,d,x,y,z,c=0x1a1a2a){
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0.3 }));
    m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
}
box(AR*2, WH, 1.5, 0, WH/2, -AR);
box(AR*2, WH, 1.5, 0, WH/2, AR);
box(1.5, WH, AR*2, -AR, WH/2, 0);
box(1.5, WH, AR*2, AR, WH/2, 0);
[
    [-22,-22],[22,-22],[-22,22],[22,22],
    [-22,0],[22,0],[0,-22],[0,22],
    [-15,15],[15,-15],[-15,-15],[15,15]
].forEach(([x,z])=>{
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.7,WH,8), new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.5, metalness: 0.5 }));
    pillar.position.set(x,WH/2,z); pillar.castShadow = true; pillar.receiveShadow = true; scene.add(pillar);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7,0.06,8,24), new THREE.MeshStandardMaterial({ color:0x003366, roughness:0.3, metalness:0.7, emissive:0x001133, emissiveIntensity:0.3 }));
    ring.rotation.x = Math.PI/2; ring.position.set(x,2.0,z); scene.add(ring);
});

// ----------------------------- AUDIO (original functions preserved) -----------------------------
let actx = null;
function initAudio(){ if(!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); }
function beep(type, freq, dur, vol = 0.3){
    if(!actx) return;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
}
function playShot(){
    if(!actx) return;
    const b = actx.createBuffer(1, actx.sampleRate * 0.1, actx.sampleRate), d = b.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/d.length,2.5)*0.6;
    const s = actx.createBufferSource(), g = actx.createGain();
    s.buffer = b; g.gain.setValueAtTime(0.6, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.1);
    s.connect(g); g.connect(actx.destination); s.start();
}
function playHit(){ beep('sawtooth', 180, 0.08, 0.25); }
function playReload(){ [0,0.15,0.3].forEach((t,i)=> setTimeout(()=> beep('square', [280,220,380][i], 0.06, 0.2), t*1000)); }
function playExplosionSound(){
    if(!actx) return;
    const buffer = actx.createBuffer(1, actx.sampleRate * 0.4, actx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i] = (Math.random()*2-1) * Math.exp(-i/(actx.sampleRate*0.08));
    const source = actx.createBufferSource(), gain = actx.createGain();
    source.buffer = buffer; gain.gain.setValueAtTime(0.9, actx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.4);
    source.connect(gain); gain.connect(actx.destination); source.start();
}

// ----------------------------- PARTICLES -----------------------------
const parts = [];
class Particle {
    constructor(pos, vel, life = 1, col1 = 0xffaa00, col2 = 0xff5500) {
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.04,4,4), new THREE.MeshBasicMaterial({ color: Math.random()>0.5?col1:col2, transparent: true }));
        this.mesh.position.copy(pos);
        this.vel = vel;
        this.life = life;
        scene.add(this.mesh);
    }
    update() {
        this.vel.y -= 0.02;
        this.mesh.position.add(this.vel);
        this.life -= 0.05;
        this.mesh.material.opacity = Math.max(0, this.life);
        if (this.life <= 0) { scene.remove(this.mesh); return false; }
        return true;
    }
}
function sparks(pos, count = 8, col1 = 0xffaa00, col2 = 0xff5500){
    for(let i=0;i<count;i++){
        const v = new THREE.Vector3((Math.random()-0.5)*0.5, Math.random()*0.5, (Math.random()-0.5)*0.5);
        parts.push(new Particle(pos.clone(), v, 1, col1, col2));
    }
}
function updateParts(){
    for(let i=parts.length-1;i>=0;i--){
        if(!parts[i].update()) parts.splice(i,1);
    }
}

// ----------------------------- GAME STATE -----------------------------
const GS = {
    running: false, hp:100, maxHp:100, ammo:30, maxAmmo:30, reserve:120,
    score:0, wave:1, kills:0, reloading:false, reloadTmr:0, cd:0,
    camYaw:0, camPitch:0, damageBoost:false, speedBoost:false,
    speedBoostTimer:0, armorActive:false, armorTimer:0,
    movementEnhanced:false, mercenaries:[], mercenaryCount:0
};

// ----------------------------- ENEMY CLASS -----------------------------
const enemies = [];
const KNAMES = ['الصقر','العقرب','الظل','الرعد','المارد','الشبح','الفهد','التنين'];

class Enemy {
    constructor(x,z,wave){
        this.g = new THREE.Group();
        // body
        const bodyGeo = new THREE.CylinderGeometry(0.35,0.4,1.2,8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x881111, roughness: 0.4, metalness: 0.5 });
        const body = new THREE.Mesh(bodyGeo, bodyMat); body.position.y = 1.2; body.castShadow = true; this.g.add(body);

        // head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.3,8,8), new THREE.MeshStandardMaterial({ color:0xaa2222, roughness:0.3, metalness:0.4 }));
        head.position.y = 2.0; head.castShadow = true; this.g.add(head);

        // shoulders
        [-0.35,0.35].forEach(sx=>{
            const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.25,0.2,0.25), new THREE.MeshStandardMaterial({ color:0x771111, roughness:0.5, metalness:0.4 }));
            shoulder.position.set(sx,1.6,0); this.g.add(shoulder);
        });

        // gun
        const gunGroup = new THREE.Group();
        const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.08,0.8,8), new THREE.MeshStandardMaterial({ color:0x222222, roughness:0.3, metalness:0.8 }));
        gunBarrel.rotation.x = Math.PI/2; gunBarrel.position.z = 0.4; gunGroup.add(gunBarrel);
        const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.15,0.3), new THREE.MeshStandardMaterial({ color:0x333333, roughness:0.3, metalness:0.7 }));
        gunBody.position.set(0,0,0.15); gunGroup.add(gunBody);
        gunGroup.position.set(0.4,1.3,0.2); this.g.add(gunGroup);

        // eyes
        [-0.08,0.08].forEach(ex=>{
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06,6,6), new THREE.MeshBasicMaterial({ color:0xff2200 }));
            eye.position.set(ex,2.05,0.25); this.g.add(eye);
        });

        // hp bar
        const bgBar = new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.08), new THREE.MeshBasicMaterial({ color:0x333333 }));
        bgBar.position.set(0,2.6,0); this.g.add(bgBar);
        const fgB = new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.08), new THREE.MeshBasicMaterial({ color:0x00ff44 }));
        fgB.position.set(0,2.6,0.01); this.g.add(fgB);
        this.fgB = fgB;

        // armor
        const armor = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.6,0.1), new THREE.MeshStandardMaterial({ color:0x440000, roughness:0.6, metalness:0.6 }));
        armor.position.set(0,1.2,0.35); this.g.add(armor);

        this.g.position.set(x,0,z);
        this.hp = 50 + wave * 15;
        this.maxHp = this.hp;
        this.speed = 0.015 + wave * 0.004;
        this.alive = true;
        this.sTmr = 50 + Math.random()*70;
        this.bob = Math.random()*Math.PI*2;
        this.hit = 0;
        scene.add(this.g);
    }

    update() {
        if (!this.alive) return;
        const tv = new THREE.Vector3(camera.position.x, 0, camera.position.z);
        const p = this.g.position;
        const dir = tv.clone().sub(p);
        const dist = dir.length();
        if (dist > 7) {
            dir.normalize();
            p.x += dir.x * this.speed;
            p.z += dir.z * this.speed;
        }
        this.g.position.y = Math.sin(Date.now()*0.0025 + this.bob) * 0.06;
        this.g.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
        this.g.children.forEach(c => { if (c.geometry && c.geometry.type === 'PlaneGeometry') c.lookAt(camera.position); });

        if (this.hit > 0) {
            this.hit--;
            this.g.traverse(c => { if (c.isMesh && c.material && c.material.emissive) {
                c.material.emissive.setHex(this.hit > 0 ? 0xff2200 : 0x000000);
                c.material.emissiveIntensity = this.hit > 0 ? 0.5 : 0;
            }});
        }

        if (dist < 40) {
            this.sTmr--;
            if (this.sTmr <= 0) {
                this.sTmr = 60 + Math.random()*70;
                shootEnemyBullet(this.g.position, camera.position);
            }
        }
    }

    takeDamage(dmg) {
        this.hp -= dmg;
        this.hit = 10;
        this.updateBar();
        if (this.hp <= 0) this.die();
    }

    updateBar() {
        const r = Math.max(0, this.hp / this.maxHp);
        this.fgB.scale.x = r;
        this.fgB.position.x = -(1 - r) * 0.35;
        if (r > 0.5) this.fgB.material.color.setHex(0x00ff44);
        else if (r > 0.25) this.fgB.material.color.setHex(0xffaa00);
        else this.fgB.material.color.setHex(0xff2200);
    }

    die() {
        this.alive = false;
        sparks(this.g.position.clone().add(new THREE.Vector3(0,1,0)), 15, 0xff4400, 0xff8800);
        scene.remove(this.g);
        GS.score += 120 + GS.wave * 60;
        GS.kills++;
        document.getElementById('score-num').textContent = GS.score.toLocaleString();
        const f = document.getElementById('killfeed');
        const d = document.createElement('div'); d.className = 'kf';
        d.textContent = `✗ ${KNAMES[GS.kills % KNAMES.length]} مقتول`;
        f.appendChild(d); setTimeout(()=>d.remove(),2500);
        incrementCombo();
        checkAchievements();
        if (Math.random() < 0.35) { GS.ammo = Math.min(GS.maxAmmo, GS.ammo + 5); updateAmmoUI(); }
        if (Math.random() < 0.12 && grenadeCount < 3) { grenadeCount++; updateGrenadeUI(); }
        if (GS.kills % 5 === 0) activatePowerUp();
        if (!enemies.some(e => e.alive)) setTimeout(()=> nextWave(), 1800);
    }
}

// ----------------------------- MERCENARY CLASS -----------------------------
class Mercenary {
    constructor() {
        this.g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.38,1.1,8), new THREE.MeshStandardMaterial({ color:0x008833, roughness:0.4, metalness:0.5 }));
        body.position.y = 1.1; body.castShadow = true; this.g.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.28,8,8), new THREE.MeshStandardMaterial({ color:0x00aa44, roughness:0.3, metalness:0.4 }));
        head.position.y = 1.9; head.castShadow = true; this.g.add(head);
        const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3,8,6,0, Math.PI*2, 0, Math.PI/2), new THREE.MeshStandardMaterial({ color:0x005522, roughness:0.3, metalness:0.7 }));
        helmet.position.y = 1.9; this.g.add(helmet);

        // gun
        const gunGroup = new THREE.Group();
        const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.07,0.7,8), new THREE.MeshStandardMaterial({ color:0x2a2a2a, roughness:0.3, metalness:0.8 }));
        gunBarrel.rotation.x = Math.PI/2; gunBarrel.position.z = 0.35; gunGroup.add(gunBarrel);
        gunGroup.position.set(0.35,1.2,0.2); this.g.add(gunGroup);

        // eyes
        [-0.07,0.07].forEach(ex=>{
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05,6,6), new THREE.MeshBasicMaterial({ color:0x00ff00 }));
            eye.position.set(ex,1.95,0.24); this.g.add(eye);
        });

        const bgBar = new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.07), new THREE.MeshBasicMaterial({ color:0x222222 }));
        bgBar.position.set(0,2.5,0); this.g.add(bgBar);
        const hpBar = new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.07), new THREE.MeshBasicMaterial({ color:0x00ff00 }));
        hpBar.position.set(0,2.5,0.01); this.g.add(hpBar);

        const armor = new THREE.Mesh(new THREE.BoxGeometry(0.45,0.55,0.1), new THREE.MeshStandardMaterial({ color:0x004400, roughness:0.5, metalness:0.6 }));
        armor.position.set(0,1.1,0.32); this.g.add(armor);

        // spawn near player
        const spawnPos = camera.position.clone();
        spawnPos.x += (Math.random()-0.5)*5;
        spawnPos.z += (Math.random()-0.5)*5;
        spawnPos.y = 0;
        this.g.position.copy(spawnPos);
        scene.add(this.g);

        this.hp = 200; this.maxHp = 200; this.alive = true; this.shootTimer = 25; this.lifeTimer = 2400;
        this.hpBar = hpBar;
    }

    update() {
        if (!this.alive) { scene.remove(this.g); return false; }
        this.lifeTimer--;
        if (this.lifeTimer <= 0) { this.alive = false; scene.remove(this.g); return false; }

        // follow player
        const targetPos = camera.position.clone();
        targetPos.x += (Math.random()-0.5) * 3;
        targetPos.z += (Math.random()-0.5) * 3;
        targetPos.y = 0;
        const dir = targetPos.sub(this.g.position);
        if (dir.length() > 1.5) { dir.normalize(); this.g.position.add(dir.multiplyScalar(0.06)); }

        this.g.rotation.y = Math.atan2(camera.position.x - this.g.position.x, camera.position.z - this.g.position.z);

        this.shootTimer--;
        if (this.shootTimer <= 0) {
            this.shootTimer = 18 + Math.random()*25;
            let closest = null; let md = Infinity;
            enemies.forEach(en => { if (!en.alive) return; const dist = this.g.position.distanceTo(en.g.position); if (dist < 35 && dist < md) { md = dist; closest = en; }});
            if (closest) {
                const damage = 18 + Math.random()*12;
                closest.hp -= damage; closest.hit = 6;
                if (closest.hp <= 0) closest.die(); else closest.updateBar();
                const muzzlePos = this.g.position.clone(); muzzlePos.y += 1.2;
                sparks(muzzlePos, 4, 0x00ff00, 0x00cc00);
                beep('square', 250, 0.04, 0.08);
            }
        }

        // can be hit by enemy bullets
        enemyBullets.forEach((b,bi) => {
            if (b.mesh.position.distanceTo(this.g.position) < 0.8) {
                this.hp -= 8 + Math.random() * 6;
                scene.remove(b.mesh);
                enemyBullets.splice(bi,1);
                if (this.hp <= 0) {
                    this.alive = false;
                    sparks(this.g.position, 12, 0x00ff00, 0xffffff);
                }
            }
        });

        const hpPercent = Math.max(0, this.hp / this.maxHp);
        this.hpBar.scale.x = hpPercent;
        this.hpBar.position.x = -(1 - hpPercent) * 0.35;
        return true;
    }
}

// ----------------------------- GRENADE SYSTEM -----------------------------
const grenades = [];
let grenadeCount = 3;
function throwGrenade(){
    if (!GS.running || grenadeCount <= 0) return;
    grenadeCount--; updateGrenadeUI();

    const direction = new THREE.Vector3(); camera.getWorldDirection(direction);
    const grenade = {
        mesh: new THREE.Mesh(new THREE.SphereGeometry(0.18,8,8), new THREE.MeshStandardMaterial({ color:0x334433, roughness:0.5, metalness:0.6, emissive:0x112211, emissiveIntensity:0.3 })),
        position: camera.position.clone().add(direction.clone().multiplyScalar(2.5)),
        velocity: direction.clone().multiplyScalar(0.6),
        timer: 160,
        exploded:false
    };
    grenade.mesh.position.copy(grenade.position); grenade.mesh.castShadow = true; scene.add(grenade.mesh); grenades.push(grenade);
    beep('square', 300, 0.08, 0.12);
}
function updateGrenades(){
    for (let i=grenades.length-1;i>=0;i--){
        const g = grenades[i];
        if (!g.exploded) {
            g.position.add(g.velocity);
            g.velocity.y -= 0.01;
            g.mesh.position.copy(g.position);
            if (g.position.y <= 0) { g.position.y = 0; g.velocity.y = 0; g.velocity.multiplyScalar(0.2); }
            g.timer--;
            if (g.timer <= 0) explodeGrenade(g);
        }
    }
}
function explodeGrenade(grenade){
    grenade.exploded = true;
    const explosionLight = new THREE.PointLight(0xff6600, 6, 12);
    explosionLight.position.copy(grenade.position); scene.add(explosionLight);
    setTimeout(()=> scene.remove(explosionLight), 400);
    sparks(grenade.position, 25, 0xff6600, 0xff8800);
    shake = 0.35;
    enemies.forEach(enemy => {
        if (!enemy.alive) return;
        const distance = enemy.g.position.distanceTo(grenade.position);
        if (distance < 6) {
            const damage = Math.floor(90 * (1 - distance / 6));
            enemy.hp -= damage; enemy.hit = 18;
            if (enemy.hp <= 0) enemy.die(); else enemy.updateBar();
        }
    });
    scene.remove(grenade.mesh);
    grenades.splice(grenades.indexOf(grenade), 1);
    playExplosionSound();
    setTimeout(()=>{ if (grenadeCount < 3) { grenadeCount++; updateGrenadeUI(); } }, 8000);
}
function updateGrenadeUI(){
    const btn = document.getElementById('grenade-btn');
    if (btn) btn.textContent = `💣 ${grenadeCount}`;
    if (btn) btn.style.opacity = grenadeCount > 0 ? '1' : '0.5';
}

// ----------------------------- ENEMY BULLETS -----------------------------
const enemyBullets = [];
function shootEnemyBullet(startPos, targetPos){
    const bulletMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12,6,6), new THREE.MeshBasicMaterial({ color:0xff3300 }));
    bulletMesh.position.copy(startPos); bulletMesh.position.y += 1.2;
    const dir = new THREE.Vector3().copy(targetPos).sub(bulletMesh.position).normalize();
    scene.add(bulletMesh);
    enemyBullets.push({ mesh: bulletMesh, dir: dir, speed: 0.4, life: 130 });
    beep('square', 150, 0.08, 0.04);
}
function updateEnemyBullets(){
    for (let i = enemyBullets.length-1; i>=0; i--){
        const b = enemyBullets[i];
        b.mesh.position.addScaledVector(b.dir, b.speed);
        b.life--;
        if (b.mesh.position.distanceTo(camera.position) < 1.0) {
            takeDamage(4 + Math.random() * 5);
            scene.remove(b.mesh); enemyBullets.splice(i,1); continue;
        }
        if (b.life <= 0) { scene.remove(b.mesh); enemyBullets.splice(i,1); }
    }
}

// ----------------------------- WEATHER / RAIN -----------------------------
let weatherType = 'clear'; let weatherIntensity = 0;
const rainParticles = [];
function updateWeather(){
    if (Math.random() < 0.0008) {
        const types = ['clear','rain','fog'];
        weatherType = types[Math.floor(Math.random()*types.length)];
        weatherIntensity = Math.random();
    }
    switch(weatherType) {
        case 'rain':
            if (rainParticles.length < 80) {
                for (let i=0;i<3;i++){
                    const p = new THREE.Mesh(new THREE.SphereGeometry(0.04,2,2), new THREE.MeshBasicMaterial({ color:0x6688aa, transparent:true, opacity:0.5 }));
                    p.position.set((Math.random()-0.5)*40, 10 + Math.random()*10, (Math.random()-0.5)*40);
                    scene.add(p);
                    rainParticles.push({ mesh: p, speed: 0.15 + Math.random()*0.25 });
                }
                while (rainParticles.length > 80) { const old = rainParticles.shift(); scene.remove(old.mesh); }
            }
            scene.fog.density = 0.018 + weatherIntensity * 0.025;
            break;
        case 'fog':
            scene.fog.density = 0.035 + weatherIntensity * 0.05;
            break;
        default:
            scene.fog.density = 0.02;
            break;
    }
}
function updateRainParticles() {
    rainParticles.forEach(p => {
        p.mesh.position.y -= p.speed;
        if (p.mesh.position.y < 0) {
            p.mesh.position.y = 10;
            p.mesh.position.x = (Math.random()-0.5)*40;
            p.mesh.position.z = (Math.random()-0.5)*40;
        }
    });
}

// ----------------------------- COMBAT (player shooting) -----------------------------
const ray = new THREE.Raycaster();
const AIM = 0.2;
function shoot() {
    if (!GS.running || GS.reloading) return;
    if (GS.ammo <= 0) { startReload(); return; }
    if (GS.cd > 0) return;
    initAudio(); playShot();
    GS.ammo--; GS.cd = 7; updateAmmoUI();
    shake = 0.06;
    const ff = document.getElementById('fire-flash');
    if (ff) { ff.style.opacity = '1'; setTimeout(()=> ff.style.opacity = '0', 45); }
    const w = document.getElementById('weapon'); if (w) { w.style.transform = 'translate(8px,-8px) rotate(-4deg)'; setTimeout(()=> w.style.transform = '', 100); }

    let best = null, bd = Infinity;
    enemies.filter(e => e.alive).forEach(en => {
        const p = en.g.position.clone().add(new THREE.Vector3(0,1.5,0)).project(camera);
        const d = Math.sqrt(p.x*p.x + p.y*p.y);
        const wd = camera.position.distanceTo(en.g.position);
        if (d < AIM && wd < 45 && d < bd) { bd = d; best = en; }
    });

    const baseDmg = GS.damageBoost ? 50 : 22;
    if (best) {
        const dmg = baseDmg + Math.floor(Math.random()*16);
        best.hp -= dmg; best.hit = 10;
        sparks(best.g.position.clone().add(new THREE.Vector3(0,1.5,0)), 10);
        playHit(); showHit();
        if (best.hp <= 0) best.die(); else best.updateBar();
    } else {
        ray.setFromCamera(new THREE.Vector2(0,0), camera);
        const ms = [];
        enemies.filter(e => e.alive).forEach(en => en.g.traverse(c => { if (c.isMesh) ms.push(c); }));
        const its = ray.intersectObjects(ms);
        if (its.length > 0) {
            sparks(its[0].point, 8); playHit(); showHit();
            enemies.filter(e => e.alive).forEach(en => {
                if (en.g.children.includes(its[0].object) || en.g.children.some(c => c === its[0].object)) {
                    const dmg = baseDmg + Math.floor(Math.random()*14);
                    en.hp -= dmg; en.hit = 8;
                    if (en.hp <= 0) en.die(); else en.updateBar();
                }
            });
        }
    }
}

// ----------------------------- RELOAD / UI -----------------------------
function startReload() {
    if (GS.reloading || GS.reserve <= 0 || GS.ammo === GS.maxAmmo) return;
    GS.reloading = true; GS.reloadTmr = 100;
    const rb = document.getElementById('reload-bar'), rp = document.getElementById('reload-prog');
    if (rb && rp) { rb.style.display = 'block'; rp.style.width = '0%'; requestAnimationFrame(()=> { rp.style.transition = 'width 1.4s linear'; rp.style.width = '100%'; }); }
    playReload();
}
function finishReload() {
    const n = GS.maxAmmo - GS.ammo, t = Math.min(n, GS.reserve);
    GS.ammo += t; GS.reserve -= t; GS.reloading = false;
    const rb = document.getElementById('reload-bar'); if (rb) rb.style.display = 'none';
    updateAmmoUI();
}
function updateAmmoUI() {
    const am = document.getElementById('ammo-main'), ar = document.getElementById('ammo-res');
    if (am) am.textContent = GS.ammo;
    if (ar) ar.textContent = `/ ${GS.reserve}`;
}
function updateHpUI() {
    const p = GS.hp / GS.maxHp * 100;
    const f = document.getElementById('hp-fill'), n = document.getElementById('hp-num');
    if (f) f.style.width = p + '%';
    if (n) {
        n.textContent = Math.ceil(GS.hp);
        if (p > 50) { f.style.background = 'linear-gradient(90deg,#00ff88,#00ffc8)'; f.style.boxShadow = '0 0 12px #00ff88'; n.style.color = '#00ff88'; }
        else if (p > 25) { f.style.background = 'linear-gradient(90deg,#ffaa00,#ffcc00)'; f.style.boxShadow = '0 0 10px #ffaa00'; n.style.color = '#ffaa00'; }
        else { f.style.background = 'linear-gradient(90deg,#ff2200,#ff6600)'; f.style.boxShadow = '0 0 10px #ff2200'; n.style.color = '#ff4'; }
    }
}

// ----------------------------- DAMAGE / GAMEOVER -----------------------------
function takeDamage(d) {
    if (GS.armorActive) d *= 0.5;
    GS.hp = Math.max(0, GS.hp - d); updateHpUI();
    shake = 0.18;
    const fl = document.getElementById('dmg-flash'); if (fl) { fl.style.opacity = '1'; setTimeout(()=> fl.style.opacity = '0', 150); }
    if (GS.hp <= 0) gameOver();
}
function gameOver(){
    GS.running = false;
    const goScore = document.getElementById('go-score'), goWave = document.getElementById('go-wave');
    if (goScore) goScore.textContent = GS.score.toLocaleString();
    if (goWave) goWave.textContent = GS.wave;
    const goEl = document.getElementById('gameover'); if (goEl) goEl.style.display = 'flex';
}

// ----------------------------- WAVE / SPAWN -----------------------------
function mkEnemy(x,z,wave){ const e = new Enemy(x,z,wave); enemies.push(e); return e; }
function spawnWave(w) {
    const n = Math.min(3 + w * 2, 18);
    for (let i=0;i<n;i++){
        const a = (i / n) * Math.PI * 2 + Math.random()*0.5;
        const r = 28 - Math.random()*5;
        mkEnemy(Math.cos(a)*r, Math.sin(a)*r, w);
    }
    const el = document.getElementById('wave-notif'); if (el) { el.textContent = `WAVE ${w}`; el.style.opacity = '1'; setTimeout(()=> el.style.opacity = '0', 2200); }
    const wt = document.getElementById('wave-txt'); if (wt) wt.textContent = `WAVE ${w}`;
}
function nextWave(){ GS.wave++; spawnWave(GS.wave); GS.hp = Math.min(GS.maxHp, GS.hp + 35); updateHpUI(); }

// ----------------------------- POWER UPS, ACHIEVEMENTS, COMBO -----------------------------
function activatePowerUp() {
    GS.damageBoost = true;
    const pu = document.getElementById('power-up-ui'); if (pu) pu.style.opacity = '1';
    pl1.color.setHex(0xffff00);
    setTimeout(()=> { GS.damageBoost = false; const pu2 = document.getElementById('power-up-ui'); if (pu2) pu2.style.opacity = '0'; pl1.color.setHex(0xff4400); }, 8000);
}

let comboCount = 0, comboTimer = null;
function incrementCombo(){
    comboCount++; clearTimeout(comboTimer);
    const comboEl = document.getElementById('combo-counter'); if (comboEl) { comboEl.style.opacity = '1'; comboEl.textContent = `${comboCount}x`; }
    if (comboCount >= 5) { showKillstreak(`🔥 ${comboCount} قتلة متتالية!`); activatePowerUp(); }
    comboTimer = setTimeout(()=> { comboCount = 0; if (comboEl) comboEl.style.opacity = '0'; }, 3000);
}
function showKillstreak(text) {
    const el = document.getElementById('killstreak-ui'); if (!el) return;
    el.textContent = text; el.style.opacity = '1'; el.style.transform = 'translate(-50%, -50%) scale(1.2)';
    setTimeout(()=> { el.style.opacity = '0'; el.style.transform = 'translate(-50%, -50%) scale(1)'; }, 2000);
}

const achievements = {
    firstKill: { unlocked:false, title:'أول دم', description:'اقتل أول عدو' },
    kill10: { unlocked:false, title:'جندي متمرس', description:'اقتل 10 أعداء' },
    kill50: { unlocked:false, title:'آلة قتل', description:'اقتل 50 عدو' },
    wave10: { unlocked:false, title:'محارب الموجات', description:'وصل للموجة 10' },
    combo5: { unlocked:false, title:'سفاح', description:'احصل على 5 قتلات متتالية' }
};
function checkAchievements(){
    if (!achievements.firstKill.unlocked && GS.kills >= 1) unlockAchievement('firstKill');
    if (!achievements.kill10.unlocked && GS.kills >= 10) unlockAchievement('kill10');
    if (!achievements.kill50.unlocked && GS.kills >= 50) unlockAchievement('kill50');
    if (!achievements.wave10.unlocked && GS.wave >= 10) unlockAchievement('wave10');
    if (!achievements.combo5.unlocked && comboCount >= 5) unlockAchievement('combo5');
}
function unlockAchievement(key){
    achievements[key].unlocked = true;
    const ach = achievements[key];
    const popup = document.getElementById('achievement-popup');
    if (!popup) return;
    popup.innerHTML = `🏆 ${ach.title}<br><small>${ach.description}</small>`;
    popup.style.opacity = '1'; popup.style.top = '30px';
    setTimeout(()=> { popup.style.opacity = '0'; popup.style.top = '20px'; }, 3000);
    GS.score += 250; document.getElementById('score-num').textContent = GS.score.toLocaleString();
}

// ----------------------------- INPUT (Hybrid PC & Mobile) -----------------------------
const keys = {};
let isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
let pointerLocked = false;

// mouse look for desktop
document.addEventListener('mousemove', (e) => {
    if (!GS.running) return;
    if (pointerLocked || isMobile === false) {
        // will only act if pointer locked on desktop
    }
});

function enablePointerLock() {
    if (canvas.requestPointerLock) canvas.requestPointerLock();
}
document.addEventListener('pointerlockchange', () => {
    pointerLocked = (document.pointerLockElement === canvas);
});

// Keyboard for PC
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (!isMobile) {
        if (e.code === 'Space' || e.code === 'KeyF') shoot();
        if (e.code === 'KeyR') startReload();
        if (e.code === 'KeyG') throwGrenade();
        if (e.code === 'KeyM') deployMercenary();
    }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas && GS.running) {
        const mx = e.movementX * 0.0025; const my = e.movementY * 0.002;
        GS.camYaw -= mx; GS.camPitch -= my;
        swayX = THREE.MathUtils.lerp(swayX, mx * 18, 0.2); swayY = THREE.MathUtils.lerp(swayY, my * 18, 0.2);
        GS.camPitch = Math.max(-Math.PI/3, Math.min(Math.PI/4, GS.camPitch));
    }
});

// click to shoot on desktop if pointer locked
canvas.addEventListener('mousedown', (e) => {
    if (!isMobile && GS.running) shoot();
    if (!pointerLocked && GS.running) enablePointerLock();
});

// Touch joystick & look area for mobile (preserve original logic)
const jRing = document.getElementById('joy-ring'), jKnob = document.getElementById('joy-knob');
const joy = { active:false, id:null, sx:0, sy:0, dx:0, dy:0 };
const look = { active:false, id:null, lx:0, ly:0 };
const JMAX = 50;

if (jRing) {
    jRing.addEventListener('touchstart', e => {
        const t = e.changedTouches[0];
        joy.active = true; joy.id = t.identifier; joy.sx = t.clientX; joy.sy = t.clientY; joy.dx = joy.dy = 0;
    }, { passive: true });
}
document.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
        if (t.identifier === joy.id) {
            const dx = t.clientX - joy.sx, dy = t.clientY - joy.sy;
            const len = Math.sqrt(dx*dx + dy*dy), cl = Math.min(len, JMAX);
            joy.dx = len > 0 ? (dx / len * cl / JMAX) : 0;
            joy.dy = len > 0 ? (dy / len * cl / JMAX) : 0;
            const nx = len > 0 ? dx / len * cl : 0, ny = len > 0 ? dy / len * cl : 0;
            if (jKnob) jKnob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
        }
        if (t.identifier === look.id) {
            const diffX = (t.clientX - look.lx) * 0.0035;
            const diffY = (t.clientY - look.ly) * 0.003;
            GS.camYaw -= diffX; GS.camPitch -= diffY;
            swayX = THREE.MathUtils.lerp(swayX, diffX * 12, 0.2); swayY = THREE.MathUtils.lerp(swayY, diffY * 12, 0.2);
            GS.camPitch = Math.max(-Math.PI/3, Math.min(Math.PI/4, GS.camPitch));
            look.lx = t.clientX; look.ly = t.clientY;
        }
    }
}, { passive: true });
document.addEventListener('touchend', e => {
    for (const t of e.changedTouches) {
        if (t.identifier === joy.id) { joy.active = false; joy.id = null; joy.dx = joy.dy = 0; if (jKnob) jKnob.style.transform = 'translate(-50%,-50%)'; }
        if (t.identifier === look.id) { look.active = false; look.id = null; }
    }
}, { passive: true });
const lookArea = document.getElementById('look-area');
if (lookArea) {
    lookArea.addEventListener('touchstart', e => {
        if (!look.active) { const t = e.changedTouches[0]; look.active = true; look.id = t.identifier; look.lx = t.clientX; look.ly = t.clientY; }
    }, { passive: true });
}

// Mobile UI firing & reload touches preserved
const fireBtn = document.getElementById('fire-btn');
if (fireBtn) fireBtn.addEventListener('touchstart', e => { e.preventDefault(); shoot(); }, { passive:false });
const reloadBtn = document.getElementById('reload-btn');
if (reloadBtn) reloadBtn.addEventListener('touchstart', e => { e.preventDefault(); startReload(); }, { passive:false });

// ----------------------------- PLAYER MOVEMENT & CAMERA Sway -----------------------------
let shake = 0, swayX = 0, swayY = 0;
function updatePlayer() {
    let spd = GS.speedBoost ? 0.48 : 0.24;
    if (GS.movementEnhanced) spd *= 1.35;

    let dx = joy.dx || 0, dy = joy.dy || 0;
    if (keys['KeyW'] || keys['ArrowUp']) dy = -1;
    if (keys['KeyS'] || keys['ArrowDown']) dy = 1;
    if (keys['KeyA'] || keys['ArrowLeft']) dx = -1;
    if (keys['KeyD'] || keys['ArrowRight']) dx = 1;

    if (dx !== 0 || dy !== 0) {
        const viewDir = new THREE.Vector3(); camera.getWorldDirection(viewDir); viewDir.y = 0; viewDir.normalize();
        const sideDir = new THREE.Vector3(0,1,0).cross(viewDir).normalize();
        camera.position.addScaledVector(viewDir, -dy * spd);
        camera.position.addScaledVector(sideDir, dx * spd);
        const B = AR - 1.5;
        camera.position.x = Math.max(-B, Math.min(B, camera.position.x));
        camera.position.z = Math.max(-B, Math.min(B, camera.position.z));
    }

    camera.rotation.order = 'YXZ';
    camera.rotation.y = GS.camYaw;
    camera.rotation.x = GS.camPitch;

    if (shake > 0.001) { camera.rotation.y += (Math.random()-0.5) * shake; camera.rotation.x += (Math.random()-0.5) * shake; shake *= 0.88; }
    swayX *= 0.8; swayY *= 0.8;
    const wp = document.getElementById('weapon'); if (wp) wp.style.transform = `translate(${swayX}px, ${swayY}px)`;

    if (GS.speedBoostTimer > 0) { GS.speedBoostTimer--; if (GS.speedBoostTimer <= 0) GS.speedBoost = false; }
    if (GS.armorTimer > 0) { GS.armorTimer--; if (GS.armorTimer <= 0) GS.armorActive = false; }
}

// ----------------------------- MINIMAP -----------------------------
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;
function updateMinimap() {
    if (!minimapCtx) return;
    minimapCtx.clearRect(0,0,110,110);
    minimapCtx.fillStyle = 'rgba(0,0,0,0.6)'; minimapCtx.fillRect(0,0,110,110);
    const scale = 110 / (AR * 2);
    const cx = 55, cy = 55;
    minimapCtx.fillStyle = '#00ff00';
    minimapCtx.beginPath(); minimapCtx.arc(cx + camera.position.x * scale, cy + camera.position.z * scale, 3, 0, Math.PI*2); minimapCtx.fill();

    minimapCtx.fillStyle = '#ff0000';
    enemies.forEach(en => { if (!en.alive) return; minimapCtx.beginPath(); minimapCtx.arc(cx + en.g.position.x * scale, cy + en.g.position.z * scale, 2, 0, Math.PI*2); minimapCtx.fill(); });

    minimapCtx.fillStyle = '#00ff44';
    GS.mercenaries.forEach(m => { if (!m.alive) return; minimapCtx.beginPath(); minimapCtx.arc(cx + m.g.position.x * scale, cy + m.g.position.z * scale, 2, 0, Math.PI*2); minimapCtx.fill(); });
}

// ----------------------------- GAME LOOP -----------------------------
function updateLights() {
    const t = performance.now() * 0.001;
    pl1.position.x = Math.sin(t*0.5)*10; pl1.position.z = Math.cos(t*0.5)*10;
    pl2.position.x = Math.cos(t*0.6)*10; pl2.position.z = Math.sin(t*0.6)*10;
    pl3.intensity = 1.5 + Math.sin(t*0.8)*0.5;
}

function updateEnemies() {
    enemies.forEach(en => { if (en.alive) en.update(); });
}

function updateMercenaries() {
    for (let i = GS.mercenaries.length - 1; i >= 0; i--) {
        const m = GS.mercenaries[i];
        if (!m.update()) GS.mercenaries.splice(i,1);
    }
}

function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const elapsed = now - lastUpdate;
    if (elapsed >= UPDATE_INTERVAL) {
        lastUpdate = now - (elapsed % UPDATE_INTERVAL);

        if (GS.running) {
            updatePlayer();
            updateEnemies();
            updateParts();
            updateLights();
            updateEnemyBullets();
            updateGrenades();
            updateMercenaries();
            updateWeather();
            updateRainParticles();
            updateMinimap();

            if (GS.cd > 0) GS.cd--;
            if (GS.reloading) { GS.reloadTmr--; if (GS.reloadTmr <= 0) finishReload(); }
        }
    }
    renderer.render(scene, camera);
}
animate();

// ----------------------------- SHOP / UI Binding -----------------------------
function openShop(){ if (!GS.running) return; GS.running = false; const s = document.getElementById('shop-ui'); if (s) s.style.display = 'flex'; }
function closeShop(){ GS.running = true; const s = document.getElementById('shop-ui'); if (s) s.style.display = 'none'; }

function buyAmmo(){
    if (GS.score >= 400) { GS.score -= 400; GS.reserve += 30; updateAmmoUI(); document.getElementById('score-num').textContent = GS.score.toLocaleString(); beep('sine',600,0.15); showKillstreak('🔫 ذخيرة إضافية!'); }
    else beep('sawtooth',150,0.2);
}
function buyHealth(){
    if (GS.score >= 600) { GS.score -= 600; GS.hp = GS.maxHp; updateHpUI(); document.getElementById('score-num').textContent = GS.score.toLocaleString(); beep('sine',800,0.2); showKillstreak('💚 صحة كاملة!'); }
    else beep('sawtooth',150,0.2);
}
function buySpeedBoost(){
    if (GS.score >= 500) { GS.score -= 500; GS.speedBoost = true; GS.speedBoostTimer = 1200; document.getElementById('score-num').textContent = GS.score.toLocaleString(); beep('sine',1000,0.3); showKillstreak('⚡ سرعة مضاعفة!'); setTimeout(()=> { GS.speedBoost = false; }, 20000); }
    else beep('sawtooth',150,0.2);
}
function buyArmor(){
    if (GS.score >= 800) { GS.score -= 800; GS.armorActive = true; GS.armorTimer = 1500; document.getElementById('score-num').textContent = GS.score.toLocaleString(); beep('sine',700,0.3); showKillstreak('🛡️ درع مفعل!'); setTimeout(()=> { GS.armorActive = false; }, 25000); }
    else beep('sawtooth',150,0.2);
}
function buyGrenades(){
    if (GS.score >= 300) { GS.score -= 300; grenadeCount = 3; updateGrenadeUI(); document.getElementById('score-num').textContent = GS.score.toLocaleString(); beep('sine',500,0.2); }
    else beep('sawtooth',150,0.2);
}
function buyMercenary(){
    if (GS.score >= 1000) { GS.score -= 1000; document.getElementById('score-num').textContent = GS.score.toLocaleString(); deployMercenary(); beep('sine',600,0.3); showKillstreak('👥 مرتزق مجند!'); }
    else beep('sawtooth',150,0.2);
}
function buyMovementFix(){
    if (GS.score >= 300) { GS.score -= 300; GS.movementEnhanced = true; document.getElementById('score-num').textContent = GS.score.toLocaleString(); beep('sine',900,0.3); showKillstreak('🔧 حركة محسنة!'); }
    else beep('sawtooth',150,0.2);
}

// ----------------------------- MERCENARY DEPLOY -----------------------------
function createMercenary(){ const m = new Mercenary(); GS.mercenaries.push(m); GS.mercenaryCount++; return m; }
function deployMercenary(){ if (!GS.running) return; createMercenary(); beep('sine',500,0.2); showKillstreak('👥 مرتزق جديد في الخدمة!'); }

// ----------------------------- HIT / UI FEEDBACK -----------------------------
function showHit(){ const h = document.getElementById('hitmarker'); if (h) { h.style.opacity = '1'; setTimeout(()=> h.style.opacity = '0', 150); } }

// ----------------------------- RESET / START / RETRY -----------------------------
function resetGame(){
    enemies.forEach(e => scene.remove(e.g)); enemies.length = 0;
    enemyBullets.forEach(b => scene.remove(b.mesh)); enemyBullets.length = 0;
    parts.forEach(p => scene.remove(p.mesh)); parts.length = 0;
    grenades.forEach(g => scene.remove(g.mesh)); grenades.length = 0;
    GS.mercenaries.forEach(m => scene.remove(m.g)); GS.mercenaries.length = 0;
    rainParticles.forEach(p => scene.remove(p.mesh)); rainParticles.length = 0;

    Object.assign(GS, { running:true, hp:100, ammo:30, reserve:120, score:0, wave:1, kills:0, reloading:false, cd:0, camYaw:0, camPitch:0, damageBoost:false, speedBoost:false, speedBoostTimer:0, armorActive:false, armorTimer:0, movementEnhanced:false, mercenaries:[], mercenaryCount:0 });
    camera.position.set(0,1.8,0);
    grenadeCount = 3;
    updateHpUI(); updateAmmoUI(); updateGrenadeUI();
    const sn = document.getElementById('score-num'); if (sn) sn.textContent = '0';
    const rb = document.getElementById('reload-bar'); if (rb) rb.style.display = 'none';
    spawnWave(1);
}

function startGame() {
    initAudio();
    const menu = document.getElementById('menu'); if (menu) menu.style.display = 'none';
    // Try to request pointer lock for desktop
    if (!isMobile) { canvas.requestPointerLock?.(); }
    resetGame();
}

function retryGame() {
    const go = document.getElementById('gameover'); if (go) go.style.display = 'none';
    resetGame();
}

// ----------------------------- AUTO FIRE -----------------------------
let autoFire = false, autoInt = null;
function toggleAuto(){
    autoFire = !autoFire;
    const b = document.getElementById('auto-btn');
    if (b) { b.textContent = autoFire ? 'AUTO ON' : 'AUTO OFF'; b.classList.toggle('on', autoFire); }
    if (autoFire) autoInt = setInterval(()=> { if (GS.running) shoot(); }, 200);
    else clearInterval(autoInt);
}

// ----------------------------- UI initialization tweaks -----------------------------
updateGrenadeUI();
updateAmmoUI();
updateHpUI();
document.getElementById('score-num').textContent = GS.score.toLocaleString();

// ----------------------------- EXPORTS for index.html onclick attributes -----------------------------
window.startGame = startGame;
window.retryGame = retryGame;
window.openShop = openShop;
window.closeShop = closeShop;
window.buyAmmo = buyAmmo;
window.buyHealth = buyHealth;
window.buySpeedBoost = buySpeedBoost;
window.buyArmor = buyArmor;
window.buyGrenades = buyGrenades;
window.buyMercenary = buyMercenary;
window.buyMovementFix = buyMovementFix;
window.throwGrenade = throwGrenade;
window.deployMercenary = deployMercenary;
window.toggleAuto = toggleAuto;
window.shoot = shoot;
window.startReload = startReload;

// ----------------------------- FINAL NOTES -----------------------------
// This script preserves the original mechanics and logic from the provided source file.
// Input now supports both Desktop (pointer lock + keyboard + mouse) and Mobile (touch joystick & touch buttons).
// Main animate loop uses a fixed logical update cadence to stabilize performance on mid-range GPUs (Iris Xe / integrated).
// All DOM functions referenced in index.html are exposed on window for compatibility.
