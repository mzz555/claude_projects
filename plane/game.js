// ============================================================
//  雷霆战机 — Thunder Strike  |  Complete Game Engine
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
canvas.width  = 480;
canvas.height = 720;

// ─────────────────────────────────────────────────────────────
//  AUDIO ENGINE
// ─────────────────────────────────────────────────────────────
class AudioEngine {
    constructor() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.28;
            this.master.connect(this.ctx.destination);
            this.ok = true;
        } catch (e) { this.ok = false; }
    }

    resume() { if (this.ok && this.ctx.state === 'suspended') this.ctx.resume(); }

    _tone(freq, type, dur, vol = 0.5, detune = 0) {
        if (!this.ok) return;
        try {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.connect(g); g.connect(this.master);
            o.type = type; o.frequency.value = freq; o.detune.value = detune;
            g.gain.setValueAtTime(vol, this.ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
            o.start(); o.stop(this.ctx.currentTime + dur);
        } catch (e) {}
    }

    _noise(dur, vol, freqCut) {
        if (!this.ok) return;
        try {
            const len    = Math.ceil(this.ctx.sampleRate * dur);
            const buf    = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const data   = buf.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 0.6);
            const src = this.ctx.createBufferSource();
            const flt = this.ctx.createBiquadFilter();
            const g   = this.ctx.createGain();
            flt.type = 'lowpass'; flt.frequency.value = freqCut;
            src.buffer = buf;
            src.connect(flt); flt.connect(g); g.connect(this.master);
            g.gain.setValueAtTime(vol, this.ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
            src.start();
        } catch (e) {}
    }

    shoot()        { this._tone(900, 'sawtooth', 0.07, 0.35); this._tone(450, 'square', 0.05, 0.15, -180); }
    doubleShoot()  { this._tone(1300, 'sawtooth', 0.09, 0.45); this._tone(650, 'square', 0.07, 0.25, -90); }
    hit()          { this._tone(220, 'sawtooth', 0.08, 0.3); }
    playerHit()    { this._noise(0.18, 0.6, 600); this._tone(120, 'sawtooth', 0.2, 0.5); }
    explodeSmall() { this._noise(0.18, 0.5, 900); }
    explodeLarge() { this._noise(0.55, 0.9, 350); }
    bomb()         { this._noise(0.9, 1.4, 180); }
    powerup()      { [400, 500, 620, 780, 960].forEach((f, i) => setTimeout(() => this._tone(f, 'sine', 0.18, 0.3), i * 55)); }
    levelUp()      { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._tone(f, 'sine', 0.3, 0.45), i * 100)); }
    bossWarn()     { [0, 500, 1000].forEach(d => setTimeout(() => this._tone(90, 'sawtooth', 0.45, 0.8), d)); }
}

// ─────────────────────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────────────────────
const rand    = (a, b) => Math.random() * (b - a) + a;
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const lerp    = (a, b, t) => a + (b - a) * t;
const clamp   = (v, a, b) => Math.max(a, Math.min(b, v));

function hits(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
}

