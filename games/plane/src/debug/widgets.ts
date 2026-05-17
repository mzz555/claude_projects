// 公用 DOM widget 辅助函数，供 DebugPanel、EnemyInspector 等复用

export const STYLE = `
  position: fixed; top: 8px; right: 8px; z-index: 9999;
  width: 320px; max-height: 95vh; overflow-y: auto;
  background: rgba(0, 16, 24, 0.92); color: #7df9ff;
  font: 12px/1.4 monospace, "Microsoft YaHei";
  border: 1px solid #1a4a5a; border-radius: 4px;
  padding: 8px 10px; user-select: none;
`;

export const HEADER_STYLE = `
  font-weight: bold; font-size: 13px; color: #fff;
  border-bottom: 1px solid #1a4a5a; padding-bottom: 4px; margin-bottom: 6px;
  display: flex; justify-content: space-between; align-items: center;
`;

export const SECTION_TITLE = `
  color: #ffaa00; font-weight: bold; margin-top: 8px; margin-bottom: 4px;
`;

export const ROW = `
  display: flex; align-items: center; gap: 6px; margin: 3px 0;
`;

export const VALUE_BADGE = `
  display: inline-block; min-width: 38px; text-align: right;
  color: #fff; font-weight: bold;
`;

export const BTN = `
  background: #1a4a5a; color: #fff; border: 1px solid #2a6a7a;
  padding: 4px 8px; font: 11px monospace; cursor: pointer; border-radius: 2px;
`;

/** 按 step 决定保留小数位数：>=1 → 整数；>=0.1 → 1 位；其余 → 2 位 */
function formatByStep(v: number, step: number): string {
    if (step >= 1) return String(Math.round(v));
    if (step >= 0.1) return v.toFixed(1);
    return v.toFixed(2);
}

export function sliderRow(
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
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(initial);
    slider.style.cssText = 'flex: 1; min-width: 80px;';
    // 数值显示：用 number input 取代 span，允许用户点击直接输入精确值
    const valIn = document.createElement('input');
    valIn.type = 'number';
    valIn.min = String(min);
    valIn.max = String(max);
    valIn.step = String(step);
    valIn.value = formatByStep(initial, step);
    valIn.style.cssText = `${VALUE_BADGE} width: 56px; background: rgba(0,0,0,0.45); border: 1px solid #2a6a7a; padding: 1px 3px; outline: none; font: 11px monospace; text-align: right;`;

    slider.oninput = (): void => {
        const v = parseFloat(slider.value);
        valIn.value = formatByStep(v, step);
        onChange(v);
    };
    valIn.oninput = (): void => {
        const raw = parseFloat(valIn.value);
        if (!Number.isFinite(raw)) return;
        const clamped = Math.min(max, Math.max(min, raw));
        slider.value = String(clamped);
        onChange(clamped);
    };
    // 失焦时矫正显示（NaN / 超界 → 重新格式化）
    valIn.onblur = (): void => {
        const raw = parseFloat(valIn.value);
        if (!Number.isFinite(raw)) {
            valIn.value = formatByStep(parseFloat(slider.value), step);
            return;
        }
        const clamped = Math.min(max, Math.max(min, raw));
        valIn.value = formatByStep(clamped, step);
        slider.value = String(clamped);
    };
    row.appendChild(lab);
    row.appendChild(slider);
    row.appendChild(valIn);
    return row;
}

export function numberRow(
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
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(initial);
    input.style.cssText = 'width: 80px; background: #001; color: #fff; border: 1px solid #1a4a5a; padding: 2px;';
    input.oninput = (): void => {
        const v = parseFloat(input.value);
        if (Number.isFinite(v)) onChange(v);
    };
    row.appendChild(lab);
    row.appendChild(input);
    return row;
}

export function checkboxRow(
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

export function sectionTitle(text: string): HTMLDivElement {
    const d = document.createElement('div');
    d.setAttribute('style', SECTION_TITLE);
    d.textContent = text;
    return d;
}

const COLLAPSE_KEY_PREFIX = '__plane_dbg_collapse_';

/**
 * 可折叠 section（HTML details + summary，状态写 localStorage 跨 reload 保留）。
 * 调用方把内容塞进返回的 body 元素，container 塞进 parent。
 *
 * key 用稳定字符串（weapon / telegraph / size / pattern / fx），同一 key 跨次 mount 状态一致。
 * initialOpen 仅在 localStorage 无记录时生效。
 */
export function collapsibleSection(
    title: string,
    key: string,
    initialOpen = true
): { container: HTMLDetailsElement; body: HTMLDetailsElement } {
    const details = document.createElement('details');
    details.style.cssText = 'margin: 6px 0; padding: 0;';
    const summary = document.createElement('summary');
    summary.setAttribute('style', SECTION_TITLE + ' cursor: pointer; outline: none; list-style: none;');
    // 用 ::-webkit-details-marker { display:none } 隐藏原生箭头；用 :before 加自定义箭头
    // 这里直接在 textContent 用 ▶/▼ 字符更稳：兼容 firefox/chrome 一致
    const updateLabel = (): void => {
        summary.textContent = (details.open ? '▼ ' : '▶ ') + title;
    };
    const stored = localStorage.getItem(COLLAPSE_KEY_PREFIX + key);
    details.open = stored != null ? stored === '1' : initialOpen;
    updateLabel();
    details.addEventListener('toggle', () => {
        localStorage.setItem(COLLAPSE_KEY_PREFIX + key, details.open ? '1' : '0');
        updateLabel();
    });
    details.appendChild(summary);
    // body 直接用 details 本身：append 进来的内容自动只在 open=true 时显示
    return { container: details, body: details };
}

export function button(text: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.setAttribute('style', BTN);
    b.textContent = text;
    b.onclick = onClick;
    return b;
}
