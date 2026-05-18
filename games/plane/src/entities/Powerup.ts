import Phaser from 'phaser';
import { POWERUPS, FP_DATA, type PowerupKey, type FirepowerShape } from '../data/powerups.js';

export interface PowerupSpawnArgs {
    x: number;
    y: number;
    key: PowerupKey;
    /** 仅当 key='power' 时使用：升级后将达到的等级（1..6），决定贴图颜色 */
    nextLevel?: number;
}

const TEX_SIZE = 64;
const DISPLAY = 28;
const BASE_SCALE = DISPLAY / TEX_SIZE;
const PLACEHOLDER_KEY = '__POWERUP_PLACEHOLDER__';

function numberToHex(c: number): string {
    return '#' + c.toString(16).padStart(6, '0');
}

function drawShape(ctx: CanvasRenderingContext2D, shape: FirepowerShape, r: number): void {
    ctx.beginPath();
    switch (shape) {
        case 'diamond':
            ctx.moveTo(0, -r);
            ctx.lineTo(r, 0);
            ctx.lineTo(0, r);
            ctx.lineTo(-r, 0);
            ctx.closePath();
            break;
        case 'circle':
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            break;
        case 'star':
            for (let i = 0; i < 10; i++) {
                const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
                const rr = i % 2 === 0 ? r : r * 0.46;
                const x = Math.cos(a) * rr;
                const y = Math.sin(a) * rr;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            break;
        case 'pentagon':
            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
                const x = Math.cos(a) * r;
                const y = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            break;
        case 'burst':
            for (let i = 0; i < 16; i++) {
                const a = (i / 16) * Math.PI * 2;
                const rr = i % 2 === 0 ? r : r * 0.57;
                const x = Math.cos(a) * rr;
                const y = Math.sin(a) * rr;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            break;
        case 'hex':
        default:
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
                const x = Math.cos(a) * r;
                const y = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
    }
}

function genPowerupTexture(
    scene: Phaser.Scene,
    textureKey: string,
    color: string,
    icon: string,
    shape: FirepowerShape
): void {
    if (scene.textures.exists(textureKey)) return;
    const canvas = document.createElement('canvas');
    canvas.width = TEX_SIZE;
    canvas.height = TEX_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.translate(TEX_SIZE / 2, TEX_SIZE / 2);

    // 外圈 glow
    const glowR = shape === 'burst' ? 30 : 24;
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
    glow.addColorStop(0, color + 'aa');
    glow.addColorStop(0.6, color + '44');
    glow.addColorStop(1, color + '00');
    ctx.fillStyle = glow;
    ctx.fillRect(-TEX_SIZE / 2, -TEX_SIZE / 2, TEX_SIZE, TEX_SIZE);

    // 形状径向渐变填充 + 描边
    drawShape(ctx, shape, 22);
    const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
    fill.addColorStop(0, color + 'cc');
    fill.addColorStop(1, color + '33');
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // icon 居中（贴图静态烘进去，旋转时随主体一起转）
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(icon, 0, 0);

    scene.textures.addCanvas(textureKey, canvas);
}

function powerupTextureKey(key: PowerupKey, nextLevel?: number): string {
    if (key === 'power') {
        const idx = Math.max(1, Math.min(6, nextLevel ?? 1));
        return `__POWERUP_power_${idx}`;
    }
    return `__POWERUP_${key}`;
}

function ensurePowerupTextures(scene: Phaser.Scene): void {
    // 4 基础道具：用 hex 形状（与原版 PUPS 默认 case 一致）
    for (const key of ['shield', 'ally', 'hp', 'speed'] as const) {
        const p = POWERUPS[key];
        genPowerupTexture(scene, powerupTextureKey(key), p.color, p.icon, 'hex');
    }
    // 6 个火力等级
    for (let lv = 1; lv <= 6; lv++) {
        const fp = FP_DATA[lv]!;
        genPowerupTexture(
            scene,
            powerupTextureKey('power', lv),
            numberToHex(fp.color),
            fp.icon,
            fp.shape
        );
    }
}

export class Powerup extends Phaser.Physics.Arcade.Image {
    powerupKey: PowerupKey = 'power';
    private floatPhase = 0;
    private spinPhase = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, PLACEHOLDER_KEY);
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    spawn(args: PowerupSpawnArgs): void {
        this.powerupKey = args.key;
        this.setActive(true);
        this.setVisible(true);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.enable = true;
        const tk = powerupTextureKey(args.key, args.nextLevel);
        if (this.texture.key !== tk) this.setTexture(tk);
        this.clearTint();
        this.setScale(BASE_SCALE);
        this.setRotation(0);
        // 关键：body 逻辑尺寸跟贴图源对齐（默认 placeholder 是 1×1，scale 0.44 会让碰撞框塌成 0.44px）
        body.setSize(TEX_SIZE, TEX_SIZE);
        this.setPosition(args.x, args.y);
        this.setVelocity(0, 80);
        this.floatPhase = Math.random() * Math.PI * 2;
        this.spinPhase = 0;
    }

    deactivate(): void {
        this.setActive(false);
        this.setVisible(false);
        this.body!.enable = false;
        this.setVelocity(0, 0);
    }

    floatUpdate(dtMs: number): void {
        if (!this.active) return;
        const dt = dtMs / 1000;
        this.floatPhase += dt * 2;
        this.spinPhase += dt * 1.2;
        const pulse = 1 + Math.sin(this.floatPhase) * 0.08;
        this.setScale(BASE_SCALE * pulse);
        this.setRotation(this.spinPhase);
    }

    recycleIfOffscreen(playAreaBottom: number): void {
        if (!this.active) return;
        if (this.y > playAreaBottom + 50) {
            this.deactivate();
        }
    }
}

export function makePowerupPool(scene: Phaser.Scene, size: number): Phaser.Physics.Arcade.Group {
    ensurePowerupTextures(scene);
    if (!scene.textures.exists(PLACEHOLDER_KEY)) {
        const g = scene.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 1, 1);
        g.generateTexture(PLACEHOLDER_KEY, 1, 1);
        g.destroy();
    }
    const group = scene.physics.add.group({
        classType: Powerup,
        runChildUpdate: false,
        maxSize: size,
        active: false,
        visible: false
    });
    group.createMultiple({ key: PLACEHOLDER_KEY, quantity: size, active: false, visible: false });
    return group;
}