// ─────────────────────────────────────────────────────────────
//  STARS
// ─────────────────────────────────────────────────────────────
class Star {
    constructor(randomY = false) { this.reset(randomY); }
    reset(randomY = false) {
        this.x     = rand(0, canvas.width);
        this.y     = randomY ? rand(0, canvas.height) : -4;
        this.r     = rand(0.4, 2.2);
        this.spd   = rand(0.4, 2.2) * (this.r / 1.5);
        this.alpha = rand(0.3, 1);
        this.phase = rand(0, Math.PI * 2);
        this.rate  = rand(0.02, 0.06);
    }
    update() {
        this.y += this.spd; this.phase += this.rate;
        if (this.y > canvas.height + 5) this.reset();
    }
    draw() {
        ctx.globalAlpha = this.alpha * (0.7 + 0.3 * Math.sin(this.phase));
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// ─────────────────────────────────────────────────────────────
//  PARTICLES
// ─────────────────────────────────────────────────────────────
class Particle {
    constructor(x, y, color, vx, vy, life, size) {
        this.x = x; this.y = y; this.color = color;
        this.vx = vx; this.vy = vy;
        this.life = life; this.maxLife = life;
        this.size = size;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vy += 0.05;
        this.size *= 0.97;
        this.life--;
        return this.life > 0 && this.size > 0.3;
    }
    draw() {
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function explode(x, y, type, arr) {
    const cfg = {
        tiny:   { n: 12, colors: ['#ff6b35','#ffbe0b','#fff'],   sz:[1,4],  spd:[1,3],  life:[15,30] },
        small:  { n: 22, colors: ['#ff6b35','#ffbe0b','#ff2200','#fff'], sz:[2,5],  spd:[1,4],  life:[20,40] },
        medium: { n: 45, colors: ['#ff6b35','#ffbe0b','#ff2200','#fff','#ff9500'], sz:[3,7], spd:[2,6], life:[30,55] },
        large:  { n: 80, colors: ['#ff6b35','#ffbe0b','#ff4400','#fff','#ffcc00','#ff6600'], sz:[4,10], spd:[2,8], life:[40,75] },
        boss:   { n: 160, colors: ['#ff6b35','#ffbe0b','#ff0000','#fff','#7b2fff','#00f5ff','#ffcc00'], sz:[5,14], spd:[3,12], life:[50,100] },
    };
    const c = cfg[type] || cfg.small;
    for (let i = 0; i < c.n; i++) {
        const a = rand(0, Math.PI * 2);
        const s = rand(c.spd[0], c.spd[1]);
        arr.push(new Particle(x, y, c.colors[randInt(0, c.colors.length - 1)],
            Math.cos(a) * s, Math.sin(a) * s,
            randInt(c.life[0], c.life[1]), rand(c.sz[0], c.sz[1])));
    }
}

// ─────────────────────────────────────────────────────────────
//  PLAYER BULLET
// ─────────────────────────────────────────────────────────────
class Bullet {
    constructor(x, y, vx, vy, dmg, color = '#00f5ff') {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.dmg = dmg; this.color = color;
        this.w = 4; this.h = 18;
        this.active = true;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        if (this.y < -25 || this.y > canvas.height + 25 || this.x < -20 || this.x > canvas.width + 20) this.active = false;
    }
    draw() {
        ctx.save();
        ctx.shadowColor = this.color; ctx.shadowBlur = 12;
        const g = ctx.createLinearGradient(this.x + 2, this.y, this.x + 2, this.y + this.h);
        g.addColorStop(0, this.color); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 1, this.y, 2, 4);
        ctx.restore();
    }
}

// ─────────────────────────────────────────────────────────────
//  ENEMY BULLET
// ─────────────────────────────────────────────────────────────
class EnemyBullet {
    constructor(x, y, vx, vy, dmg, type = 'normal') {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.dmg = dmg; this.type = type; this.active = true;
        this.age = 0;
        if (type === 'boss') {
            this.r = 8; this.color = '#ff0040'; this.w = 16; this.h = 16;
        } else {
            this.r = 5; this.color = '#ff6b35'; this.w = 10; this.h = 10;
        }
    }
    update() {
        this.x += this.vx; this.y += this.vy; this.age++;
        if (this.y < -30 || this.y > canvas.height + 30 || this.x < -30 || this.x > canvas.width + 30) this.active = false;
    }
    draw() {
        ctx.save();
        ctx.shadowColor = this.color; ctx.shadowBlur = 14;
        const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.r);
        g.addColorStop(0, '#fff'); g.addColorStop(0.4, this.color); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, this.r, 0, Math.PI * 2); ctx.fill();
        // Trail
        const trailDir = Math.atan2(this.vy, this.vx);
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = this.color;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(trailDir + Math.PI / 2);
        ctx.fillRect(-2, 0, 4, this.r * 3);
        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

// ─────────────────────────────────────────────────────────────
//  POWERUPS
// ─────────────────────────────────────────────────────────────
const PUPS = {
    DOUBLE: { color: '#ffbe0b', icon: '⚡', label: '双倍子弹' },
    SHIELD: { color: '#7b2fff', icon: '◈', label: '护盾' },
    BOMB:   { color: '#ff6b35', icon: '◉', label: '炸弹' },
    HEALTH: { color: '#00ff88', icon: '♥', label: '生命+1' },
    SPEED:  { color: '#00f5ff', icon: '▶', label: '加速' },
};

class Powerup {
    constructor(x, y, type) {
        this.x = x - 14; this.y = y; this.type = type;
        this.cfg = PUPS[type];
        this.w = 28; this.h = 28;
        this.vy = 1.8; this.active = true;
        this.t = 0; this.bobOff = rand(0, Math.PI * 2);
    }
    update() {
        this.y += this.vy; this.t += 0.08;
        if (this.y > canvas.height + 35) this.active = false;
    }
    draw() {
        const bob = Math.sin(this.bobOff + this.t) * 3;
        const pulse = 1 + Math.sin(this.t * 2) * 0.08;
        ctx.save();
        ctx.translate(this.x + 14, this.y + 14 + bob);
        ctx.rotate(this.t * 0.6);
        ctx.scale(pulse, pulse);
        ctx.shadowColor = this.cfg.color; ctx.shadowBlur = 22;
        // Hexagon
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            i === 0 ? ctx.moveTo(Math.cos(a) * 13, Math.sin(a) * 13)
                    : ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
        }
        ctx.closePath();
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 13);
        g.addColorStop(0, this.cfg.color + 'bb'); g.addColorStop(1, this.cfg.color + '22');
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = this.cfg.color; ctx.lineWidth = 1.5; ctx.stroke();
        // Icon
        ctx.rotate(-this.t * 0.6);
        ctx.font = '13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
        ctx.fillText(this.cfg.icon, 0, 0);
        ctx.restore();
    }
}

// ─────────────────────────────────────────────────────────────
//  PLAYER
// ─────────────────────────────────────────────────────────────
class Player {
    constructor() {
        this.w = 48; this.h = 58;
        this.x = canvas.width / 2 - this.w / 2;
        this.y = canvas.height - 130;
        this.spd  = 5;
        this.hp   = 3; this.maxHp = 3;
        this.shield = 0; this.maxShield = 100;
        this.cooldown = 0; this.fireRate = 14;
        this.doubleShot = false; this.dblTimer = 0;
        this.speedBoost = false; this.spdTimer = 0;
        this.invincible = false; this.invTimer = 0;
        this.bombs = 0;
        this.hitFlash = 0;
        this.thrusterT = 0;
        this.alive = true;
        this.deathParticlesSpawned = false;
    }

