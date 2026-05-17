import {
    debugParams,
    ENEMY_BULLET_KEYS,
    ENEMY_TYPE_KEYS,
    ENEMY_TYPE_LABELS,
    HEALTH_BAR_TYPES,
    HEALTH_BAR_LABELS,
    BULLET_AIM_MODES,
    BULLET_AIM_LABELS,
    TELEGRAPH_TYPES,
    TELEGRAPH_LABELS,
    type EnemyBulletTextureKey,
    type EnemyTypeKey,
    type HealthBarType,
    type BulletAimMode,
    type TelegraphType,
    type AttackPattern
} from './debugParams.js';
import {
    STYLE, HEADER_STYLE, ROW,
    sliderRow, numberRow, checkboxRow, sectionTitle, button, collapsibleSection
} from './widgets.js';
import type { Enemy } from '../entities/Enemy.js';
import { ENEMY_TYPES, defaultHealthBarByTier } from '../data/enemyTypes.js';
import {
    ENEMY_WEAPON_KEYS,
    ENEMY_WEAPON_LABELS,
    ENEMY_WEAPON_MAP,
    ENEMY_WEAPONS,
    type EnemyWeaponKey
} from '../data/enemyWeapons.js';

const BULLET_LABELS: Record<EnemyBulletTextureKey, string> = {
    'enemy-bullet-small': 'small（侦察/战斗）',
    'enemy-bullet-teardrop': 'teardrop（拦截）',
    'enemy-bullet-shrapnel': 'shrapnel（精英）',
    'enemy-bullet-orb': 'orb（巡洋）',
    'enemy-bullet-heavy': 'heavy（轰炸/母舰）'
};

