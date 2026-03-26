// ============================================================
//  雷霆战机 — Thunder Strike  v4.0
//  640×800 | 30命 | 7种敌机 | 5级火力系统 | 追踪导弹 | 激光炮 | 超频状态
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
canvas.width  = 640;
canvas.height = 800;

// ─────────────────────────────────────────────────────────────
//  AUDIO
// ─────────────────────────────────────────────────────────────
class AudioEngine {
    constructor() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.22;
            this.master.connect(this.ctx.destination);
            this.ok = true;
        } catch (e) { this.ok = false; }
    }
    resume() { if (this.ok && this.ctx.state === 'suspended') this.ctx.resume(); }
    _tone(freq, type, dur, vol = 0.4, detune = 0) {
        if (!this.ok) return;
        try {
            const o = this.ctx.createOscillator(), g = this.ctx.createGain();
            o.connect(g); g.connect(this.master);
            o.type = type; o.frequency.value = freq; o.detune.value = detune;
            g.gain.setValueAtTime(vol, this.ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
            o.start(); o.stop(this.ctx.currentTime + dur);
        } catch (e) {}
    }
    _noise(dur, vol, cut) {
        if (!this.ok) return;
        try {
            const len = Math.ceil(this.ctx.sampleRate * dur);
            const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len,0.6);
            const src = this.ctx.createBufferSource(), flt = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
            flt.type='lowpass'; flt.frequency.value=cut;
            src.buffer=buf; src.connect(flt); flt.connect(g); g.connect(this.master);
            g.gain.setValueAtTime(vol, this.ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime+dur);
            src.start();
        } catch(e){}
    }
    shoot()        { this._tone(880,'sawtooth',0.06,0.28); }
    allyShoot()    { this._tone(1100,'sine',0.04,0.15); }
    doubleShoot()  { this._tone(1200,'sawtooth',0.08,0.38); this._tone(600,'square',0.06,0.18,-90); }
    hit()          { this._tone(200,'sawtooth',0.06,0.25); }
    playerHit()    { this._noise(0.18,0.5,600); this._tone(110,'sawtooth',0.18,0.4); }
    explodeSmall() { this._noise(0.15,0.4,900); }
    explodeLarge() { this._noise(0.5,0.8,350); }
    support()      { [280,380,520,680].forEach((f,i)=>setTimeout(()=>this._tone(f,'sine',0.22,0.38),i*65)); }
    powerup()      { [400,500,620,780,960].forEach((f,i)=>setTimeout(()=>this._tone(f,'sine',0.16,0.28),i*55)); }
    levelUp()      { [523,659,784,1047,1318].forEach((f,i)=>setTimeout(()=>this._tone(f,'sine',0.35,0.42),i*90)); }
    bossWarn()     { [0,500,1000].forEach(d=>setTimeout(()=>this._tone(80,'sawtooth',0.5,0.75),d)); }
    missileShoot() { this._tone(300,'sawtooth',0.12,0.35,200); this._tone(150,'sine',0.08,0.2); }
    laserCharge()  { [180,280,420,640,960].forEach((f,i)=>setTimeout(()=>this._tone(f,'sine',0.28,0.35),i*55)); }
    laserFire()    { this._tone(80,'sawtooth',0.6,0.6); this._tone(3200,'sine',0.5,0.18,-30); }
    overclock()    { [400,600,900,1200,1600,2200].forEach((f,i)=>setTimeout(()=>this._tone(f,'sine',0.18,0.35),i*45)); }
}

// ─────────────────────────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────────────────────────
const rand    = (a,b) => Math.random()*(b-a)+a;
const randInt = (a,b) => Math.floor(rand(a,b+1));
const lerp    = (a,b,t) => a+(b-a)*t;
const clamp   = (v,a,b) => Math.max(a,Math.min(b,v));
function hits(a,b){ return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; }

// ─────────────────────────────────────────────────────────────
//  STARS
// ─────────────────────────────────────────────────────────────
class Star {
    constructor(ry=false){ this.reset(ry); }
    reset(ry=false){
        this.x=rand(0,canvas.width); this.y=ry?rand(0,canvas.height):-4;
        this.r=rand(0.3,2); this.spd=rand(0.3,1.8)*(this.r/1.5);
        this.alpha=rand(0.3,1); this.phase=rand(0,Math.PI*2); this.rate=rand(0.02,0.06);
    }
    update(){ this.y+=this.spd; this.phase+=this.rate; if(this.y>canvas.height+5)this.reset(); }
    draw(){
        ctx.globalAlpha=this.alpha*(0.7+0.3*Math.sin(this.phase));
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
    }
}

// ─────────────────────────────────────────────────────────────
//  PARTICLES
// ─────────────────────────────────────────────────────────────
class Particle {
    constructor(x,y,color,vx,vy,life,size){
        this.x=x; this.y=y; this.color=color;
        this.vx=vx; this.vy=vy; this.life=life; this.maxLife=life; this.size=size;
    }
    update(){ this.x+=this.vx; this.y+=this.vy; this.vy+=0.04; this.size*=0.97; this.life--; return this.life>0&&this.size>0.3; }
    draw(){
        ctx.globalAlpha=this.life/this.maxLife;
        ctx.fillStyle=this.color; ctx.beginPath(); ctx.arc(this.x,this.y,this.size,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
    }
}

function explode(x,y,type,arr){
    const cfg={
        tiny:  {n:10,colors:['#ff6b35','#ffbe0b','#fff'],              sz:[1,3],  spd:[0.8,2.5],life:[12,25]},
        small: {n:20,colors:['#ff6b35','#ffbe0b','#ff2200','#fff'],    sz:[2,5],  spd:[1,3.5], life:[18,38]},
        medium:{n:40,colors:['#ff6b35','#ffbe0b','#ff2200','#fff','#ff9500'],sz:[2.5,6],spd:[1.5,5],life:[28,52]},
        large: {n:70,colors:['#ff6b35','#ffbe0b','#ff4400','#fff','#ffcc00'],sz:[3,9], spd:[2,7],  life:[38,70]},
        boss:  {n:140,colors:['#ff6b35','#ffbe0b','#ff0000','#fff','#7b2fff','#00f5ff'],sz:[4,12],spd:[2.5,10],life:[45,95]},
        ally:  {n:16,colors:['#00ff88','#00f5ff','#fff'],               sz:[2,5],  spd:[1,3.5], life:[18,38]},
        spawn: {n:12,colors:['#ffffff','#aaffff','#00f5ff'],            sz:[1,3],  spd:[0.5,2], life:[10,20]},
    };
    const c=cfg[type]||cfg.small;
    for(let i=0;i<c.n;i++){
        const a=rand(0,Math.PI*2), s=rand(c.spd[0],c.spd[1]);
        arr.push(new Particle(x,y,c.colors[randInt(0,c.colors.length-1)],
            Math.cos(a)*s, Math.sin(a)*s, randInt(c.life[0],c.life[1]), rand(c.sz[0],c.sz[1])));
    }
}

// ─────────────────────────────────────────────────────────────
//  BULLETS
// ─────────────────────────────────────────────────────────────
class Bullet {
    constructor(x,y,vx,vy,dmg,color='#00f5ff'){
        this.x=x; this.y=y; this.vx=vx; this.vy=vy;
        this.dmg=dmg; this.color=color; this.w=4; this.h=16; this.active=true;
    }
    update(){
        this.x+=this.vx; this.y+=this.vy;
        if(this.y<-25||this.y>canvas.height+25||this.x<-20||this.x>canvas.width+20)this.active=false;
    }
    draw(){
        ctx.save(); ctx.shadowColor=this.color; ctx.shadowBlur=10;
        const g=ctx.createLinearGradient(this.x+2,this.y,this.x+2,this.y+this.h);
        g.addColorStop(0,this.color); g.addColorStop(1,'transparent');
        ctx.fillStyle=g; ctx.fillRect(this.x,this.y,this.w,this.h);
        ctx.fillStyle='#fff'; ctx.fillRect(this.x+1,this.y,2,4);
        ctx.restore();
    }
}

class EnemyBullet {
    constructor(x,y,vx,vy,dmg,type='normal'){
        this.x=x; this.y=y; this.vx=vx; this.vy=vy;
        this.dmg=dmg; this.type=type; this.active=true; this.age=0;
        if(type==='boss')    {this.r=7; this.color='#ff0040'; this.w=14; this.h=14;}
        else if(type==='cluster'){this.r=4; this.color='#ff8800'; this.w=8; this.h=8;}
        else                 {this.r=5; this.color='#ff6b35'; this.w=10; this.h=10;}
    }
    update(){
        this.x+=this.vx; this.y+=this.vy; this.age++;
        if(this.y<-30||this.y>canvas.height+30||this.x<-30||this.x>canvas.width+30)this.active=false;
    }
    draw(){
        ctx.save();
        if(this.type==='boss'){ctx.shadowColor=this.color;ctx.shadowBlur=10;}
        const cx=this.x+this.w/2, cy=this.y+this.h/2;
        const g=ctx.createRadialGradient(cx,cy,0,cx,cy,this.r);
        g.addColorStop(0,'#fff'); g.addColorStop(0.4,this.color); g.addColorStop(1,'transparent');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,this.r,0,Math.PI*2); ctx.fill();
        const td=Math.atan2(this.vy,this.vx);
        ctx.globalAlpha=0.32; ctx.fillStyle=this.color;
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(td+Math.PI/2); ctx.fillRect(-2,0,4,this.r*3); ctx.restore();
        ctx.globalAlpha=1; ctx.restore();
    }
}