    update(keys) {
        if (!this.alive) return;
        const spd = this.speedBoost ? this.spd * 1.6 : this.spd;
        if (keys['ArrowLeft']  || keys['a'] || keys['A']) this.x -= spd;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) this.x += spd;
        if (keys['ArrowUp']    || keys['w'] || keys['W']) this.y -= spd;
        if (keys['ArrowDown']  || keys['s'] || keys['S']) this.y += spd;
        this.x = clamp(this.x, 0, canvas.width - this.w);
        this.y = clamp(this.y, 0, canvas.height - this.h);
        if (this.cooldown > 0) this.cooldown--;
        this.thrusterT += 0.18;
        if (this.dblTimer > 0 && --this.dblTimer === 0) this.doubleShot = false;
        if (this.spdTimer > 0 && --this.spdTimer === 0) this.speedBoost = false;
        if (this.invTimer > 0 && --this.invTimer === 0) this.invincible = false;
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.shield > 0) this.shield = Math.max(0, this.shield - 0.08);
    }

    shoot(bullets, audio) {
        if (this.cooldown > 0 || !this.alive) return;
        this.cooldown = this.fireRate;
        const cx = this.x + this.w / 2;
        if (this.doubleShot) {
            bullets.push(new Bullet(cx - 13, this.y - 8, -0.3, -15, 2, '#ffbe0b'));
            bullets.push(new Bullet(cx + 9,  this.y - 8,  0.3, -15, 2, '#ffbe0b'));
            bullets.push(new Bullet(cx - 2,  this.y - 14, 0,   -17, 2, '#00f5ff'));
            audio.doubleShoot();
        } else {
            bullets.push(new Bullet(cx - 2, this.y - 14, 0, -15, 1));
            audio.shoot();
        }
    }

    damage(amt, audio) {
        if (this.invincible) return false;
        if (this.shield > 0) {
            this.shield = Math.max(0, this.shield - amt * 35);
            this.hitFlash = 5; audio.hit(); return false;
        }
        this.hp -= amt;
        this.hitFlash = 18; this.invincible = true; this.invTimer = 130;
        audio.playerHit();
        if (this.hp <= 0) { this.alive = false; return true; }
        return false;
    }

    draw() {
        if (!this.alive) return;
        if (this.invincible && Math.floor(Date.now() / 90) % 2 === 0) ctx.globalAlpha = 0.35;
        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        ctx.shadowColor = this.hitFlash > 0 ? '#ff4444' : '#00f5ff';
        ctx.shadowBlur  = this.hitFlash > 0 ? 24 : 16;

        // Thrusters
        const eg = 0.65 + 0.35 * Math.sin(this.thrusterT);
        const eLen = 18 + eg * 26;
        const eW   = 8  + eg * 5;
        [-16, 16].forEach(ex => {
            const tg = ctx.createLinearGradient(ex, this.h / 2, ex, this.h / 2 + eLen);
            tg.addColorStop(0, `rgba(0,245,255,${0.85 * eg})`);
            tg.addColorStop(1, 'transparent');
            ctx.fillStyle = tg;
            ctx.beginPath(); ctx.ellipse(ex, this.h / 2 + eLen / 2, eW / 2, eLen / 2, 0, 0, Math.PI * 2); ctx.fill();
        });

        // Wings
        ctx.beginPath();
        ctx.moveTo(-this.w / 2, this.h / 4);
        ctx.lineTo(-this.w / 2 - 10, this.h / 2);
        ctx.lineTo(-this.w / 2 + 2, this.h / 2);
        ctx.closePath();
        ctx.fillStyle = '#003355'; ctx.fill();
        ctx.beginPath();
        ctx.moveTo(this.w / 2, this.h / 4);
        ctx.lineTo(this.w / 2 + 10, this.h / 2);
        ctx.lineTo(this.w / 2 - 2, this.h / 2);
        ctx.closePath();
        ctx.fillStyle = '#003355'; ctx.fill();

        // Body
        ctx.beginPath();
        ctx.moveTo(0, -this.h / 2);
        ctx.lineTo(-this.w / 2 + 4, this.h / 4);
        ctx.lineTo(-this.w / 2, this.h / 2);
        ctx.lineTo(-this.w / 2 + 10, this.h / 2 - 4);
        ctx.lineTo(0, this.h / 2 - 20);
        ctx.lineTo(this.w / 2 - 10, this.h / 2 - 4);
        ctx.lineTo(this.w / 2, this.h / 2);
        ctx.lineTo(this.w / 2 - 4, this.h / 4);
        ctx.closePath();
        const bg = ctx.createLinearGradient(0, -this.h / 2, 0, this.h / 2);
        bg.addColorStop(0, '#00e5ee'); bg.addColorStop(0.4, '#007799'); bg.addColorStop(1, '#003355');
        ctx.fillStyle = bg; ctx.fill();

        // Wing detail
        [[-1, -this.w / 2 + 4, this.h / 4], [1, this.w / 2 - 4, this.h / 4]].forEach(([s, wx, wy]) => {
            ctx.beginPath();
            ctx.moveTo(wx, wy);
            ctx.lineTo(s * 9, 0);
            ctx.lineTo(s * 9, this.h / 4);
            ctx.closePath();
            ctx.fillStyle = 'rgba(0,245,255,0.18)'; ctx.fill();
        });

        // Cockpit
        const cg = ctx.createRadialGradient(-3, -this.h / 4 - 2, 0, 0, -this.h / 4, 11);
        cg.addColorStop(0, '#b0ffff'); cg.addColorStop(1, '#001e33');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.ellipse(0, -this.h / 4, 6.5, 11, 0, 0, Math.PI * 2); ctx.fill();

        // Energy lines
        ctx.strokeStyle = 'rgba(0,245,255,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-5, -this.h / 4 + 9); ctx.lineTo(-5, this.h / 5);
        ctx.moveTo( 5, -this.h / 4 + 9); ctx.lineTo( 5, this.h / 5);
        ctx.stroke();

        // Weapon pods
        ctx.fillStyle = '#5522cc';
        ctx.fillRect(-this.w / 2 + 1, -4, 8, 14);
        ctx.fillRect(this.w / 2 - 9, -4, 8, 14);
        ctx.fillStyle = '#00f5ff';
        ctx.fillRect(-this.w / 2 + 3, -6, 4, 4);
        ctx.fillRect(this.w / 2 - 7, -6, 4, 4);

        // Shield ring
        if (this.shield > 0) {
            const sa = (this.shield / this.maxShield) * 0.45;
            ctx.strokeStyle = `rgba(123,47,255,${sa + 0.15})`;
            ctx.lineWidth = 2; ctx.shadowColor = '#7b2fff'; ctx.shadowBlur = 20;
            ctx.beginPath(); ctx.ellipse(0, 0, this.w / 2 + 9, this.h / 2 + 9, 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    }
}

// ─────────────────────────────────────────────────────────────
//  ENEMY
// ─────────────────────────────────────────────────────────────
class Enemy {
    constructor(x, y, type) {
        this.x = x; this.y = y; this.type = type;
        this.active = true;
        this.hitFlash = 0; this.t = 0; this.bulletT = 0;
        this.vx = 0;
        this._setup();
    }

    _setup() {
        switch (this.type) {
            case 'scout':
                this.w = 32; this.h = 30; this.hp = this.maxHp = 1;
                this.vy = rand(3, 5.5); this.score = 100; this.color = '#ff3366';
                this.fireRate = 200; this.dmg = 1;
                break;
            case 'fighter':
                this.w = 44; this.h = 42; this.hp = this.maxHp = 4;
                this.vy = rand(2, 3.2); this.score = 260; this.color = '#ff6600';
                this.fireRate = 110; this.dmg = 1;
                break;
            case 'cruiser':
                this.w = 62; this.h = 58; this.hp = this.maxHp = 10;
                this.vy = rand(1.2, 2); this.score = 520; this.color = '#cc0000';
                this.fireRate = 75; this.dmg = 2;
                break;
            case 'boss':
                this.w = 128; this.h = 104; this.hp = this.maxHp = 120;
                this.vy = 1; this.score = 6000; this.color = '#ff0000';
                this.fireRate = 38; this.dmg = 3;
                this.entering = true;
                this.targetY  = 90;
                this.phase    = 1;
                break;
        }
    }

    update(eBullets, player, level) {
        if (!this.active) return;
        this.hitFlash = Math.max(0, this.hitFlash - 1);
        this.t++;
        this.type === 'boss' ? this._updateBoss(eBullets, player) : this._updateNormal(eBullets, player, level);
        if (this.y > canvas.height + 70) this.active = false;
    }

    _updateNormal(eBullets, player, level) {
        if (this.type === 'scout')   this.x += Math.sin(this.t * 0.055) * 1.8;
        if (this.type === 'fighter' && this.y > 120) {
            const dx = player.x + player.w / 2 - (this.x + this.w / 2);
            this.vx = lerp(this.vx, dx * 0.009, 0.04);
        }
        this.x += this.vx; this.y += this.vy;
        this.x = clamp(this.x, 0, canvas.width - this.w);
        this.bulletT++;
        const rate = Math.max(35, this.fireRate - level * 6);
        if (this.bulletT >= rate) { this.bulletT = 0; this._shoot(eBullets, player); }
    }

    _updateBoss(eBullets, player) {
        if (this.entering) {
            this.x = lerp(this.x, canvas.width / 2 - this.w / 2, 0.04);
            this.y = lerp(this.y, this.targetY, 0.04);
            if (Math.abs(this.y - this.targetY) < 1.5) this.entering = false;
        } else {
            const seg = Math.floor(this.t / 200) % 4;
            const targets = [22, canvas.width - this.w - 22, canvas.width / 2 - this.w / 2,
                             player.x - this.w / 2 + player.w / 2];
            this.x = lerp(this.x, clamp(targets[seg], 0, canvas.width - this.w), 0.015);
        }
        if (this.hp <= this.maxHp * 0.5 && this.phase === 1) { this.phase = 2; this.fireRate = 24; }
        if (this.hp <= this.maxHp * 0.25 && this.phase === 2) { this.phase = 3; this.fireRate = 14; }
        this.bulletT++;
        if (this.bulletT >= this.fireRate) { this.bulletT = 0; this._shootBoss(eBullets, player); }
    }

    _shoot(eBullets, player) {
        const cx = this.x + this.w / 2, cy = this.y + this.h;
        if (this.type === 'scout') {
            eBullets.push(new EnemyBullet(cx - 5, cy, 0, 7, this.dmg));
        } else if (this.type === 'fighter') {
            const dx = player.x + player.w / 2 - cx, dy = player.y - cy;
            const d  = Math.sqrt(dx * dx + dy * dy) || 1;
            eBullets.push(new EnemyBullet(cx - 5, cy, dx / d * 7, dy / d * 7, this.dmg));
        } else {
            [-3, 0, 3].forEach(ox => eBullets.push(new EnemyBullet(cx - 5, cy, ox, 5, this.dmg)));
        }
    }

    _shootBoss(eBullets, player) {
        const cx = this.x + this.w / 2, cy = this.y + this.h;
        if (this.phase === 1) {
            for (let i = -2; i <= 2; i++)
                eBullets.push(new EnemyBullet(cx - 5, cy, i * 2.2, 6.5, this.dmg, 'boss'));
        } else if (this.phase === 2) {
            const dx = player.x + player.w / 2 - cx, dy = player.y - cy;
            const base = Math.atan2(dy, dx);
            for (let i = -2; i <= 2; i++) {
                const a = base + i * 0.22;
                eBullets.push(new EnemyBullet(cx, cy, Math.cos(a) * 8.5, Math.sin(a) * 8.5, this.dmg, 'boss'));
            }
        } else {
            const cnt = 14;
            for (let i = 0; i < cnt; i++) {
                const a = (i / cnt) * Math.PI * 2 + this.t * 0.04;
                eBullets.push(new EnemyBullet(cx, cy, Math.cos(a) * 6, Math.sin(a) * 6, this.dmg, 'boss'));
            }
            const dx = player.x + player.w / 2 - cx, dy = player.y - cy;
            const d  = Math.sqrt(dx * dx + dy * dy) || 1;
            eBullets.push(new EnemyBullet(cx, cy, dx / d * 11, dy / d * 11, this.dmg * 2, 'boss'));
        }
    }

    hit(amt) {
        this.hp -= amt; this.hitFlash = 10;
        if (this.hp <= 0) { this.active = false; return true; }
        return false;
    }

    draw() {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        ctx.shadowColor = this.hitFlash > 0 ? '#ffffff' : this.color;
        ctx.shadowBlur  = this.hitFlash > 0 ? 28 : 10;
        this._drawShape(ctx);
        if (this.maxHp > 1 && this.type !== 'boss') this._drawHpBar();
        ctx.restore();
    }

    _drawShape(ctx) {
        const W = this.w, H = this.h;
        if (this.type === 'scout') {
            ctx.beginPath();
            ctx.moveTo(0, -H / 2);
            ctx.lineTo(-W / 2, H / 3);
            ctx.lineTo(-W / 4, H / 5);
            ctx.lineTo(0, H / 2);
            ctx.lineTo(W / 4, H / 5);
            ctx.lineTo(W / 2, H / 3);
            ctx.closePath();
            const g = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
            g.addColorStop(0, '#ff3366'); g.addColorStop(1, '#550022');
            ctx.fillStyle = g; ctx.fill();
            ctx.fillStyle = 'rgba(255,100,50,0.9)';
            ctx.beginPath(); ctx.ellipse(0, H / 2 - 3, 3, 5, 0, 0, Math.PI * 2); ctx.fill();

        } else if (this.type === 'fighter') {
            ctx.beginPath();
            ctx.moveTo(0, -H / 2);
            ctx.lineTo(-W / 2, H / 5);
            ctx.lineTo(-W / 3, H / 2);
            ctx.lineTo(0, H / 4);
            ctx.lineTo(W / 3, H / 2);
            ctx.lineTo(W / 2, H / 5);
            ctx.closePath();
            const g = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
            g.addColorStop(0, '#ff6600'); g.addColorStop(0.5, '#cc3300'); g.addColorStop(1, '#550000');
            ctx.fillStyle = g; ctx.fill();
            // Cockpit
            ctx.beginPath(); ctx.ellipse(0, -H / 6, 5.5, 8, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,200,80,0.9)'; ctx.fill();
            // Cannons
            ctx.fillStyle = '#882200';
            ctx.fillRect(-W / 2, H / 5 - 3, 9, 5);
            ctx.fillRect(W / 2 - 9, H / 5 - 3, 9, 5);

        } else if (this.type === 'cruiser') {
            ctx.beginPath();
            ctx.moveTo(0, -H / 2);
            ctx.lineTo(-W / 4, -H / 4);
            ctx.lineTo(-W / 2, H / 5);
            ctx.lineTo(-W / 3, H / 2);
            ctx.lineTo(W / 3, H / 2);
            ctx.lineTo(W / 2, H / 5);
            ctx.lineTo(W / 4, -H / 4);
            ctx.closePath();
            const g = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
            g.addColorStop(0, '#aa0000'); g.addColorStop(0.5, '#770000'); g.addColorStop(1, '#440000');
            ctx.fillStyle = g; ctx.fill();
            // Plating lines
            ctx.strokeStyle = 'rgba(255,60,60,0.35)'; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-W / 5, -H / 5); ctx.lineTo(-W / 5, H / 5);
            ctx.moveTo(W / 5, -H / 5); ctx.lineTo(W / 5, H / 5);
            ctx.stroke();
            // Turrets
            ctx.fillStyle = '#550000';
            ctx.fillRect(-W / 2, H / 10, 12, 8);
            ctx.fillRect(W / 2 - 12, H / 10, 12, 8);
            // Engine glow
            ['rgba(255,80,0,0.8)', 'rgba(200,0,0,0.5)'].forEach((c, i) => {
                ctx.fillStyle = c;
                ctx.beginPath(); ctx.ellipse(-W / 5, H / 2 - 3, 5 - i * 2, 7 - i * 2, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(W / 5, H / 2 - 3, 5 - i * 2, 7 - i * 2, 0, 0, Math.PI * 2); ctx.fill();
            });

        } else if (this.type === 'boss') {
            this._drawBossBody(ctx);
        }
    }

    _drawBossBody(ctx) {
        const W = this.w, H = this.h;
        const p = this.phase;
        // Main body
        ctx.beginPath();
        ctx.moveTo(0, -H / 2);
        ctx.lineTo(-W / 4, -H / 4);
        ctx.lineTo(-W / 2, H / 8);
        ctx.lineTo(-W / 3, H / 2);
        ctx.lineTo(0, H / 3);
        ctx.lineTo(W / 3, H / 2);
        ctx.lineTo(W / 2, H / 8);
        ctx.lineTo(W / 4, -H / 4);
        ctx.closePath();
        const bg = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
        bg.addColorStop(0, p >= 3 ? '#ff6600' : p >= 2 ? '#ff2200' : '#cc0000');
        bg.addColorStop(1, p >= 3 ? '#882200' : '#440000');
        ctx.fillStyle = bg; ctx.fill();
        // Side wings
        [[-1, -W / 2], [1, W / 2]].forEach(([s, wx]) => {
            ctx.beginPath();
            ctx.moveTo(wx, H / 8);
            ctx.lineTo(wx + s * 24, -H / 4);
            ctx.lineTo(wx + s * 24, H / 4);
            ctx.lineTo(wx, H / 3);
            ctx.closePath();
            ctx.fillStyle = '#660000'; ctx.fill();
        });
        // Armor lines
        ctx.strokeStyle = `rgba(255,${p >= 3 ? 120 : 40},0,0.4)`; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-W / 5, -H / 5); ctx.lineTo(-W / 5, H / 4);
        ctx.moveTo(W / 5, -H / 5); ctx.lineTo(W / 5, H / 4);
        ctx.stroke();
        // Core
        const coreColor = p >= 3 ? '#fff' : p >= 2 ? '#ffaa00' : '#ff5500';
        const cg = ctx.createRadialGradient(0, -H / 5, 0, 0, -H / 5, 20);
        cg.addColorStop(0, coreColor); cg.addColorStop(0.5, coreColor + '88'); cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(0, -H / 5, 20, 0, Math.PI * 2); ctx.fill();
        // Hardpoints
        const hColor = p >= 2 ? '#ff6600' : '#ff0000';
        [-W / 3, 0, W / 3].forEach(hx => {
            ctx.shadowColor = hColor; ctx.shadowBlur = 12;
            ctx.fillStyle = hColor;
            ctx.beginPath(); ctx.arc(hx, H / 3, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(hx, H / 3, 2.5, 0, Math.PI * 2); ctx.fill();
        });
    }

    _drawHpBar() {
        const bw = this.w, bh = 4;
        const bx = -this.w / 2, by = -this.h / 2 - 9;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx, by, bw, bh);
        const pct = this.hp / this.maxHp;
        ctx.fillStyle = pct > 0.5 ? '#00ff88' : pct > 0.25 ? '#ffbe0b' : '#ff3366';
        ctx.fillRect(bx, by, bw * pct, bh);
    }
}