const BEHAVIOR_OPTIONS = [
    'sinusoidal', 'player-tracker', 'elite-tracker', 'horizontal-sweep', 'hover',
    'zigzag', 'circle', 'figure-8', 'random-walk', 'dive-bomb',
    'pulse', 'charge', 'flank', 'mirror', 'tornado',
    's-curve', 'loop-back', 'bezier-path',
    'ram', 'cycloid', 'spiral-entry', 'helicopter', 'veering-swoop'
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
        const e = this.selectedEnemy;
        if (live) {
            const b = e.body as Phaser.Physics.Arcade.Body | null;
            const vx = b?.velocity.x ?? 0;
            const vy = b?.velocity.y ?? 0;
            live.textContent = `x=${e.x.toFixed(0)} y=${e.y.toFixed(0)} hp=${e.hp} v=(${vx.toFixed(0)},${vy.toFixed(0)})`;
        }
        // 攻击 pattern 运行时状态
        const patternStatus = this.root.querySelector('#__plane_dbg_pattern_status__');
        if (patternStatus) {
            const ov = debugParams.enemyOverrides[e.typeKey];
            const pat = ov?.attackPattern;
            if (!ov?.attackPatternEnabled || !pat || pat.steps.length === 0) {
                patternStatus.textContent = '';
            } else {
                const rt = e.getPatternRuntimeStatus();
                const curStep = pat.steps[rt.stepIdx];
                if (rt.exhausted) {
                    patternStatus.textContent = '⛔ pattern 已结束 (loop=false)';
                } else if (curStep) {
                    const total = rt.inGap ? curStep.gapMs : curStep.durationMs;
                    const pct = total > 0 ? Math.min(100, (rt.elapsed / total) * 100).toFixed(0) : '0';
                    const phase = rt.inGap ? 'gap' : 'fire';
                    patternStatus.textContent = `▶ Step ${rt.stepIdx + 1}/${pat.steps.length} ${phase} ${pct}%`;
                }
            }
        }
    }

    render(): void {
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

        // 显示命中框（F1 也可切）
        r.appendChild(checkboxRow('显示命中框（F1）', debugParams.showHitbox, (v) => (debugParams.showHitbox = v)));

        // === 🎆 特效（全局开关，可折叠）===
        const fxSec = collapsibleSection('🎆 特效', 'fx', false);
        r.appendChild(fxSec.container);
        fxSec.body.appendChild(checkboxRow('启用粒子特效', debugParams.fxEnabled, (v) => (debugParams.fxEnabled = v)));
        fxSec.body.appendChild(sliderRow(
            '特效强度',
            debugParams.fxIntensity,
            0.3,
            3.0,
            0.1,
            (v) => (debugParams.fxIntensity = v)
        ));

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

        // === 🔫 武器子区（折叠）===
        const weaponSec = collapsibleSection('🔫 武器', 'weapon');
        parent.appendChild(weaponSec.container);
        const weaponBody = weaponSec.body;

        // 发射方式（5 选 1，首项"默认"按 ENEMY_WEAPON_MAP 走）
        const defWeap: EnemyWeaponKey = ENEMY_WEAPON_MAP[typeKey] ?? 'single';
        const weapRow = document.createElement('div');
        weapRow.setAttribute('style', ROW);
        const weapLab = document.createElement('span');
        weapLab.style.cssText = 'width: 80px; font-size: 11px;';
        weapLab.textContent = '发射方式';
        const weapSel = document.createElement('select');
        weapSel.style.cssText = 'flex: 1; background: #001; color: #fff; border: 1px solid #1a4a5a; padding: 2px;';
        const weapDef = document.createElement('option');
        weapDef.value = '';
        weapDef.textContent = `默认（${ENEMY_WEAPON_LABELS[defWeap]}）`;
        weapSel.appendChild(weapDef);
        for (const wk of ENEMY_WEAPON_KEYS) {
            const opt = document.createElement('option');
            opt.value = wk;
            opt.textContent = ENEMY_WEAPON_LABELS[wk];
            if (override.weaponKey === wk) opt.selected = true;
            weapSel.appendChild(opt);
        }
        weapSel.onchange = () => {
            if (weapSel.value === '') delete override.weaponKey;
            else override.weaponKey = weapSel.value;
            e.setWeapon((override.weaponKey as EnemyWeaponKey | undefined) ?? defWeap);
        };
        weapRow.appendChild(weapLab);
        weapRow.appendChild(weapSel);
        weaponBody.appendChild(weapRow);

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
        weaponBody.appendChild(bulRow);

        // 子弹方向（2 选 1，首项"默认（面向英雄机）"清 override）
        const aimRow = document.createElement('div');
        aimRow.setAttribute('style', ROW);
        const aimLab = document.createElement('span');
        aimLab.style.cssText = 'width: 80px; font-size: 11px;';
        aimLab.textContent = '子弹方向';
        const aimSel = document.createElement('select');
        aimSel.style.cssText = 'flex: 1; background: #001; color: #fff; border: 1px solid #1a4a5a; padding: 2px;';
        const aimDef = document.createElement('option');
        aimDef.value = '';
        aimDef.textContent = `默认（${BULLET_AIM_LABELS.aim}）`;
        aimSel.appendChild(aimDef);
        for (const m of BULLET_AIM_MODES) {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = BULLET_AIM_LABELS[m];
            if (override.bulletAim === m) opt.selected = true;
            aimSel.appendChild(opt);
        }
        aimSel.onchange = () => {
            if (aimSel.value === '') delete override.bulletAim;
            else override.bulletAim = aimSel.value as BulletAimMode;
            e.setBulletAim(override.bulletAim ?? 'aim');
        };
        aimRow.appendChild(aimLab);
        aimRow.appendChild(aimSel);
        weaponBody.appendChild(aimRow);

        // 攻击间隔 ms（覆盖 weaponKey 默认 intervalMs；越小越频繁）
        const curWeaponInterval = ENEMY_WEAPONS[e.weaponKey].intervalMs;
        weaponBody.appendChild(sliderRow(
            '攻击间隔 ms',
            override.attackIntervalMs ?? curWeaponInterval,
            100,
            5000,
            50,
            (v) => {
                override.attackIntervalMs = v;
                e.setAttackInterval(v);
            }
        ));

        // 子弹速度 px/s（覆盖 weaponKey 默认 bulletSpeed；越大越快）
        const curWeaponSpeed = ENEMY_WEAPONS[e.weaponKey].bulletSpeed;
        weaponBody.appendChild(sliderRow(
            '子弹速度',
            override.bulletSpeed ?? curWeaponSpeed,
            50,
            1500,
            10,
            (v) => {
                override.bulletSpeed = v;
                e.setBulletSpeed(v);
            }
        ));

        // === 🚨 预警线（折叠）===
        const teleSec = collapsibleSection('🚨 预警线', 'telegraph');
        parent.appendChild(teleSec.container);
        const teleBody = teleSec.body;

        // 启用复选框
        teleBody.appendChild(checkboxRow(
            '启用预警',
            override.telegraphEnabled ?? false,
            (v) => {
                override.telegraphEnabled = v;
                e.setTelegraphEnabled(v);
            }
        ));

        // 线型（4 选 1）
        const tgRow = document.createElement('div');
        tgRow.setAttribute('style', ROW);
        const tgLab = document.createElement('span');
        tgLab.style.cssText = 'width: 80px; font-size: 11px;';
        tgLab.textContent = '预警类型';
        const tgSel = document.createElement('select');
        tgSel.style.cssText = 'flex: 1; background: #001; color: #fff; border: 1px solid #1a4a5a; padding: 2px;';
        for (const tt of TELEGRAPH_TYPES) {
            const opt = document.createElement('option');
            opt.value = tt;
            opt.textContent = TELEGRAPH_LABELS[tt];
            if ((override.telegraphType ?? 'line-solid') === tt) opt.selected = true;
            tgSel.appendChild(opt);
        }
        tgSel.onchange = () => {
            override.telegraphType = tgSel.value as TelegraphType;
            e.setTelegraphType(override.telegraphType);
        };
        tgRow.appendChild(tgLab);
        tgRow.appendChild(tgSel);
        teleBody.appendChild(tgRow);

        // 预警时间 ms
        teleBody.appendChild(sliderRow(
            '预警时间 ms',
            override.telegraphMs ?? 500,
            100,
            2000,
            50,
            (v) => {
                override.telegraphMs = v;
                e.setTelegraphMs(v);
            }
        ));

        // === 📐 尺寸（折叠）===
        const sizeSec = collapsibleSection('📐 尺寸', 'size', false);
        parent.appendChild(sizeSec.container);
        const sizeBody = sizeSec.body;

        // 显示宽度 W（绝对 px）
        sizeBody.appendChild(sliderRow(
            '宽度 W px',
            override.displayW ?? Math.round(e.displayWidth),
            20,
            400,
            5,
            (v) => {
                override.displayW = v;
                // displayH 没设过的话，把当前 H 也写入 override 让两边都被记录
                if (override.displayH === undefined) override.displayH = Math.round(e.displayHeight);
                e.refreshDisplaySize();
            }
        ));

        // 显示高度 H
        sizeBody.appendChild(sliderRow(
            '高度 H px',
            override.displayH ?? Math.round(e.displayHeight),
            20,
            400,
            5,
            (v) => {
                override.displayH = v;
                if (override.displayW === undefined) override.displayW = Math.round(e.displayWidth);
                e.refreshDisplaySize();
            }
        ));

        // 命中宽 ratio（默认 enemyBodyRatio * perEnemyBodyRatio.w，本机覆盖时取 override）
        const defaultHitW = debugParams.enemyBodyRatio * (debugParams.perEnemyBodyRatio[typeKey]?.w ?? 1);
        const defaultHitH = debugParams.enemyBodyRatio * (debugParams.perEnemyBodyRatio[typeKey]?.h ?? 1);
        sizeBody.appendChild(sliderRow(
            '命中宽 ratio',
            override.hitW ?? defaultHitW,
            0.1,
            2.0,
            0.05,
            (v) => {
                override.hitW = v;
                e.refreshHitbox();
            }
        ));

        // 命中高 ratio
        sizeBody.appendChild(sliderRow(
            '命中高 ratio',
            override.hitH ?? defaultHitH,
            0.1,
            2.0,
            0.05,
            (v) => {
                override.hitH = v;
                e.refreshHitbox();
            }
        ));

        // === 🎭 攻击模式（多重 Step Pattern，折叠）===
        const patSec = collapsibleSection('🎭 攻击模式', 'pattern', false);
        parent.appendChild(patSec.container);
        this.renderAttackPatternSection(patSec.body, override, e);

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

        // F. 行为 tunable 动态滑条（折叠）
        const tunables = e.behavior?.getTunables() ?? [];
        if (tunables.length > 0) {
            const behSec = collapsibleSection('▷ 行为参数', 'behavior');
            parent.appendChild(behSec.container);
            for (const td of tunables) {
                behSec.body.appendChild(sliderRow(td.label, td.get(), td.min, td.max, td.step, (v) => td.set(v)));
            }
        }
    }

    private renderAttackPatternSection(
        parent: HTMLElement,
        override: import('./debugParams.js').EnemyOverride,
        e: Enemy
    ): void {
        // 标题由外层 collapsibleSection 提供，这里不再加 sectionTitle
        // 启用复选框
        parent.appendChild(checkboxRow(
            '启用 Pattern',
            override.attackPatternEnabled ?? false,
            (v) => {
                override.attackPatternEnabled = v;
                // 切换后让运行时立刻应用：清状态
                e.resetAttackPattern();
                this.render();
            }
        ));

        // 确保 pattern 对象存在（不打勾时不创建，避免污染数据）
        if (!override.attackPatternEnabled) return;
        if (!override.attackPattern) {
            override.attackPattern = { steps: [], loop: true };
        }
        const pat: AttackPattern = override.attackPattern;
        const editIdx = override.attackPatternEditingIdx ?? 0;

        // Step 列表头：dropdown + 加 + 删
        const headerRow = document.createElement('div');
        headerRow.setAttribute('style', ROW);
        const headerLab = document.createElement('span');
        headerLab.style.cssText = 'width: 80px; font-size: 11px;';
        headerLab.textContent = `Step (${pat.steps.length})`;
        headerRow.appendChild(headerLab);
        const stepSel = document.createElement('select');
        stepSel.style.cssText = 'flex: 1; background: #001; color: #fff; border: 1px solid #1a4a5a; padding: 2px;';
        for (let i = 0; i < pat.steps.length; i++) {
            const opt = document.createElement('option');
            opt.value = String(i);
            const s = pat.steps[i]!;
            const label = s.label ?? `Step ${i + 1}`;
            const w = s.weaponKey ?? '继承';
            opt.textContent = `${label} (${w}, ${s.durationMs}+${s.gapMs}ms)`;
            if (i === editIdx) opt.selected = true;
            stepSel.appendChild(opt);
        }
        if (pat.steps.length === 0) {
            const opt = document.createElement('option');
            opt.textContent = '(空)';
            stepSel.appendChild(opt);
            stepSel.disabled = true;
        }
        stepSel.onchange = () => {
            override.attackPatternEditingIdx = parseInt(stepSel.value, 10);
            this.render();
        };
        headerRow.appendChild(stepSel);
        parent.appendChild(headerRow);

        // 操作按钮：加 step / 删当前 / 复制
        const actionRow = document.createElement('div');
        actionRow.setAttribute('style', 'display: flex; gap: 4px; margin: 2px 0 6px 0;');
        actionRow.appendChild(button('➕ 新 Step', () => {
            // 新 step 默认武器 + 子弹都按 idx 循环：
            //   武器：single → double → rapid → fan → barrage
            //   子弹：small → teardrop → shrapnel → orb → heavy
            // 让"切武器"和"切子弹"立即可见。用户仍可在对应 dropdown 改成"继承"
            const idx = pat.steps.length;
            const autoWeapon = ENEMY_WEAPON_KEYS[idx % ENEMY_WEAPON_KEYS.length]!;
            const autoBullet = ENEMY_BULLET_KEYS[idx % ENEMY_BULLET_KEYS.length]!;
            pat.steps.push({
                durationMs: 1500,
                gapMs: 300,
                weaponKey: autoWeapon,
                bulletTexture: autoBullet
            });
            override.attackPatternEditingIdx = idx;
            e.resetAttackPattern();
            this.render();
        }));
        actionRow.appendChild(button('📋 复制', () => {
            const cur = pat.steps[editIdx];
            if (cur) {
                pat.steps.splice(editIdx + 1, 0, JSON.parse(JSON.stringify(cur)));
                override.attackPatternEditingIdx = editIdx + 1;
                e.resetAttackPattern();
                this.render();
            }
        }));
        actionRow.appendChild(button('🗑 删除', () => {
            if (pat.steps.length === 0) return;
            pat.steps.splice(editIdx, 1);
            override.attackPatternEditingIdx = Math.max(0, Math.min(editIdx, pat.steps.length - 1));
            e.resetAttackPattern();
            this.render();
        }));
        actionRow.appendChild(button('▶ 重置', () => {
            e.resetAttackPattern();
        }));
        parent.appendChild(actionRow);

        // 循环复选框
        parent.appendChild(checkboxRow(
            '循环 (loop)',
            pat.loop,
            (v) => { pat.loop = v; e.resetAttackPattern(); }
        ));

        // 当前 step 编辑器（如有）
        const step = pat.steps[editIdx];
        if (!step) return;

        // 时长 / 间隔
        parent.appendChild(sliderRow(
            'Step 持续 ms',
            step.durationMs,
            100, 10000, 100,
            (v) => { step.durationMs = v; }
        ));
        parent.appendChild(sliderRow(
            'Step 间隔 ms',
            step.gapMs,
            0, 5000, 50,
            (v) => { step.gapMs = v; }
        ));

        // 武器（dropdown 第一项"继承基础"）
        const wRow = document.createElement('div');
        wRow.setAttribute('style', ROW);
        const wLab = document.createElement('span');
        wLab.style.cssText = 'width: 80px; font-size: 11px;';
        wLab.textContent = 'Step 武器';
        const wSel = document.createElement('select');
        wSel.style.cssText = 'flex: 1; background: #001; color: #fff; border: 1px solid #1a4a5a; padding: 2px;';
        const wDef = document.createElement('option');
        wDef.value = '';
        wDef.textContent = `继承（${e.weaponKey}）`;
        wSel.appendChild(wDef);
        for (const wk of ENEMY_WEAPON_KEYS) {
            const opt = document.createElement('option');
            opt.value = wk;
            opt.textContent = ENEMY_WEAPON_LABELS[wk];
            if (step.weaponKey === wk) opt.selected = true;
            wSel.appendChild(opt);
        }
        wSel.onchange = () => {
            if (wSel.value === '') delete step.weaponKey;
            else step.weaponKey = wSel.value;
            this.render();  // 刷新列表（step label 变化）
        };
        wRow.appendChild(wLab);
        wRow.appendChild(wSel);
        parent.appendChild(wRow);

        // Step 子弹 dropdown（第一项"继承"= undefined）
        const bRow = document.createElement('div');
        bRow.setAttribute('style', ROW);
        const bLab = document.createElement('span');
        bLab.style.cssText = 'width: 80px; font-size: 11px;';
        bLab.textContent = 'Step 子弹';
        const bSel = document.createElement('select');
        bSel.style.cssText = 'flex: 1; background: #001; color: #fff; border: 1px solid #1a4a5a; padding: 2px;';
        const bDef = document.createElement('option');
        bDef.value = '';
        bDef.textContent = `继承（${e.bulletTextureKey}）`;
        bSel.appendChild(bDef);
        for (const bk of ENEMY_BULLET_KEYS) {
            const opt = document.createElement('option');
            opt.value = bk;
            opt.textContent = bk;
            if (step.bulletTexture === bk) opt.selected = true;
            bSel.appendChild(opt);
        }
        bSel.onchange = () => {
            if (bSel.value === '') delete step.bulletTexture;
            else step.bulletTexture = bSel.value as EnemyBulletTextureKey;
        };
        bRow.appendChild(bLab);
        bRow.appendChild(bSel);
        parent.appendChild(bRow);

        // 攻击间隔覆盖（复选框 + 滑条）
        const intvHasOverride = step.attackIntervalMs !== undefined;
        parent.appendChild(checkboxRow(
            'Step 覆盖间隔',
            intvHasOverride,
            (v) => {
                if (v) step.attackIntervalMs = e.attackIntervalMs ?? 1000;
                else delete step.attackIntervalMs;
                this.render();
            }
        ));
        if (intvHasOverride) {
            parent.appendChild(sliderRow(
                'Step 间隔 ms',
                step.attackIntervalMs!,
                100, 5000, 50,
                (v) => { step.attackIntervalMs = v; }
            ));
        }

        // 预警三态：继承 / 强制开 / 强制关
        const teleRow = document.createElement('div');
        teleRow.setAttribute('style', ROW);
        const teleLab = document.createElement('span');
        teleLab.style.cssText = 'width: 80px; font-size: 11px;';
        teleLab.textContent = 'Step 预警';
        const teleSel = document.createElement('select');
        teleSel.style.cssText = 'flex: 1; background: #001; color: #fff; border: 1px solid #1a4a5a; padding: 2px;';
        const teleOptInherit = document.createElement('option');
        teleOptInherit.value = '';
        teleOptInherit.textContent = `继承（${e.telegraphEnabled ? '开' : '关'}）`;
        teleSel.appendChild(teleOptInherit);
        const teleOptOn = document.createElement('option');
        teleOptOn.value = 'on';
        teleOptOn.textContent = '强制开';
        teleSel.appendChild(teleOptOn);
        const teleOptOff = document.createElement('option');
        teleOptOff.value = 'off';
        teleOptOff.textContent = '强制关';
        teleSel.appendChild(teleOptOff);
        if (step.telegraphEnabled === true) teleOptOn.selected = true;
        else if (step.telegraphEnabled === false) teleOptOff.selected = true;
        else teleOptInherit.selected = true;
        teleSel.onchange = () => {
            if (teleSel.value === 'on') step.telegraphEnabled = true;
            else if (teleSel.value === 'off') step.telegraphEnabled = false;
            else delete step.telegraphEnabled;
            this.render();
        };
        teleRow.appendChild(teleLab);
        teleRow.appendChild(teleSel);
        parent.appendChild(teleRow);

        // 预警类型 + 时间（仅在 step 强制开时显示编辑器，其他情况继承）
        if (step.telegraphEnabled === true) {
            const tgRow = document.createElement('div');
            tgRow.setAttribute('style', ROW);
            const tgLab = document.createElement('span');
            tgLab.style.cssText = 'width: 80px; font-size: 11px;';
            tgLab.textContent = 'Step 线型';
            const tgSel = document.createElement('select');
            tgSel.style.cssText = 'flex: 1; background: #001; color: #fff; border: 1px solid #1a4a5a; padding: 2px;';
            const tgDef = document.createElement('option');
            tgDef.value = '';
            tgDef.textContent = `继承（${e.telegraphType}）`;
            tgSel.appendChild(tgDef);
            for (const tt of TELEGRAPH_TYPES) {
                const opt = document.createElement('option');
                opt.value = tt;
                opt.textContent = TELEGRAPH_LABELS[tt];
                if (step.telegraphType === tt) opt.selected = true;
                tgSel.appendChild(opt);
            }
            tgSel.onchange = () => {
                if (tgSel.value === '') delete step.telegraphType;
                else step.telegraphType = tgSel.value as TelegraphType;
            };
            tgRow.appendChild(tgLab);
            tgRow.appendChild(tgSel);
            parent.appendChild(tgRow);

            const teleMsHasOverride = step.telegraphMs !== undefined;
            parent.appendChild(checkboxRow(
                'Step 覆盖预警时长',
                teleMsHasOverride,
                (v) => {
                    if (v) step.telegraphMs = e.telegraphMs;
                    else delete step.telegraphMs;
                    this.render();
                }
            ));
            if (teleMsHasOverride) {
                parent.appendChild(sliderRow(
                    'Step 预警 ms',
                    step.telegraphMs!,
                    100, 2000, 50,
                    (v) => { step.telegraphMs = v; }
                ));
            }
        }

        // 运行时状态显示（每帧由 tick() 刷新内容）
        const status = document.createElement('div');
        status.id = '__plane_dbg_pattern_status__';
        status.style.cssText = 'padding: 2px 4px; font-size: 11px; color: #88ccff; margin-top: 2px;';
        parent.appendChild(status);
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
