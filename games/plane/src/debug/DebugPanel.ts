import {
    debugParams,
    ENEMY_BULLET_KEYS,
    ENEMY_TYPE_KEYS,
    ENEMY_TYPE_LABELS,
    HEALTH_BAR_TYPES,
    HEALTH_BAR_LABELS,
    type EnemyBulletTextureKey,
    type EnemyTypeKey,
    type HealthBarType
} from './debugParams.js';
import {
    STYLE, HEADER_STYLE, ROW,
    sliderRow, numberRow, checkboxRow, sectionTitle, button
} from './widgets.js';
import type { Enemy } from '../entities/Enemy.js';
import { ENEMY_TYPES, defaultHealthBarByTier } from '../data/enemyTypes.js';

const BULLET_LABELS: Record<EnemyBulletTextureKey, string> = {
    'enemy-bullet-small': 'small（侦察/战斗）',
    'enemy-bullet-teardrop': 'teardrop（拦截）',
    'enemy-bullet-shrapnel': 'shrapnel（精英）',
    'enemy-bullet-orb': 'orb（巡洋）',
    'enemy-bullet-heavy': 'heavy（轰炸/母舰）'
};

const BEHAVIOR_OPTIONS = [
    'sinusoidal',
    'player-tracker',
    'elite-tracker',
    'horizontal-sweep',
    'hover'
] as const;

export class DebugPanel {
    private root: HTMLDivElement | null = null;
    private collapsed = false;
    private selectedEnemy: Enemy | null = null;

    /** TestScene 注入：通过坐标解析 slot 索引（M6-14 赋值） */
    onSwapTypeKey: ((slotIdx: number, newKey: EnemyTypeKey) => void) | null = null;
    /** TestScene 注入：根据敌机坐标找到对应 slot 索引（M6-14 赋值） */
    resolveSlotIdx: ((x: number, y: number) => number) | null = null;

    mount(): void {
        if (this.root) return;
        const root = document.createElement('div');
        root.id = '__plane_debug_panel__';
        root.setAttribute('style', STYLE);
        document.body.appendChild(root);
        this.root = root;
        this.render();
    }

    unmount(): void {
        this.root?.remove();
        this.root = null;
    }

    selectEnemy(e: Enemy): void {
        this.selectedEnemy = e;
        debugParams.selectedEnemyTypeKey = e.typeKey;
        this.render();
    }

    /** 每帧由 TestScene 调用，更新实时数据 div */
    tick(): void {
        if (!this.root || !this.selectedEnemy || !this.selectedEnemy.active) return;
        const live = this.root.querySelector('#__plane_dbg_live__');
        if (!live) return;
        const e = this.selectedEnemy;
        const b = e.body as Phaser.Physics.Arcade.Body | null;
        const vx = b?.velocity.x ?? 0;
        const vy = b?.velocity.y ?? 0;
        live.textContent = `x=${e.x.toFixed(0)} y=${e.y.toFixed(0)} hp=${e.hp} v=(${vx.toFixed(0)},${vy.toFixed(0)})`;
    }