// ─────────────────────────────────────────────────────────────
//  GUIDED MISSILE 追踪导弹
// ─────────────────────────────────────────────────────────────
class GuidedMissile {
    constructor(x,y,enemies){
        this.x=x; this.y=y; this.vx=0; this.vy=-7;
        this.dmg=8; this.w=6; this.h=14; this.active=true;
        this.age=0; this.speed=7; this.turnSpeed=0.16;
        this.smoke=[]; this.target=this._findNearest(enemies);
    }
    _findNearest(enemies){
        let best=null, bestD=Infinity;
        for(const e of enemies){
            if(!e.active)continue;
            const dx=(e.x+e.w/2)-this.x, dy=(e.y+e.h/2)-this.y, d=dx*dx+dy*dy;
            if(d<bestD){bestD=d;best=e;}
        }
        return best;
    }
    update(enemies){
        this.age++;
        if(!this.target||!this.target.active)this.target=this._findNearest(enemies);
        if(this.target&&this.target.active){
            const tx=this.target.x+this.target.w/2, ty=this.target.y+this.target.h/2;
            const desired=Math.atan2(ty-this.y,tx-this.x);
            let cur=Math.atan2(this.vy,this.vx);
            let diff=desired-cur;
            if(diff>Math.PI)diff-=Math.PI*2; if(diff<-Math.PI)diff+=Math.PI*2;
            cur+=Math.sign(diff)*Math.min(Math.abs(diff),this.turnSpeed);
            this.vx=Math.cos(cur)*this.speed; this.vy=Math.sin(cur)*this.speed;
        }
        this.x+=this.vx; this.y+=this.vy;
        if(this.age%2===0)this.smoke.push({x:this.x,y:this.y,life:18,max:18});
        this.smoke=this.smoke.filter(s=>{s.life--;return s.life>0;});
        if(this.y<-50||this.y>canvas.height+50||this.x<-50||this.x>canvas.width+50)this.active=false;
    }
    draw(){
        for(const s of this.smoke){
            ctx.globalAlpha=(s.life/s.max)*0.5; ctx.fillStyle='#ff7700';
            ctx.beginPath(); ctx.arc(s.x,s.y,3*(s.life/s.max),0,Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha=1;
        const angle=Math.atan2(this.vy,this.vx)+Math.PI/2;
        ctx.save(); ctx.translate(this.x+this.w/2,this.y+this.h/2); ctx.rotate(angle);
        ctx.shadowColor='#ff4400'; ctx.shadowBlur=14;
        const g=ctx.createLinearGradient(0,-this.h/2,0,this.h/2);
        g.addColorStop(0,'#ffcc00'); g.addColorStop(0.5,'#ff6600'); g.addColorStop(1,'#cc2200');
        ctx.fillStyle=g;
        ctx.beginPath(); ctx.moveTo(0,-this.h/2); ctx.lineTo(-this.w/2,this.h/4); ctx.lineTo(0,this.h/2); ctx.lineTo(this.w/2,this.h/4); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(0,-this.h/2,1.5,0,Math.PI*2); ctx.fill();
        ctx.restore(); ctx.globalAlpha=1;
    }
}

// ─────────────────────────────────────────────────────────────
//  POWERUPS
// ─────────────────────────────────────────────────────────────
const PUPS = {
    FIREPOWER:{color:'#00ff44',icon:'⊕',label:'火力升级'}, // visual overridden in constructor
    SHIELD:   {color:'#7b2fff',icon:'◈', label:'护盾'},
    SUPPORT:  {color:'#00ff88',icon:'✈', label:'支援+1'},
    HEALTH:   {color:'#ff4477',icon:'♥', label:'生命+3'},
    SPEED:    {color:'#00f5ff',icon:'▶', label:'加速'},
};
// 火力道具外观配置（按升级后的等级索引）
const FP_DATA=[null,
    {color:'#00ff44',icon:'⊕',label:'副炮   Lv.1',shape:'diamond' },
    {color:'#ffee00',icon:'≋', label:'蜂群   Lv.2',shape:'circle'  },
    {color:'#ff8800',icon:'◎',label:'导弹   Lv.3',shape:'star'    },
    {color:'#ff2200',icon:'⦿',label:'双导弹 Lv.4',shape:'pentagon'},
    {color:'#cc00ff',icon:'⬡',label:'激光   Lv.5',shape:'hex'     },
    {color:'#00ffff',icon:'✦',label:'超频   MAX', shape:'burst'   },
];

class Powerup {
    constructor(x,y,type,nextLevel=1){
        this.x=x-14; this.y=y; this.type=type;
        this.w=28; this.h=28; this.vy=1.4; this.active=true;
        this.t=0; this.bobOff=rand(0,Math.PI*2);
        this.nextLevel=nextLevel;
        this.cfg = type==='FIREPOWER' ? (FP_DATA[Math.min(nextLevel,6)]||FP_DATA[1]) : PUPS[type];
    }
    update(){ this.y+=this.vy; this.t+=0.08; if(this.y>canvas.height+35)this.active=false; }
    draw(){
        const bob=Math.sin(this.bobOff+this.t)*3, pulse=1+Math.sin(this.t*2)*0.08;
        ctx.save(); ctx.translate(this.x+14,this.y+14+bob); ctx.rotate(this.t*0.6); ctx.scale(pulse,pulse);
        ctx.shadowColor=this.cfg.color; ctx.shadowBlur=this.cfg.shape==='burst'?32:20;
        ctx.beginPath();
        switch(this.cfg.shape){
            case 'diamond':
                ctx.moveTo(0,-14); ctx.lineTo(14,0); ctx.lineTo(0,14); ctx.lineTo(-14,0); ctx.closePath(); break;
            case 'circle':
                ctx.arc(0,0,13,0,Math.PI*2); break;
            case 'star':
                for(let i=0;i<10;i++){const a=(i/10)*Math.PI*2-Math.PI/2,r=i%2===0?13:6; i===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);} ctx.closePath(); break;
            case 'pentagon':
                for(let i=0;i<5;i++){const a=(i/5)*Math.PI*2-Math.PI/2; i===0?ctx.moveTo(Math.cos(a)*13,Math.sin(a)*13):ctx.lineTo(Math.cos(a)*13,Math.sin(a)*13);} ctx.closePath(); break;
            case 'burst':
                for(let i=0;i<16;i++){const a=(i/16)*Math.PI*2,r=i%2===0?14:8; i===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);} ctx.closePath(); break;
            case 'hex': default:
                for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2-Math.PI/6; i===0?ctx.moveTo(Math.cos(a)*13,Math.sin(a)*13):ctx.lineTo(Math.cos(a)*13,Math.sin(a)*13);} ctx.closePath();
        }
        const g=ctx.createRadialGradient(0,0,0,0,0,13);
        g.addColorStop(0,this.cfg.color+'bb'); g.addColorStop(1,this.cfg.color+'22');
        ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle=this.cfg.color; ctx.lineWidth=1.5; ctx.stroke();
        ctx.rotate(-this.t*0.6); ctx.font='13px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle='#fff'; ctx.shadowBlur=0; ctx.fillText(this.cfg.icon,0,0);
        ctx.restore();
    }
}

// ─────────────────────────────────────────────────────────────
//  ALLY 僚机
// ─────────────────────────────────────────────────────────────
class Ally {
    constructor(side){
        this.side=side; this.w=22; this.h=28;
        this.x=0; this.y=0;
        this.hp=8; this.maxHp=8;          // HP ×2 (原4→8)
        this.active=true; this.life=720;
        this.bulletT=0; this.fireRate=20;
        this.hitFlash=0; this.thrusterT=rand(0,Math.PI*2);
        this.enterAnim=30; // 入场动画帧数
        this.alpha=0;
    }
    update(player,bullets){
        // 入场淡入
        if(this.enterAnim>0){ this.enterAnim--; this.alpha=Math.min(1,this.alpha+0.06); }
        const tx=player.x+player.w/2+this.side*65-this.w/2;
        const ty=player.y+8;
        this.x=lerp(this.x,tx,0.14); this.y=lerp(this.y,ty,0.14);
        this.x=clamp(this.x,0,canvas.width-this.w);
        this.y=clamp(this.y,0,canvas.height-this.h);
        this.thrusterT+=0.22;
        if(this.hitFlash>0)this.hitFlash--;
        this.bulletT++;
        if(this.bulletT>=this.fireRate){
            this.bulletT=0;
            bullets.push(new Bullet(this.x+this.w/2-2,this.y-8,0,-10,1,'#00ff88'));
        }
        this.life--; if(this.life<=0||this.hp<=0)this.active=false;
    }
    hit(amt){ this.hp-=amt; this.hitFlash=10; if(this.hp<=0){this.active=false;return true;} return false; }
    draw(){
        if(!this.active)return;
        if(this.life<120) this.alpha=this.life/120;
        ctx.globalAlpha=this.alpha;
        ctx.save(); ctx.translate(this.x+this.w/2,this.y+this.h/2);
        ctx.shadowColor=this.hitFlash>0?'#ffffff':'#00ff88'; ctx.shadowBlur=12;
        // 推进火焰
        const eg=0.6+0.4*Math.sin(this.thrusterT);
        const tg=ctx.createLinearGradient(0,this.h/2,0,this.h/2+14);
        tg.addColorStop(0,`rgba(0,255,136,${0.8*eg})`); tg.addColorStop(1,'transparent');
        ctx.fillStyle=tg; ctx.beginPath(); ctx.ellipse(0,this.h/2+7,3,7,0,0,Math.PI*2); ctx.fill();
        // 机身
        ctx.beginPath();
        ctx.moveTo(0,-this.h/2); ctx.lineTo(-this.w/2+2,this.h/4);
        ctx.lineTo(-this.w/2,this.h/2); ctx.lineTo(0,this.h/2-8);
        ctx.lineTo(this.w/2,this.h/2); ctx.lineTo(this.w/2-2,this.h/4); ctx.closePath();
        const bg=ctx.createLinearGradient(0,-this.h/2,0,this.h/2);
        bg.addColorStop(0,'#00ff88'); bg.addColorStop(0.4,'#009944'); bg.addColorStop(1,'#004422');
        ctx.fillStyle=bg; ctx.fill();
        // 座舱
        ctx.beginPath(); ctx.ellipse(0,-this.h/6,3,5,0,0,Math.PI*2);
        ctx.fillStyle='rgba(180,255,220,0.85)'; ctx.fill();
        // HP条
        const bw=this.w,bh=3,bx=-this.w/2,by=-this.h/2-7;
        ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(bx,by,bw,bh);
        ctx.fillStyle='#00ff88'; ctx.fillRect(bx,by,bw*(this.hp/this.maxHp),bh);
        ctx.restore(); ctx.globalAlpha=1;
    }
}

