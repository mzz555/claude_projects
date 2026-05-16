import { describe, it, expect } from 'vitest';
import { FP_DATA } from '../src/data/powerups.js';

describe('FP_DATA 火力道具贴图表', () => {
    it('索引 0..6 共 7 项（0 占位，1..6 对应升级后等级）', () => {
        expect(FP_DATA).toHaveLength(7);
    });

    it('Lv1 绿 / Lv2 黄 / Lv3 橙 / Lv4 红 / Lv5 紫 / Lv6 青（颜色梯度独特）', () => {
        const colors = [1, 2, 3, 4, 5, 6].map((i) => FP_DATA[i]!.color);
        const unique = new Set(colors);
        expect(unique.size).toBe(6);
    });

    it('每项含 color/icon/shape 三字段', () => {
        for (let i = 1; i <= 6; i++) {
            const v = FP_DATA[i]!;
            expect(typeof v.color).toBe('number');
            expect(typeof v.icon).toBe('string');
            expect(['diamond', 'circle', 'star', 'pentagon', 'hex', 'burst']).toContain(v.shape);
        }
    });
});
