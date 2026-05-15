export interface WeaponLevel {
    name: string;
    intervalMs: number;
    bulletSpeed: number;
    damage: number;
    spread?: number;
}

export const WEAPONS: WeaponLevel[] = [
    {
        name: '主炮',
        intervalMs: 133,
        bulletSpeed: 720,
        damage: 1
    }
];
