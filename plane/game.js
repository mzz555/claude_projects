// ============================================================
//  雷霆战机 — Thunder Strike  v4.0
//  640×800 | 30命 | 7种敌机 | 5级火力系统 | 追踪导弹 | 激光炮 | 超频状态
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
canvas.width  = 640;
canvas.height = 800;

// ══════════════════════════════════════════════════════════════════
//  弹珠敌机生成系统 — Marble Enemy Panel
// ══════════════════════════════════════════════════════════════════
const MB_G=0.38,MB_MXSP=34,MB_BW=0.88,MB_BO=0.90,MB_BF=0.82;
const MB_FSP=13.5,MB_TRL=14,MB_GRN='#00ff66',MB_GD='#009944';
const MB_W=700,MB_H=500,MB_TH=255,MB_BH=245,MB_TGH=40;
const MB_TTGY=MB_TH-MB_TGH;    // 215: 上容器目标区y
const MB_BTGY=MB_H-MB_TGH;     // 460: 下容器目标区y
const MB_STPY=MB_TTGY-28;      // 187: 上容器扫描器y
const MB_SBTY=MB_BTGY-28;      // 432: 下容器扫描器y
const MB_OMXT=MB_STPY-14-6;    // 167: 上容器障碍物最大y
const MB_OMXB=MB_SBTY-13-6;    // 413: 下容器障碍物最大y

class MbV2{constructor(x=0,y=0){this.x=x;this.y=y;}add(v){return new MbV2(this.x+v.x,this.y+v.y);}scale(s){return new MbV2(this.x*s,this.y*s);}dot(v){return this.x*v.x+this.y*v.y;}len(){return Math.sqrt(this.x*this.x+this.y*this.y);}clone(){return new MbV2(this.x,this.y);}}

class MbBall{
    constructor(x,y,vx,vy,cont='top'){
        this.pos=new MbV2(x,y);this.vel=new MbV2(vx,vy);
        this.r=7;this.trail=[];this.state='active';this.cont=cont;this.hitCD=0;this.age=0;
    }
    update(obs,swps,tb,bb){
        if(this.state==='dead')return;
        this.age++;this.vel.y+=MB_G;
        const sp=this.vel.len();if(sp>MB_MXSP){const f=MB_MXSP/sp;this.vel.x*=f;this.vel.y*=f;}
        this.pos.x+=this.vel.x;this.pos.y+=this.vel.y;
        this.trail.push(this.pos.clone());if(this.trail.length>MB_TRL)this.trail.shift();
        if(this.hitCD>0)this.hitCD--;
        const b=this.cont==='top'?tb:bb;this._wb(b);
        for(const o of obs)if(o.cont===this.cont)this._ob(o.cx,o.cy,o.half,o.rot);
        for(const sw of swps)if(sw.cont===this.cont)for(const c of sw.cells)this._ob(c.x,c.y,sw.ch,sw.rot);
    }
    _wb(b){const r=this.r;
        if(this.pos.x-r<b.left){this.pos.x=b.left+r;this.vel.x=Math.abs(this.vel.x)*MB_BW;}
        if(this.pos.x+r>b.right){this.pos.x=b.right-r;this.vel.x=-Math.abs(this.vel.x)*MB_BW;}
        if(this.pos.y-r<b.top){this.pos.y=b.top+r;this.vel.y=Math.abs(this.vel.y)*MB_BW;}
        if(this.pos.y+r>b.bottom){this.pos.y=b.bottom-r;this.vel.y=-Math.abs(this.vel.y)*MB_BF;this.vel.x*=0.92;}
    }
    _ob(cx,cy,h,ang){
        const dx=this.pos.x-cx,dy=this.pos.y-cy;
        const ca=Math.cos(ang),sa=Math.sin(ang);
        const p0=dx*ca+dy*sa,p1=-dx*sa+dy*ca;
        const o0=h+this.r-Math.abs(p0),o1=h+this.r-Math.abs(p1);
        if(o0<=0||o1<=0)return;
        let nx,ny,pen;
        if(o0<o1){const s=p0>=0?1:-1;nx=s*ca;ny=s*sa;pen=o0;}
        else{const s=p1>=0?1:-1;nx=-s*sa;ny=s*ca;pen=o1;}
        this.pos.x+=nx*pen;this.pos.y+=ny*pen;
        const dt=this.vel.x*nx+this.vel.y*ny;
        this.vel.x=(this.vel.x-2*dt*nx)*MB_BO;this.vel.y=(this.vel.y-2*dt*ny)*MB_BO;
    }
    draw(c){
        if(this.state==='dead')return;
        for(let i=0;i<this.trail.length;i++){
            const p=this.trail[i],a=(i/this.trail.length)*0.55,r=Math.max(this.r*(i/this.trail.length)*0.8,1);
            c.save();c.globalAlpha=a;c.fillStyle=MB_GRN;c.shadowBlur=5;c.shadowColor=MB_GRN;
            c.beginPath();c.arc(p.x,p.y,r,0,Math.PI*2);c.fill();c.restore();
        }
        c.save();c.shadowBlur=18;c.shadowColor=MB_GRN;c.fillStyle=MB_GRN;
        c.beginPath();c.arc(this.pos.x,this.pos.y,this.r,0,Math.PI*2);c.fill();
        c.fillStyle='rgba(255,255,255,0.5)';c.beginPath();c.arc(this.pos.x-2,this.pos.y-2,this.r*0.38,0,Math.PI*2);c.fill();
        c.restore();
    }
}

class MbObs{
    constructor(cx,cy,half,cont,rotSpd,minY,maxY,oSpd=0.006){
        this.cx=cx;this.half=half;this.cont=cont;this.rot=Math.PI/4;this.rotSpd=rotSpd;
        this.yBase=(minY+maxY)/2;this.oscAmp=(maxY-minY)/2;this.cy=cy;
        this.oscPh=Math.random()*Math.PI*2;this.oscSpd=oSpd+(Math.random()-0.5)*0.002;
    }
    update(){this.rot+=this.rotSpd;this.oscPh+=this.oscSpd;this.cy=this.yBase+Math.sin(this.oscPh)*this.oscAmp;}
    draw(c){
        c.save();c.translate(this.cx,this.cy);c.rotate(this.rot);
        const s=this.half*Math.SQRT2;
        c.fillStyle='#1e1e1e';c.strokeStyle=MB_GD;c.lineWidth=1.5;c.shadowBlur=7;c.shadowColor=MB_GD;
        c.beginPath();c.rect(-s/2,-s/2,s,s);c.fill();c.stroke();c.restore();
    }
}

class MbSwp{
    constructor(cont,yPos){this.cont=cont;this.yPos=yPos;this.offset=0;this.speed=1.4;this.ch=10;this.gap=38;
        this.count=Math.ceil(MB_W/38)+3;this.rot=0;this.rotSpd=0.18;this.cells=[];this.active=true;}
    update(){
        if(!this.active)return;
        this.offset=(this.offset+this.speed)%this.gap;this.rot+=this.rotSpd;this.cells=[];
        for(let i=0;i<this.count;i++)this.cells.push({x:i*this.gap+this.offset-this.gap,y:this.yPos});
    }
    draw(c){
        if(!this.active)return;
        c.save();c.strokeStyle='rgba(0,200,60,0.22)';c.lineWidth=1;
        c.beginPath();c.moveTo(0,this.yPos);c.lineTo(MB_W,this.yPos);c.stroke();c.restore();
        for(const cl of this.cells){
            if(cl.x<-this.ch*2||cl.x>MB_W+this.ch*2)continue;
            c.save();c.translate(cl.x,cl.y);c.rotate(this.rot);
            const s=this.ch*Math.SQRT2;
            c.fillStyle='#232323';c.strokeStyle='#00cc44';c.lineWidth=1.5;c.shadowBlur=8;c.shadowColor='#00cc44';
            c.beginPath();c.rect(-s/2,-s/2,s,s);c.fill();c.stroke();c.restore();
        }
    }
}

class MbPipe{
    constructor(p0,cp1,cp2,p3Fn){this.p0=p0;this.cp1=cp1;this.cp2=cp2;this.p3Fn=p3Fn;this.flowing=[];this.speed=0.007;this.visible=false;}
    addMarble(){this.flowing.push({t:0});}
    update(){for(const m of this.flowing)m.t+=this.speed;const done=this.flowing.filter(m=>m.t>=1).length;this.flowing=this.flowing.filter(m=>m.t<1);return done;}
    bezierPos(t){
        const p3=this.p3Fn(),it=1-t,cp2=this.cp2Fn?this.cp2Fn():this.cp2;
        return{x:it*it*it*this.p0.x+3*it*it*t*this.cp1.x+3*it*t*t*cp2.x+t*t*t*p3.x,
               y:it*it*it*this.p0.y+3*it*it*t*this.cp1.y+3*it*t*t*cp2.y+t*t*t*p3.y};
    }
    draw(c){
        if(!this.visible&&this.flowing.length===0)return;
        const p3=this.p3Fn(),cp2=this.cp2Fn?this.cp2Fn():this.cp2;
        c.save();c.beginPath();c.moveTo(this.p0.x,this.p0.y);c.bezierCurveTo(this.cp1.x,this.cp1.y,cp2.x,cp2.y,p3.x,p3.y);
        c.strokeStyle='rgba(0,60,20,0.7)';c.lineWidth=16;c.lineCap='round';c.stroke();
        c.strokeStyle='rgba(0,180,70,0.25)';c.lineWidth=10;c.stroke();
        c.shadowBlur=8;c.shadowColor=MB_GRN;c.strokeStyle='rgba(0,255,102,0.55)';c.lineWidth=2.5;c.stroke();c.shadowBlur=0;
        for(const m of this.flowing){
            const pos=this.bezierPos(m.t);
            c.shadowBlur=14;c.shadowColor=MB_GRN;c.fillStyle=MB_GRN;
            c.beginPath();c.arc(pos.x,pos.y,7,0,Math.PI*2);c.fill();
        }
        c.restore();
    }
}

