import Phaser from 'phaser';
import { BootScene } from '@cp/core';
import { PLANE_THEME } from './data/theme.js';
import { planeManifest } from './assets/manifest.js';
import { PlayScene } from './scenes/PlayScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { PlaneTitleScene } from './scenes/PlaneTitleScene.js';
import { TestScene } from './scenes/TestScene.js';
import { registerAllBehaviors } from './behaviors/index.js';

registerAllBehaviors();

const boot = new BootScene({ manifest: planeManifest, next: 'title' });
const title = new PlaneTitleScene();
const play = new PlayScene();
const test = new TestScene();
const result = new ResultScene();

const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: PLANE_THEME.bg,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false }
    },
    scene: [boot, title, play, test, result]
});