// ─────────────────────────────────────────────────────────────
//  PLAYER
// ─────────────────────────────────────────────────────────────
class Player {
    constructor(){
        this.w=34; this.h=42;                 // 缩小 (~70%)
        this.x=canvas.width/2-this.w/2;
        this.y=canvas.height+80;              // 从屏幕外飞入
        this.targetY=canvas.height-110;
        this.enterAnim=70;                    // 入场动画
        this.spd=5;                           // 速度加快
        this.hp=30; this.maxHp=30;            // 30条命
        this.shield=0; this.maxShield=100;
        this.cooldown=0; this.fireRate=8;     // 发射更快
        this.speedBoost=false; this.spdTimer=0;
        this.invincible=false; this.invTimer=0;
        this.supports=3;                      // 默认3次支援
        this.hitFlash=0; this.thrusterT=0; this.alive=true;
        this.alpha=0;                         // 入场淡入
        // ── 火力升级系统（0-6级）──
        this.fireLevel=0;
        this.swarmCooldown=0; this.swarmRate=2;           // Lv.2 极快射速
        this.missileCooldown=0; this.missileInterval=120; // Lv.3/4
        this.laserState='idle'; this.laserTimer=0;        // Lv.5
        this.laserCycleTimer=0; this.laserInterval=300;
        this.laserChargeDur=60; this.laserFireDur=180;
        this.overclockActive=false; this.overclockTimer=0;// Lv.MAX(6)
        this.overclockDur=600; this.overclockPulse=0;
    }
    update(keys){
        if(!this.alive)return;
        // 入场动画
        if(this.enterAnim>0){
            this.enterAnim--;
            this.y=lerp(this.y,this.targetY,0.08);
            this.alpha=Math.min(1,this.alpha+0.04);
            return;
        }
        this.alpha=1;
        let spd=this.speedBoost?this.spd*1.5:this.spd;
        if(this.overclockActive)spd*=2;
        if(keys['ArrowLeft'] ||keys['a']||keys['A'])this.x-=spd;
        if(keys['ArrowRight']||keys['d']||keys['D'])this.x+=spd;
        if(keys['ArrowUp']   ||keys['w']||keys['W'])this.y-=spd;
        if(keys['ArrowDown'] ||keys['s']||keys['S'])this.y+=spd;
        this.x=clamp(this.x,0,canvas.width-this.w);
        this.y=clamp(this.y,0,canvas.height-this.h);
        if(this.cooldown>0)this.cooldown--;
        this.thrusterT+=0.18;
        if(this.spdTimer>0&&--this.spdTimer===0)this.speedBoost=false;
        if(this.invTimer>0&&--this.invTimer===0)this.invincible=false;
        if(this.hitFlash>0)this.hitFlash--;
        if(this.shield>0)this.shield=Math.max(0,this.shield-0.08);
        // 蜂群冷却
        if(this.fireLevel>=2&&this.swarmCooldown>0)this.swarmCooldown--;
        // 导弹冷却
        if(this.fireLevel>=3&&this.missileCooldown>0)this.missileCooldown--;
        // 激光状态机（Lv.5+）
        if(this.fireLevel>=5){
            if(this.laserState==='idle'){
                this.laserCycleTimer++;
                if(this.laserCycleTimer>=this.laserInterval){
                    this.laserCycleTimer=0; this.laserState='charging';
                    this.laserTimer=this.laserChargeDur;
                    this._laserChargeAudio=true; // 通知Game播放充能音效
                }
            } else if(this.laserState==='charging'){
                if(--this.laserTimer<=0){
                    this.laserState='firing'; this.laserTimer=this.laserFireDur;
                    this._laserFireAudio=true;
                }
            } else if(this.laserState==='firing'){
                if(--this.laserTimer<=0)this.laserState='idle';
            }
        }
        // 超频倒计时
        if(this.overclockActive){
            this.overclockPulse++;
            if(--this.overclockTimer<=0)this.overclockActive=false;
        }
    }
    shoot(bullets,audio,enemies){
        if(!this.alive||this.enterAnim>0)return;
        const cx=this.x+this.w/2;
        const effRate=this.overclockActive?Math.max(2,Math.floor(this.fireRate/2)):this.fireRate;
        // ── 主炮 ──
        if(this.cooldown<=0){
            this.cooldown=effRate;
            bullets.push(new Bullet(cx-2,this.y-10,0,-11,1));
            audio.shoot();
            // Lv.1 副炮：左右各一门
            if(this.fireLevel>=1){
                bullets.push(new Bullet(cx-22,this.y-2,0,-10,1,'#00ff44'));
                bullets.push(new Bullet(cx+18, this.y-2,0,-10,1,'#00ff44'));
            }
        }
        // ── Lv.2 蜂群：左右各3发极速散射（独立冷却）──
        if(this.fireLevel>=2){
            const sr=this.overclockActive?1:this.swarmRate;
            if(this.swarmCooldown<=0){
                this.swarmCooldown=sr;
                // 左侧3发
                bullets.push(new Bullet(cx-20,this.y-4,-0.6,-12,0.4,'#ffee00'));
                bullets.push(new Bullet(cx-13,this.y-6,-0.3,-13,0.4,'#ffee00'));
                bullets.push(new Bullet(cx-6, this.y-8,-0.1,-13,0.4,'#ffee00'));
                // 右侧3发
                bullets.push(new Bullet(cx+6, this.y-8, 0.1,-13,0.4,'#ffee00'));
                bullets.push(new Bullet(cx+13,this.y-6, 0.3,-13,0.4,'#ffee00'));
                bullets.push(new Bullet(cx+20,this.y-4, 0.6,-12,0.4,'#ffee00'));
            }
        }
        // ── Lv.3 1发导弹 / Lv.4 2发导弹（独立冷却，Lv.4更快）──
        if(this.fireLevel>=3){
            const mi=this.overclockActive?Math.floor(this.missileInterval/2):this.missileInterval;
            const actualInterval=this.fireLevel>=4?Math.floor(mi*0.65):mi;
            if(this.missileCooldown<=0&&enemies&&enemies.length>0){
                this.missileCooldown=actualInterval;
                bullets.push(new GuidedMissile(cx-3,this.y-10,enemies));
                if(this.fireLevel>=4)bullets.push(new GuidedMissile(cx+3,this.y-10,enemies));
                audio.missileShoot();
            }
        }
    }
    damage(amt,audio){
        if(this.invincible)return false;
        if(this.shield>0){this.shield=Math.max(0,this.shield-amt*35);this.hitFlash=5;audio.hit();return false;}
        this.hp-=amt; this.hitFlash=20; this.invincible=true; this.invTimer=140;
        audio.playerHit();
        if(this.hp<=0){this.alive=false;return true;}
        return false;
    }
    draw(){
        if(!this.alive)return;
        ctx.globalAlpha=this.alpha;
        if(this.invincible&&Math.floor(Date.now()/90)%2===0)ctx.globalAlpha*=0.35;
        ctx.save(); ctx.translate(this.x+this.w/2,this.y+this.h/2);
        // ── 超频光环 ──
        if(this.overclockActive){
            const pulse=0.5+0.5*Math.sin(this.overclockPulse*0.22);
            ctx.save();
            ctx.globalAlpha=0.55+pulse*0.3;
            ctx.strokeStyle='#00ffff'; ctx.lineWidth=2+pulse*2;
            ctx.shadowColor='#00ffff'; ctx.shadowBlur=30+pulse*20;
            ctx.beginPath(); ctx.ellipse(0,0,this.w/2+12+pulse*5,this.h/2+12+pulse*5,0,0,Math.PI*2); ctx.stroke();
            ctx.rotate(-this.overclockPulse*0.07);
            ctx.globalAlpha=0.3+pulse*0.2; ctx.strokeStyle='#ff00ff'; ctx.lineWidth=1.5;
            ctx.setLineDash([7,5]);
            ctx.beginPath(); ctx.ellipse(0,0,this.w/2+20,this.h/2+20,0,0,Math.PI*2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
        ctx.shadowColor=this.hitFlash>0?'#ff4444':'#00f5ff';
        ctx.shadowBlur=this.hitFlash>0?22:14;
        // 推进器
        const eg=0.65+0.35*Math.sin(this.thrusterT);
        [-11,11].forEach(ex=>{
            const eLen=12+eg*18, eW=6+eg*4;
            const tg=ctx.createLinearGradient(ex,this.h/2,ex,this.h/2+eLen);
            tg.addColorStop(0,`rgba(0,245,255,${0.85*eg})`); tg.addColorStop(1,'transparent');
            ctx.fillStyle=tg; ctx.beginPath(); ctx.ellipse(ex,this.h/2+eLen/2,eW/2,eLen/2,0,0,Math.PI*2); ctx.fill();
        });
        // 翼尖
        [[-1,-this.w/2],[1,this.w/2]].forEach(([s,wx])=>{
            ctx.beginPath(); ctx.moveTo(wx,this.h/4); ctx.lineTo(wx+s*7,this.h/2); ctx.lineTo(wx-s*1,this.h/2); ctx.closePath();
            ctx.fillStyle='#003355'; ctx.fill();
        });
        // 机身
        ctx.beginPath();
        ctx.moveTo(0,-this.h/2); ctx.lineTo(-this.w/2+3,this.h/4);
        ctx.lineTo(-this.w/2,this.h/2); ctx.lineTo(-this.w/2+7,this.h/2-3);
        ctx.lineTo(0,this.h/2-14); ctx.lineTo(this.w/2-7,this.h/2-3);
        ctx.lineTo(this.w/2,this.h/2); ctx.lineTo(this.w/2-3,this.h/4); ctx.closePath();
        const bg=ctx.createLinearGradient(0,-this.h/2,0,this.h/2);
        bg.addColorStop(0,'#00e5ee'); bg.addColorStop(0.4,'#007799'); bg.addColorStop(1,'#003355');
        ctx.fillStyle=bg; ctx.fill();
        // 翼面纹
        [[-1,-this.w/2+3],[1,this.w/2-3]].forEach(([s,wx])=>{
            ctx.beginPath(); ctx.moveTo(wx,this.h/4); ctx.lineTo(s*6,0); ctx.lineTo(s*6,this.h/4); ctx.closePath();
            ctx.fillStyle='rgba(0,245,255,0.18)'; ctx.fill();
        });
        // 座舱
        const cg=ctx.createRadialGradient(-2,-this.h/4-1,0,0,-this.h/4,8);
        cg.addColorStop(0,'#b0ffff'); cg.addColorStop(1,'#001e33');
        ctx.fillStyle=cg; ctx.beginPath(); ctx.ellipse(0,-this.h/4,4.5,7.5,0,0,Math.PI*2); ctx.fill();
        // 武器舱
        ctx.fillStyle='#5522cc';
        ctx.fillRect(-this.w/2+1,-3,6,10); ctx.fillRect(this.w/2-7,-3,6,10);
        ctx.fillStyle='#00f5ff';
        ctx.fillRect(-this.w/2+2,-4,3,3); ctx.fillRect(this.w/2-5,-4,3,3);
        // 护盾圈
        if(this.shield>0){
            const sa=(this.shield/this.maxShield)*0.45;
            ctx.strokeStyle=`rgba(123,47,255,${sa+0.15})`; ctx.lineWidth=2;
            ctx.shadowColor='#7b2fff'; ctx.shadowBlur=18;
            ctx.beginPath(); ctx.ellipse(0,0,this.w/2+7,this.h/2+7,0,0,Math.PI*2); ctx.stroke();
        }
        ctx.restore(); ctx.globalAlpha=1;
    }
}

// ─────────────────────────────────────────────────────────────
//  ENEMY
// ─────────────────────────────────────────────────────────────
class Enemy {
    constructor(x,y,type){
        this.x=x; this.y=y; this.type=type;
        this.active=true; this.hitFlash=0; this.t=0; this.bulletT=0; this.vx=0;
        this.spawnQueue=[]; this.hasEntered=false; this.entryFlash=0; this.alpha=0;
        this._setup();
    }
    _setup(){
        switch(this.type){
            // 基础三种（缩小约70%，速度×0.6）
            case 'scout':
                this.w=23;this.h=21;this.hp=this.maxHp=1;
                this.vy=rand(1.8,3.5);this.score=100;this.color='#ff3366';this.fireRate=130;this.dmg=1;break;
            case 'fighter':
                this.w=31;this.h=30;this.hp=this.maxHp=4;
                this.vy=rand(1.2,2.0);this.score=260;this.color='#ff6600';this.fireRate=70;this.dmg=1;break;
            case 'cruiser':
                this.w=44;this.h=42;this.hp=this.maxHp=10;
                this.vy=rand(0.7,1.3);this.score=520;this.color='#cc0000';this.fireRate=52;this.dmg=2;break;
            // 新增四种（同比缩小，速度×0.6）
            case 'interceptor':
                this.w=20;this.h=19;this.hp=this.maxHp=2;
                this.vy=rand(2.8,4.5);this.score=150;this.color='#ff00cc';
                this.fireRate=40;this.dmg=1;
                this.sweepDir=Math.random()<0.5?1:-1;this.sweepAmp=rand(2,3.5);break;
            case 'bomber':
                this.w=52;this.h=43;this.hp=this.maxHp=16;
                this.vy=rand(0.5,0.9);this.score=450;this.color='#886600';this.fireRate=60;this.dmg=2;break;
            case 'elite':
                this.w=36;this.h=35;this.hp=this.maxHp=6;
                this.vy=rand(1.1,1.8);this.score=380;this.color='#ff8800';this.fireRate=45;this.dmg=1;break;
            case 'carrier':
                this.w=65;this.h=54;this.hp=this.maxHp=22;
                this.vy=rand(0.4,0.7);this.score=900;this.color='#440088';
                this.fireRate=38;this.dmg=2;this.nextSpawn=200;break;
            case 'boss':
                this.w=100;this.h=79;this.hp=this.maxHp=150;
                this.vy=0.5;this.score=7000;this.color='#ff0000';
                this.fireRate=36;this.dmg=3;
                this.entering=true;this.targetY=80;this.phase=1;break;
        }
    }
    update(eBullets,player,level,diff=1){
        if(!this.active)return;
        this.hitFlash=Math.max(0,this.hitFlash-1); this.t++;
        // 入场动画：alpha淡入 + 入场粒子
        if(!this.hasEntered&&this.y+this.h>0){
            this.hasEntered=true; this.entryFlash=12; this.alpha=0;
        }
        if(this.entryFlash>0){ this.entryFlash--; this.alpha=Math.min(1,this.alpha+0.12); }
        else { this.alpha=1; }
        this.type==='boss'?this._updateBoss(eBullets,player):this._updateNormal(eBullets,player,level,diff);
        if(this.y>canvas.height+80)this.active=false;
    }
    _updateNormal(eBullets,player,level,diff=1){
        switch(this.type){
            case 'scout':       this.x+=Math.sin(this.t*0.055)*1.5; break;
            case 'fighter':
                if(this.y>100){const dx=player.x+player.w/2-(this.x+this.w/2); this.vx=lerp(this.vx,dx*0.009,0.04);} break;
            case 'interceptor':
                this.vx=this.sweepDir*this.sweepAmp*(1+Math.sin(this.t*0.08));
                if(this.x<=0||this.x>=canvas.width-this.w)this.sweepDir*=-1; break;
            case 'bomber':      this.x+=Math.sin(this.t*0.02)*0.5; break;
            case 'elite':
                if(this.y>70&&this.y<canvas.height*0.55){const dx=player.x+player.w/2-(this.x+this.w/2); this.vx=lerp(this.vx,dx*0.018,0.055);} break;
            case 'carrier':
                this.x+=Math.sin(this.t*0.015)*1.0;
                if(this.t>=this.nextSpawn){
                    this.nextSpawn=this.t+randInt(160,230);
                    this.spawnQueue.push({type:'scout',x:this.x+this.w*0.25});
                    this.spawnQueue.push({type:'scout',x:this.x+this.w*0.65});
                } break;
        }
        this.x+=this.vx; this.y+=this.vy;
        this.x=clamp(this.x,0,canvas.width-this.w);
        this.bulletT++;
        // 难度乘数：普通×1.0 困难×0.58 地狱×0.32
        const diffFireMult=[1.0,0.58,0.32][diff-1];
        const diffFloor=[28,15,8][diff-1];
        const rate=Math.max(diffFloor,Math.floor((this.fireRate-level*5)*diffFireMult));
        if(this.bulletT>=rate){this.bulletT=0;this._shoot(eBullets,player);}
    }
    _updateBoss(eBullets,player){
        if(this.entering){
            this.x=lerp(this.x,canvas.width/2-this.w/2,0.04);
            this.y=lerp(this.y,this.targetY,0.04);
            if(Math.abs(this.y-this.targetY)<1.5)this.entering=false;
        } else {
            const seg=Math.floor(this.t/220)%4;
            const targets=[25,canvas.width-this.w-25,canvas.width/2-this.w/2,player.x-this.w/2+player.w/2];
            this.x=lerp(this.x,clamp(targets[seg],0,canvas.width-this.w),0.014);
        }
        if(this.hp<=this.maxHp*0.5&&this.phase===1){this.phase=2;this.fireRate=22;}
        if(this.hp<=this.maxHp*0.25&&this.phase===2){this.phase=3;this.fireRate=13;}
        this.bulletT++;
        if(this.bulletT>=this.fireRate){this.bulletT=0;this._shootBoss(eBullets,player);}
    }
    _shoot(eBullets,player){
        const cx=this.x+this.w/2, cy=this.y+this.h;
        switch(this.type){
            case 'scout':    eBullets.push(new EnemyBullet(cx-5,cy,0,4.0,this.dmg)); break;
            case 'fighter':{
                const dx=player.x+player.w/2-cx, dy=player.y-cy, d=Math.sqrt(dx*dx+dy*dy)||1;
                eBullets.push(new EnemyBullet(cx-5,cy,dx/d*4.5,dy/d*4.5,this.dmg)); break;
            }
            case 'cruiser':  [-2.5,0,2.5].forEach(ox=>eBullets.push(new EnemyBullet(cx-5,cy,ox,3.5,this.dmg))); break;
            case 'interceptor':{
                const dx=player.x+player.w/2-cx, dy=player.y-cy, d=Math.sqrt(dx*dx+dy*dy)||1;
                eBullets.push(new EnemyBullet(cx,cy,dx/d*5-0.8,dy/d*5,this.dmg));
                eBullets.push(new EnemyBullet(cx,cy,dx/d*5+0.8,dy/d*5,this.dmg)); break;
            }
            case 'bomber':   for(let i=-2;i<=2;i++) eBullets.push(new EnemyBullet(cx+i*12,cy,i*1.0,rand(2,3.5),this.dmg,'cluster')); break;
            case 'elite':{
                const dx=player.x+player.w/2-cx, dy=player.y-cy, d=Math.sqrt(dx*dx+dy*dy)||1;
                [-7,7].forEach(ox=>eBullets.push(new EnemyBullet(cx+ox,cy,dx/d*5,dy/d*5,this.dmg))); break;
            }
            case 'carrier':  [-2,-1,0,1,2].forEach(i=>eBullets.push(new EnemyBullet(cx-5,cy,i*2,4.0,this.dmg))); break;
        }
    }
    _shootBoss(eBullets,player){
        const cx=this.x+this.w/2, cy=this.y+this.h;
        if(this.phase===1){
            for(let i=-2;i<=2;i++)eBullets.push(new EnemyBullet(cx-5,cy,i*1.8,5.0,this.dmg,'boss'));
        } else if(this.phase===2){
            const dx=player.x+player.w/2-cx, dy=player.y-cy, base=Math.atan2(dy,dx);
            for(let i=-2;i<=2;i++){const a=base+i*0.22; eBullets.push(new EnemyBullet(cx,cy,Math.cos(a)*6,Math.sin(a)*6,this.dmg,'boss'));}
        } else {
            const cnt=10;
            for(let i=0;i<cnt;i++){const a=(i/cnt)*Math.PI*2+this.t*0.04; eBullets.push(new EnemyBullet(cx,cy,Math.cos(a)*5.5,Math.sin(a)*5.5,this.dmg,'boss'));}
            const dx=player.x+player.w/2-cx, dy=player.y-cy, d=Math.sqrt(dx*dx+dy*dy)||1;
            eBullets.push(new EnemyBullet(cx,cy,dx/d*8,dy/d*8,this.dmg*2,'boss'));
        }
    }
    hit(amt){ this.hp-=amt; this.hitFlash=10; if(this.hp<=0){this.active=false;return true;} return false; }
    draw(){
        if(!this.active)return;
        ctx.globalAlpha=this.alpha;
        // 入场闪光
        if(this.entryFlash>0){
            ctx.save(); ctx.globalAlpha=this.entryFlash/12*0.6;
            ctx.fillStyle='#ffffff';
            ctx.fillRect(this.x-4,this.y-4,this.w+8,this.h+8);
            ctx.restore(); ctx.globalAlpha=this.alpha;
        }
        ctx.save(); ctx.translate(this.x+this.w/2,this.y+this.h/2);
        ctx.shadowColor=this.hitFlash>0?'#ffffff':this.color;
        ctx.shadowBlur=this.hitFlash>0?26:8;
        this._drawShape(ctx);
        if(this.maxHp>1&&this.type!=='boss')this._drawHpBar();
        ctx.restore(); ctx.globalAlpha=1;
    }
    _drawShape(ctx){
        const W=this.w,H=this.h;
        switch(this.type){
            case 'scout':{
                ctx.beginPath(); ctx.moveTo(0,-H/2); ctx.lineTo(-W/2,H/3); ctx.lineTo(-W/4,H/5); ctx.lineTo(0,H/2); ctx.lineTo(W/4,H/5); ctx.lineTo(W/2,H/3); ctx.closePath();
                const g=ctx.createLinearGradient(0,-H/2,0,H/2); g.addColorStop(0,'#ff3366'); g.addColorStop(1,'#550022'); ctx.fillStyle=g; ctx.fill();
                ctx.fillStyle='rgba(255,100,50,0.9)'; ctx.beginPath(); ctx.ellipse(0,H/2-2,2,4,0,0,Math.PI*2); ctx.fill(); break;
            }
            case 'fighter':{
                ctx.beginPath(); ctx.moveTo(0,-H/2); ctx.lineTo(-W/2,H/5); ctx.lineTo(-W/3,H/2); ctx.lineTo(0,H/4); ctx.lineTo(W/3,H/2); ctx.lineTo(W/2,H/5); ctx.closePath();
                const g=ctx.createLinearGradient(0,-H/2,0,H/2); g.addColorStop(0,'#ff6600'); g.addColorStop(0.5,'#cc3300'); g.addColorStop(1,'#550000'); ctx.fillStyle=g; ctx.fill();
                ctx.beginPath(); ctx.ellipse(0,-H/6,4,6,0,0,Math.PI*2); ctx.fillStyle='rgba(255,200,80,0.9)'; ctx.fill(); break;
            }
            case 'cruiser':{
                ctx.beginPath(); ctx.moveTo(0,-H/2); ctx.lineTo(-W/4,-H/4); ctx.lineTo(-W/2,H/5); ctx.lineTo(-W/3,H/2); ctx.lineTo(W/3,H/2); ctx.lineTo(W/2,H/5); ctx.lineTo(W/4,-H/4); ctx.closePath();
                const g=ctx.createLinearGradient(0,-H/2,0,H/2); g.addColorStop(0,'#aa0000'); g.addColorStop(0.5,'#770000'); g.addColorStop(1,'#440000'); ctx.fillStyle=g; ctx.fill();
                ctx.strokeStyle='rgba(255,60,60,0.3)'; ctx.lineWidth=1.2;
                ctx.beginPath(); ctx.moveTo(-W/5,-H/5); ctx.lineTo(-W/5,H/5); ctx.moveTo(W/5,-H/5); ctx.lineTo(W/5,H/5); ctx.stroke();
                ctx.fillStyle='#550000'; ctx.fillRect(-W/2,H/10,9,6); ctx.fillRect(W/2-9,H/10,9,6); break;
            }
            case 'interceptor':{
                ctx.beginPath(); ctx.moveTo(0,-H/2); ctx.lineTo(-W/2,H/4); ctx.lineTo(-W/3,H/2); ctx.lineTo(0,H/3); ctx.lineTo(W/3,H/2); ctx.lineTo(W/2,H/4); ctx.closePath();
                const g=ctx.createLinearGradient(0,-H/2,0,H/2); g.addColorStop(0,'#ff00cc'); g.addColorStop(1,'#440044'); ctx.fillStyle=g; ctx.fill();
                ctx.fillStyle='#cc0099'; ctx.fillRect(-W/2-3,0,6,3); ctx.fillRect(W/2-3,0,6,3); break;
            }
            case 'bomber':{
                ctx.beginPath(); ctx.moveTo(0,-H/2); ctx.lineTo(-W/3,-H/4); ctx.lineTo(-W/2,H/4); ctx.lineTo(-W/3,H/2); ctx.lineTo(W/3,H/2); ctx.lineTo(W/2,H/4); ctx.lineTo(W/3,-H/4); ctx.closePath();
                const g=ctx.createLinearGradient(0,-H/2,0,H/2); g.addColorStop(0,'#aa7700'); g.addColorStop(0.5,'#775500'); g.addColorStop(1,'#442200'); ctx.fillStyle=g; ctx.fill();
                ctx.fillStyle='#332200'; ctx.fillRect(-W/4,-H/8,W/2,H/4);
                ctx.strokeStyle='rgba(255,180,0,0.35)'; ctx.lineWidth=1.2;
                ctx.beginPath(); ctx.moveTo(-W/4,-H/8); ctx.lineTo(-W/4,H/8); ctx.moveTo(0,-H/8); ctx.lineTo(0,H/8); ctx.moveTo(W/4,-H/8); ctx.lineTo(W/4,H/8); ctx.stroke();
                [-W/3,-W/8,W/8,W/3].forEach(ex=>{ ctx.fillStyle='rgba(255,140,0,0.8)'; ctx.beginPath(); ctx.ellipse(ex,H/2-2,3,5,0,0,Math.PI*2); ctx.fill(); }); break;
            }
            case 'elite':{
                ctx.beginPath(); ctx.moveTo(0,-H/2); ctx.lineTo(-W/2,H/4); ctx.lineTo(-W/3,H/2); ctx.lineTo(0,H/3); ctx.lineTo(W/3,H/2); ctx.lineTo(W/2,H/4); ctx.closePath();
                const g=ctx.createLinearGradient(0,-H/2,0,H/2); g.addColorStop(0,'#ffaa00'); g.addColorStop(0.5,'#cc5500'); g.addColorStop(1,'#442200'); ctx.fillStyle=g; ctx.fill();
                ctx.fillStyle='#884400'; ctx.fillRect(-W/2+2,-H/5,5,H/3); ctx.fillRect(W/2-7,-H/5,5,H/3);
                const cg=ctx.createRadialGradient(0,-H/6,0,0,-H/6,6); cg.addColorStop(0,'#ffee00'); cg.addColorStop(1,'transparent');
                ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(0,-H/6,6,0,Math.PI*2); ctx.fill(); break;
            }
            case 'carrier':{
                ctx.beginPath();
                for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2-Math.PI/2; const r=i%2===0?W/2:W*0.38; i===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r*0.7):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r*0.7);}
                ctx.closePath();
                const g=ctx.createLinearGradient(0,-H/2,0,H/2); g.addColorStop(0,'#6600aa'); g.addColorStop(0.5,'#440077'); g.addColorStop(1,'#220044'); ctx.fillStyle=g; ctx.fill();
                ctx.strokeStyle='rgba(180,100,255,0.28)'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(0,0,W/4,0,Math.PI*2); ctx.stroke();
                const cg2=ctx.createRadialGradient(0,0,0,0,0,W/5); cg2.addColorStop(0,'#cc88ff'); cg2.addColorStop(1,'transparent');
                ctx.fillStyle=cg2; ctx.beginPath(); ctx.arc(0,0,W/5,0,Math.PI*2); ctx.fill();
                [-W/3,0,W/3].forEach(ex=>{ ctx.fillStyle='rgba(180,80,255,0.8)'; ctx.beginPath(); ctx.ellipse(ex,H*0.38,4,5,0,0,Math.PI*2); ctx.fill(); }); break;
            }
            case 'boss': this._drawBossBody(ctx); break;
        }
    }
    _drawBossBody(ctx){
        const W=this.w,H=this.h,p=this.phase;
        ctx.beginPath(); ctx.moveTo(0,-H/2); ctx.lineTo(-W/4,-H/4); ctx.lineTo(-W/2,H/8); ctx.lineTo(-W/3,H/2); ctx.lineTo(0,H/3); ctx.lineTo(W/3,H/2); ctx.lineTo(W/2,H/8); ctx.lineTo(W/4,-H/4); ctx.closePath();
        const bg=ctx.createLinearGradient(0,-H/2,0,H/2);
        bg.addColorStop(0,p>=3?'#ff6600':p>=2?'#ff2200':'#cc0000'); bg.addColorStop(1,p>=3?'#882200':'#440000');
        ctx.fillStyle=bg; ctx.fill();
        [[-1,-W/2],[1,W/2]].forEach(([s,wx])=>{
            ctx.beginPath(); ctx.moveTo(wx,H/8); ctx.lineTo(wx+s*22,-H/4); ctx.lineTo(wx+s*22,H/4); ctx.lineTo(wx,H/3); ctx.closePath();
            ctx.fillStyle='#660000'; ctx.fill();
        });
        ctx.strokeStyle=`rgba(255,${p>=3?120:40},0,0.35)`; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(-W/5,-H/5); ctx.lineTo(-W/5,H/4); ctx.moveTo(W/5,-H/5); ctx.lineTo(W/5,H/4); ctx.stroke();
        const cc=p>=3?'#fff':p>=2?'#ffaa00':'#ff5500';
        const cg=ctx.createRadialGradient(0,-H/5,0,0,-H/5,18); cg.addColorStop(0,cc); cg.addColorStop(0.5,cc+'88'); cg.addColorStop(1,'transparent');
        ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(0,-H/5,18,0,Math.PI*2); ctx.fill();
        const hc=p>=2?'#ff6600':'#ff0000';
        [-W/3,0,W/3].forEach(hx=>{ ctx.shadowColor=hc; ctx.shadowBlur=10; ctx.fillStyle=hc; ctx.beginPath(); ctx.arc(hx,H/3,6,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(hx,H/3,2,0,Math.PI*2); ctx.fill(); });
    }
    _drawHpBar(){
        const bw=this.w,bh=3,bx=-this.w/2,by=-this.h/2-8;
        ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(bx,by,bw,bh);
        const pct=this.hp/this.maxHp;
        ctx.fillStyle=pct>0.5?'#00ff88':pct>0.25?'#ffbe0b':'#ff3366'; ctx.fillRect(bx,by,bw*pct,bh);
    }
}