// ─────────────────────────────────────────────────────────────
//  GAME
// ─────────────────────────────────────────────────────────────
class Game {
    constructor() {
        this.state      = 'start';
        this.score      = 0;
        this.level      = 1;
        this.kills      = 0;
        this.difficulty = 1;

        this.player    = new Player();
        this.bullets   = [];
        this.eBullets  = [];
        this.enemies   = [];
        this.particles = [];
        this.powerups  = [];
        this.stars     = Array.from({ length: 160 }, () => new Star(true));
        this.audio     = new AudioEngine();
        this.keys      = {};

        this.spawnT  = 0;
        this.spawnRate = 80;
        this.levelT  = 0;
        this.levelDur = 1800;
        this.bossActive   = false;
        this.bossSpawned  = false;

        this.nebulaT = 0;
        this.frame   = 0;

        this._ui();
        this._input();
        this._loop();
    }

    // ── UI SETUP ──
    _ui() {
        const $ = id => document.getElementById(id);
        $('startBtn').onclick = () => this._start();
        $('resumeBtn').onclick = () => this._resume();
        $('restartFromPauseBtn').onclick = () => { this._resume(); this._reset(); this._start(); };
        $('playAgainBtn').onclick = () => { $('gameOverScreen').classList.add('hidden'); this._reset(); this._start(); };
        $('mainMenuBtn').onclick  = () => { $('gameOverScreen').classList.add('hidden'); $('hud').classList.add('hidden'); $('startScreen').classList.remove('hidden'); $('startScreen').classList.add('active'); };
        document.querySelectorAll('.diff-btn').forEach(b => b.onclick = e => {
            document.querySelectorAll('.diff-btn').forEach(x => x.classList.remove('active'));
            e.target.classList.add('active');
            this.difficulty = +e.target.dataset.diff;
        });
    }

