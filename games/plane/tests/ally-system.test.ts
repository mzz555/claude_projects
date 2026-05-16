import { describe, it, expect } from 'vitest';
import { AllySystem } from '../src/systems/AllySystem.js';

describe('AllySystem/charges 管理', () => {
    it('初始 3 个支援', () => {
        const a = new AllySystem();
        expect(a.getCharges()).toBe(3);
    });

    it('addCharge 上限 5', () => {
        const a = new AllySystem();
        for (let i = 0; i < 10; i++) a.addCharge();
        expect(a.getCharges()).toBe(5);
    });

    it('tryDeploy 消耗 1 个支援', () => {
        const a = new AllySystem();
        const ok = a.tryDeploy();
        expect(ok).toBe(true);
        expect(a.getCharges()).toBe(2);
    });

    it('charges=0 时 tryDeploy 返回 false', () => {
        const a = new AllySystem();
        a.tryDeploy();
        a.tryDeploy();
        a.tryDeploy();
        expect(a.tryDeploy()).toBe(false);
        expect(a.getCharges()).toBe(0);
    });
});