class MbZone{
    constructor(idx,count,label,type,cont,tgtY){
        this.idx=idx;this.count=count;this.label=label;this.type=type;this.cont=cont;
        const sw=MB_W/count;this.x=idx*sw;this.w=sw;this.y=tgtY;this.h=MB_TGH;
        this.cx=this.x+sw/2;this.cy=tgtY+MB_TGH/2;this.pulse=0;this.hitFlash=0;
    }
    update(){this.pulse+=0.06;if(this.hitFlash>0)this.hitFlash--;}
    checkHit(m){
        if(m.state!=='active'||m.hitCD>0)return false;
        return m.pos.x+m.r>this.x&&m.pos.x-m.r<this.x+this.w&&m.pos.y+m.r>this.y&&m.pos.y-m.r<this.y+this.h;
    }
    triggerFlash(){this.hitFlash=20;}
    draw(c){
        const fl=this.hitFlash>0,al=fl?0.9:(0.35+0.15*Math.sin(this.pulse));
        c.save();
        const gr=c.createLinearGradient(this.x,this.y,this.x,this.y+this.h);
        gr.addColorStop(0,`rgba(0,255,102,${al*0.6})`);gr.addColorStop(1,`rgba(0,255,102,${al*0.15})`);
        c.fillStyle=gr;c.fillRect(this.x+1,this.y,this.w-2,this.h);
        c.strokeStyle=fl?'#ffffff':MB_GRN;c.lineWidth=fl?2.5:1.5;c.shadowBlur=fl?20:10;c.shadowColor=MB_GRN;
        c.strokeRect(this.x+1,this.y,this.w-2,this.h);
        c.fillStyle=fl?'#ffffff':MB_GRN;c.font='bold 13px monospace';c.textAlign='center';c.textBaseline='middle';
        c.shadowBlur=fl?16:8;c.shadowColor=MB_GRN;c.fillText(this.label,this.cx,this.cy);c.restore();
    }
}

class MbLaunch{
    constructor(x,y,cont,fireInt){
        this.x=x;this.y=y;this.cont=cont;this.fireInt=fireInt;
        this.angMin=-Math.PI*85/180;this.angMax=-Math.PI*15/180;this.ang=this.angMin;this.angDir=1;this.angSpd=0.013;
        this.fireT=fireInt*0.35;this.barLen=26;this.active=true;
    }
    update(){
        if(!this.active)return;
        this.ang+=this.angDir*this.angSpd;
        if(this.ang>=this.angMax){this.ang=this.angMax;this.angDir=-1;}
        if(this.ang<=this.angMin){this.ang=this.angMin;this.angDir=1;}
        if(this.fireT>0)this.fireT--;
    }
    shouldFire(){return this.active&&this.fireT<=0;}
    resetTimer(){this.fireT=this.fireInt;}
    createMarble(aOff=0){
        const a=this.ang+aOff;
        return new MbBall(this.x+Math.cos(a)*(this.barLen+2),this.y+Math.sin(a)*(this.barLen+2),
            Math.cos(a)*MB_FSP,Math.sin(a)*MB_FSP,this.cont);
    }
    draw(c){
        const tx=this.x+Math.cos(this.ang)*this.barLen,ty=this.y+Math.sin(this.ang)*this.barLen;
        c.save();c.shadowBlur=14;c.shadowColor=MB_GRN;c.strokeStyle=MB_GRN;c.lineWidth=6;c.lineCap='round';
        c.beginPath();c.moveTo(this.x,this.y);c.lineTo(tx,ty);c.stroke();
        c.fillStyle='#102010';c.strokeStyle=MB_GRN;c.lineWidth=2.5;c.shadowBlur=16;
        c.beginPath();c.arc(this.x,this.y,14,0,Math.PI*2);c.fill();c.stroke();
        c.fillStyle=MB_GRN;c.shadowBlur=4;c.beginPath();c.arc(this.x,this.y,5,0,Math.PI*2);c.fill();c.restore();
    }
}

// 弹珠区 → 敌机类型映射
const MB_ZONE_TYPES=[
    ()=>'scout',
    ()=>Math.random()<0.5?'fighter':'interceptor',
    ()=>Math.random()<0.5?'elite':'cruiser',
    ()=>Math.random()<0.5?'bomber':'carrier',
];
// 每种敌机生成一架所需积分（按类型独立累计）
const MB_TYPE_COSTS={scout:2,fighter:3,interceptor:3,elite:5,cruiser:6,bomber:12,carrier:16};

class MarbleEnemyPanel{
    constructor(){
        this.oc=Object.assign(document.createElement('canvas'),{width:MB_W,height:MB_H});
        this.octx=this.oc.getContext('2d');
        // 外部独立 canvas（网页左上角）
        const extEl=document.getElementById('marbleCanvas');
        this.extCtx=extEl?extEl.getContext('2d'):null;
        this.enemyQueue=[];
        this.typePoints={scout:0,fighter:0,interceptor:0,elite:0,cruiser:0,bomber:0,carrier:0};
        this.frame=0; // 用于 FIRE_INT 渐进
        this.FIRE_INT=60; // 容器1初始发射间隔（每秒减0.5帧，最低15帧）
        this.marbles=[];
        this.bottomVisible=false;this.bottomSlideY=MB_BH;
        this.weaponHit=false;this.deferredPipes=[];
        this.topBounds={left:10,right:MB_W-10,top:10,bottom:MB_TH-2};
        this.botBounds={left:10,right:MB_W-10,top:MB_TH+10,bottom:MB_H-2};
        this._build();
    }
    _build(){
        this.topLaunch=new MbLaunch(28,108,'top',this.FIRE_INT);
        this.botLaunch=new MbLaunch(28,MB_TH+100,'bottom',this.FIRE_INT);
        this.botLaunch.active=false;
        const TM=20,TXM=MB_OMXT,BM=MB_TH+20,BXM=MB_OMXB;
        this.obs=[
            new MbObs(160, 90,14,'top',+0.035,TM,TXM,0.006),
            new MbObs(320, 60,14,'top',-0.042,TM,TXM,0.008),
            new MbObs(480,140,14,'top',+0.047,TM,TXM,0.007),
            new MbObs(220,155,13,'top',-0.038,TM,TXM,0.005),
            new MbObs(180,MB_TH+80, 13,'bottom',+0.043,BM,BXM,0.007),
            new MbObs(380,MB_TH+130,13,'bottom',-0.038,BM,BXM,0.006),
            new MbObs(560,MB_TH+70, 13,'bottom',+0.045,BM,BXM,0.008),
        ];
        this.swps=[new MbSwp('top',MB_STPY),new MbSwp('bottom',MB_SBTY)];
        this.swps[1].active=false;
        this.topZones=[
            new MbZone(0,3,'WEAPON','weapon','top',MB_TTGY),
            new MbZone(1,3,'SPLIT','split','top',MB_TTGY),
            new MbZone(2,3,'GIANT','buff','top',MB_TTGY),
        ];
        this.botZones=[
            new MbZone(0,4,'①','unit1','bottom',MB_BTGY),
            new MbZone(1,4,'②','unit2','bottom',MB_BTGY),
            new MbZone(2,4,'③','unit3','bottom',MB_BTGY),
            new MbZone(3,4,'④','unit4','bottom',MB_BTGY),
        ];
        this.weaponPipe=new MbPipe(
            {x:117,y:MB_TTGY},{x:80,y:MB_TH-4},null,
            ()=>({x:28,y:MB_TH+100+this.bottomSlideY}));
        this.weaponPipe.cp2Fn=()=>({x:20,y:MB_TH+20+this.bottomSlideY*0.5});
        this.weaponPipe.visible=true;
        this.splitPipe=new MbPipe(
            {x:350,y:MB_TTGY},{x:200,y:MB_TH-4},{x:20,y:MB_TH-10},
            ()=>({x:this.topLaunch.x,y:this.topLaunch.y}));
        this.splitPipe.visible=true;
    }
    onWeapon(m){
        m.state='dead';
        if(!this.weaponHit){this.weaponHit=true;this.bottomVisible=true;this.bottomSlideY=MB_BH;}
        this.weaponPipe.addMarble();
    }
    onSplit(m){
        m.state='dead';this.splitPipe.addMarble();
        this.deferredPipes.push({pipe:this.splitPipe,framesLeft:30});
    }
    onUnit(i){
        if(i>=MB_ZONE_TYPES.length)return;
        const type=MB_ZONE_TYPES[i]();          // 随机决定本次命中产生的敌机类型
        this.typePoints[type]++;
        if(this.typePoints[type]>=MB_TYPE_COSTS[type]){
            this.typePoints[type]-=MB_TYPE_COSTS[type];
            this.enemyQueue.push(type);
        }
    }
    update(){
        this.frame++;
        // 每 300 帧（5s）发射间隔 +5，最多比初始值多 120 帧
        if(this.frame%60===0)
            this.topLaunch.fireInt=Math.max(this.topLaunch.fireInt-0.5, 15);
        this.topLaunch.update();
        if(this.topLaunch.shouldFire()){this.topLaunch.resetTimer();this.marbles.push(this.topLaunch.createMarble());}
        this.botLaunch.update();
        for(const o of this.obs)o.update();
        for(const sw of this.swps)sw.update();
        if(this.bottomVisible){
            this.bottomSlideY+=(0-this.bottomSlideY)*0.11;
            if(this.bottomSlideY<0.8)this.bottomSlideY=0;
            if(this.bottomSlideY<8&&!this.botLaunch.active){this.botLaunch.active=true;this.swps[1].active=true;}
        }
        const wA=this.weaponPipe.update();
        for(let i=0;i<wA;i++)this.marbles.push(this.botLaunch.createMarble());
        const sA=this.splitPipe.update();
        for(let i=0;i<sA;i++)this.marbles.push(this.topLaunch.createMarble());
        for(const m of this.marbles)m.update(this.obs,this.swps,this.topBounds,this.botBounds);
        // 目标区碰撞检测
        for(const m of this.marbles){
            if(m.state!=='active'||m.hitCD>0)continue;
            if(m.cont==='top'){
                for(const z of this.topZones){
                    if(z.checkHit(m)){z.triggerFlash();
                        if(z.type==='buff')m.state='dead';
                        else if(z.type==='weapon')this.onWeapon(m);
                        else if(z.type==='split')this.onSplit(m);
                        break;}
                }
            }else{
                for(let i=0;i<this.botZones.length;i++){
                    const z=this.botZones[i];
                    if(z.checkHit(m)){m.state='dead';z.triggerFlash();this.onUnit(i);break;}
                }
            }
        }
        for(const d of this.deferredPipes){d.framesLeft--;if(d.framesLeft<=0)d.pipe.addMarble();}
        this.deferredPipes=this.deferredPipes.filter(d=>d.framesLeft>0);
        this.marbles=this.marbles.filter(m=>m.state!=='dead');
        for(const z of this.topZones)z.update();
        for(const z of this.botZones)z.update();
    }
    _renderToOC(){
        const c=this.octx;
        c.clearRect(0,0,MB_W,MB_H);
        // 上容器背景
        c.fillStyle='#111111';c.fillRect(0,0,MB_W,MB_TH);
        this.swps[0].draw(c);
        for(const o of this.obs)if(o.cont==='top')o.draw(c);
        for(const z of this.topZones)z.draw(c);
        this.topLaunch.draw(c);
        // 上下分隔线
        c.save();c.strokeStyle=MB_GRN;c.lineWidth=2.5;c.shadowBlur=10;c.shadowColor=MB_GRN;
        c.beginPath();c.moveTo(0,MB_TH-1);c.lineTo(MB_W,MB_TH-1);c.stroke();c.restore();
        // 下容器（带滑入动画）
        if(this.bottomVisible){
            c.save();c.beginPath();c.rect(0,MB_TH,MB_W,MB_BH);c.clip();
            c.translate(0,this.bottomSlideY);
            c.fillStyle='#0f180f';c.fillRect(0,MB_TH,MB_W,MB_BH);
            this.swps[1].draw(c);
            for(const o of this.obs)if(o.cont==='bottom')o.draw(c);
            // 底部目标区 + 各子类型积分进度
            // 每区的敌机类型及对应积分键
            const ZONE_INFO=[
                [{t:'scout',    label:'侦察机'}],
                [{t:'fighter',  label:'战斗机'},{t:'interceptor',label:'拦截机'}],
                [{t:'elite',    label:'精英机'},{t:'cruiser',    label:'巡洋舰'}],
                [{t:'bomber',   label:'轰炸机'},{t:'carrier',   label:'母舰'}],
            ];
            for(let i=0;i<this.botZones.length;i++){
                this.botZones[i].draw(c);
                const zx=this.botZones[i].x, zw=this.botZones[i].w, cx=this.botZones[i].cx;
                const info=ZONE_INFO[i];
                const rowH=Math.floor((MB_BH-MB_TGH-10)/info.length);
                info.forEach((item,row)=>{
                    const py=MB_TH+8+row*rowH;
                    const pts=this.typePoints[item.t], cost=MB_TYPE_COSTS[item.t];
                    // 标签
                    c.save();c.fillStyle='rgba(0,255,102,0.7)';c.font='bold 18px monospace';
                    c.textAlign='center';c.textBaseline='top';c.shadowBlur=6;c.shadowColor=MB_GRN;
                    c.fillText(item.label,cx,py);c.restore();
                    // 进度条
                    const barW=zw-28,barH=7,bx=zx+14,by=py+24;
                    const ratio=pts/cost;
                    c.save();
                    c.fillStyle='rgba(0,30,8,0.9)';c.fillRect(bx,by,barW,barH);
                    c.fillStyle=ratio>=1?'#ffffff':ratio>0.5?MB_GRN:'#006622';
                    c.shadowBlur=ratio>0?6:0;c.shadowColor=MB_GRN;
                    c.fillRect(bx,by,barW*Math.min(ratio,1),barH);
                    c.strokeStyle='rgba(0,255,102,0.25)';c.lineWidth=1;c.strokeRect(bx,by,barW,barH);
                    // 数字
                    c.fillStyle='rgba(0,255,102,0.6)';c.font='12px monospace';
                    c.textAlign='center';c.textBaseline='top';c.shadowBlur=0;
                    c.fillText(`${pts}/${cost}`,cx,by+10);
                    c.restore();
                });
            }
            this.botLaunch.draw(c);c.restore();
        }
        // 管道（全局层，跨两容器）
        this.weaponPipe.draw(c);this.splitPipe.draw(c);
        // 弹珠
        for(const m of this.marbles)m.draw(c);
    }
    drawExternal(){
        if(!this.extCtx)return;
        this._renderToOC();
        const c=this.extCtx;
        const cw=c.canvas.width,ch=c.canvas.height;
        c.clearRect(0,0,cw,ch);
        // 背景
        c.fillStyle='#080f08';c.fillRect(0,0,cw,ch);
        // 弹珠模拟（铺满整个外部 canvas）
        c.drawImage(this.oc,0,0,cw,ch);
        // 外框
        c.strokeStyle='rgba(0,255,102,0.5)';c.lineWidth=1.5;c.shadowBlur=12;c.shadowColor=MB_GRN;
        c.strokeRect(1,1,cw-2,ch-2);
    }
    popEnemy(){return this.enemyQueue.shift()||null;}
}

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
// 敌机等级 → 道具爆率
const ENEMY_TIER={scout:1,fighter:2,interceptor:2,elite:3,cruiser:3,bomber:4,carrier:4};
const TIER_RATE={1:0.03,2:0.10,3:0.30,4:0.50};

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
    constructor(x,y,vx,vy,dmg,color='#00f5ff',w=4,h=16){
        this.x=x; this.y=y; this.vx=vx; this.vy=vy;
        this.dmg=dmg; this.color=color; this.w=w; this.h=h; this.active=true;
    }
    update(){
        this.x+=this.vx; this.y+=this.vy;
        if(this.y<-25||this.y>canvas.height+25||this.x<-20||this.x>canvas.width+20)this.active=false;
    }
    draw(){
        ctx.fillStyle=this.color;
        ctx.fillRect(this.x,this.y,this.w,this.h);
        ctx.fillStyle='rgba(255,255,255,0.9)';
        ctx.fillRect(this.x+1,this.y,2,4);
    }
}

