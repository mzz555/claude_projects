export interface Store<T> {
    read(): T;
    write(value: T): void;
    clear(): void;
}

export function defineStore<T extends Record<string, unknown>>(
    namespace: string,
    version: number,
    defaults: T
): Store<T> {
    const key = `cp:${namespace}`;

    return {
        read(): T {
            const raw = localStorage.getItem(key);
            if (raw === null) return { ...defaults };
            try {
                const parsed = JSON.parse(raw) as T & { __v?: number };
                if (parsed.__v !== version) return { ...defaults };
                const { __v: _v, ...rest } = parsed;
                return { ...defaults, ...(rest as T) };
            } catch {
                return { ...defaults };
            }
        },
        write(value: T): void {
            localStorage.setItem(key, JSON.stringify({ ...value, __v: version }));
        },
        clear(): void {
            localStorage.removeItem(key);
        }
    };
}
