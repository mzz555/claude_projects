export interface AssetManifest {
    images?: Array<{ key: string; url: string }>;
    spritesheets?: Array<{ key: string; url: string; frameW: number; frameH: number }>;
    audio?: Array<{ key: string; urls: string[] }>;
    fonts?: Array<{ family: string; url: string }>;
}

export interface LoaderLike {
    image(key: string, url: string): unknown;
    spritesheet(key: string, url: string, config: { frameWidth: number; frameHeight: number }): unknown;
    audio(key: string, urls: string[]): unknown;
}

export function applyManifest(loader: LoaderLike, manifest: AssetManifest): void {
    for (const m of manifest.images ?? []) loader.image(m.key, m.url);
    for (const m of manifest.spritesheets ?? []) {
        loader.spritesheet(m.key, m.url, { frameWidth: m.frameW, frameHeight: m.frameH });
    }
    for (const m of manifest.audio ?? []) loader.audio(m.key, m.urls);
}
