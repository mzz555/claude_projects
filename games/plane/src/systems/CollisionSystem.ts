import Phaser from 'phaser';
import { Bullet } from '../entities/Bullet.js';
import { Enemy } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { Powerup } from '../entities/Powerup.js';
import { Meteor, METEOR_DAMAGE } from '../entities/Meteor.js';
import type { PowerupKey } from '../data/powerups.js';
import { E } from '../events.js';

export interface CollisionSystemOpts {
    scene: Phaser.Scene;
    player: Player;
    enemies: Phaser.Physics.Arcade.Group;
    bullets: Phaser.Physics.Arcade.Group;
    powerups: Phaser.Physics.Arcade.Group;
    meteors: Phaser.Physics.Arcade.Group;
    onPowerupPicked: (key: PowerupKey) => void;
    /**
     * 跳过 player↔enemy 直接碰撞处理。
     * - false（默认）：PlayScene 正常 — 撞机 emit PlayerHit + enemy.deactivate
     * - true：TestScene 用 — 完全跳过这条 overlap，玩家能从敌机身上穿过去，敌机不消失
     */
    disablePlayerEnemyCollision?: boolean;
}

export class CollisionSystem {
    constructor(opts: CollisionSystemOpts) {
        const { scene, player, enemies, bullets, powerups, meteors } = opts;

        scene.physics.add.overlap(bullets, enemies, (a, b) => {
            const bullet = a as Bullet;
            const enemy = b as Enemy;
            if (!bullet.active || !enemy.active) return;
            const hitX = bullet.x;
            const hitY = bullet.y;
            const killed = enemy.takeDamage(bullet.damage);
            bullet.deactivate();
            scene.events.emit(E.EnemyHit, { x: hitX, y: hitY });
            if (killed) {
                scene.events.emit(E.EnemyKilled, {
                    enemyType: enemy.typeKey,
                    score: enemy.score,
                    x: enemy.x,
                    y: enemy.y
                });
            }
        });

        scene.physics.add.overlap(bullets, meteors, (a, b) => {
            const bullet = a as Bullet;
            const meteor = b as Meteor;
            if (!bullet.active || !meteor.active) return;
            const killed = meteor.takeDamage(bullet.damage);
            bullet.deactivate();
            if (killed) {
                scene.events.emit('meteor-broken', { x: meteor.x, y: meteor.y });
            }
        });

        if (!opts.disablePlayerEnemyCollision) {
            scene.physics.add.overlap(player, enemies, (_p, b) => {
                const enemy = b as Enemy;
                if (!enemy.active) return;
                if (!player.isShielded()) {
                    scene.events.emit(E.PlayerHit, { damage: enemy.dmg, x: player.x, y: player.y });
                }
                enemy.deactivate();
            });
        }

        scene.physics.add.overlap(player, meteors, (_p, m) => {
            const meteor = m as Meteor;
            if (!meteor.active) return;
            if (!player.isShielded()) {
                scene.events.emit(E.PlayerHit, { damage: METEOR_DAMAGE, x: player.x, y: player.y });
            }
            meteor.deactivate();
        });

        scene.physics.add.overlap(player, powerups, (_p, pwr) => {
            const p = pwr as Powerup;
            if (!p.active) return;
            opts.onPowerupPicked(p.powerupKey);
            p.deactivate();
        });
    }
}