// ─────────────────────────────────────────────────────────────
//  GAME
// ─────────────────────────────────────────────────────────────
class Game {
    constructor(){
        this.state='start'; this.score=0; this.level=1; this.kills=0; this.difficulty=1;
        this.player=new Player();
        this.bullets=[]; this.eBullets=[]; this.enemies=[];
        this.particles=[]; this.powerups=[]; this.allies=[];
        this.stars=Array.from({length:200},()=>new Star(true));
        this.audio=new AudioEngine(); this.keys={};
        this.spawnT=0; this.spawnRate=45;     // 基础生成间隔
        this.levelT=0; this.levelDur=2400;    // 关卡更长
        this.bossActive=false; this.bossSpawned=false;
        this.nebulaT=0; this.frame=0;
        this.fpDropCooldown=0; // 火力道具冷却（5s）
        // 屏幕特效
        this.screenShake=0;
        this.screenFlashAlpha=0; this.screenFlashColor='#ff0000';
        this.levelUpAnim=0;
        this._ui(); this._input(); this._loop();
    }

    _ui(){
        const $=id=>document.getElementById(id);
        $('startBtn').onclick=()=>this._start();
        $('resumeBtn').onclick=()=>this._resume();
        $('restartFromPauseBtn').onclick=()=>{this._resume();this._reset();this._start();};
        $('playAgainBtn').onclick=()=>{$('gameOverScreen').classList.add('hidden');this._reset();this._start();};
        $('mainMenuBtn').onclick=()=>{
            $('gameOverScreen').classList.add('hidden');$('hud').classList.add('hidden');
            $('startScreen').classList.remove('hidden');$('startScreen').classList.add('active');
        };
        document.querySelectorAll('.diff-btn').forEach(b=>b.onclick=e=>{
            document.querySelectorAll('.diff-btn').forEach(x=>x.classList.remove('active'));
            e.target.classList.add('active'); this.difficulty=+e.target.dataset.diff;
        });
    }

