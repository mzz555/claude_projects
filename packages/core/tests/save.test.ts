import { describe, it, expect, beforeEach } from 'vitest';
import { defineStore } from '../src/save/index.js';

beforeEach(() => localStorage.clear());

describe('save/defineStore', () => {
    it('未写入时返回 defaults', () => {
        const store = defineStore('test', 1, { hp: 100, name: 'p' });
        const v = store.read();
        expect(v.hp).toBe(100);
        expect(v.name).toBe('p');
    });

    it('写入后能读回', () => {
        const store = defineStore('test', 1, { hp: 100 });
        store.write({ hp: 42 });
        expect(store.read().hp).toBe(42);
    });

    it('不同 namespace 互不干扰', () => {
        const a = defineStore('a', 1, { v: 1 });
        const b = defineStore('b', 1, { v: 2 });
        a.write({ v: 9 });
        expect(b.read().v).toBe(2);
    });
});

describe('save/defineStore 版本与回退', () => {
    it('版本错配返回 defaults', () => {
        localStorage.setItem('cp:t', JSON.stringify({ hp: 99, __v: 1 }));
        const store = defineStore('t', 2, { hp: 100 });
        expect(store.read().hp).toBe(100);
    });

    it('JSON 损坏返回 defaults', () => {
        localStorage.setItem('cp:t', '{not json');
        const store = defineStore('t', 1, { hp: 100 });
        expect(store.read().hp).toBe(100);
    });

    it('写入时附带版本号', () => {
        const store = defineStore('t', 3, { hp: 100 });
        store.write({ hp: 50 });
        const raw = JSON.parse(localStorage.getItem('cp:t')!);
        expect(raw.__v).toBe(3);
    });

    it('clear 后回到 defaults', () => {
        const store = defineStore('t', 1, { hp: 100 });
        store.write({ hp: 1 });
        store.clear();
        expect(store.read().hp).toBe(100);
    });
});