    private render(): void {
        if (!this.root) return;
        const r = this.root;
        r.innerHTML = '';

        // 标题栏
        const header = document.createElement('div');
        header.setAttribute('style', HEADER_STYLE);
        header.innerHTML = `<span>🛠 调参面板 (F1 切换命中框)</span>`;
        const toggleBtn = button(this.collapsed ? '展开' : '折叠', () => {
            this.collapsed = !this.collapsed;
            this.render();
        });
        header.appendChild(toggleBtn);
        r.appendChild(header);

        if (this.collapsed) return;

        // === 选中敌机（仅 selectedEnemy 存在且 active 时渲染）===
        if (this.selectedEnemy?.active) {
            this.renderSelectedEnemySection(r);
        }

        // === 敌机 ===
        r.appendChild(sectionTitle('敌机'));

        r.appendChild(
            sliderRow(
                '贴图缩放',
                debugParams.enemyDisplayScale,
                1,
                8,
                0.25,
                (v) => (debugParams.enemyDisplayScale = v)
            )
        );
        r.appendChild(
            sliderRow(
                '全局 hitbox',
                debugParams.enemyBodyRatio,
                0.2,
                1.5,
                0.05,
                (v) => (debugParams.enemyBodyRatio = v)
            )
        );

        // === 每机微调（形状）===
        r.appendChild(sectionTitle('每机 hitbox 形状（W × H，叠乘到全局）'));

        for (const typeKey of ENEMY_TYPE_KEYS) {
            r.appendChild(this.perEnemyShapeRow(typeKey));
        }

        // === 子弹 ===
        r.appendChild(sectionTitle('子弹尺寸（W × H）'));

        for (const key of ENEMY_BULLET_KEYS) {
            r.appendChild(this.bulletSizeRow(key));
        }

        // === 开关 ===
        r.appendChild(sectionTitle('可视化'));
        r.appendChild(checkboxRow('显示命中框（F1）', debugParams.showHitbox, (v) => (debugParams.showHitbox = v)));

        // === 操作 ===
        const actions = document.createElement('div');
        actions.setAttribute('style', 'margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;');

        const copyBtn = button('📋 复制当前参数', () => {
            const out = JSON.stringify(
                {
                    enemyDisplayScale: debugParams.enemyDisplayScale,
                    enemyBodyRatio: debugParams.enemyBodyRatio,
                    perEnemyBodyRatio: debugParams.perEnemyBodyRatio,
                    bulletSize: debugParams.bulletSize
                },
                null,
                2
            );
            navigator.clipboard
                .writeText(out)
                .then(() => {
                    copyBtn.textContent = '✓ 已复制';
                    setTimeout(() => (copyBtn.textContent = '📋 复制当前参数'), 1500);
                })
                .catch(() => alert(out));
        });
        actions.appendChild(copyBtn);

        const dumpBtn = button('🖨 打印到控制台', () => {
            // eslint-disable-next-line no-console
            console.log('[debugParams]', JSON.parse(JSON.stringify(debugParams)));
        });
        actions.appendChild(dumpBtn);

        r.appendChild(actions);
    }