    _input(){
        window.addEventListener('keydown',e=>{
            this.keys[e.key]=true;
            if(e.key===' '){e.preventDefault();}
            if((e.key==='p'||e.key==='P')&&this.state==='playing')this._pause();
            else if((e.key==='p'||e.key==='P')&&this.state==='paused')this._resume();
            if((e.key==='b'||e.key==='B')&&this.state==='playing'&&this.player.supports>0)this._callSupport();
        });
        window.addEventListener('keyup',e=>{this.keys[e.key]=false;});
    }

    _start(){
        this.audio.resume(); this.state='playing';
        const ss=document.getElementById('startScreen'); ss.classList.remove('active'); ss.classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        this._hud();
    }
    _pause(){ this.state='paused'; document.getElementById('pauseScreen').classList.remove('hidden'); }
    _resume(){ this.state='playing'; document.getElementById('pauseScreen').classList.add('hidden'); }

    _reset(){
        this.score=0; this.level=1; this.kills=0;
        this.player=new Player();
        this.bullets=[]; this.eBullets=[]; this.enemies=[]; this.particles=[]; this.powerups=[]; this.allies=[];
        this.spawnT=0; this.spawnRate=45; this.levelT=0;
        this.bossActive=false; this.bossSpawned=false;
        this.fpDropCooldown=0;
        this.screenShake=0; this.screenFlashAlpha=0; this.levelUpAnim=0;
    }

