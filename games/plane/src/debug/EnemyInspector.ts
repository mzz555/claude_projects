import type { Enemy } from '../entities/Enemy.js';
import { debugParams, ENEMY_TYPE_LABELS, type EnemyTypeKey } from './debugParams.js';
import { STYLE, sectionTitle, sliderRow, numberRow } from './widgets.js';

export class EnemyInspector {
    private root: HTMLDivElement | null = null;
    /** 选中的敌机实例（运行时引用，可能被回收） */
    private selected: Enemy | null = null;

    mount(): void {
        if (this.root) return;
        const r = document.createElement('div');
        r.id = '__plane_enemy_inspector__';
        const leftStyle = STYLE.replace('right: 8px', 'left: 8px').replace('width: 320px', 'width: 280px');
        r.setAttribute('style', leftStyle);
        document.body.appendChild(r);
        this.root = r;
        this.render();
    }

    unmount(): void {
        this.root?.remove();
        this.root = null;
        this.selected = null;
    }

    select(enemy: Enemy | null): void {
        this.selected = enemy;
        debugParams.selectedEnemyTypeKey = enemy?.typeKey ?? null;
        this.render();
    }

    /** 每帧调用刷新运行时数据（坐标/速度等） */
    tick(): void {
        if (!this.root || !this.selected) return;
        const live = this.root.querySelector('#__live_data__');
        if (live && this.selected.active) {
            const body = this.selected.body as Phaser.Physics.Arcade.Body;
            live.textContent =
                `x=${this.selected.x.toFixed(0)} y=${this.selected.y.toFixed(0)} ` +
                `vx=${body.velocity.x.toFixed(0)} vy=${body.velocity.y.toFixed(0)} ` +
                `hp=${this.selected.hp}`;
        }
    }

    private render(): void {
        if (!this.root) return;
        const r = this.root;
        r.innerHTML = '';

        const header = document.createElement('div');
        header.style.cssText = 'font-weight: bold; color: #fff; border-bottom: 1px solid #1a4a5a; padding-bottom: 4px; margin-bottom: 6px;';
        header.textContent = '🎯 EnemyInspector';
        r.appendChild(header);

        if (!this.selected) {
            const hint = document.createElement('div');
            hint.style.cssText = 'color: #888;';
            hint.textContent = '点击场上任一敌机查看详情';
            r.appendChild(hint);
            return;
        }

        const typeKey = this.selected.typeKey;

        r.appendChild(sectionTitle(`选中：${ENEMY_TYPE_LABELS[typeKey]} (${typeKey})`));

        // 实时数据行（每帧 tick 刷新）
        const live = document.createElement('div');
        live.id = '__live_data__';
        live.style.cssText = 'color: #7df9ff; font-size: 11px; margin: 4px 0;';
        live.textContent = '...';
        r.appendChild(live);

        // 属性 override
        r.appendChild(sectionTitle('属性 override'));
        const override = debugParams.enemyOverrides[typeKey] ?? {};
        r.appendChild(numberRow('hp', override.hp ?? this.selected.hp, 1, 999, 1, (v) => {
            debugParams.enemyOverrides[typeKey] = { ...override, hp: v };
        }));
        r.appendChild(numberRow('score', override.score ?? this.selected.score, 0, 9999, 10, (v) => {
            debugParams.enemyOverrides[typeKey] = { ...override, score: v };
        }));
        r.appendChild(numberRow('dmg', override.dmg ?? this.selected.dmg, 0, 99, 1, (v) => {
            debugParams.enemyOverrides[typeKey] = { ...override, dmg: v };
        }));

        // 行为 + 行为内 tunables
        r.appendChild(sectionTitle('行为'));
        const beh = this.selected.behavior;
        if (beh) {
            const idLine = document.createElement('div');
            idLine.style.cssText = 'color: #ffaa00; font-size: 11px;';
            idLine.textContent = `当前：${beh.displayName} (${beh.id})`;
            r.appendChild(idLine);

            for (const t of beh.getTunables()) {
                r.appendChild(sliderRow(t.label, t.get(), t.min, t.max, t.step, t.set));
            }
        }
    }
}