    private renderSelectedEnemySection(parent: HTMLDivElement): void {
        // A. section 标题 + 类型标签
        parent.appendChild(sectionTitle('🎯 选中敌机'));

        const e = this.selectedEnemy!;
        const typeKey = e.typeKey;

        const typeLabel = document.createElement('div');
        typeLabel.style.cssText = 'padding: 2px 4px; font-size: 11px; color: #ffaa00; font-weight: bold;';
        typeLabel.textContent = `${ENEMY_TYPE_LABELS[typeKey]} (${typeKey})`;
        parent.appendChild(typeLabel);

        // B. 实时数据占位
        const live = document.createElement('div');
        live.id = '__plane_dbg_live__';
        live.style.cssText = 'padding: 2px 4px; font-size: 11px; color: #88ccff; margin-bottom: 4px;';
        live.textContent = '...';
        parent.appendChild(live);

        // C. 类别下拉（7 选 1）
        const typeRow = document.createElement('div');
        typeRow.setAttribute('style', ROW);
        const typeLab = document.createElement('span');
        typeLab.style.cssText = 'width: 80px; font-size: 11px;';
        typeLab.textContent = '敌机类别';
        const typeSel = document.createElement('select');
        typeSel.style.cssText = 'flex: 1; background: #001; color: #fff; border: 1px solid #1a4a5a; padding: 2px;';
        for (const k of ENEMY_TYPE_KEYS) {
            const opt = document.createElement('option');
            opt.value = k;
            opt.textContent = `${ENEMY_TYPE_LABELS[k]} (${k})`;
            if (k === typeKey) opt.selected = true;
            typeSel.appendChild(opt);
        }
        typeSel.onchange = () => {
            const newKey = typeSel.value as EnemyTypeKey;
            const slotIdx = this.resolveSlotIdx?.(e.x, e.y) ?? -1;
            if (slotIdx >= 0) this.onSwapTypeKey?.(slotIdx, newKey);
            // 重渲染以反映新数据（注意 e.typeKey 已被 setTypeKey 改了）
            this.render();
        };
        typeRow.appendChild(typeLab);
        typeRow.appendChild(typeSel);
        parent.appendChild(typeRow);

        // D. HP / Score / Dmg / Vy 数字输入（写 override）
        const override = (debugParams.enemyOverrides[typeKey] ??= {});
        const t = ENEMY_TYPES[typeKey];

        parent.appendChild(numberRow('HP', override.hp ?? t.hp, 1, 999, 1, (v) => {
            override.hp = v;
            // 当前实例的 hp cap 一下（避免超过新上限）
            if (e.hp > v) e.hp = v;
        }));
        parent.appendChild(numberRow('Score', override.score ?? t.score, 0, 9999, 10, (v) => {
            override.score = v;
            e.score = v;
        }));
        parent.appendChild(numberRow('Dmg', override.dmg ?? t.dmg, 0, 99, 1, (v) => {
            override.dmg = v;
            e.dmg = v;
        }));
        parent.appendChild(numberRow('Vy', override.vy ?? t.vyMax, 0, 600, 10, (v) => {
            override.vy = v;
            // 测试场的敌机 spawn 时 vy=0，所以不能立即生效到当前实例
            // 但下次正常游戏 spawn 时会读 override.vy
        }));

        // E. 轨迹覆盖 + 子弹覆盖（5 选 1，首项"默认"清 override）
        const behRow = document.createElement('div');
        behRow.setAttribute('style', ROW);
        const behLab = document.createElement('span');
        behLab.style.cssText = 'width: 80px; font-size: 11px;';
        behLab.textContent = '轨迹覆盖';
        const behSel = document.createElement('select');
        behSel.style.cssText = 'flex: 1; background: #001; color: #fff; border: 1px solid #1a4a5a; padding: 2px;';
        const behDef = document.createElement('option');
        behDef.value = '';
        behDef.textContent = `默认（${t.behaviorId}）`;
        behSel.appendChild(behDef);
        for (const bid of BEHAVIOR_OPTIONS) {
            const opt = document.createElement('option');
            opt.value = bid;
            opt.textContent = bid;
            if (override.behaviorId === bid) opt.selected = true;
            behSel.appendChild(opt);
        }
        behSel.onchange = () => {
            if (behSel.value === '') delete override.behaviorId;
            else override.behaviorId = behSel.value;
            e.setBehavior(override.behaviorId ?? t.behaviorId);
            this.render();
        };
        behRow.appendChild(behLab);
        behRow.appendChild(behSel);
        parent.appendChild(behRow);

        // 子弹覆盖
        const bulRow = document.createElement('div');
        bulRow.setAttribute('style', ROW);
        const bulLab = document.createElement('span');
        bulLab.style.cssText = 'width: 80px; font-size: 11px;';
        bulLab.textContent = '子弹覆盖';
        const bulSel = document.createElement('select');
        bulSel.style.cssText = 'flex: 1; background: #001; color: #fff; border: 1px solid #1a4a5a; padding: 2px;';
        const bulDef = document.createElement('option');
        bulDef.value = '';
        bulDef.textContent = `默认（${t.bulletTexture}）`;
        bulSel.appendChild(bulDef);
        for (const bk of ENEMY_BULLET_KEYS) {
            const opt = document.createElement('option');
            opt.value = bk;
            opt.textContent = bk;
            if (override.bulletTexture === bk) opt.selected = true;
            bulSel.appendChild(opt);
        }
        bulSel.onchange = () => {
            if (bulSel.value === '') delete override.bulletTexture;
            else override.bulletTexture = bulSel.value as EnemyBulletTextureKey;
            e.setBulletTexture(override.bulletTexture ?? t.bulletTexture);
        };
        bulRow.appendChild(bulLab);
        bulRow.appendChild(bulSel);
        parent.appendChild(bulRow);

        // 血条类型（4 选 1，首项"默认"按 tier 自动映射）
        const hbRow = document.createElement('div');
        hbRow.setAttribute('style', ROW);
        const hbLab = document.createElement('span');
        hbLab.style.cssText = 'width: 80px; font-size: 11px;';
        hbLab.textContent = '血条类型';
        const hbSel = document.createElement('select');
        hbSel.style.cssText = 'flex: 1; background: #001; color: #fff; border: 1px solid #1a4a5a; padding: 2px;';
        const hbDef = document.createElement('option');
        hbDef.value = '';
        hbDef.textContent = `默认（${HEALTH_BAR_LABELS[defaultHealthBarByTier(t.tier)]}）`;
        hbSel.appendChild(hbDef);
        for (const ht of HEALTH_BAR_TYPES) {
            const opt = document.createElement('option');
            opt.value = ht;
            opt.textContent = HEALTH_BAR_LABELS[ht];
            if (override.healthBarType === ht) opt.selected = true;
            hbSel.appendChild(opt);
        }
        hbSel.onchange = () => {
            if (hbSel.value === '') delete override.healthBarType;
            else override.healthBarType = hbSel.value as HealthBarType;
            e.setHealthBarType(override.healthBarType ?? defaultHealthBarByTier(t.tier));
        };
        hbRow.appendChild(hbLab);
        hbRow.appendChild(hbSel);
        parent.appendChild(hbRow);

        // F. 行为 tunable 动态滑条
        const tunables = e.behavior?.getTunables() ?? [];
        if (tunables.length > 0) {
            parent.appendChild(sectionTitle('▷ 行为参数'));
            for (const td of tunables) {
                parent.appendChild(sliderRow(td.label, td.get(), td.min, td.max, td.step, (v) => td.set(v)));
            }
        }
    }