    _gameOver(){
        this.state='gameOver';
        document.getElementById('finalScore').textContent=this.score.toLocaleString();
        document.getElementById('finalLevel').textContent=this.level;
        document.getElementById('finalKills').textContent=this.kills;
        // 游戏结束：屏幕红闪 + 震动
        this._triggerShake(14); this._triggerFlash('#ff0000',0.5);
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }

    _hud(){
        document.getElementById('scoreDisplay').textContent=this.score.toLocaleString();
        document.getElementById('levelDisplay').textContent=this.level;
        document.getElementById('supportDisplay').textContent=this.player.supports;
        const hpEl=document.getElementById('livesDisplay');
        hpEl.textContent=this.player.hp+' / '+this.player.maxHp;
        hpEl.style.color=this.player.hp<=8?'#ff3366':this.player.hp<=15?'#ffbe0b':'#00f5ff';
        document.getElementById('shieldBar').style.width=(this.player.shield/this.player.maxShield*100)+'%';
        const pu=document.getElementById('powerupDisplay');
        const fpNames=['','副炮','蜂群散射','追踪导弹','双导弹','激光炮','超频MAX'];
        const fpColors=['','#00ff44','#ffee00','#ff8800','#ff2200','#cc00ff','#00ffff'];
        if(this.player.overclockActive){
            pu.classList.remove('hidden');
            pu.style.color='#00ffff';
            pu.textContent=`✦ 超频 MAX  ${Math.ceil(this.player.overclockTimer/60)}s`;
        } else if(this.player.speedBoost){
            pu.classList.remove('hidden'); pu.style.color='#00f5ff';
            pu.textContent=`▶ 加速  ${Math.ceil(this.player.spdTimer/60)}s`;
        } else if(this.player.fireLevel>0){
            pu.classList.remove('hidden');
            pu.style.color=fpColors[Math.min(this.player.fireLevel,6)];
            pu.textContent=`⬡ 火力 Lv.${this.player.fireLevel} ${fpNames[Math.min(this.player.fireLevel,6)]}`;
        } else {
            pu.classList.add('hidden'); pu.style.color='';
        }
    }

    // ── 屏幕特效 ──
    _triggerShake(strength){ this.screenShake=Math.max(this.screenShake,strength); }
    _triggerFlash(color,alpha){ this.screenFlashColor=color; this.screenFlashAlpha=Math.max(this.screenFlashAlpha,alpha); }

    // ── 呼叫支援 ──
    _callSupport(){
        if(this.player.supports<=0)return;
        this.player.supports--;
        this.allies=[];
        const L=new Ally(-1), R=new Ally(1);
        L.x=this.player.x-70; L.y=this.player.y+10;
        R.x=this.player.x+this.player.w+30; R.y=this.player.y+10;
        this.allies.push(L,R);
        this.audio.support();
        this._triggerFlash('#00ff88',0.18);
        this._showNotif('✈  支援到位  ✈','#00ff88');
        this._hud();
    }

    _showNotif(text,color){
        const el=document.createElement('div');
        el.style.cssText=`position:absolute;top:42%;left:50%;transform:translate(-50%,-50%);
            font-family:'Orbitron',monospace;font-size:20px;font-weight:900;color:${color};
            text-shadow:0 0 18px ${color}99;pointer-events:none;z-index:9;letter-spacing:3px;opacity:1;`;
        el.textContent=text;
        document.getElementById('game-container').appendChild(el);
        let op=1;
        const fade=setInterval(()=>{op-=0.025;el.style.opacity=op;if(op<=0){clearInterval(fade);el.remove();}},40);
    }

    _spawnEnemy(){
        if(this.bossActive)return;
        const x=rand(20,canvas.width-100);
        const r=Math.random(); let type;
        if(this.level<2)       type=r<0.72?'scout':r<0.90?'fighter':'interceptor';
        else if(this.level<3)  type=r<0.32?'scout':r<0.58?'fighter':r<0.72?'interceptor':r<0.88?'cruiser':'elite';
        else if(this.level<5)  type=r<0.22?'scout':r<0.40?'fighter':r<0.54?'interceptor':r<0.68?'cruiser':r<0.82?'elite':'bomber';
        else                   type=r<0.16?'scout':r<0.30?'fighter':r<0.42?'interceptor':r<0.54?'cruiser':r<0.66?'elite':r<0.78?'bomber':'carrier';
        const e=new Enemy(x,-70,type);
        this.enemies.push(e);
        // 入场粒子（刚生成时在顶部闪烁）
        explode(x+e.w/2,-5,'spawn',this.particles);
    }