    _input() {
        window.addEventListener('keydown', e => {
            this.keys[e.key] = true;
            if (e.key === ' ') { e.preventDefault(); if (this.state === 'playing') this.player.shoot(this.bullets, this.audio); }
            if ((e.key === 'p' || e.key === 'P') && this.state === 'playing') this._pause();
            else if ((e.key === 'p' || e.key === 'P') && this.state === 'paused') this._resume();
            if ((e.key === 'b' || e.key === 'B') && this.state === 'playing' && this.player.bombs > 0) this._bomb();
        });
        window.addEventListener('keyup', e => { this.keys[e.key] = false; });
    }

    _start() {
        this.audio.resume();
        this.state = 'playing';
        const ss = document.getElementById('startScreen');
        ss.classList.remove('active');
        ss.classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        this._hud();
    }
    _pause() { this.state = 'paused'; document.getElementById('pauseScreen').classList.remove('hidden'); }
    _resume() { this.state = 'playing'; document.getElementById('pauseScreen').classList.add('hidden'); }

    _reset() {
        this.score = 0; this.level = 1; this.kills = 0;
        this.player = new Player();
        this.bullets = []; this.eBullets = []; this.enemies = []; this.particles = []; this.powerups = [];
        this.spawnT = 0; this.spawnRate = 80; this.levelT = 0;
        this.bossActive = false; this.bossSpawned = false;
    }