class EnemyBullet {
    constructor(x,y,vx,vy,dmg,wtype='single'){
        this.x=x; this.y=y; this.vx=vx; this.vy=vy;
        this.dmg=dmg; this.wtype=wtype; this.active=true; this.age=0;
        this.homing=false; this.willSplit=false; this.splitTimer=0; this.splitDone=false;
        this.isDiamond=false; this.isMissile=false; this.deployAtAge=-1;
        this.homingAge=0; this.maxHomingAge=300; // 5s@60fps后失去追踪
        this.eFieldW=80; this.eFieldH=60;
        switch(wtype){
            case 'single':     this.color='#ff4444'; this.w=8;  this.h=8;  break;
            case 'double':     this.color='#ff8800'; this.w=8;  this.h=8;  break;
            case 'rapid':      this.color='#ffcc00'; this.w=6;  this.h=6;  break;
            case 'fan':        this.color='#ff44aa'; this.w=10; this.h=10; break;
            case 'barrage':    this.color='#cc44ff'; this.w=8;  this.h=8;  this.isDiamond=true; break;
            case 'fieldproj':  this.color='#88aaff'; this.w=10; this.h=10; this.isDiamond=true;
                               this.deployAtAge=120; break;
            case 'hmissile':   this.color='#44ffcc'; this.w=8;  this.h=14; this.homing=true; this.isMissile=true; break;
            case 'split':      this.color='#ff6600'; this.w=10; this.h=10; this.willSplit=true; this.splitTimer=60; break;
            case 'splitchild': this.color='#ff8833'; this.w=8;  this.h=8;  break;
            default:           this.color='#ff6b35'; this.w=10; this.h=10;
        }
    }
    update(player){
        this.x+=this.vx; this.y+=this.vy; this.age++;
        if(this.homing&&player&&player.alive){
            this.homingAge++;
            if(this.homingAge<=this.maxHomingAge){ // 5s内保持追踪
                const dx=(player.x+player.w/2)-(this.x+this.w/2);
                const dy=(player.y+player.h/2)-(this.y+this.h/2);
                const desired=Math.atan2(dy,dx);
                let cur=Math.atan2(this.vy,this.vx);
                let diff=desired-cur;
                if(diff>Math.PI)diff-=Math.PI*2; if(diff<-Math.PI)diff+=Math.PI*2;
                cur+=Math.sign(diff)*Math.min(Math.abs(diff),0.05);
                const spd=Math.sqrt(this.vx*this.vx+this.vy*this.vy);
                this.vx=Math.cos(cur)*spd; this.vy=Math.sin(cur)*spd;
            }
            // 5s后失去追踪，变为直线飞行
        }
        if(this.willSplit&&this.splitTimer>0){ this.splitTimer--; }
        const margin=this.homing?120:20;
        if(this.y>canvas.height+margin||this.y<-margin||this.x>canvas.width+margin||this.x<-margin)this.active=false;
    }
    // 特殊形状子弹单独绘制（菱形/导弹）
    drawSpecial(){
        ctx.save();
        if(this.isDiamond){
            ctx.translate(this.x+this.w/2,this.y+this.h/2);
            ctx.fillStyle=this.color;
            ctx.shadowColor=this.color; ctx.shadowBlur=8;
            ctx.beginPath(); ctx.moveTo(0,-this.h/2); ctx.lineTo(this.w/2,0); ctx.lineTo(0,this.h/2); ctx.lineTo(-this.w/2,0); ctx.closePath();
            ctx.fill();
        } else if(this.isMissile){
            const ang=Math.atan2(this.vy,this.vx)+Math.PI/2;
            ctx.translate(this.x+this.w/2,this.y+this.h/2); ctx.rotate(ang);
            ctx.shadowColor='#44ffcc'; ctx.shadowBlur=12;
            ctx.fillStyle='#44ffcc';
            ctx.beginPath(); ctx.moveTo(0,-this.h/2); ctx.lineTo(-this.w/2,this.h/4); ctx.lineTo(0,this.h/2); ctx.lineTo(this.w/2,this.h/4); ctx.closePath(); ctx.fill();
            ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(0,-this.h/2+2,1.5,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
    }
    // 普通矩形子弹由 Game._draw() 批量绘制
}

// ─────────────────────────────────────────────────────────────
//  ELECTRIC FIELD  电场 (Bomber的压制武器)
// ─────────────────────────────────────────────────────────────
class EField {
    constructor(x,y,w,h,circular=false){ this.x=x; this.y=y; this.w=w; this.h=h; this.circular=circular; this.timer=0; this.duration=240; this.active=true; this.r=w/2; }
    update(){ this.timer++; if(this.timer>=this.duration)this.active=false; }
    // 圆形电场碰撞检测（供Game._update使用）
    containsPoint(px,py){ if(this.circular){const dx=px-(this.x+this.r),dy=py-(this.y+this.r);return dx*dx+dy*dy<this.r*this.r;}return px>=this.x&&px<=this.x+this.w&&py>=this.y&&py<=this.y+this.h; }
    draw(){
        const alpha=0.35+0.25*Math.sin(this.timer*0.18);
        ctx.save(); ctx.globalAlpha=alpha;
        if(this.circular){
            const cx=this.x+this.r, cy=this.y+this.r;
            ctx.fillStyle='#1a2aff';
            ctx.beginPath(); ctx.arc(cx,cy,this.r,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle='#88aaff'; ctx.lineWidth=2;
            ctx.shadowColor='#4466ff'; ctx.shadowBlur=20;
            ctx.beginPath(); ctx.arc(cx,cy,this.r,0,Math.PI*2); ctx.stroke();
            const step=20; ctx.strokeStyle=`rgba(136,170,255,${0.5+0.3*Math.sin(this.timer*0.3)})`;
            ctx.lineWidth=1; ctx.shadowBlur=5;
            for(let i=0;i<4;i++){
                const angle=rand(0,Math.PI*2), dist=rand(0,this.r);
                const lx=cx+Math.cos(angle)*dist, ly=cy+Math.sin(angle)*dist;
                ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx+rand(-step,step),ly+rand(-step,step)); ctx.stroke();
            }
        } else {
            ctx.fillStyle='#1a2aff'; ctx.fillRect(this.x,this.y,this.w,this.h);
            ctx.strokeStyle='#88aaff'; ctx.lineWidth=2;
            ctx.shadowColor='#4466ff'; ctx.shadowBlur=20;
            ctx.strokeRect(this.x,this.y,this.w,this.h);
            const step=20; ctx.strokeStyle=`rgba(136,170,255,${0.5+0.3*Math.sin(this.timer*0.3)})`;
            ctx.lineWidth=1; ctx.shadowBlur=5;
            for(let i=0;i<3;i++){
                const lx=this.x+rand(0,this.w), ly=this.y+rand(0,this.h);
                ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx+rand(-step,step),ly+rand(-step,step)); ctx.stroke();
            }
        }
        ctx.restore(); ctx.globalAlpha=1;
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
        this.trackAge=0; this.maxTrackAge=300; // 5s@60fps后失去追踪
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
        this.age++; this.trackAge++;
        if(this.trackAge>this.maxTrackAge)this.target=null; // 5s后失去追踪
        if(!this.target||!this.target.active)this.target=this._findNearest(enemies);
        if(this.target&&this.target.active&&this.trackAge<=this.maxTrackAge){
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
//  METEOR 陨石
// ─────────────────────────────────────────────────────────────
class Meteor {
    constructor(x){
        this.x=x; this.y=-50;
        this.r=randInt(22,35);
        this.w=this.r*2; this.h=this.r*2;
        this.vy=rand(1.0,2.2); this.vx=rand(-0.4,0.4);
        this.rot=rand(0,Math.PI*2); this.rotSpd=rand(-0.018,0.018);
        this.hp=this.maxHp=Math.floor(this.r*1.2);
        this.active=true; this.hitFlash=0;
        this.craters=[];
        for(let i=0;i<5;i++)
            this.craters.push({x:rand(-this.r*0.6,this.r*0.6),y:rand(-this.r*0.6,this.r*0.6),r:rand(3,7)});
    }
    update(){
        this.x+=this.vx; this.y+=this.vy;
        this.rot+=this.rotSpd;
        if(this.hitFlash>0)this.hitFlash--;
        if(this.y>canvas.height+60)this.active=false;
    }
    hit(amt){
        this.hp-=amt; this.hitFlash=8;
        if(this.hp<=0){this.active=false;return true;} return false;
    }
    draw(){
        if(!this.active)return;
        ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(this.rot);
        ctx.shadowColor=this.hitFlash>0?'#ffffff':'#ff6600';
        ctx.shadowBlur=this.hitFlash>0?18:8;
        const g=ctx.createRadialGradient(-this.r*0.3,-this.r*0.3,0,0,0,this.r);
        g.addColorStop(0,'#aa7744'); g.addColorStop(0.5,'#775533'); g.addColorStop(1,'#443322');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=0.45;
        for(const c of this.craters){
            ctx.fillStyle='#221100';
            ctx.beginPath(); ctx.arc(c.x,c.y,c.r,0,Math.PI*2); ctx.fill();
        }
        ctx.restore(); ctx.globalAlpha=1;
        // 血条单独绘制，不跟随旋转
        const bw=this.r*2,bh=3,bx=this.x-this.r,by=this.y-this.r-8;
        ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(bx,by,bw,bh);
        const pct=this.hp/this.maxHp;
        ctx.fillStyle=pct>0.5?'#00ff88':pct>0.25?'#ffbe0b':'#ff3366';
        ctx.fillRect(bx,by,bw*pct,bh);
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
        this.hp=100; this.maxHp=100;            // 100点血量
        this.shield=0; this.maxShield=100;
        this.shieldImmune=false; this.shieldImmuneTimer=0; // 护盾免疫5s
        this.cooldown=0; this.fireRate=8;     // 发射更快
        this.speedBoost=false; this.spdTimer=0;
        this.invincible=false; this.invTimer=0;
        this.supports=3;                      // 默认3次支援
        this.hitFlash=0; this.thrusterT=0; this.alive=true;
        this.alpha=0;                         // 入场淡入
        // ── 火力升级系统（0-6级）──
        this.fireLevel=0;
        this.swarmCooldown=0; this.swarmRate=2;           // Lv.2 极快射速
        this.swarmCycleT=0; this.swarmCyclePeriod=18; this.swarmBurstDur=6; // 0.3s周期 0.1s发射
        this.missileCooldown=0; this.missileInterval=120; // Lv.3/4
        this.laserState='idle'; this.laserTimer=0;        // Lv.5
        this.laserCycleTimer=0; this.laserInterval=120;  // 频率加快：2s冷却（原5s）
        this.laserChargeDur=60; this.laserFireDur=240;   // 充能1s，发射4s（原3s）
        this.overclockActive=false; this.overclockTimer=0;// Lv.MAX(6)
        this.overclockDur=600; this.overclockPulse=0;
        this.currentForm='default'; // 道具形态：default|shield|speed|health|support|firepower
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
        if(this.shieldImmuneTimer>0&&--this.shieldImmuneTimer===0)this.shieldImmune=false;
        // 蜂群周期计时
        if(this.fireLevel>=2){
            if(!this.overclockActive) this.swarmCycleT=(this.swarmCycleT+1)%this.swarmCyclePeriod;
            if((this.overclockActive||(this.swarmCycleT<this.swarmBurstDur))&&this.swarmCooldown>0)this.swarmCooldown--;
        }
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
        // ── Lv.2 蜂群：周期0.3s，发射0.1s，极快2帧/轮，伤害0.1/发 ──
        if(this.fireLevel>=2){
            const inBurst=this.overclockActive||(this.swarmCycleT<this.swarmBurstDur);
            if(inBurst&&this.swarmCooldown<=0){
                this.swarmCooldown=this.overclockActive?1:this.swarmRate;
                bullets.push(new Bullet(cx-20,this.y-4,-0.6,-12,0.1,'#ffee00',2,10));
                bullets.push(new Bullet(cx-13,this.y-6,-0.3,-13,0.1,'#ffee00',2,10));
                bullets.push(new Bullet(cx-6, this.y-8,-0.1,-13,0.1,'#ffee00',2,10));
                bullets.push(new Bullet(cx+6, this.y-8, 0.1,-13,0.1,'#ffee00',2,10));
                bullets.push(new Bullet(cx+13,this.y-6, 0.3,-13,0.1,'#ffee00',2,10));
                bullets.push(new Bullet(cx+20,this.y-4, 0.6,-12,0.1,'#ffee00',2,10));
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
        if(this.shieldImmune)return false; // 护盾免疫期间完全免伤
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
        // 道具形态叠加
        this._drawFormOverlay();
        // 护盾圈
        if(this.shield>0){
            const sa=(this.shield/this.maxShield)*0.45;
            ctx.strokeStyle=`rgba(123,47,255,${sa+0.15})`; ctx.lineWidth=2;
            ctx.shadowColor='#7b2fff'; ctx.shadowBlur=18;
            ctx.beginPath(); ctx.ellipse(0,0,this.w/2+7,this.h/2+7,0,0,Math.PI*2); ctx.stroke();
        }
        // 免疫护盾特效
        if(this.shieldImmune){
            const sp=Math.sin(Date.now()*0.01);
            ctx.strokeStyle=`rgba(123,47,255,${0.6+sp*0.3})`; ctx.lineWidth=3;
            ctx.shadowColor='#aa66ff'; ctx.shadowBlur=30;
            ctx.beginPath(); ctx.ellipse(0,0,this.w/2+10,this.h/2+10,0,0,Math.PI*2); ctx.stroke();
        }
        // 玩家血条
        const hbW=50,hbH=5,hbX=-25,hbY=this.h/2+8;
        ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(hbX,hbY,hbW,hbH);
        const hpPct=this.hp/this.maxHp;
        ctx.fillStyle=hpPct>0.5?'#00ff88':hpPct>0.25?'#ffbe0b':'#ff3366';
        ctx.fillRect(hbX,hbY,hbW*hpPct,hbH);
        ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=0.5;
        ctx.strokeRect(hbX,hbY,hbW,hbH);
        ctx.restore(); ctx.globalAlpha=1;
    }
    _drawFormOverlay(){
        const W=this.w, H=this.h;
        const fpColors=['','#00ff44','#ffee00','#ff8800','#ff2200','#cc00ff','#00ffff'];
        if(this.currentForm==='shield'){
            ctx.save();
            ctx.shadowColor='#7b2fff'; ctx.shadowBlur=16;
            ctx.fillStyle='rgba(150,60,255,0.42)'; ctx.strokeStyle='#bb77ff'; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.moveTo(-W/2,H/4); ctx.lineTo(-W/2-6,0); ctx.lineTo(-W/2-2,-H/5); ctx.lineTo(-W/2+2,-H/5); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(W/2,H/4); ctx.lineTo(W/2+6,0); ctx.lineTo(W/2+2,-H/5); ctx.lineTo(W/2-2,-H/5); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
        } else if(this.currentForm==='speed'){
            ctx.save();
            ctx.shadowColor='#00f5ff'; ctx.shadowBlur=10;
            [-W/2+6,-W/2+10,W/2-6,W/2-10].forEach(x=>{
                ctx.strokeStyle='rgba(0,245,255,0.75)'; ctx.lineWidth=1.5;
                ctx.beginPath(); ctx.moveTo(x,-H/8); ctx.lineTo(x,H/4); ctx.stroke();
            });
            const eg=0.6+0.4*Math.sin(this.thrusterT*2.5);
            const tg=ctx.createLinearGradient(0,H/2,0,H/2+22);
            tg.addColorStop(0,`rgba(0,220,255,${0.8*eg})`); tg.addColorStop(1,'transparent');
            ctx.fillStyle=tg; ctx.beginPath(); ctx.ellipse(0,H/2+11,3,11,0,0,Math.PI*2); ctx.fill();
            ctx.restore();
        } else if(this.currentForm==='health'){
            ctx.save();
            ctx.fillStyle='#ff4477'; ctx.shadowColor='#ff4477'; ctx.shadowBlur=10;
            ctx.fillRect(-1.5,-H/2+3,3,9); ctx.fillRect(-4.5,-H/2+6,9,3);
            ctx.strokeStyle='rgba(255,100,150,0.6)'; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.moveTo(-W/2+5,0); ctx.lineTo(-W/2+5,H/3); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(W/2-5,0); ctx.lineTo(W/2-5,H/3); ctx.stroke();
            ctx.restore();
        } else if(this.currentForm==='support'){
            ctx.save();
            ctx.fillStyle='rgba(0,255,136,0.5)'; ctx.shadowColor='#00ff88'; ctx.shadowBlur=10;
            ctx.fillRect(-W/2+4,-H/8,5,H/4); ctx.fillRect(W/2-9,-H/8,5,H/4);
            ctx.strokeStyle='#00ff88'; ctx.lineWidth=1.5; ctx.shadowBlur=8;
            ctx.beginPath(); ctx.arc(0,H/5,5,0,Math.PI*2); ctx.stroke();
            ctx.restore();
        } else if(this.currentForm==='firepower'&&this.fireLevel>=1){
            const lv=this.fireLevel;
            const fc=fpColors[Math.min(lv,6)];
            ctx.save();
            ctx.shadowColor=fc; ctx.shadowBlur=14;
            ctx.fillStyle=fc;
            ctx.beginPath(); ctx.arc(-W/2+4,-H/8,3,0,Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(W/2-4,-H/8,3,0,Math.PI*2); ctx.fill();
            if(lv>=2){
                ctx.fillStyle=fpColors[2]; ctx.shadowColor=fpColors[2];
                ctx.beginPath(); ctx.arc(-W/2+2,H/8,2.5,0,Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(W/2-2,H/8,2.5,0,Math.PI*2); ctx.fill();
            }
            if(lv>=3){
                ctx.strokeStyle=fpColors[3]; ctx.lineWidth=2.5; ctx.shadowColor=fpColors[3]; ctx.shadowBlur=12;
                ctx.beginPath(); ctx.moveTo(-W/2+4,H/6); ctx.lineTo(-W/2+4,H/3); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(W/2-4,H/6); ctx.lineTo(W/2-4,H/3); ctx.stroke();
            }
            if(lv>=4){
                ctx.strokeStyle=fpColors[4]; ctx.lineWidth=2.5; ctx.shadowColor=fpColors[4];
                ctx.beginPath(); ctx.moveTo(-W/2+10,H/6); ctx.lineTo(-W/2+10,H/3); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(W/2-10,H/6); ctx.lineTo(W/2-10,H/3); ctx.stroke();
            }
            if(lv>=5){
                ctx.strokeStyle=fpColors[5]; ctx.lineWidth=2.5; ctx.shadowColor=fpColors[5]; ctx.shadowBlur=22;
                ctx.beginPath(); ctx.moveTo(-2,-H/2+1); ctx.lineTo(-2,-H/2-8); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(2,-H/2+1); ctx.lineTo(2,-H/2-8); ctx.stroke();
            }
            if(lv>=6){
                const pulse=0.5+0.5*Math.sin((this.overclockPulse||0)*0.28);
                ctx.strokeStyle=fpColors[6]; ctx.lineWidth=1.5;
                ctx.shadowColor=fpColors[6]; ctx.shadowBlur=22+pulse*14;
                ctx.globalAlpha=0.45+pulse*0.4;
                ctx.beginPath();
                ctx.moveTo(0,-H/2); ctx.lineTo(-W/2+3,H/4); ctx.lineTo(-W/2,H/2);
                ctx.lineTo(0,H/2-14); ctx.lineTo(W/2,H/2); ctx.lineTo(W/2-3,H/4); ctx.closePath();
                ctx.stroke(); ctx.globalAlpha=1;
            }
            ctx.restore();
        }
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
        this.confrontMode=false; this.confrontVX=0; this.confrontTimer=0;
        // rapid burst state (interceptor)
        this.burstCount=0; this.burstTimer=0;
        // carrier laser state
        this.eLaserState='idle'; this.eLaserTimer=0;
        this.eLaserChargeDur=80; this.eLaserFireDur=50;
        this.eLaserCycleTimer=0; this.eLaserCycleInterval=400;
        // carrier weapon cycle (missile→split→laser→missile→...)
        this.weaponCycleIdx=0; this.weaponCycleShots=0;
        this._setup();
    }
    _setup(){
        switch(this.type){
            case 'scout':
                this.w=23;this.h=21;this.hp=this.maxHp=2;
                this.vy=rand(1.0,2.0);this.score=100;this.color='#ff3366';this.fireRate=200;this.dmg=1;
                this.weaponType='single'; break;
            case 'fighter':
                this.w=31;this.h=30;this.hp=this.maxHp=8;
                this.vy=rand(0.6,1.0);this.score=260;this.color='#ff6600';this.fireRate=110;this.dmg=1;
                this.weaponType='double'; break;
            case 'interceptor':
                this.w=20;this.h=19;this.hp=this.maxHp=4;
                this.vy=rand(1.4,2.2);this.score=150;this.color='#ff00cc';
                this.fireRate=65;this.dmg=1;
                this.sweepDir=Math.random()<0.5?1:-1;this.sweepAmp=rand(3.5,5.5); // 增大横移幅度
                this.weaponType='rapid'; break;
            case 'elite':
                this.w=36;this.h=35;this.hp=this.maxHp=12;
                this.vy=rand(0.5,0.9);this.score=380;this.color='#ff8800';this.fireRate=75;this.dmg=1;
                this.weaponType='fan'; break;
            case 'cruiser':
                this.w=44;this.h=42;this.hp=this.maxHp=20;
                this.vy=rand(0.35,0.65);this.score=520;this.color='#cc0000';this.fireRate=85;this.dmg=2;
                this.weaponType='barrage'; break;
            case 'bomber':
                this.w=68;this.h=56;this.hp=this.maxHp=64; // Lv4：体积变大，血量翻倍
                this.vy=rand(0.25,0.5);this.score=450;this.color='#886600';this.fireRate=110;this.dmg=2;
                this.weaponType='field'; this.bomberAltWeapon=0; break; // 交替使用电场炸弹和分裂炮
            case 'carrier':
                this.w=84;this.h=70;this.hp=this.maxHp=88; // Lv4：体积变大，血量翻倍
                this.vy=rand(0.18,0.35);this.score=900;this.color='#440088';
                this.fireRate=120;this.dmg=2;this.nextSpawn=200;
                this.weaponType='cycle'; break;
        }
    }
    update(eBullets,player){
        if(!this.active)return;
        this.hitFlash=Math.max(0,this.hitFlash-1); this.t++;
        // 入场动画：alpha淡入 + 入场粒子
        if(!this.hasEntered&&this.y+this.h>0){
            this.hasEntered=true; this.entryFlash=12; this.alpha=0;
        }
        if(this.entryFlash>0){ this.entryFlash--; this.alpha=Math.min(1,this.alpha+0.12); }
        else { this.alpha=1; }
        this._updateNormal(eBullets,player);
        if(this.y>canvas.height+80)this.active=false;
    }
    _updateNormal(eBullets,player){
        switch(this.type){
            case 'scout':       this.x+=Math.sin(this.t*0.055)*1.5; break;
            case 'fighter':
                { const dx=player.x+player.w/2-(this.x+this.w/2); this.vx=lerp(this.vx,dx*0.009,0.04); } break;
            case 'interceptor':
                this.vx=this.sweepDir*this.sweepAmp;
                if(this.x<=2||this.x>=canvas.width-this.w-2)this.sweepDir*=-1;
                break;
            case 'bomber':
                this.x+=Math.sin(this.t*0.02)*0.5;
                if(this.bomberFieldCooldown===undefined)this.bomberFieldCooldown=randInt(120,200);
                this.bomberFieldCooldown++;
                if(this.bomberFieldCooldown>=300){
                    this.bomberFieldCooldown=0;
                    const _cx=this.x+this.w/2, _cy=this.y+this.h;
                    const _ddx=player.x+player.w/2-_cx, _ddy=player.y-_cy, _dd=Math.sqrt(_ddx*_ddx+_ddy*_ddy)||1;
                    const _fb=new EnemyBullet(_cx-5,_cy,_ddx/_dd*2.0,_ddy/_dd*2.0,this.dmg,'fieldproj');
                    _fb.eFieldW=120; _fb.eFieldH=120; eBullets.push(_fb);
                }
                break;
            case 'elite':
                { const dx=player.x+player.w/2-(this.x+this.w/2); this.vx=lerp(this.vx,dx*0.018,0.055); } break;
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
        // 非侦察机：在屏幕上2/3区域内上下弹跳巡逻
        if(this.type!=='scout'){
            const maxY=canvas.height*(2/3)-this.h;
            if(this.y>=maxY){ this.y=maxY; if(this.vy>0)this.vy=-(rand(0.25,0.55)+Math.abs(this.vy)*0.3); }
            if(this.y<=0){    this.y=0;    if(this.vy<0)this.vy= rand(0.25,0.55)+Math.abs(this.vy)*0.3; }
        }
        // 连发炮突发处理（interceptor）
        if(this.type==='interceptor'&&this.burstCount>0){
            this.burstTimer++;
            if(this.burstTimer%10===0){
                const cx=this.x+this.w/2, cy=this.y+this.h;
                // 每发瞄准玩家
                const _dx=player.x+player.w/2-cx, _dy=player.y-cy, _d=Math.sqrt(_dx*_dx+_dy*_dy)||1;
                eBullets.push(new EnemyBullet(cx-3,cy,_dx/_d*6.5,_dy/_d*6.5,this.dmg,'rapid'));
                this.burstCount--;
            }
        }
        // 母舰激光状态机
        if(this.type==='carrier'){
            this.eLaserCycleTimer++;
            if(this.eLaserState==='idle'&&this.eLaserCycleTimer>=this.eLaserCycleInterval){
                this.eLaserCycleTimer=0; this.eLaserState='charging'; this.eLaserTimer=this.eLaserChargeDur;
            } else if(this.eLaserState==='charging'){
                if(--this.eLaserTimer<=0){this.eLaserState='firing'; this.eLaserTimer=this.eLaserFireDur;}
            } else if(this.eLaserState==='firing'){
                if(--this.eLaserTimer<=0)this.eLaserState='idle';
            }
        }
        this.bulletT++;
        // 攻击频率减半（×1.5），随机性±30帧
        const rate=Math.max(40,Math.floor(this.fireRate*1.5)+randInt(-30,30));
        if(this.bulletT>=rate){this.bulletT=0;this._shoot(eBullets,player);}
    }
    _shoot(eBullets,player){
        const cx=this.x+this.w/2, cy=this.y+this.h;
        const dx=player.x+player.w/2-cx, dy=player.y-cy, d=Math.sqrt(dx*dx+dy*dy)||1;
        const baseAng=Math.atan2(dy,dx);
        switch(this.weaponType){
            case 'single':  // Scout: 瞄准玩家，速度提升
                eBullets.push(new EnemyBullet(cx-4,cy,dx/d*6.0,dy/d*6.0,this.dmg,'single')); break;
            case 'double':  // Fighter: 双发精准瞄准+额外中央弹
                eBullets.push(new EnemyBullet(cx-6,cy,Math.cos(baseAng-0.28)*6,Math.sin(baseAng-0.28)*6,this.dmg,'double'));
                eBullets.push(new EnemyBullet(cx, cy,dx/d*6.5,dy/d*6.5,this.dmg,'double'));
                eBullets.push(new EnemyBullet(cx+4,cy,Math.cos(baseAng+0.28)*6,Math.sin(baseAng+0.28)*6,this.dmg,'double')); break;
            case 'rapid':   // Interceptor: 连发炮（触发突发序列，5发）
                if(this.burstCount<=0){ this.burstCount=5; this.burstTimer=0; } break;
            case 'fan': {   // Elite: 7弹扇形瞄准，速度6，伤害×2
                const angles=[-0.75,-0.50,-0.25,0,0.25,0.50,0.75];
                angles.forEach(a=>{
                    eBullets.push(new EnemyBullet(cx-4,cy,Math.cos(baseAng+a)*6,Math.sin(baseAng+a)*6,this.dmg*2,'fan'));
                }); break;
            }
            case 'barrage': // Cruiser: 7弹瞄准扇射+中央重弹，伤害+1
                [-0.62,-0.42,-0.21,0,0.21,0.42,0.62].forEach(a=>{
                    eBullets.push(new EnemyBullet(cx-4,cy,Math.cos(baseAng+a)*5.5,Math.sin(baseAng+a)*5.5,this.dmg+1,'barrage'));
                }); break;
            case 'field':   // Bomber: 常规射击只发分裂炮，电场由独立计时器控制
                eBullets.push(new EnemyBullet(cx-4,cy,dx/d*4.0,dy/d*4.0,this.dmg,'split'));
                break;
            case 'cycle': { // Carrier: 循环三种武器
                const weapons=['hmissile','split','skip'];
                const w=weapons[this.weaponCycleIdx%3];
                this.weaponCycleShots++;
                if(this.weaponCycleShots>=2){ this.weaponCycleShots=0; this.weaponCycleIdx++; }
                if(w==='hmissile'){
                    // 双导弹齐射
                    eBullets.push(new EnemyBullet(cx-10,cy,-0.6,3.0,this.dmg,'hmissile'));
                    eBullets.push(new EnemyBullet(cx+6, cy, 0.6,3.0,this.dmg,'hmissile'));
                } else if(w==='split'){
                    // 三路分裂炮
                    eBullets.push(new EnemyBullet(cx-4,cy,dx/d*4.5,dy/d*4.5,this.dmg,'split'));
                    eBullets.push(new EnemyBullet(cx-4,cy,Math.cos(baseAng-0.4)*4.0,Math.sin(baseAng-0.4)*4.0,this.dmg,'split'));
                    eBullets.push(new EnemyBullet(cx-4,cy,Math.cos(baseAng+0.4)*4.0,Math.sin(baseAng+0.4)*4.0,this.dmg,'split'));
                }
                // 'skip' = 本轮跳过（激光已由状态机单独处理）
                break;
            }
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
        ctx.shadowBlur=this.hitFlash>0?16:8;
        this._drawShape(ctx);
        if(this.maxHp>1)this._drawHpBar();
        ctx.restore(); ctx.globalAlpha=1;
    }
    _drawShape(ctx){
        ctx.save();
        ctx.scale(1,-1); // 机头朝下，面向玩家
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
        }
        ctx.restore();
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
        this.state='start'; this.score=0; this.kills=0; this.difficulty=2;
        this.player=new Player();
        this.bullets=[]; this.eBullets=[]; this.enemies=[];
        this.particles=[]; this.powerups=[]; this.allies=[];
        this.stars=Array.from({length:120},()=>new Star(true));
        this.audio=new AudioEngine(); this.keys={};
        this.waveT=0; this.gameTime=0;         // 波次/游戏计时
        this.nebulaT=0; this.frame=0;
        this.fpDropCooldown=0;
        this.eFields=[];
        this.meteors=[]; this.meteorTimer=0; this.nextMeteorTime=randInt(600,1200);
        // 统计
        this.stats={shotsFired:0,shotsHit:0,damageTaken:0,damageDealt:0,powerupsCollected:0,
            survivalFrames:0,killsByType:{scout:0,fighter:0,cruiser:0,interceptor:0,bomber:0,elite:0,carrier:0}};
        this.fps=60; this._fpsCount=0; this._fpsTime=performance.now(); this._statsT=0;
        // 预渲染扫描线（避免每帧267次fillRect）
        this._scanline=document.createElement('canvas');
        this._scanline.width=canvas.width; this._scanline.height=canvas.height;
        const _slCtx=this._scanline.getContext('2d');
        _slCtx.fillStyle='rgba(0,0,0,0.022)';
        for(let _y=0;_y<canvas.height;_y+=3)_slCtx.fillRect(0,_y,canvas.width,1);
        // 屏幕特效
        this.screenShake=0;
        this.screenFlashAlpha=0; this.screenFlashColor='#ff0000';
        // 弹珠敌机生成器
        this.marblePanel=new MarbleEnemyPanel();
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
        this.score=0; this.kills=0;
        this.player=new Player();
        this.bullets=[]; this.eBullets=[]; this.enemies=[]; this.particles=[]; this.powerups=[]; this.allies=[];
        this.waveT=0; this.gameTime=0;
        this.fpDropCooldown=0;
        this.eFields=[];
        this.meteors=[]; this.meteorTimer=0; this.nextMeteorTime=randInt(600,1200);
        this.stats={shotsFired:0,shotsHit:0,damageTaken:0,damageDealt:0,powerupsCollected:0,
            survivalFrames:0,killsByType:{scout:0,fighter:0,cruiser:0,interceptor:0,bomber:0,elite:0,carrier:0}};
        this._statsT=0;
        this.screenShake=0; this.screenFlashAlpha=0;
    }

    _gameOver(){
        this.state='gameOver';
        document.getElementById('finalScore').textContent=this.score.toLocaleString();
        const _gt=this.gameTime;
        document.getElementById('finalLevel').textContent=String(Math.floor(_gt/3600)).padStart(2,'0')+':'+String(Math.floor((_gt%3600)/60)).padStart(2,'0');
        document.getElementById('finalKills').textContent=this.kills;
        // 游戏结束：屏幕红闪 + 震动
        this._triggerShake(14); this._triggerFlash('#ff0000',0.5);
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }

    _hud(){
        document.getElementById('scoreDisplay').textContent=this.score.toLocaleString();
        const _t=this.gameTime,_mm=String(Math.floor(_t/3600)).padStart(2,'0'),_ss=String(Math.floor((_t%3600)/60)).padStart(2,'0');
        document.getElementById('levelDisplay').textContent=_mm+':'+_ss;
        document.getElementById('supportDisplay').textContent=this.player.supports;
        const hpEl=document.getElementById('livesDisplay');
        hpEl.textContent=this.player.hp+' / '+this.player.maxHp;
        hpEl.style.color=this.player.hp<=25?'#ff3366':this.player.hp<=50?'#ffbe0b':'#00f5ff';
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
        if(this.enemies.length>=12)return;
        const type=this.marblePanel.popEnemy();
        if(!type)return; // 无弹珠队列则不生成
        const x=rand(20,canvas.width-100);
        const e=new Enemy(x,-70,type);
        this.enemies.push(e);
        explode(x+e.w/2,-5,'spawn',this.particles);
    }
    _getEnemyType(){
        // 0–200s 线性插值：Lv1 80%→20%，Lv2 固定20%，Lv3 0%→30%，Lv4 余量0%→30%
        const alpha=Math.min(this.gameTime/12000,1); // 12000帧=200s
        const p1=lerp(0.80,0.20,alpha);
        const p2=0.20;
        const p3=lerp(0.00,0.30,alpha);
        const r=Math.random();
        if(r<p1)         return 'scout';
        if(r<p1+p2)      return Math.random()<0.5?'fighter':'interceptor';
        if(r<p1+p2+p3)   return Math.random()<0.5?'elite':'cruiser';
        return Math.random()<0.5?'bomber':'carrier';
    }


    _spawnPowerup(x,y,enemyType='scout'){
        if(this.powerups.length>=3)return;
        // 按敌机等级确定爆率
        const tier=ENEMY_TIER[enemyType]||1;
        if(Math.random()>TIER_RATE[tier])return;
        const p=this.player;
        // 50%概率尝试火力道具（有冷却且未满级）
        if(this.fpDropCooldown<=0&&!this.powerups.some(pu=>pu.type==='FIREPOWER')&&Math.random()<0.50){
            // 超频可重复获得：Lv6时继续掉落超频道具
            const nextLv=p.fireLevel<6?p.fireLevel+1:6;
            this.powerups.push(new Powerup(x,y,'FIREPOWER',nextLv));
            this.fpDropCooldown=300;
            return;
        }
        // 其余道具：只选玩家还需要的（过滤已满/已激活）
        const eligible=[];
        if(p.hp<p.maxHp-2)  eligible.push('HEALTH');
        if(!p.speedBoost)    eligible.push('SPEED');
        if(p.shield<p.maxShield-10) eligible.push('SHIELD');
        if(p.supports<5)     eligible.push('SUPPORT');
        // 过滤掉场上已有的同类道具
        const onScreen=new Set(this.powerups.map(pu=>pu.type));
        const choices=eligible.filter(t=>!onScreen.has(t));
        if(choices.length===0)return;
        const type=choices[randInt(0,choices.length-1)];
        this.powerups.push(new Powerup(x,y,type));
    }

    _spawnMeteorPowerup(x,y){
        const p=this.player;
        const eligible=[];
        if(p.hp<p.maxHp-2)           eligible.push('HEALTH');
        if(!p.speedBoost)             eligible.push('SPEED');
        if(p.shield<p.maxShield-10)  eligible.push('SHIELD');
        if(p.supports<5)             eligible.push('SUPPORT');
        if(this.fpDropCooldown<=0&&p.fireLevel<6) eligible.push('FIREPOWER');
        if(eligible.length===0)      eligible.push('HEALTH','SHIELD','SUPPORT');
        const type=eligible[randInt(0,eligible.length-1)];
        if(type==='FIREPOWER'){
            this.powerups.push(new Powerup(x,y,'FIREPOWER',Math.min(p.fireLevel+1,6)));
            this.fpDropCooldown=300;
        } else {
            this.powerups.push(new Powerup(x,y,type));
        }
    }

    _applyPowerup(type){
        this.stats.powerupsCollected++;
        switch(type){
            case 'SHIELD':  this.player.shield=this.player.maxShield; this.player.shieldImmune=true; this.player.shieldImmuneTimer=300; this.player.currentForm='shield'; break;
            case 'SUPPORT': this.player.supports=Math.min(this.player.supports+1,5); this.player.currentForm='support'; break;
            case 'HEALTH':  this.player.hp=Math.min(this.player.hp+Math.round(this.player.maxHp*0.33),this.player.maxHp); this.player.currentForm='health'; break;
            case 'SPEED':   this.player.speedBoost=true; this.player.spdTimer=360; this.player.currentForm='speed'; break;
            case 'FIREPOWER': {
                const p=this.player, nextLv=p.fireLevel+1;
                this.fpDropCooldown=300; // 5秒冷却
                if(nextLv<=5){
                    p.fireLevel=nextLv;
                    p.currentForm='firepower';
                    const fpNames=['','副炮','蜂群散射','追踪导弹','双导弹','激光炮'];
                    const fpColors=['','#00ff44','#ffee00','#ff8800','#ff2200','#cc00ff'];
                    this._showNotif(`🔥 火力升级 Lv.${nextLv} ${fpNames[nextLv]}`,fpColors[nextLv]);
                    this.audio.powerup();
                    this._triggerFlash('#ffbe0b',0.12);
                } else {
                    // Lv.6 MAX：激活/续期超频
                    if(p.fireLevel<6)p.fireLevel=6;
                    p.currentForm='firepower';
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

    // ── UPDATE ──
    _update(){
        // 弹珠模拟每帧更新（游戏开始前也运行以预热队列）
        this.marblePanel.update();
        if(this.state!=='playing')return;
        this.frame++; this.nebulaT+=0.003;

        // 屏幕特效衰减
        this.screenShake*=0.82;
        this.screenFlashAlpha=Math.max(0,this.screenFlashAlpha-0.025);

        this.stars.forEach(s=>s.update());
        this.player.update(this.keys);

        // ★ 自动攻击（不需要按空格）
        if(this.fpDropCooldown>0)this.fpDropCooldown--;
        if(this.player.alive&&this.player.enterAnim<=0)this.stats.survivalFrames++;
        const _bPre=this.bullets.length;
        this.player.shoot(this.bullets,this.audio,this.enemies);
        this.stats.shotsFired+=Math.max(0,this.bullets.length-_bPre);
        if(this.player._laserChargeAudio){this.player._laserChargeAudio=false;this.audio.laserCharge();}
        if(this.player._laserFireAudio){this.player._laserFireAudio=false;this.audio.laserFire();}

        this.gameTime++;
        // 敌机生成完全由弹珠系统驱动——队列有敌机就立即生成，无队列则不生成
        while(this.marblePanel.enemyQueue.length>0 && this.enemies.length<12)
            this._spawnEnemy();

        // 僚机更新
        this.allies=this.allies.filter(a=>{
            if(!a.active)return false; a.update(this.player,this.bullets); return a.active;
        });

        this.bullets=this.bullets.filter(b=>{
            if(b instanceof GuidedMissile)b.update(this.enemies); else b.update(); return b.active;
        });
        const _splitNew=[], _fieldNew=[];
        this.eBullets=this.eBullets.filter(b=>{
            b.update(this.player);
            if(b.willSplit&&b.splitTimer<=0&&!b.splitDone&&b.active){
                b.splitDone=true;
                const spd=5;
                [[-1,-1],[1,-1],[-1,1],[1,1],[0,-1.4],[0,1.4]].forEach(([sdx,sdy])=>
                    _splitNew.push(new EnemyBullet(b.x,b.y,sdx*spd,sdy*spd,b.dmg,'splitchild')));
                return false;
            }
            if(b.wtype==='fieldproj'&&b.deployAtAge>0&&b.age>=b.deployAtAge){
                _fieldNew.push(new EField(b.x-b.eFieldW/2,b.y-b.eFieldH/2,b.eFieldW,b.eFieldH,true)); // 圆形电场
                return false;
            }
            return b.active;
        });
        if(_splitNew.length>0)this.eBullets.push(..._splitNew);
        for(const f of _fieldNew)this.eFields.push(f);
        this.eFields=this.eFields.filter(f=>{f.update();return f.active;});
        if(this.eBullets.length>100)this.eBullets=this.eBullets.slice(-80);
        // ── 激光穿透伤害 (Lv.5+)：伤害和宽度随发射时间递增 ──
        if(this.player.fireLevel>=5&&this.player.laserState==='firing'){
            const pcx=this.player.x+this.player.w/2;
            const laserProgress=1-(this.player.laserTimer/this.player.laserFireDur); // 0→1
            const bw=this.player.overclockActive?(20+laserProgress*30):(10+laserProgress*15);
            const lpf=this.player.overclockActive?lerp(0.5,3.0,laserProgress):lerp(0.2,1.5,laserProgress);
            for(const e of this.enemies){
                if(!e.active)continue;
                const ecx=e.x+e.w/2;
                if(ecx>pcx-bw&&ecx<pcx+bw&&e.y+e.h>0){
                    e.hitFlash=Math.max(e.hitFlash,3);
                    if(e.hit(lpf)){
                        const et=e.type==='cruiser'||e.type==='carrier'||e.type==='bomber'?'large':e.type==='fighter'||e.type==='elite'?'medium':'small';
                        explode(e.x+e.w/2,e.y+e.h/2,et,this.particles);
                        et==='large'?this.audio.explodeLarge():this.audio.explodeSmall();
                        this.score+=e.score*this.difficulty; this.kills++;
                        this.stats.killsByType[e.type]=(this.stats.killsByType[e.type]||0)+1;
                        this.stats.damageDealt+=e.maxHp;
                        this._spawnPowerup(e.x+e.w/2,e.y+e.h/2,e.type); this._hud();
                    }
                }
            }
        }

        // 敌机更新 + 处理母舰生成队列
        const newE=[];
        this.enemies=this.enemies.filter(e=>{
            if(!e.active)return false;
            e.update(this.eBullets,this.player);
            if(e.spawnQueue.length>0){
                e.spawnQueue.forEach(s=>newE.push(new Enemy(s.x,e.y+e.h+5,s.type)));
                e.spawnQueue=[];
            }
            return e.active;
        });
        this.enemies.push(...newE);

        // 母舰激光伤害（直接扣血，不触发无敌帧）
        for(const e of this.enemies){
            if(e.type==='carrier'&&e.active&&e.eLaserState==='firing'&&this.player.alive&&this.frame%3===0){
                const ecx=e.x+e.w/2;
                if(this.player.x<ecx+12&&this.player.x+this.player.w>ecx-12){
                    this.player.hp=Math.max(0,this.player.hp-1);
                    this.player.hitFlash=3; this._triggerShake(2);
                    this.stats.damageTaken+=1; this._hud();
                    if(this.player.hp<=0&&this.player.alive){
                        this.player.alive=false;
                        explode(this.player.x+this.player.w/2,this.player.y+this.player.h/2,'large',this.particles);
                        this.audio.explodeLarge(); this._gameOver();
                    }
                }
            }
        }

        // 电场伤害
        for(const f of this.eFields){
            if(!f.active||!this.player.alive)continue;
            const _pcx=this.player.x+this.player.w/2,_pcy=this.player.y+this.player.h/2;
            if(f.containsPoint(_pcx,_pcy)&&this.frame%5===0){
                this.player.hp=Math.max(0,this.player.hp-1);
                this.player.hitFlash=3; this.stats.damageTaken+=1; this._hud();
                if(this.player.hp<=0&&this.player.alive){
                    this.player.alive=false;
                    explode(this.player.x+this.player.w/2,this.player.y+this.player.h/2,'large',this.particles);
                    this.audio.explodeLarge(); this._gameOver();
                }
            }
        }

        // 玩家子弹 vs 敌机（每帧最多播一次击中音，防止Audio API过载）
        let _hitAudio=false;
        for(const b of this.bullets){
            if(!b.active)continue;
            for(const e of this.enemies){
                if(!e.active)continue;
                if(hits({x:b.x,y:b.y,w:b.w,h:b.h},{x:e.x,y:e.y,w:e.w,h:e.h})){
                    b.active=false; explode(b.x+2,b.y,'tiny',this.particles);
                    if(!_hitAudio){this.audio.hit();_hitAudio=true;}
                    this.stats.shotsHit++;
                    if(e.hit(b.dmg)){
                        const et=e.type==='cruiser'||e.type==='carrier'||e.type==='bomber'?'large':e.type==='fighter'||e.type==='elite'?'medium':'small';
                        explode(e.x+e.w/2,e.y+e.h/2,et,this.particles);
                        et==='large'?this.audio.explodeLarge():this.audio.explodeSmall();
                        this.score+=e.score*this.difficulty; this.kills++;
                        this.stats.killsByType[e.type]=(this.stats.killsByType[e.type]||0)+1;
                        this.stats.damageDealt+=e.maxHp;
                        this._spawnPowerup(e.x+e.w/2,e.y+e.h/2,e.type); this._hud();
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
                this.stats.damageTaken+=b.dmg;
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

        // ── 陨石生成 ──
        this.meteorTimer++;
        if(this.meteorTimer>=this.nextMeteorTime){
            this.meteorTimer=0; this.nextMeteorTime=randInt(600,1200);
            this.meteors.push(new Meteor(rand(40,canvas.width-40)));
            this._showNotif('☄  陨石来袭！','#ff8800');
        }
        // 陨石更新
        this.meteors=this.meteors.filter(m=>{m.update();return m.active;});
        // 玩家子弹 vs 陨石
        for(const b of this.bullets){
            if(!b.active)continue;
            for(const m of this.meteors){
                if(!m.active)continue;
                const bx=b.x+b.w/2,by=b.y+b.h/2,dx=bx-m.x,dy=by-m.y;
                if(dx*dx+dy*dy<m.r*m.r){
                    b.active=false; explode(bx,by,'tiny',this.particles);
                    if(m.hit(b.dmg)){
                        explode(m.x,m.y,'large',this.particles); this.audio.explodeLarge();
                        this.score+=200*this.difficulty; this.kills++; this._hud();
                        if(Math.random()<0.8)this._spawnMeteorPowerup(m.x,m.y);
                    }
                    break;
                }
            }
        }
        // 激光 vs 陨石 (Lv.5+)
        if(this.player.fireLevel>=5&&this.player.laserState==='firing'){
            const pcx=this.player.x+this.player.w/2;
            const _lp=1-(this.player.laserTimer/this.player.laserFireDur);
            const bw=this.player.overclockActive?(20+_lp*30):(10+_lp*15);
            const _lpfM=this.player.overclockActive?lerp(0.5,3.0,_lp):lerp(0.2,1.5,_lp);
            for(const m of this.meteors){
                if(!m.active)continue;
                if(m.x>pcx-bw-m.r&&m.x<pcx+bw+m.r){
                    m.hitFlash=Math.max(m.hitFlash,3);
                    if(m.hit(_lpfM)){
                        explode(m.x,m.y,'large',this.particles); this.audio.explodeLarge();
                        this.score+=200*this.difficulty; this.kills++; this._hud();
                        if(Math.random()<0.8)this._spawnMeteorPowerup(m.x,m.y);
                    }
                }
            }
        }
        // 陨石 vs 玩家
        const mhb={x:this.player.x+7,y:this.player.y+7,w:this.player.w-14,h:this.player.h-14};
        for(const m of this.meteors){
            if(!m.active||!this.player.alive)continue;
            const px=mhb.x+mhb.w/2,py=mhb.y+mhb.h/2,dx=px-m.x,dy=py-m.y;
            if(dx*dx+dy*dy<(m.r+8)*(m.r+8)){
                m.active=false; explode(m.x,m.y,'medium',this.particles);
                if(this.player.damage(3,this.audio)){
                    explode(this.player.x+this.player.w/2,this.player.y+this.player.h/2,'large',this.particles);
                    this.audio.explodeLarge(); this._gameOver();
                } else { this._triggerShake(8); this._triggerFlash('#ff8800',0.3); }
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
        if(this.particles.length>400)this.particles=this.particles.slice(-320);

        // 统计面板更新（每20帧）
        this._statsT++;
        if(this._statsT>=20){ this._statsT=0; this._updateStatsPanel(); }
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

        this.stars.forEach(s=>s.draw());
        this.particles.forEach(p=>p.draw());
        this.enemies.forEach(e=>e.draw());
        this.meteors.forEach(m=>m.draw());

        // 电场渲染
        this.eFields.forEach(f=>f.draw());

        // 母舰激光渲染
        for(const e of this.enemies){
            if(e.type==='carrier'&&e.active){
                const ecx=e.x+e.w/2;
                if(e.eLaserState==='charging'){
                    const prog=1-(e.eLaserTimer/e.eLaserChargeDur);
                    ctx.save(); ctx.globalAlpha=0.5+prog*0.4;
                    ctx.strokeStyle='#aa88ff'; ctx.lineWidth=2; ctx.shadowColor='#aa88ff'; ctx.shadowBlur=18;
                    ctx.beginPath(); ctx.arc(ecx,e.y+e.h,6+prog*12,0,Math.PI*2); ctx.stroke();
                    ctx.restore(); ctx.globalAlpha=1;
                } else if(e.eLaserState==='firing'){
                    const prog=e.eLaserTimer/e.eLaserFireDur;
                    ctx.save(); ctx.globalAlpha=0.85*prog;
                    ctx.shadowColor='#cc88ff'; ctx.shadowBlur=30;
                    const lg=ctx.createLinearGradient(ecx-10,0,ecx+10,0);
                    lg.addColorStop(0,'transparent'); lg.addColorStop(0.5,'#dd88ff'); lg.addColorStop(1,'transparent');
                    ctx.fillStyle=lg; ctx.fillRect(ecx-10,e.y+e.h,20,canvas.height-(e.y+e.h));
                    ctx.restore(); ctx.globalAlpha=1;
                }
            }
        }

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
                const fireProgress=1-prog; // 0→1随发射时间增长
                const pulse=Math.sin(Date.now()*0.04)*2;
                const bw=(isMAX?12:6)+fireProgress*(isMAX?22:11)+pulse; // 宽度随时间增长
                const outerW=(isMAX?60:30)+fireProgress*(isMAX?50:25);
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

        // ── 批量绘制玩家子弹（按颜色分组，大幅减少fillStyle切换）──
        const _bc=Object.create(null);
        for(const b of this.bullets){
            if(b instanceof GuidedMissile){b.draw();continue;}
            if(!_bc[b.color])_bc[b.color]=[];
            _bc[b.color].push(b);
        }
        for(const color in _bc){
            ctx.fillStyle=color;
            for(const b of _bc[color])ctx.fillRect(b.x,b.y,b.w,b.h);
        }
        ctx.fillStyle='rgba(255,255,255,0.88)';
        for(const b of this.bullets){
            if(!(b instanceof GuidedMissile))ctx.fillRect(b.x+1,b.y,2,4);
        }

        // ── 批量绘制敌机子弹（矩形子弹分组）──
        const _ec=Object.create(null);
        const _specialBullets=[];
        for(const b of this.eBullets){
            if(b.isDiamond||b.isMissile){_specialBullets.push(b);continue;}
            if(!_ec[b.color])_ec[b.color]=[];
            _ec[b.color].push(b);
        }
        for(const color in _ec){
            ctx.fillStyle=color;
            for(const b of _ec[color])ctx.fillRect(b.x,b.y,b.w,b.h);
        }
        ctx.fillStyle='rgba(255,255,255,0.72)';
        for(const b of this.eBullets){
            if(!b.isDiamond&&!b.isMissile)ctx.fillRect(b.x+b.w/2-1.5,b.y+b.h/2-1.5,3,3);
        }
        // 特殊形状子弹
        for(const b of _specialBullets)b.drawSpecial();

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

        // 弹珠敌机生成器面板（右上角，仅游戏中显示）
        if(this.state==='playing')
        // 弹珠敌机生成器（渲染到网页左上角独立 canvas）
        this.marblePanel.drawExternal();

        // 扫描线（预渲染，1次drawImage代替267次fillRect）
        ctx.drawImage(this._scanline,0,0);

        if(shake>0.5)ctx.restore();
    }

    _updateStatsPanel(){
        const g=id=>document.getElementById(id);
        const p=this.player, st=this.stats;
        // Player
        const hpPct=p.alive?p.hp/p.maxHp:0;
        const hpBar=g('sp-hp-bar');
        if(hpBar){ hpBar.style.width=(hpPct*100)+'%'; hpBar.style.background=hpPct>0.5?'#00ff88':hpPct>0.25?'#ffbe0b':'#ff3366'; }
        const shBar=g('sp-shield-bar'); if(shBar)shBar.style.width=(p.shield/p.maxShield*100)+'%';
        const fpNames=['无','副炮','蜂群','导弹','双导弹','激光','超频MAX'];
        const fpColors=['#aaa','#00ff44','#ffee00','#ff8800','#ff2200','#cc00ff','#00ffff'];
        const fEl=g('sp-fire'); if(fEl){fEl.textContent='Lv.'+p.fireLevel+' '+fpNames[Math.min(p.fireLevel,6)]; fEl.style.color=fpColors[Math.min(p.fireLevel,6)];}
        const hpV=g('sp-hp-val'); if(hpV)hpV.textContent=p.hp+'/'+p.maxHp;
        const supV=g('sp-support'); if(supV)supV.textContent=p.supports;
        // Mission
        const tf=st.survivalFrames, mm=String(Math.floor(tf/3600)).padStart(2,'0'), ss=String(Math.floor((tf%3600)/60)).padStart(2,'0');
        const tEl=g('sp-time'); if(tEl)tEl.textContent=mm+':'+ss;
        const scEl=g('sp-score'); if(scEl)scEl.textContent=this.score.toLocaleString();
        const lvEl=g('sp-level'); if(lvEl){const _gt=this.gameTime;lvEl.textContent=String(Math.floor(_gt/3600)).padStart(2,'0')+':'+String(Math.floor((_gt%3600)/60)).padStart(2,'0');}
        const klEl=g('sp-kills'); if(klEl)klEl.textContent=this.kills;
        // Kill log
        const types=['scout','fighter','cruiser','interceptor','bomber','elite','carrier'];
        const maxK=Math.max(1,...types.map(t=>st.killsByType[t]||0));
        types.forEach(t=>{ const k=st.killsByType[t]||0; const kv=g('kv-'+t); const kb=g('kb-'+t); if(kv)kv.textContent=k; if(kb)kb.style.width=(k/maxK*100)+'%'; });
        // Combat
        const hr=st.shotsFired>0?Math.round(st.shotsHit/st.shotsFired*100)+'%':'—';
        const hrEl=g('sp-hitrate'); if(hrEl)hrEl.textContent=hr;
        const shEl=g('sp-shots'); if(shEl)shEl.textContent=st.shotsFired;
        const ddEl=g('sp-dmgd'); if(ddEl)ddEl.textContent=st.damageDealt;
        const dtEl=g('sp-dmgt'); if(dtEl)dtEl.textContent=st.damageTaken;
        const puEl=g('sp-pups'); if(puEl)puEl.textContent=st.powerupsCollected;
        // System
        const blEl=g('sp-bullets'); if(blEl)blEl.textContent=this.bullets.length;
        const ebEl=g('sp-ebullets'); if(ebEl)ebEl.textContent=this.eBullets.length;
        const ptEl=g('sp-particles'); if(ptEl)ptEl.textContent=this.particles.length;
        const fpEl=g('sp-fps'); if(fpEl){ fpEl.textContent=this.fps; fpEl.style.color=this.fps>=55?'#00ff88':this.fps>=30?'#ffbe0b':'#ff3366'; }
    }

    _loop(){
        const tick=()=>{
            this._fpsCount++;
            const now=performance.now();
            if(now-this._fpsTime>=1000){
                this.fps=Math.round(this._fpsCount*1000/(now-this._fpsTime));
                this._fpsCount=0; this._fpsTime=now;
            }
            this._update(); this._draw(); requestAnimationFrame(tick);
        };
        tick();
    }
}

window.addEventListener('load',()=>new Game());