    _spawnBoss(){
        this.bossSpawned=true; this.bossActive=true;
        this.enemies=[]; this.eBullets=[]; // 清空残余敌机和子弹
        this.enemies.push(new Enemy(canvas.width/2-50,-130,'boss'));
        this.audio.bossWarn();
        this._triggerShake(12); this._triggerFlash('#ff0000',0.35);
        // Boss 警告文字
        const w=document.createElement('div');
        w.style.cssText=`position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);
            font-family:'Orbitron',monospace;font-size:24px;font-weight:900;color:#ff0000;
            text-shadow:0 0 28px rgba(255,0,0,0.9);pointer-events:none;z-index:9;letter-spacing:3px;`;
        w.textContent='⚠  BOSS  APPROACHING  ⚠';
        document.getElementById('game-container').appendChild(w);
        let op=0,show=true;
        const blink=setInterval(()=>{w.style.opacity=show?'1':'0';show=!show;op++;if(op>12){clearInterval(blink);w.remove();}},200);
    }

    _spawnPowerup(x,y){
        if(this.powerups.length>=3)return; // 最多3个同屏
        const p=this.player;
        // 火力道具：20%爆率，需冷却，场上不重复
        if(this.fpDropCooldown<=0&&Math.random()<0.20){
            const nextLv=p.fireLevel+1; // 1~6（6=MAX超频）
            if(nextLv<=6&&!this.powerups.some(pu=>pu.type==='FIREPOWER')){
                this.powerups.push(new Powerup(x,y,'FIREPOWER',nextLv));
                return;
            }
        }
        // 其余道具（35%概率）
        if(Math.random()>0.35)return;
        let type;
        const r=Math.random();
        if(p.hp<p.maxHp-5&&r<0.30)type='HEALTH';
        else if(p.supports<3&&r<0.28)type='SUPPORT';
        else{const baseTypes=['SHIELD','SUPPORT','HEALTH','SPEED'];type=baseTypes[randInt(0,baseTypes.length-1)];}
        if(this.powerups.some(pu=>pu.type===type))return; // 同类型只存一个
        this.powerups.push(new Powerup(x,y,type));
    }

    _applyPowerup(type){
        switch(type){
            case 'SHIELD':  this.player.shield=this.player.maxShield; break;
            case 'SUPPORT': this.player.supports=Math.min(this.player.supports+1,5); break;
            case 'HEALTH':  this.player.hp=Math.min(this.player.hp+3,this.player.maxHp); break;
            case 'SPEED':   this.player.speedBoost=true; this.player.spdTimer=360; break;
            case 'FIREPOWER': {
                const p=this.player, nextLv=p.fireLevel+1;
                this.fpDropCooldown=300; // 5秒冷却
                if(nextLv<=5){
                    p.fireLevel=nextLv;
                    const fpNames=['','副炮','蜂群散射','追踪导弹','双导弹','激光炮'];
                    const fpColors=['','#00ff44','#ffee00','#ff8800','#ff2200','#cc00ff'];
                    this._showNotif(`🔥 火力升级 Lv.${nextLv} ${fpNames[nextLv]}`,fpColors[nextLv]);
                    this.audio.powerup();
                    this._triggerFlash('#ffbe0b',0.12);
                } else {
                    // Lv.6 MAX：激活/续期超频
                    if(p.fireLevel<6)p.fireLevel=6;
                    p.overclockActive=true;
                    p.overclockTimer=p.overclockDur;
                    this._triggerFlash('#00ffff',0.5);
                    this._triggerShake(12);
                    this.audio.overclock();
                    this._showNotif('⚡ 超频 MAX ⚡','#00ffff');
                }
                this._hud(); return;
            }
        }
        this.audio.powerup(); this._triggerFlash('#ffbe0b',0.12); this._hud();
    }

    _levelUp(){
        this.level++; this.bossSpawned=false; this.bossActive=false; this.levelT=0;
        this.spawnRate=Math.max(14,45-this.level*5);
        this.audio.levelUp();
        this._triggerShake(8); this._triggerFlash('#00f5ff',0.28);
        this.levelUpAnim=180; // 升关动画时长
        document.getElementById('levelNotifNum').textContent=this.level;
        const n=document.getElementById('levelUpNotif'); n.classList.remove('hidden');
        setTimeout(()=>n.classList.add('hidden'),2500);
        this._hud();
    }

    // ── UPDATE ──
    _update(){
        if(this.state!=='playing')return;
        this.frame++; this.nebulaT+=0.003;

        // 屏幕特效衰减
        this.screenShake*=0.82;
        this.screenFlashAlpha=Math.max(0,this.screenFlashAlpha-0.025);
        if(this.levelUpAnim>0)this.levelUpAnim--;

        this.stars.forEach(s=>s.update());
        this.player.update(this.keys);

        // ★ 自动攻击（不需要按空格）
        if(this.fpDropCooldown>0)this.fpDropCooldown--;
        this.player.shoot(this.bullets,this.audio,this.enemies);
        if(this.player._laserChargeAudio){this.player._laserChargeAudio=false;this.audio.laserCharge();}
        if(this.player._laserFireAudio){this.player._laserFireAudio=false;this.audio.laserFire();}

        this.levelT++;
        if(!this.bossSpawned&&this.levelT>=this.levelDur)this._spawnBoss();

        if(!this.bossActive){
            this.spawnT++;
            // 难度乘数：普通×1.0 困难×0.55 地狱×0.28
            const diffMult=[1.0,0.55,0.28][this.difficulty-1];
            const spawnInterval=Math.max([12,7,4][this.difficulty-1],Math.floor(this.spawnRate*diffMult));
            if(this.spawnT>=spawnInterval){
                this.spawnT=0;
                this._spawnEnemy();
                // 困难20%、地狱50% 额外同时再生成一架
                if(this.difficulty===3&&Math.random()<0.55)this._spawnEnemy();
                else if(this.difficulty===2&&Math.random()<0.22)this._spawnEnemy();
            }
        }

        // 僚机更新
        this.allies=this.allies.filter(a=>{
            if(!a.active)return false; a.update(this.player,this.bullets); return a.active;
        });

        this.bullets=this.bullets.filter(b=>{
            if(b instanceof GuidedMissile)b.update(this.enemies); else b.update(); return b.active;
        });
        this.eBullets=this.eBullets.filter(b=>{b.update();return b.active;});
        if(this.bullets.length>150)this.bullets=this.bullets.slice(-120);
        // ── 激光穿透伤害 (Lv.5+) ──
        if(this.player.fireLevel>=5&&this.player.laserState==='firing'){
            const pcx=this.player.x+this.player.w/2;
            const bw=this.player.overclockActive?20:10; // MAX时光束宽度翻倍
            const lpf=this.player.overclockActive?1.0:0.5;
            for(const e of this.enemies){
                if(!e.active)continue;
                const ecx=e.x+e.w/2;
                if(ecx>pcx-bw&&ecx<pcx+bw&&e.y+e.h>0){
                    e.hitFlash=Math.max(e.hitFlash,3);
                    if(e.hit(lpf)){
                        const et=e.type==='boss'?'boss':e.type==='cruiser'||e.type==='carrier'||e.type==='bomber'?'large':e.type==='fighter'||e.type==='elite'?'medium':'small';
                        explode(e.x+e.w/2,e.y+e.h/2,et,this.particles);
                        (et==='large'||et==='boss')?this.audio.explodeLarge():this.audio.explodeSmall();
                        this.score+=e.score*this.difficulty; this.kills++;
                        this._spawnPowerup(e.x+e.w/2,e.y+e.h/2); this._hud();
                    }
                }
            }
        }

        // 敌机更新 + 处理母舰生成队列
        let bossAlive=false;
        const newE=[];
        this.enemies=this.enemies.filter(e=>{
            if(!e.active)return false;
            e.update(this.eBullets,this.player,this.level,this.difficulty);
            if(e.type==='boss'&&e.active)bossAlive=true;
            if(e.spawnQueue.length>0){
                e.spawnQueue.forEach(s=>newE.push(new Enemy(s.x,e.y+e.h+5,s.type)));
                e.spawnQueue=[];
            }
            return e.active;
        });
        this.enemies.push(...newE);
        if(this.eBullets.length>250)this.eBullets=this.eBullets.slice(-200);

        if(this.bossActive&&!bossAlive){this.bossActive=false;this._levelUp();}

        // 玩家子弹 vs 敌机
        for(const b of this.bullets){
            if(!b.active)continue;
            for(const e of this.enemies){
                if(!e.active)continue;
                if(hits({x:b.x,y:b.y,w:b.w,h:b.h},{x:e.x,y:e.y,w:e.w,h:e.h})){
                    b.active=false; explode(b.x+2,b.y,'tiny',this.particles); this.audio.hit();
                    if(e.hit(b.dmg)){
                        const et=e.type==='boss'?'boss':e.type==='cruiser'||e.type==='carrier'||e.type==='bomber'?'large':e.type==='fighter'||e.type==='elite'?'medium':'small';
                        explode(e.x+e.w/2,e.y+e.h/2,et,this.particles);
                        (et==='large'||et==='boss')?this.audio.explodeLarge():this.audio.explodeSmall();
                        this.score+=e.score*this.difficulty; this.kills++;
                        this._spawnPowerup(e.x+e.w/2,e.y+e.h/2); this._hud();
                    }
                    break;
                }
            }
        }

        // 敌机子弹 vs 玩家
        const hb={x:this.player.x+7,y:this.player.y+7,w:this.player.w-14,h:this.player.h-14};
        for(const b of this.eBullets){
            if(!b.active)continue;
            if(hits({x:b.x,y:b.y,w:b.w,h:b.h},hb)){
                b.active=false;
                if(this.player.damage(b.dmg,this.audio)){
                    explode(this.player.x+this.player.w/2,this.player.y+this.player.h/2,'large',this.particles);
                    this.audio.explodeLarge(); this._gameOver();
                } else {
                    this._triggerShake(6); this._triggerFlash('#ff0000',0.22);
                }
                this._hud();
            }
        }

        // 敌机子弹 vs 僚机
        for(const b of this.eBullets){
            if(!b.active)continue;
            for(const a of this.allies){
                if(!a.active)continue;
                if(hits({x:b.x,y:b.y,w:b.w,h:b.h},{x:a.x,y:a.y,w:a.w,h:a.h})){
                    b.active=false;
                    if(a.hit(b.dmg)){explode(a.x+a.w/2,a.y+a.h/2,'ally',this.particles);}
                }
            }
        }

        // 敌机体碰撞 vs 玩家
        for(const e of this.enemies){
            if(!e.active)continue;
            if(hits({x:e.x,y:e.y,w:e.w,h:e.h},hb)){
                explode(this.player.x+this.player.w/2,this.player.y+this.player.h/2,'medium',this.particles);
                e.hit(99);
                if(this.player.damage(2,this.audio)){
                    explode(this.player.x+this.player.w/2,this.player.y+this.player.h/2,'large',this.particles);
                    this.audio.explodeLarge(); this._gameOver();
                } else { this._triggerShake(8); this._triggerFlash('#ff4400',0.3); }
                this._hud();
            }
        }

        // 道具
        this.powerups=this.powerups.filter(p=>{
            p.update(); if(!p.active)return false;
            if(hits({x:p.x,y:p.y,w:p.w,h:p.h},{x:this.player.x,y:this.player.y,w:this.player.w,h:this.player.h})){
                this._applyPowerup(p.type); return false;
            }
            return true;
        });

        this.particles=this.particles.filter(p=>p.update());
        if(this.particles.length>700)this.particles=this.particles.slice(-560);
    }

