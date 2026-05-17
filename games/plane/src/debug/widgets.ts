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

export function button(text: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.setAttribute('style', BTN);
    b.textContent = text;
    b.onclick = onClick;
    return b;
}
