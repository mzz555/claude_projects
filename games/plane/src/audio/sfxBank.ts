import Phaser from 'phaser';
import { AudioBank } from '@cp/core';

/**
 * SFX fire-and-forget 接口。
 *
 * M3 review 指出 @cp/core/AudioBank.play(key, opts) 的 loop/rate/volume
 * 黏性/重置行为不一致。playSfx 故意只接 key，
 * 内部固定 loop=false，每次重置默认音量。
 */
export class SfxBank {
    private bank: AudioBank;

    constructor(scene: Phaser.Scene) {
        this.bank = new AudioBank(scene, { volume: 0.6 });
    }

    playSfx(key: string): void {
        try {
            this.bank.play(key, { loop: false });
        } catch {
            // 占位 key 在 dev 期无 mp3 是预期状态
        }
    }
}