    _gameOver() {
        this.state = 'gameOver';
        document.getElementById('finalScore').textContent = this.score.toLocaleString();
        document.getElementById('finalLevel').textContent  = this.level;
        document.getElementById('finalKills').textContent  = this.kills;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }

    _hud() {
        document.getElementById('scoreDisplay').textContent = this.score.toLocaleString();
        document.getElementById('levelDisplay').textContent = this.level;
        document.getElementById('bombDisplay').textContent  = this.player.bombs;
        // Lives
        const el = document.getElementById('livesDisplay');
        el.innerHTML = '';
        for (let i = 0; i < this.player.maxHp; i++) {
            const d = document.createElement('div');
            d.className = 'life-icon' + (i < this.player.hp ? '' : ' empty');
            el.appendChild(d);
        }
        // Shield
        document.getElementById('shieldBar').style.width = (this.player.shield / this.player.maxShield * 100) + '%';
        // Powerup
        const pu = document.getElementById('powerupDisplay');
        if (this.player.doubleShot) {
            pu.classList.remove('hidden');
            pu.textContent = `⚡ 双倍子弹  ${Math.ceil(this.player.dblTimer / 60)}s`;
        } else if (this.player.speedBoost) {
            pu.classList.remove('hidden');
            pu.textContent = `▶ 加速  ${Math.ceil(this.player.spdTimer / 60)}s`;
        } else {
            pu.classList.add('hidden');
        }
    }

