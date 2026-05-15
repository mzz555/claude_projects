export interface InputSource {
    isKeyDown(code: string): boolean;
}

export class InputMap<A extends string = string> {
    private keys = new Map<A, string[]>();
    private gamepad = new Map<A, number[]>();
    private prevDown = new Map<A, boolean>();
    private nowDown = new Map<A, boolean>();
    private gpQuery: ((button: number) => boolean) | null = null;

    constructor(private readonly source: InputSource) {}

    bindKey(action: A, ...codes: string[]): void {
        this.keys.set(action, [...(this.keys.get(action) ?? []), ...codes]);
    }

    bindGamepad(action: A, button: number): void {
        this.gamepad.set(action, [...(this.gamepad.get(action) ?? []), button]);
    }

    setGamepadQuery(q: (button: number) => boolean): void {
        this.gpQuery = q;
    }

    isDown(action: A): boolean {
        const codes = this.keys.get(action);
        if (codes) for (const c of codes) if (this.source.isKeyDown(c)) return true;
        const buttons = this.gamepad.get(action);
        if (buttons && this.gpQuery) for (const b of buttons) if (this.gpQuery(b)) return true;
        return false;
    }

    justPressed(action: A): boolean {
        return this.nowDown.get(action) === true && this.prevDown.get(action) !== true;
    }

    tick(): void {
        for (const k of new Set([...this.keys.keys(), ...this.gamepad.keys()])) {
            this.prevDown.set(k, this.nowDown.get(k) ?? false);
            this.nowDown.set(k, this.isDown(k));
        }
    }
}