    private perEnemyShapeRow(typeKey: keyof typeof ENEMY_TYPE_LABELS): HTMLDivElement {
        const row = document.createElement('div');
        row.setAttribute('style', ROW);

        const lab = document.createElement('span');
        lab.style.cssText = 'width: 50px; font-size: 11px;';
        lab.textContent = ENEMY_TYPE_LABELS[typeKey];

        const shape = debugParams.perEnemyBodyRatio[typeKey];
        const inputStyle =
            'width: 50px; background: #001; color: #fff; border: 1px solid #1a4a5a; padding: 2px;';

        const wLab = document.createElement('span');
        wLab.style.cssText = 'color: #ffaa00; font-size: 10px;';
        wLab.textContent = 'W';
        const wIn = document.createElement('input');
        wIn.type = 'number';
        wIn.value = String(shape.w);
        wIn.style.cssText = inputStyle;
        wIn.min = '0.1';
        wIn.max = '2';
        wIn.step = '0.05';

        const hLab = document.createElement('span');
        hLab.style.cssText = 'color: #ffaa00; font-size: 10px;';
        hLab.textContent = 'H';
        const hIn = document.createElement('input');
        hIn.type = 'number';
        hIn.value = String(shape.h);
        hIn.style.cssText = inputStyle;
        hIn.min = '0.1';
        hIn.max = '2';
        hIn.step = '0.05';

        const apply = (): void => {
            const w = parseFloat(wIn.value);
            const h = parseFloat(hIn.value);
            if (Number.isFinite(w)) debugParams.perEnemyBodyRatio[typeKey].w = w;
            if (Number.isFinite(h)) debugParams.perEnemyBodyRatio[typeKey].h = h;
        };
        wIn.oninput = apply;
        hIn.oninput = apply;

        row.appendChild(lab);
        row.appendChild(wLab);
        row.appendChild(wIn);
        row.appendChild(hLab);
        row.appendChild(hIn);
        return row;
    }

    private bulletSizeRow(key: EnemyBulletTextureKey): HTMLDivElement {
        const row = document.createElement('div');
        row.setAttribute('style', ROW);
        const lab = document.createElement('span');
        lab.style.cssText = 'width: 140px; font-size: 11px;';
        lab.textContent = BULLET_LABELS[key];
        const [w0, h0] = debugParams.bulletSize[key];
        const wIn = document.createElement('input');
        wIn.type = 'number';
        wIn.value = String(w0);
        wIn.style.cssText = 'width: 60px; background: #001; color: #fff; border: 1px solid #1a4a5a; padding: 2px;';
        wIn.min = '4';
        wIn.max = '300';
        wIn.step = '2';
        const x = document.createElement('span');
        x.textContent = '×';
        const hIn = document.createElement('input');
        hIn.type = 'number';
        hIn.value = String(h0);
        hIn.style.cssText = wIn.style.cssText;
        hIn.min = '4';
        hIn.max = '300';
        hIn.step = '2';
        const apply = (): void => {
            const w = parseFloat(wIn.value);
            const h = parseFloat(hIn.value);
            if (!Number.isFinite(w) || !Number.isFinite(h)) return;
            debugParams.bulletSize[key] = [w, h];
        };
        wIn.oninput = apply;
        hIn.oninput = apply;
        row.appendChild(lab);
        row.appendChild(wIn);
        row.appendChild(x);
        row.appendChild(hIn);
        return row;
    }
}