    // ── SPAWNING ──
    _spawnEnemy() {
        if (this.bossActive) return;
        const x = rand(20, canvas.width - 90);
        const r = Math.random();
        let type;
        if (this.level < 2)      type = r < 0.82 ? 'scout' : 'fighter';
        else if (this.level < 4) type = r < 0.48 ? 'scout' : r < 0.84 ? 'fighter' : 'cruiser';
        else                     type = r < 0.3  ? 'scout' : r < 0.64 ? 'fighter' : 'cruiser';
        this.enemies.push(new Enemy(x, -65, type));
    }

    _spawnBoss() {
        this.bossSpawned = true;
        this.bossActive  = true;
        this.enemies.push(new Enemy(canvas.width / 2 - 64, -130, 'boss'));
        this.audio.bossWarn();
        // Boss warning overlay
        const w = document.createElement('div');
        w.style.cssText = `position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);
            font-family:'Orbitron',monospace;font-size:28px;font-weight:900;color:#ff0000;
            text-shadow:0 0 30px rgba(255,0,0,0.9);pointer-events:none;z-index:9;
            animation:none;letter-spacing:4px;`;
        w.textContent = '⚠  BOSS  APPROACHING  ⚠';
        document.getElementById('game-container').appendChild(w);
        let op = 0; let show = true;
        const blink = setInterval(() => { w.style.opacity = show ? '1' : '0'; show = !show; op++; if (op > 10) { clearInterval(blink); w.remove(); } }, 200);
    }

    _spawnPowerup(x, y) {
        if (Math.random() > 0.32) return;
        const types = Object.keys(PUPS);
        let type;
        const r = Math.random();
        if (this.player.hp < this.player.maxHp && r < 0.28) type = 'HEALTH';
        else if (!this.player.doubleShot && r < 0.28) type = 'DOUBLE';
        else type = types[randInt(0, types.length - 1)];
        this.powerups.push(new Powerup(x, y, type));
    }

    _applyPowerup(type) {
        switch (type) {
            case 'DOUBLE': this.player.doubleShot = true; this.player.dblTimer = 600; break;
            case 'SHIELD': this.player.shield = this.player.maxShield; break;
            case 'BOMB':   this.player.bombs++; break;
            case 'HEALTH': this.player.hp = Math.min(this.player.hp + 1, this.player.maxHp); break;
            case 'SPEED':  this.player.speedBoost = true; this.player.spdTimer = 360; break;
        }
        this.audio.powerup();
        this._hud();
    }

    _bomb() {
        this.player.bombs--;
        this.audio.bomb();
        this.enemies.forEach(e => {
            if (!e.active) return;
            explode(e.x + e.w / 2, e.y + e.h / 2, e.type === 'boss' ? 'large' : 'medium', this.particles);
            this.score += Math.floor(e.score / 2);
            this.kills++;
            e.active = false;
        });
        this.eBullets.forEach(b => b.active = false);
        if (this.bossActive) { this.bossActive = false; this._levelUp(); }
        // Flash
        const f = document.createElement('div');
        f.style.cssText = 'position:absolute;inset:0;background:rgba(255,120,0,0.38);pointer-events:none;z-index:7;';
        document.getElementById('game-container').appendChild(f);
        setTimeout(() => f.remove(), 180);
        this._hud();
    }

    _levelUp() {
        this.level++;
        this.bossSpawned = false; this.bossActive = false; this.levelT = 0;
        this.spawnRate = Math.max(28, 80 - this.level * 8);
        this.audio.levelUp();
        // Notification
        document.getElementById('levelNotifNum').textContent = this.level;
        const n = document.getElementById('levelUpNotif');
        n.classList.remove('hidden');
        setTimeout(() => n.classList.add('hidden'), 2200);
        this._hud();
    }

