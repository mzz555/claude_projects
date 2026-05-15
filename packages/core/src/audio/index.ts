import type Phaser from 'phaser';

interface SoundLike {
    play(config?: { rate?: number; volume?: number; loop?: boolean }): void;
    stop(): void;
    setRate(rate: number): void;
    setVolume(volume: number): void;
}

interface SceneLike {
    sound: {
        add(key: string): SoundLike;
        removeByKey(key: string): void;
    };
}

export interface AudioBankDefaults {
    volume?: number;
}

export interface PlayOpts {
    rate?: number;
    volume?: number;
    loop?: boolean;
}

export class AudioBank {
    private cache = new Map<string, SoundLike>();
    private masterVolume: number;
    private muted = false;

    constructor(private scene: SceneLike | Phaser.Scene, defaults?: AudioBankDefaults) {
        this.masterVolume = defaults?.volume ?? 1;
    }

    play(key: string, opts: PlayOpts = {}): void {
        let s = this.cache.get(key);
        if (!s) {
            s = (this.scene as SceneLike).sound.add(key);
            this.cache.set(key, s);
        }
        const v = this.muted ? 0 : (opts.volume ?? this.masterVolume);
        s.setVolume(v);
        if (opts.rate !== undefined) s.setRate(opts.rate);
        s.play({ loop: opts.loop ?? false });
    }

    stop(key: string): void {
        this.cache.get(key)?.stop();
    }

    setMasterVolume(v: number): void {
        this.masterVolume = v;
    }

    setMuted(m: boolean): void {
        this.muted = m;
    }
}