    // ── DRAW ──
    _draw(){
        ctx.clearRect(0,0,canvas.width,canvas.height);

        // 屏幕震动
        const shake=this.screenShake;
        if(shake>0.5){ ctx.save(); ctx.translate((Math.random()-0.5)*shake*2,(Math.random()-0.5)*shake*2); }

        // 太空背景
        const bg=ctx.createLinearGradient(0,0,0,canvas.height);
        bg.addColorStop(0,'#020408'); bg.addColorStop(0.5,'#050c1a'); bg.addColorStop(1,'#040810');
        ctx.fillStyle=bg; ctx.fillRect(0,0,canvas.width,canvas.height);

        // 星云
        ctx.save(); ctx.globalAlpha=0.042;
        [[100+Math.sin(this.nebulaT)*35,250,'#7b2fff',230],
         [530+Math.cos(this.nebulaT*0.7)*28,520,'#00f5ff',210],
         [320,420+Math.sin(this.nebulaT*1.3)*40,'#ff3366',180]].forEach(([nx,ny,nc,nr])=>{
            const ng=ctx.createRadialGradient(nx,ny,0,nx,ny,nr);
            ng.addColorStop(0,nc); ng.addColorStop(1,'transparent');
            ctx.fillStyle=ng; ctx.fillRect(0,0,canvas.width,canvas.height);
        });
        ctx.restore();

        // 升关时屏幕光晕
        if(this.levelUpAnim>0){
            const p=this.levelUpAnim/180;
            ctx.save(); ctx.globalAlpha=p*0.12;
            const lg=ctx.createRadialGradient(canvas.width/2,canvas.height/2,0,canvas.width/2,canvas.height/2,canvas.width*0.7);
            lg.addColorStop(0,'#00f5ff'); lg.addColorStop(1,'transparent');
            ctx.fillStyle=lg; ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.restore();
        }

        this.stars.forEach(s=>s.draw());
        this.particles.forEach(p=>p.draw());
        this.enemies.forEach(e=>e.draw());

        // Boss HP条
        const boss=this.enemies.find(e=>e.type==='boss'&&e.active);
        if(boss)this._drawBossHPBar(boss);

        this.allies.forEach(a=>a.draw());

        // ── 激光炮渲染 (Lv.5+) ──
        if(this.player.fireLevel>=5&&this.player.alive){
            const p=this.player, pcx=p.x+p.w/2;
            const isMAX=p.overclockActive; // MAX超频时光束宽度翻倍
            if(p.laserState==='charging'){
                const prog=1-(p.laserTimer/p.laserChargeDur);
                ctx.save();
                for(let r=0;r<3;r++){
                    const rr=(r+1)*14*prog*(isMAX?1.5:1);
                    ctx.globalAlpha=(1-prog)*0.7;
                    ctx.strokeStyle=isMAX?'#00ffff':'#dd00ff'; ctx.lineWidth=2.5-r*0.7;
                    ctx.shadowColor=isMAX?'#00ffff':'#dd00ff'; ctx.shadowBlur=22;
                    ctx.beginPath(); ctx.arc(pcx,p.y,rr,0,Math.PI*2); ctx.stroke();
                }
                ctx.globalAlpha=0.4+prog*0.6;
                const cg=ctx.createRadialGradient(pcx,p.y,0,pcx,p.y,8+prog*16);
                cg.addColorStop(0,'#ffffff'); cg.addColorStop(0.4,isMAX?'#00ffff':'#ff00ff'); cg.addColorStop(1,'transparent');
                ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(pcx,p.y,8+prog*16,0,Math.PI*2); ctx.fill();
                ctx.restore(); ctx.globalAlpha=1;
            } else if(p.laserState==='firing'){
                const prog=p.laserTimer/p.laserFireDur;
                const pulse=Math.sin(Date.now()*0.04)*2;
                const bw=(isMAX?12:6)+pulse; // MAX时光束宽度翻倍
                const outerW=isMAX?60:30;
                ctx.save();
                ctx.globalAlpha=0.9*prog;
                ctx.shadowColor=isMAX?'#00ffff':'#ff00ff'; ctx.shadowBlur=36;
                const lg=ctx.createLinearGradient(pcx-bw,0,pcx+bw,0);
                lg.addColorStop(0,'transparent'); lg.addColorStop(0.35,isMAX?'#00ccff':'#cc00ff');
                lg.addColorStop(0.5,'#ffffff'); lg.addColorStop(0.65,isMAX?'#00ccff':'#cc00ff'); lg.addColorStop(1,'transparent');
                ctx.fillStyle=lg; ctx.fillRect(pcx-bw,0,bw*2,p.y);
                ctx.globalAlpha=0.22*prog;
                ctx.shadowBlur=55;
                const og=ctx.createLinearGradient(pcx-outerW,0,pcx+outerW,0);
                og.addColorStop(0,'transparent'); og.addColorStop(0.5,isMAX?'#00ffff':'#ff00ff'); og.addColorStop(1,'transparent');
                ctx.fillStyle=og; ctx.fillRect(pcx-outerW,0,outerW*2,p.y);
                ctx.restore(); ctx.globalAlpha=1;
            }
        }

        this.player.draw();
        this.bullets.forEach(b=>b.draw());
        this.eBullets.forEach(b=>b.draw());
        this.powerups.forEach(p=>p.draw());

        // 受击/道具屏幕闪光
        if(this.screenFlashAlpha>0.01){
            ctx.save(); ctx.globalAlpha=this.screenFlashAlpha;
            ctx.fillStyle=this.screenFlashColor;
            ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.restore();
        }

        // ── 超频屏幕染色 ──
        if(this.player.overclockActive){
            const pulse=0.5+0.5*Math.sin(this.frame*0.12);
            ctx.save();
            ctx.globalAlpha=0.05+pulse*0.03;
            ctx.fillStyle='#00ffff'; ctx.fillRect(0,0,canvas.width,canvas.height);
            const vg=ctx.createRadialGradient(canvas.width/2,canvas.height/2,canvas.width*0.32,canvas.width/2,canvas.height/2,canvas.width*0.72);
            vg.addColorStop(0,'transparent'); vg.addColorStop(1,`rgba(0,200,255,${0.15+pulse*0.1})`);
            ctx.globalAlpha=1; ctx.fillStyle=vg; ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.restore();
        }

        // 扫描线
        ctx.save(); ctx.globalAlpha=0.02;
        for(let y=0;y<canvas.height;y+=3){ctx.fillStyle='#000';ctx.fillRect(0,y,canvas.width,1);}
        ctx.restore();

        if(shake>0.5)ctx.restore();
    }

    _drawBossHPBar(boss){
        const bw=canvas.width-40,bh=16,bx=20,by=canvas.height-34,pct=boss.hp/boss.maxHp;
        ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(bx-2,by-2,bw+4,bh+4);
        const bg=ctx.createLinearGradient(bx,0,bx+bw,0);
        bg.addColorStop(0,'#ff0000'); bg.addColorStop(0.5,'#ff5500'); bg.addColorStop(1,'#ffaa00');
        ctx.fillStyle=bg; ctx.fillRect(bx,by,bw*pct,bh);
        ctx.strokeStyle='#ff0000'; ctx.lineWidth=1.5; ctx.strokeRect(bx,by,bw,bh);
        ctx.fillStyle='#fff'; ctx.font='bold 10px "Orbitron",monospace';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(`BOSS  ${boss.hp} / ${boss.maxHp}`,canvas.width/2,by+bh/2);
    }

    _loop(){ const tick=()=>{this._update();this._draw();requestAnimationFrame(tick);}; tick(); }
}

window.addEventListener('load',()=>new Game());