    // ── UPDATE ──
    _update() {
        if (this.state !== 'playing') return;
        this.frame++;
        this.nebulaT += 0.003;

        this.stars.forEach(s => s.update());
        this.player.update(this.keys);
        if (this.keys[' ']) this.player.shoot(this.bullets, this.audio);

        this.levelT++;
        if (!this.bossSpawned && this.levelT >= this.levelDur) this._spawnBoss();

        if (!this.bossActive) {
            this.spawnT++;
            if (this.spawnT >= Math.max(20, this.spawnRate - this.difficulty * 6)) { this.spawnT = 0; this._spawnEnemy(); }
        }

        this.bullets  = this.bullets.filter(b => { b.update(); return b.active; });
        this.eBullets = this.eBullets.filter(b => { b.update(); return b.active; });

        let bossAlive = false;
        this.enemies = this.enemies.filter(e => {
            if (!e.active) return false;
            e.update(this.eBullets, this.player, this.level);
            if (e.type === 'boss' && e.active) bossAlive = true;
            return e.active;
        });

        if (this.bossActive && !bossAlive) { this.bossActive = false; this._levelUp(); }

        // Player bullets vs enemies
        for (const b of this.bullets) {
            if (!b.active) continue;
            for (const e of this.enemies) {
                if (!e.active) continue;
                if (hits({ x: b.x, y: b.y, w: b.w, h: b.h }, { x: e.x, y: e.y, w: e.w, h: e.h })) {
                    b.active = false;
                    explode(b.x + 2, b.y, 'tiny', this.particles);
                    this.audio.hit();
                    if (e.hit(b.dmg)) {
                        const et = e.type === 'boss' ? 'boss' : e.type === 'cruiser' ? 'large' : e.type === 'fighter' ? 'medium' : 'small';
                        explode(e.x + e.w / 2, e.y + e.h / 2, et, this.particles);
                        e.type === 'boss' || e.type === 'cruiser' ? this.audio.explodeLarge() : this.audio.explodeSmall();
                        this.score += e.score * this.difficulty;
                        this.kills++;
                        this._spawnPowerup(e.x + e.w / 2, e.y + e.h / 2);
                        this._hud();
                    }
                    break;
                }
            }
        }

        // Enemy bullets vs player
        const hb = { x: this.player.x + 9, y: this.player.y + 9, w: this.player.w - 18, h: this.player.h - 18 };
        for (const b of this.eBullets) {
            if (!b.active) continue;
            if (hits({ x: b.x, y: b.y, w: b.w, h: b.h }, hb)) {
                b.active = false;
                if (this.player.damage(b.dmg, this.audio)) {
                    explode(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 'large', this.particles);
                    this.audio.explodeLarge();
                    this._gameOver();
                }
                this._hud();
            }
        }

        // Enemy ram vs player
        for (const e of this.enemies) {
            if (!e.active) continue;
            if (hits({ x: e.x, y: e.y, w: e.w, h: e.h }, hb)) {
                explode(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 'medium', this.particles);
                e.hit(99);
                if (this.player.damage(2, this.audio)) {
                    explode(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 'large', this.particles);
                    this.audio.explodeLarge(); this._gameOver();
                }
                this._hud();
            }
        }

        // Powerup pickup
        this.powerups = this.powerups.filter(p => {
            p.update();
            if (!p.active) return false;
            if (hits({ x: p.x, y: p.y, w: p.w, h: p.h }, { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h })) {
                this._applyPowerup(p.type); return false;
            }
            return true;
        });

        this.particles = this.particles.filter(p => p.update());
        if (this.particles.length > 600) this.particles = this.particles.slice(-480);
    }

    // ── DRAW ──
    _draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Space background
        const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bg.addColorStop(0, '#020408'); bg.addColorStop(0.5, '#050c1a'); bg.addColorStop(1, '#040810');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Nebula clouds
        ctx.save(); ctx.globalAlpha = 0.045;
        const n1 = ctx.createRadialGradient(80 + Math.sin(this.nebulaT) * 30, 220, 0, 80, 220, 220);
        n1.addColorStop(0, '#7b2fff'); n1.addColorStop(1, 'transparent');
        ctx.fillStyle = n1; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const n2 = ctx.createRadialGradient(400 + Math.cos(this.nebulaT * 0.7) * 25, 480, 0, 400, 480, 200);
        n2.addColorStop(0, '#00f5ff'); n2.addColorStop(1, 'transparent');
        ctx.fillStyle = n2; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const n3 = ctx.createRadialGradient(240, 360 + Math.sin(this.nebulaT * 1.3) * 40, 0, 240, 360, 170);
        n3.addColorStop(0, '#ff3366'); n3.addColorStop(1, 'transparent');
        ctx.fillStyle = n3; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        this.stars.forEach(s => s.draw());
        this.particles.forEach(p => p.draw());
        this.enemies.forEach(e => e.draw());

        // Boss HP bar (drawn after enemies, in screen space)
        const boss = this.enemies.find(e => e.type === 'boss' && e.active);
        if (boss) this._drawBossHPBar(boss);

        this.player.draw();
        this.bullets.forEach(b => b.draw());
        this.eBullets.forEach(b => b.draw());
        this.powerups.forEach(p => p.draw());

        // Subtle scanlines
        ctx.save(); ctx.globalAlpha = 0.025;
        for (let y = 0; y < canvas.height; y += 3) { ctx.fillStyle = '#000'; ctx.fillRect(0, y, canvas.width, 1); }
        ctx.restore();
    }

    _drawBossHPBar(boss) {
        const bw = canvas.width - 40, bh = 16;
        const bx = 20, by = canvas.height - 34;
        const pct = boss.hp / boss.maxHp;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
        const bg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
        bg.addColorStop(0, '#ff0000'); bg.addColorStop(0.5, '#ff5500'); bg.addColorStop(1, '#ffaa00');
        ctx.fillStyle = bg; ctx.fillRect(bx, by, bw * pct, bh);
        ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px "Orbitron", monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`BOSS  ${boss.hp} / ${boss.maxHp}`, canvas.width / 2, by + bh / 2);
    }

    // ── LOOP ──
    _loop() {
        const tick = () => { this._update(); this._draw(); requestAnimationFrame(tick); };
        tick();
    }
}

// ─────────────────────────────────────────────────────────────
window.addEventListener('load', () => new Game());
