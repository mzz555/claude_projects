import {
    debugParams,
    ENEMY_BULLET_KEYS,
    ENEMY_TYPE_KEYS,
    ENEMY_TYPE_LABELS,
    type EnemyBulletTextureKey
} from './debugParams.js';

const BULLET_LABELS: Record<EnemyBulletTextureKey, string> = {
    'enemy-bullet-small': 'small（侦察/战斗）',
    'enemy-bullet-teardrop': 'teardrop（拦截）',
    'enemy-bullet-shrapnel': 'shrapnel（精英）',
    'enemy-bullet-orb': 'orb（巡洋）',
    'enemy-bullet-heavy': 'heavy（轰炸/母舰）'
};

const STYLE = `
  position: fixed; top: 8px; right: 8px; z-index: 9999;
  width: 320px; max-height: 95vh; overflow-y: auto;
  background: rgba(0, 16, 24, 0.92); color: #7df9ff;
  font: 12px/1.4 monospace, "Microsoft YaHei";
  border: 1px solid #1a4a5a; border-radius: 4px;
  padding: 8px 10px; user-select: none;
`;

const HEADER_STYLE = `
  font-weight: bold; font-size: 13px; color: #fff;
  border-bottom: 1px solid #1a4a5a; padding-bottom: 4px; margin-bottom: 6px;
  display: flex; justify-content: space-between; align-items: center;
`;

const SECTION_TITLE = `
  color: #ffaa00; font-weight: bold; margin-top: 8px; margin-bottom: 4px;
`;

const ROW = `
  display: flex; align-items: center; gap: 6px; margin: 3px 0;
`;

const VALUE_BADGE = `
  display: inline-block; min-width: 38px; text-align: right;
  color: #fff; font-weight: bold;
`;

const BTN = `
  background: #1a4a5a; color: #fff; border: 1px solid #2a6a7a;
  padding: 4px 8px; font: 11px monospace; cursor: pointer; border-radius: 2px;
`;

export class DebugPanel {
    private root: HTMLDivElement | null = null;
    private collapsed = false;

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

    private render(): void {
        if (!this.root) return;
        const r = this.root;
        r.innerHTML = '';

        // 标题栏
        const header = document.createElement('div');
        header.setAttribute('style', HEADER_STYLE);
        header.innerHTML = `<span>🛠 调参面板 (F1 切换命中框)</span>`;
        const toggleBtn = document.createElement('button');
        toggleBtn.setAttribute('style', BTN);
        toggleBtn.textContent = this.collapsed ? '展开' : '折叠';
        toggleBtn.onclick = (): void => {
            this.collapsed = !this.collapsed;
            this.render();
        };
        header.appendChild(toggleBtn);
        r.appendChild(header);

        if (this.collapsed) return;

        // === 敌机 ===
        const enemyTitle = document.createElement('div');
        enemyTitle.setAttribute('style', SECTION_TITLE);
        enemyTitle.textContent = '敌机';
        r.appendChild(enemyTitle);

        r.appendChild(
            this.sliderRow(
                '贴图缩放',
                debugParams.enemyDisplayScale,
                1,
                8,
                0.25,
                (v) => (debugParams.enemyDisplayScale = v)
            )
        );
        r.appendChild(
            this.sliderRow(
                '全局 hitbox',
                debugParams.enemyBodyRatio,
                0.2,
                1.5,
                0.05,
                (v) => (debugParams.enemyBodyRatio = v)
            )
        );

        // === 每机微调（形状）===
        const perEnemyTitle = document.createElement('div');
        perEnemyTitle.setAttribute('style', SECTION_TITLE);
        perEnemyTitle.textContent = '每机 hitbox 形状（W × H，叠乘到全局）';
        r.appendChild(perEnemyTitle);

        for (const typeKey of ENEMY_TYPE_KEYS) {
            r.appendChild(this.perEnemyShapeRow(typeKey));
        }

        // === 子弹 ===
        const bulletTitle = document.createElement('div');
        bulletTitle.setAttribute('style', SECTION_TITLE);
        bulletTitle.textContent = '子弹尺寸（W × H）';
        r.appendChild(bulletTitle);

        for (const key of ENEMY_BULLET_KEYS) {
            r.appendChild(this.bulletSizeRow(key));
        }

        // === 开关 ===
        const toggleTitle = document.createElement('div');
        toggleTitle.setAttribute('style', SECTION_TITLE);
        toggleTitle.textContent = '可视化';
        r.appendChild(toggleTitle);
        r.appendChild(this.checkboxRow('显示命中框（F1）', debugParams.showHitbox, (v) => (debugParams.showHitbox = v)));

        // === 操作 ===
        const actions = document.createElement('div');
        actions.setAttribute('style', 'margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;');

        const copyBtn = document.createElement('button');
        copyBtn.setAttribute('style', BTN);
        copyBtn.textContent = '📋 复制当前参数';
        copyBtn.onclick = (): void => {
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
        };
        actions.appendChild(copyBtn);

        const dumpBtn = document.createElement('button');
        dumpBtn.setAttribute('style', BTN);
        dumpBtn.textContent = '🖨 打印到控制台';
        dumpBtn.onclick = (): void => {
            // eslint-disable-next-line no-console
            console.log('[debugParams]', JSON.parse(JSON.stringify(debugParams)));
        };
        actions.appendChild(dumpBtn);

        r.appendChild(actions);
    }

    private sliderRow(
        label: string,
        initial: number,
        min: number,
        max: number,
        step: number,
        onChange: (v: number) => void
    ): HTMLDivElement {
        const row = document.createElement('div');
        row.setAttribute('style', ROW);
        const lab = document.createElement('span');
        lab.style.cssText = 'width: 80px;';
        lab.textContent = label;
        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
        input.value = String(initial);
        input.style.cssText = 'flex: 1;';
        const badge = document.createElement('span');
        badge.setAttribute('style', VALUE_BADGE);
        badge.textContent = initial.toFixed(2);
        input.oninput = (): void => {
            const v = parseFloat(input.value);
            badge.textContent = v.toFixed(2);
            onChange(v);
        };
        row.appendChild(lab);
        row.appendChild(input);
        row.appendChild(badge);
        return row;
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

    private checkboxRow(
        label: string,
        initial: boolean,
        onChange: (v: boolean) => void
    ): HTMLDivElement {
        const row = document.createElement('div');
        row.setAttribute('style', ROW);
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = initial;
        input.onchange = (): void => onChange(input.checked);
        const lab = document.createElement('label');
        lab.appendChild(input);
        const text = document.createElement('span');
        text.style.cssText = 'margin-left: 6px;';
        text.textContent = label;
        lab.appendChild(text);
        lab.style.cssText = 'cursor: pointer;';
        row.appendChild(lab);
        return row;
    }
}
