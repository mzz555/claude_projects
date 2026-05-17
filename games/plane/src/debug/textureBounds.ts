import Phaser from 'phaser';

export interface AlphaBounds {
    /** alpha>0 区域的左上角 x（贴图原始像素坐标） */
    x: number;
    /** 左上角 y */
    y: number;
    /** 紧致矩形宽 */
    w: number;
    /** 紧致矩形高 */
    h: number;
    /** 原图总宽 */
    srcW: number;
    /** 原图总高 */
    srcH: number;
}

const cache = new Map<string, AlphaBounds>();

/**
 * 扫描贴图 alpha 通道找到非透明区域的紧致包围盒。
 * 失败（如 happy-dom 环境无 canvas）会返回 full image bounds 作为兜底。
 *
 * 阈值：alpha > ALPHA_THRESHOLD（避免半透明边缘干扰）。
 */
const ALPHA_THRESHOLD = 16; // 0~255

export function getAlphaBounds(scene: Phaser.Scene, key: string): AlphaBounds | null {
    if (cache.has(key)) return cache.get(key)!;

    const tex = scene.textures.get(key);
    if (!tex || !tex.source.length) return null;
    const src = tex.source[0];
    if (!src) return null;
    const img = src.image as HTMLImageElement | HTMLCanvasElement | undefined;
    if (!img) return null;
    const srcW = src.width;
    const srcH = src.height;

    try {
        const canvas = document.createElement('canvas');
        canvas.width = srcW;
        canvas.height = srcH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return fallback(key, srcW, srcH);
        ctx.drawImage(img as CanvasImageSource, 0, 0);
        const data = ctx.getImageData(0, 0, srcW, srcH).data;

        let minX = srcW;
        let minY = srcH;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < srcH; y++) {
            for (let x = 0; x < srcW; x++) {
                const a = data[(y * srcW + x) * 4 + 3];
                if (a !== undefined && a > ALPHA_THRESHOLD) {
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (maxX < 0) {
            // 全透明，回退为整图
            return fallback(key, srcW, srcH);
        }

        const bounds: AlphaBounds = {
            x: minX,
            y: minY,
            w: maxX - minX + 1,
            h: maxY - minY + 1,
            srcW,
            srcH
        };
        cache.set(key, bounds);
        return bounds;
    } catch {
        return fallback(key, srcW, srcH);
    }
}

function fallback(key: string, srcW: number, srcH: number): AlphaBounds {
    const b: AlphaBounds = { x: 0, y: 0, w: srcW, h: srcH, srcW, srcH };
    cache.set(key, b);
    return b;
}
