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
