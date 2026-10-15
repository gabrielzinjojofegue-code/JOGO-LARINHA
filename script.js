
(() => {
  "use strict";

  function initGame() {
    const requiredIds = [
      "game",
      "overlay",
      "overlayTitle",
      "overlayText",
      "startButton",
      "levelLabel",
      "healthLabel",
      "scoreLabel",
      "enemyLabel"
    ];

    const elements = {};
    const missing = [];

    for (const id of requiredIds) {
      elements[id] = document.getElementById(id);
      if (!elements[id]) missing.push(id);
    }

    if (missing.length > 0) {
      console.error(
        "O Resgate do Príncipe: faltam elementos HTML com estes IDs:",
        missing.join(", ")
      );
      return;
    }

    const canvas = elements.game;

    if (typeof canvas.getContext !== "function") {
      console.error("O elemento #game precisa ser um canvas HTML.");
      return;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      console.error("Não foi possível iniciar o Canvas 2D.");
      return;
    }

    const overlay = elements.overlay;
    const overlayTitle = elements.overlayTitle;
    const overlayText = elements.overlayText;
    const startButton = elements.startButton;

    const levelLabel = elements.levelLabel;
    const healthLabel = elements.healthLabel;
    const scoreLabel = elements.scoreLabel;
    const enemyLabel = elements.enemyLabel;

    const W = canvas.width;
    const H = canvas.height;
    const GROUND = 456;

    if (W <= 0 || H <= 0) {
      console.error("O canvas precisa ter largura e altura maiores que zero.");
      return;
    }

    const keys = Object.create(null);

    let running = false;
    let lastTime = 0;
    let time = 0;
    let score = 0;
    let levelIndex = 0;
    let enemies = [];
    let particles = [];
    let heartDrops = [];
    let bossAttacks = [];
    let attackTimer = 0;
    let princeRescued = false;

    let endingMode = false;
    let endingTime = 0;

    const BOSS_MAX_HP = 30;

    const stages = [
      {
        name: "Floresta encantada",
        sky: "#8fc9d8",
        far: "#6caa91",
        near: "#397b68",
        ground: "#315b4d",
        accent: "#f5d77a",
        enemy: "slime",
        count: 4
      },
      {
        name: "Castelo abandonado",
        sky: "#77799f",
        far: "#555473",
        near: "#3c3a59",
        ground: "#29283f",
        accent: "#f4bd67",
        enemy: "skeleton",
        count: 5
      },
      {
        name: "Caverna sombria",
        sky: "#39324f",
        far: "#55406d",
        near: "#302944",
        ground: "#211c31",
        accent: "#c48cff",
        enemy: "bat",
        count: 5
      },
      {
        name: "Salão das Sombras",
        sky: "#21172e",
        far: "#382343",
        near: "#28182f",
        ground: "#17101f",
        accent: "#ed527e",
        enemy: "boss",
        count: 1
      }
    ];

    const player = {
      x: 72,
      y: GROUND - 68,
      w: 36,
      h: 68,
      vx: 0,
      vy: 0,
      speed: 4.2,
      jump: -12.6,
      onGround: true,
      facing: 1,
      health: 3,
      invuln: 0
    };

    function pixel(x, y, color, w, h) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), w, h);
    }

    function drawHeart(x, y, size, color) {
      pixel(x, y + size * 0.25, color, size, size * 0.55);
      pixel(x + size, y + size * 0.25, color, size, size * 0.55);
      pixel(x + size * 0.25, y, color, size * 0.8, size);
      pixel(x + size * 0.75, y, color, size * 0.8, size);
      pixel(x + size * 0.25, y + size * 0.65, color, size * 1.05, size * 0.35);
      pixel(x + size * 0.5, y + size, color, size * 0.55, size * 0.25);
    }

    function drawKnight(x, y, facing = 1, jumping = false) {
      ctx.save();
      ctx.translate(x + 18, y);

      if (facing < 0) ctx.scale(-1, 1);

      ctx.translate(-18, 0);

      const bob = jumping
        ? -2
        : Math.abs(player.vx) > 0
          ? Math.sin(time * 0.022) * 2
          : 0;

      const step = !jumping && Math.abs(player.vx) > 0
        ? Math.sin(time * 0.022) * 4
        : 0;

      // Cabelo.
      pixel(8, 4 + bob, "#17131e", 20, 20);
      pixel(4, 12 + bob, "#17131e", 8, 25);
      pixel(24, 12 + bob, "#17131e", 8, 28);
      pixel(8, 24 + bob, "#292033", 4, 17);
      pixel(24, 29 + bob, "#292033", 4, 15);

      // Rosto.
      pixel(8, 10 + bob, "#f4c6a8", 20, 18);
      pixel(10, 16 + bob, "#33223a", 4, 4);
      pixel(22, 16 + bob, "#33223a", 4, 4);
      pixel(16, 23 + bob, "#d87594", 4, 2);
      pixel(6, 20 + bob, "#e998a9", 4, 4);
      pixel(26, 20 + bob, "#e998a9", 4, 4);

      // Elmo.
      pixel(4, 5 + bob, "#68758f", 8, 12);
      pixel(8, 2 + bob, "#cbd5e8", 20, 8);
      pixel(12, bob, "#f1f4ff", 12, 4);
      pixel(24, 5 + bob, "#68758f", 8, 12);
      pixel(8, 7 + bob, "#aab7cf", 4, 5);
      pixel(24, 7 + bob, "#aab7cf", 4, 5);
      pixel(12, 7 + bob, "#f4c6a8", 12, 3);

      // Pescoço e ombreiras.
      pixel(12, 27 + bob, "#77849f", 12, 6);
      pixel(12, 28 + bob, "#dbe3f2", 12, 3);
      pixel(2, 31 + bob, "#7d89a3", 10, 10);
      pixel(2, 30 + bob, "#e6edf8", 10, 4);
      pixel(26, 31 + bob, "#7d89a3", 10, 10);
      pixel(26, 30 + bob, "#e6edf8", 10, 4);

      // Peitoral.
      pixel(4, 30 + bob, "#ff0000", 28, 24);
      pixel(8, 28 + bob, "#ffffff", 20, 5);
      pixel(10, 35 + bob, "#555555", 16, 12);

      // Coração da armadura.
      pixel(13, 38 + bob, "#ff8db9", 4, 4);
      pixel(17, 38 + bob, "#ff8db9", 4, 4);
      pixel(15, 41 + bob, "#ff8db9", 4, 4);
      pixel(15, 45 + bob, "#d94e87", 2, 2);

      // Braços.
      pixel(0, 35 + bob, "#7d89a3", 8, 13);
      pixel(0, 35 + bob, "#e6edf8", 8, 4);
      pixel(28, 35 + bob, "#7d89a3", 8, 13);
      pixel(28, 35 + bob, "#e6edf8", 8, 4);
      pixel(0, 46 + bob, "#d8dfed", 8, 5);
      pixel(28, 46 + bob, "#d8dfed", 8, 5);

      // Saia metálica.
      pixel(7, 47 + bob, "#65738f", 22, 8);
      pixel(5, 48 + bob, "#b8c5dc", 8, 7);
      pixel(14, 48 + bob, "#e6edf8", 8, 7);
      pixel(23, 48 + bob, "#b8c5dc", 7, 7);

      // Pernas.
      pixel(8 + step, 54 + bob, "#8d9bb5", 7, 7);
      pixel(21 - step, 54 + bob, "#8d9bb5", 7, 7);
      pixel(8 + step, 54 + bob, "#e1e8f5", 7, 3);
      pixel(21 - step, 54 + bob, "#e1e8f5", 7, 3);

      // Botas.
      pixel(5 + step, 59 + bob, "#343044", 11, 5);
      pixel(20 - step, 59 + bob, "#343044", 11, 5);
      pixel(5 + step, 59 + bob, "#aebbd2", 8, 2);
      pixel(20 - step, 59 + bob, "#aebbd2", 8, 2);

      // Espada.
      if (attackTimer > 0) {
        pixel(32, 31 + bob, "#f7d77a", 8, 5);
        pixel(38, 23 + bob, "#f4f7ff", 7, 27);
        pixel(40, 23 + bob, "#aebbd2", 5, 27);
        pixel(32, 49 + bob, "#b98759", 10, 4);
      } else {
        pixel(31, 29 + bob, "#aebbd2", 4, 21);
        pixel(31, 29 + bob, "#f4f7ff", 2, 18);
        pixel(29, 27 + bob, "#f7d77a", 8, 4);
        pixel(29, 48 + bob, "#b98759", 8, 4);
        pixel(31, 51 + bob, "#70503e", 4, 7);
      }

      ctx.restore();
    }

    function drawPrince(x, y) {
      ctx.save();

      // Corpo.
      pixel(x + 5, y + 28, "#8551a0", 26, 32);
      pixel(x + 1, y + 36, "#633c82", 8, 22);
      pixel(x + 27, y + 36, "#633c82", 8, 22);

      // Cabelo cacheado.
      pixel(x + 7, y + 5, "#21162a", 22, 13);
      pixel(x + 3, y + 9, "#21162a", 6, 10);
      pixel(x + 27, y + 8, "#21162a", 6, 10);
      pixel(x + 5, y + 2, "#21162a", 7, 7);
      pixel(x + 10, y - 1, "#21162a", 7, 7);
      pixel(x + 16, y, "#21162a", 7, 7);
      pixel(x + 22, y - 1, "#21162a", 7, 7);
      pixel(x + 27, y + 3, "#21162a", 5, 7);

      pixel(x + 7, y + 3, "#49304f", 3, 3);
      pixel(x + 13, y + 2, "#49304f", 3, 3);
      pixel(x + 19, y + 2, "#49304f", 3, 3);
      pixel(x + 25, y + 4, "#49304f", 3, 3);

      // Coroa.
      pixel(x + 7, y + 1, "#f6c84d", 22, 5);
      pixel(x + 8, y - 5, "#f6c84d", 5, 7);
      pixel(x + 16, y - 8, "#f6c84d", 5, 10);
      pixel(x + 24, y - 5, "#f6c84d", 5, 7);
      pixel(x + 15, y + 2, "#ff729f", 5, 3);

      // Rosto.
      pixel(x + 8, y + 10, "#f4c6a8", 20, 18);
      pixel(x + 9, y + 15, "#302036", 4, 4);
      pixel(x + 23, y + 15, "#302036", 4, 4);
      pixel(x + 15, y + 22, "#d87594", 6, 2);
      pixel(x + 6, y + 19, "#e99ba8", 4, 4);
      pixel(x + 26, y + 19, "#e99ba8", 4, 4);

      // Roupa real.
      pixel(x + 7, y + 29, "#29283d", 22, 20);
      pixel(x + 12, y + 31, "#f2c64e", 12, 17);
      pixel(x + 15, y + 35, "#fff0a6", 6, 6);
      drawHeart(x + 18, y + 40, 5, "#ff6caa");

      pixel(x + 1, y + 32, "#29283d", 8, 15);
      pixel(x + 27, y + 32, "#29283d", 8, 15);
      pixel(x + 8, y + 48, "#f2c64e", 7, 10);
      pixel(x + 21, y + 48, "#f2c64e", 7, 10);
      pixel(x + 6, y + 56, "#3a2947", 10, 5);
      pixel(x + 20, y + 56, "#3a2947", 10, 5);

      ctx.restore();
    }

    function overlaps(a, b) {
      return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
      );
    }

    function makeEnemies(stage) {
      const list = [];

      if (stage.enemy === "boss") {
        list.push({
          type: "boss",
          x: 690,
          y: GROUND - 104,
          w: 76,
          h: 104,
          minX: 430,
          maxX: W - 84,
          dir: -1,
          speed: 1.15,
          hp: BOSS_MAX_HP,
          maxHp: BOSS_MAX_HP,
          alive: true,
          phase: 0,
          knockbackX: 0,
          knockbackTimer: 0,
          attackCooldown: 100,
          chargeTimer: 0,
          chargeDir: -1,
          hitFlash: 0,
          skyAttackCooldown: 100,
          skyAttackIndex: 0,
          attackState: "idle",
          attackStateTimer: 0,
          attackWarningX: W / 2
        });

        return list;
      }

      for (let i = 0; i < stage.count; i++) {
        const flying = stage.enemy === "bat";
        const spacing = stage.count > 4 ? 125 : 155;

        list.push({
          type: stage.enemy,
          x: 260 + i * spacing,
          y: flying
            ? 260 + (i % 3) * 42
            : GROUND - (stage.enemy === "slime" ? 28 : 42),
          w: stage.enemy === "slime" ? 34 : 38,
          h: stage.enemy === "slime" ? 28 : 40,
          minX: 220 + i * spacing,
          maxX: Math.min(W - 55, 365 + i * spacing),
          dir: i % 2 ? -1 : 1,
          speed: stage.enemy === "slime"
            ? 1.1
            : stage.enemy === "skeleton"
              ? 1.45
              : 1.65,
          hp: stage.enemy === "skeleton" ? 2 : 1,
          alive: true,
          phase: i * 1.7,
          knockbackX: 0,
          knockbackTimer: 0
        });
      }

      return list;
    }

    function loadStage(index) {
      levelIndex = index;
      enemies = makeEnemies(stages[index]);
      bossAttacks = [];

      player.x = 72;
      player.y = GROUND - player.h;
      player.vx = 0;
      player.vy = 0;
      player.onGround = true;
      player.invuln = 0;
      attackTimer = 0;

      updateHud();
    }

    function updateHud() {
      levelLabel.textContent = `${levelIndex + 1} / ${stages.length}`;

      healthLabel.textContent = player.health > 0
        ? "♥ ".repeat(player.health).trim()
        : "—";

      scoreLabel.textContent = score;
      enemyLabel.textContent = enemies.filter(e => e.alive).length;
    }

    function drawBackground() {
      const s = stages[levelIndex];

      ctx.fillStyle = s.sky;
      ctx.fillRect(0, 0, W, H);

      if (levelIndex === 3) {
        // Lua vermelha.
        ctx.fillStyle = "#b74770";
        ctx.beginPath();
        ctx.arc(790, 105, 43, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#e66a8c";
        ctx.beginPath();
        ctx.arc(778, 92, 32, 0, Math.PI * 2);
        ctx.fill();

        // Janelas e pilares.
        for (let i = 0; i < 5; i++) {
          const x = 35 + i * 190;

          pixel(x, 120, "#120d1b", 48, 240);
          pixel(x - 10, 110, "#4a2a50", 68, 12);
          pixel(x + 10, 145, "#7b365f", 4, 180);
          pixel(x + 32, 145, "#7b365f", 4, 180);
          pixel(x + 10, 145, "#e65b86", 26, 3);
        }

        // Silhuetas de torres.
        for (let i = 0; i < 6; i++) {
          const x = i * 165;

          pixel(x + 25, 205, "#1b1127", 80, 251);
          pixel(x + 10, 190, "#1b1127", 110, 18);
          pixel(x + 40, 165, "#1b1127", 50, 25);
          pixel(x + 51, 145, "#1b1127", 28, 20);
        }
      } else {
        ctx.fillStyle = s.accent;
        ctx.beginPath();
        ctx.arc(790, 90, 34, 0, Math.PI * 2);
        ctx.fill();

        // Nuvens.
        for (let i = 0; i < 4; i++) {
          const x = (
            (i * 270 + 60 - time * 0.012) % (W + 150) + W + 150
          ) % (W + 150) - 70;

          pixel(x, 90 + (i % 2) * 35, "#ffffff55", 70, 16);
          pixel(x + 15, 78 + (i % 2) * 35, "#ffffff55", 42, 16);
        }

        // Silhuetas do cenário.
        for (let i = 0; i < 9; i++) {
          const x = i * 125 - (time * 0.025 % 125);

          pixel(x + 10, 210, s.far, 70, 246);
          pixel(x, 190, s.far, 90, 30);
          pixel(x + 20, 165, s.far, 50, 35);
        }

        for (let i = 0; i < 8; i++) {
          const x = i * 145 - (time * 0.05 % 145);

          pixel(x + 20, 300, s.near, 65, 156);
          pixel(x, 280, s.near, 105, 35);
        }
      }

      // Chão.
      ctx.fillStyle = s.ground;
      ctx.fillRect(0, GROUND, W, H - GROUND);

      ctx.fillStyle = s.accent;
      ctx.fillRect(0, GROUND, W, 5);

      for (let x = 0; x < W; x += 42) {
        pixel(x + 8, GROUND + 20, s.near, 18, 5);
        pixel(x + 22, GROUND + 42, "#ffffff12", 12, 4);
      }

      // Plataformas decorativas nas fases 2 e 3.
      if (levelIndex === 1 || levelIndex === 2) {
        const platforms = [
          { x: 220, y: 365, w: 120 },
          { x: 520, y: 320, w: 120 },
          { x: 730, y: 380, w: 100 }
        ];

        for (const p of platforms) {
          pixel(p.x, p.y, s.accent, p.w, 7);
          pixel(p.x, p.y + 7, s.ground, p.w, 16);
        }
      }

      if (levelIndex === 3) {
        pixel(0, GROUND - 7, "#100b18", W, 7);

        for (let i = 0; i < 12; i++) {
          const x = 22 + i * 80;

          pixel(x, GROUND + 12, "#793354", 22, 3);
          pixel(x + 9, GROUND + 8, "#b94770", 3, 12);
        }
      }
    }

    function drawEnemy(e) {
      if (!e.alive) return;

      if (e.type === "boss") {
        drawBoss(e);
        return;
      }

      if (e.type === "slime") {
        const bounce = Math.sin(time * 0.012 + e.phase) * 3;

        pixel(e.x + 3, e.y + 15 + bounce, "#267a58", 28, 13);
        pixel(e.x + 7, e.y + 7 + bounce, "#3bc98a", 20, 18);
        pixel(e.x + 12, e.y + 2 + bounce, "#54e6a0", 11, 9);
        pixel(e.x + 10, e.y + 12 + bounce, "#173c3b", 4, 5);
        pixel(e.x + 22, e.y + 12 + bounce, "#173c3b", 4, 5);
        pixel(e.x + 11, e.y + 11 + bounce, "#ffffff", 2, 2);
        pixel(e.x + 23, e.y + 11 + bounce, "#ffffff", 2, 2);

      } else if (e.type === "skeleton") {
        pixel(e.x + 7, e.y + 11, "#d9d5d1", 24, 22);
        pixel(e.x + 10, e.y + 2, "#f0e8d7", 18, 17);
        pixel(e.x + 12, e.y + 8, "#29283f", 4, 5);
        pixel(e.x + 22, e.y + 8, "#29283f", 4, 5);
        pixel(e.x + 13, e.y + 18, "#b4a99a", 13, 3);
        pixel(e.x + 9, e.y + 32, "#c5c0b7", 8, 9);
        pixel(e.x + 23, e.y + 32, "#c5c0b7", 8, 9);
        pixel(e.x + 1, e.y + 17, "#d9d5d1", 7, 5);
        pixel(e.x + 31, e.y + 12, "#b6c5d9", 4, 25);
        pixel(e.x + 28, e.y + 10, "#f4d47b", 10, 4);

        if (e.hp > 1) {
          pixel(e.x + 4, e.y - 8, "#3a2037", 30, 4);
          pixel(e.x + 4, e.y - 8, "#ff658b", 15, 4);
        }

      } else if (e.type === "bat") {
        const flap = Math.sin(time * 0.025 + e.phase) * 5;

        pixel(e.x + 13, e.y + 9, "#30213e", 14, 22);
        pixel(e.x + 4, e.y + 11 + flap, "#5e3a80", 12, 14);
        pixel(e.x + 24, e.y + 11 - flap, "#5e3a80", 12, 14);
        pixel(e.x + 10, e.y + 4, "#8b5bd0", 20, 14);
        pixel(e.x + 13, e.y + 10, "#ff587f", 4, 4);
        pixel(e.x + 23, e.y + 10, "#ff587f", 4, 4);
        pixel(e.x + 15, e.y + 24, "#b5a0d8", 3, 8);
        pixel(e.x + 23, e.y + 24, "#b5a0d8", 3, 8);
      }
    }

    // Sprite do Rei das Sombras.
    function drawBoss(e) {
      const x = e.x;
      const y = e.y;

      const bob = Math.sin(time * 0.006) * 2;
      const flash = e.hitFlash > 0;

      const armor = flash ? "#ffffff" : "#49304f";
      const armorLight = flash ? "#ffffff" : "#75416f";
      const dark = flash ? "#ffffff" : "#17101f";
      const cape = flash ? "#ffffff" : "#30172f";
      const red = flash ? "#ffffff" : "#ff315f";

      if (
        e.attackState === "warningLightning" ||
        e.attackState === "warningSpikes"
      ) {
        ctx.globalAlpha = 0.25 + Math.sin(time * 0.04) * 0.15;
        pixel(x - 12, y + 15, "#ff315f", 8, 60);
        pixel(x + e.w + 4, y + 15, "#ff315f", 8, 60);
        ctx.globalAlpha = 1;
      } else if (e.attackState === "warningMeteor") {
        ctx.globalAlpha = 0.3 + Math.sin(time * 0.05) * 0.15;
        pixel(x - 8, y + 12, "#b94cff", 8, 55);
        pixel(x + e.w, y + 12, "#b94cff", 8, 55);
        ctx.globalAlpha = 1;
      }

      // Sombra no chão.
      pixel(x - 7, GROUND - 5, "#0c091288", 92, 7);

      // Capa.
      pixel(x + 10, y + 38 + bob, cape, 56, 54);
      pixel(x + 4, y + 49 + bob, cape, 12, 43);
      pixel(x + 16, y + 82 + bob, "#1d1027", 44, 10);
      pixel(x + 22, y + 91 + bob, "#120c1a", 30, 7);

      // Pernas e botas.
      pixel(x + 16, y + 84 + bob, dark, 18, 16);
      pixel(x + 43, y + 84 + bob, dark, 18, 16);
      pixel(x + 11, y + 96 + bob, "#6f3d63", 25, 7);
      pixel(x + 41, y + 96 + bob, "#6f3d63", 25, 7);

      // Braços.
      pixel(x + 2, y + 43 + bob, dark, 17, 30);
      pixel(x + 1, y + 56 + bob, armorLight, 17, 17);
      pixel(x + 57, y + 43 + bob, dark, 17, 30);
      pixel(x + 58, y + 56 + bob, armorLight, 17, 17);

      // Ombreiras.
      pixel(x + 3, y + 33 + bob, armorLight, 22, 17);
      pixel(x - 2, y + 27 + bob, armor, 12, 10);
      pixel(x + 8, y + 20 + bob, armorLight, 12, 15);
      pixel(x + 53, y + 33 + bob, armorLight, 22, 17);
      pixel(x + 66, y + 27 + bob, armor, 12, 10);
      pixel(x + 56, y + 20 + bob, armorLight, 12, 15);

      // Peitoral.
      pixel(x + 16, y + 31 + bob, armor, 44, 43);
      pixel(x + 23, y + 29 + bob, armorLight, 30, 8);
      pixel(x + 23, y + 42 + bob, "#26142f", 30, 22);
      pixel(x + 30, y + 43 + bob, red, 15, 12);
      pixel(x + 34, y + 55 + bob, "#b62b62", 7, 8);

      // Detalhes da armadura.
      pixel(x + 18, y + 37 + bob, "#c08bc4", 4, 28);
      pixel(x + 54, y + 37 + bob, "#c08bc4", 4, 28);
      pixel(x + 30, y + 67 + bob, "#9b5d99", 16, 4);
      pixel(x + 34, y + 72 + bob, "#9b5d99", 8, 4);

      // Pescoço.
      pixel(x + 27, y + 19 + bob, dark, 22, 16);

      // Cabeça.
      pixel(x + 18, y + 8 + bob, dark, 40, 29);
      pixel(x + 22, y + 4 + bob, armor, 32, 24);
      pixel(x + 26, y + 13 + bob, "#211326", 24, 15);

      // Coroa.
      pixel(x + 18, y + 5 + bob, "#a04d88", 40, 7);
      pixel(x + 18, y - 5 + bob, "#8e407c", 8, 15);
      pixel(x + 28, y - 13 + bob, "#a04d88", 8, 23);
      pixel(x + 40, y - 7 + bob, "#8e407c", 8, 17);
      pixel(x + 50, y - 3 + bob, "#a04d88", 8, 13);
      pixel(x + 27, y - 5 + bob, "#f3b5e2", 5, 5);

      // Olhos.
      pixel(x + 25, y + 14 + bob, red, 9, 5);
      pixel(x + 44, y + 14 + bob, red, 9, 5);
      pixel(x + 28, y + 15 + bob, "#fff1f6", 3, 2);
      pixel(x + 47, y + 15 + bob, "#fff1f6", 3, 2);

      // Boca.
      pixel(x + 31, y + 25 + bob, "#100914", 14, 4);

      // Aura da investida.
      if (e.chargeTimer > 0) {
        ctx.globalAlpha = 0.25 + Math.sin(time * 0.04) * 0.12;
        pixel(x - 12, y + 15, "#ff315f", 8, 60);
        pixel(x + e.w + 4, y + 15, "#ff315f", 8, 60);
        ctx.globalAlpha = 1;
      }
    }

    function spawnBurst(x, y, color, amount = 8) {
      for (let i = 0; i < amount; i++) {
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 5,
          vy: -Math.random() * 4 - 1,
          life: 30,
          color,
          size: 3 + Math.floor(Math.random() * 3)
        });
      }
    }

    function dropHeart(x, y) {
      if (Math.random() < 0.30) {
        heartDrops.push({
          x: x - 10,
          y: y - 10,
          w: 20,
          h: 20,
          bob: Math.random() * Math.PI * 2
        });
      }
    }

    function drawHeartDrop(heart) {
      const floatY = Math.sin(time * 0.006 + heart.bob) * 4;
      const x = heart.x;
      const y = heart.y + floatY;

      pixel(x - 2, y + 5, "#ffb6d9", 24, 12);
      pixel(x + 3, y + 2, "#ff4f91", 5, 5);
      pixel(x + 12, y + 2, "#ff4f91", 5, 5);
      pixel(x + 1, y + 5, "#ff4f91", 18, 6);
      pixel(x + 4, y + 10, "#ff4f91", 12, 4);
      pixel(x + 7, y + 14, "#ff4f91", 6, 3);
      pixel(x + 4, y + 4, "#ffffff", 3, 3);
    }

    // Ataques aéreos do Rei das Sombras.
    function spawnBossAttack() {
      const types = ["meteor", "lightning", "spike"];
      const boss = enemies.find(e => e.type === "boss" && e.alive);

      if (!boss) return;

      const type = types[boss.skyAttackIndex % types.length];
      boss.skyAttackIndex++;

      const playerCenter = player.x + player.w / 2;
      const offset = (Math.random() < 0.5 ? -1 : 1) *
        (90 + Math.random() * 100);

      const x = Math.max(35, Math.min(W - 35, playerCenter + offset));

      bossAttacks.push({
        type,
        x,
        y: type === "meteor" ? -35 : type === "spike" ? -48 : 0,
        w: type === "lightning" ? 42 : type === "spike" ? 28 : 30,
        h: type === "meteor" ? 30 : type === "spike" ? 42 : GROUND,
        warning: type === "meteor" ? 25 : type === "lightning" ? 45 : 42,
        speed: type === "meteor" ? 5.5 : 6.5,
        active: false,
        hit: false,
        life: 0
      });
    }

    function updateBossAttacks(frame) {
      for (let i = bossAttacks.length - 1; i >= 0; i--) {
        const a = bossAttacks[i];

        if (a.warning > 0) {
          a.warning -= frame;

          if (a.warning <= 0) {
            a.active = true;

            if (a.type === "lightning") {
              a.life = 13;
            }
          }

          continue;
        }

        if (!a.active) continue;

        if (a.type === "meteor" || a.type === "spike") {
          a.y += a.speed * frame;

          if (a.y + a.h >= GROUND) {
            spawnBurst(
              a.x,
              GROUND - 5,
              a.type === "meteor" ? "#d45aff" : "#ff527f",
              12
            );

            bossAttacks.splice(i, 1);
            continue;
          }
        }

        if (a.type === "lightning") {
          a.life -= frame;

          if (a.life <= 0) {
            bossAttacks.splice(i, 1);
            continue;
          }
        }

        const hitbox = a.type === "lightning"
          ? {
              x: a.x - a.w / 2,
              y: 0,
              w: a.w,
              h: GROUND
            }
          : {
              x: a.x - a.w / 2,
              y: a.y,
              w: a.w,
              h: a.h
            };

        if (!a.hit && overlaps(player, hitbox)) {
          a.hit = true;
          hurtPlayer();
        }

        if (a.y > H + 50) {
          bossAttacks.splice(i, 1);
        }
      }
    }

    function drawBossAttacks() {
      for (const a of bossAttacks) {
        const x = a.x;

        // Avisos antes dos ataques.
        if (a.warning > 0) {
          const blink = Math.floor(time / 90) % 2 === 0;
          ctx.globalAlpha = blink ? 0.95 : 0.45;

          if (a.type === "meteor") {
            pixel(x - 24, GROUND - 5, "#a92cff", 48, 5);
            pixel(x - 15, GROUND - 10, "#e28cff", 30, 4);
            pixel(x - 5, GROUND - 15, "#ffffff", 10, 3);
          } else if (a.type === "lightning") {
            pixel(x - 21, 0, "#a62ee8", 42, GROUND);
            pixel(x - 3, 0, "#ff527f", 6, GROUND);
            pixel(x - 25, GROUND - 8, "#ff9bbd", 50, 8);
          } else {
            pixel(x - 20, GROUND - 8, "#ff315f", 40, 8);
            pixel(x - 12, GROUND - 15, "#ff8cac", 24, 5);
          }

          ctx.globalAlpha = 1;
          continue;
        }

        if (!a.active) continue;

        if (a.type === "meteor") {
          pixel(x - 8, a.y - 28, "#7626b588", 16, 22);
          pixel(x - 5, a.y - 17, "#b94cff", 10, 18);
          pixel(x - 15, a.y + 2, "#7626b5", 30, 23);
          pixel(x - 11, a.y - 4, "#d45aff", 22, 22);
          pixel(x - 5, a.y + 1, "#ffe0ff", 10, 10);
          pixel(x - 13, a.y + 12, "#ff9aff", 7, 5);
        }

        if (a.type === "lightning") {
          ctx.globalAlpha = 0.88;
          pixel(x - 21, 0, "#8f35ce", 42, GROUND);
          pixel(x - 7, 0, "#ff477b", 14, GROUND);
          pixel(x - 18, 75, "#ffb2d0", 15, 7);
          pixel(x + 3, 160, "#ffb2d0", 15, 7);
          pixel(x - 17, 250, "#ffb2d0", 15, 7);
          pixel(x + 2, 340, "#ffb2d0", 15, 7);
          ctx.globalAlpha = 1;
        }

        if (a.type === "spike") {
          pixel(x - 14, a.y + 13, "#211329", 28, 29);
          pixel(x - 10, a.y + 7, "#5b2b6a", 20, 24);
          pixel(x - 6, a.y, "#9f3f91", 12, 17);
          pixel(x - 3, a.y + 3, "#ed7bd1", 6, 10);
          pixel(x - 2, a.y + 20, "#ffb2ed", 4, 12);
        }
      }

      ctx.globalAlpha = 1;
    }

    function attack() {
      if (!running || endingMode || attackTimer > 0) return;

      attackTimer = 13;

      const hitbox = {
        x: player.facing > 0
          ? player.x + player.w - 2
          : player.x - 34,
        y: player.y + 18,
        w: 38,
        h: 34
      };

      for (const e of enemies) {
        if (!e.alive || !overlaps(hitbox, e)) continue;

        e.hp--;

        const playerCenter = player.x + player.w / 2;
        const enemyCenter = e.x + e.w / 2;
        const direction = enemyCenter >= playerCenter ? 1 : -1;

        e.knockbackX = direction * (e.type === "boss" ? 2 : 5);
        e.knockbackTimer = e.type === "boss" ? 4 : 10;

        if (e.type === "boss") {
          e.hitFlash = 7;
        }

        spawnBurst(
          e.x + e.w / 2,
          e.y + e.h / 2,
          e.type === "boss" ? "#ff527f" : stages[levelIndex].accent,
          e.type === "boss" ? 8 : 5
        );

        if (e.hp <= 0) {
          e.alive = false;

          score += e.type === "boss"
            ? 150
            : e.type === "skeleton"
              ? 20
              : e.type === "bat"
                ? 15
                : 10;

          dropHeart(e.x + e.w / 2, e.y + e.h / 2);

          spawnBurst(
            e.x + e.w / 2,
            e.y + e.h / 2,
            e.type === "boss"
              ? "#ff315f"
              : e.type === "slime"
                ? "#57f0a4"
                : "#ff8eb5",
            e.type === "boss" ? 35 : 14
          );

          if (e.type === "boss") {
            bossAttacks = [];
          }
        }
      }

      updateHud();
    }

    function hurtPlayer() {
      if (player.invuln > 0 || !running || endingMode) return;

      player.health--;
      player.invuln = 90;
      player.vy = -5;
      player.vx = -player.facing * 3;

      spawnBurst(
        player.x + player.w / 2,
        player.y + 30,
        "#ff6caa",
        10
      );

      updateHud();

      if (player.health <= 0) {
        endGame(false);
      }
    }

    function updateBoss(e, frame) {
      if (e.hitFlash > 0) {
        e.hitFlash = Math.max(0, e.hitFlash - frame);
      }

      if (e.knockbackTimer > 0) {
        e.x += e.knockbackX * frame;
        e.knockbackX *= Math.pow(0.75, frame);
        e.knockbackTimer -= frame;
      }

      const lowHp = e.hp <= 5;

      if (e.attackState === "idle" && e.chargeTimer <= 0) {
        const playerCenter = player.x + player.w / 2;
        const bossCenter = e.x + e.w / 2;
        const distance = playerCenter - bossCenter;

        if (Math.abs(distance) > 48) {
          e.dir = distance > 0 ? 1 : -1;
          e.x += e.dir * e.speed * frame;
        }

        e.skyAttackCooldown -= frame;
        e.attackCooldown -= frame;

        if (e.attackCooldown <= 0) {
          e.chargeDir = distance >= 0 ? 1 : -1;
          e.dir = e.chargeDir;
          e.chargeTimer = lowHp ? 30 : 24;
          e.attackCooldown = lowHp ? 75 : 115;

          spawnBurst(
            e.x + e.w / 2,
            e.y + e.h / 2,
            "#e84d83",
            9
          );
        }

        if (e.skyAttackCooldown <= 0) {
          spawnBossAttack();

          e.skyAttackCooldown = lowHp
            ? 48 + Math.random() * 22
            : 82 + Math.random() * 38;
        }
      } else if (e.chargeTimer > 0) {
        e.x += e.chargeDir * (lowHp ? 5.8 : 4.6) * frame;
        e.chargeTimer -= frame;
      }

      e.x = Math.max(e.minX, Math.min(e.maxX, e.x));
    }

    function startEnding() {
      if (endingMode) return;

      endingMode = true;
      endingTime = 0;
      princeRescued = true;

      score += 100;
      bossAttacks = [];
      heartDrops = [];
      attackTimer = 0;
      particles = [];

      player.x = 620;
      player.y = GROUND - player.h;
      player.vx = 0;
      player.vy = 0;
      player.facing = 1;
      player.onGround = true;

      updateHud();
    }

    function update(dt) {
      const frame = Math.min(dt / 16.67, 2);
      time += dt;

      // Durante a cena final, só avança a animação.
      if (endingMode) {
        endingTime += dt;

        if (endingTime >= 10500) {
          endGame(true);
        }

        return;
      }

      if (attackTimer > 0) {
        attackTimer = Math.max(0, attackTimer - frame);
      }

      if (player.invuln > 0) {
        player.invuln = Math.max(0, player.invuln - frame);
      }

      const left = keys.ArrowLeft || keys.KeyA;
      const right = keys.ArrowRight || keys.KeyD;

      if (left && !right) {
        player.vx = -player.speed;
        player.facing = -1;
      } else if (right && !left) {
        player.vx = player.speed;
        player.facing = 1;
      } else {
        player.vx *= 0.72;
      }

      player.x += player.vx * frame;
      player.x = Math.max(8, Math.min(W - player.w - 8, player.x));

      if (
        (keys.Space || keys.ArrowUp || keys.KeyW) &&
        player.onGround
      ) {
        player.vy = player.jump;
        player.onGround = false;
      }

      player.vy += 0.58 * frame;
      player.y += player.vy * frame;

      if (player.y + player.h >= GROUND) {
        player.y = GROUND - player.h;
        player.vy = 0;
        player.onGround = true;
      }

      // Atualiza inimigos e colisões.
      for (const e of enemies) {
        if (!e.alive) continue;

        if (e.type === "boss") {
          updateBoss(e, frame);
        } else if (e.knockbackTimer > 0) {
          e.x += e.knockbackX * frame;
          e.knockbackX *= Math.pow(0.75, frame);
          e.knockbackTimer -= frame;

          if (e.knockbackTimer <= 0) {
            e.knockbackTimer = 0;
            e.knockbackX = 0;
          }
        } else if (e.type === "bat") {
          e.x += e.dir * e.speed * frame;
          e.y += Math.sin(time * 0.004 + e.phase) * 0.65 * frame;
        } else {
          e.x += e.dir * e.speed * frame;
        }

        if (e.type !== "boss") {
          if (e.x < e.minX) {
            e.x = e.minX;
            e.dir = 1;
          }

          if (e.x > e.maxX) {
            e.x = e.maxX;
            e.dir = -1;
          }
        }

        if (overlaps(player, e)) {
          hurtPlayer();
        }
      }

      // Atualiza ataques aéreos na fase do chefão.
      if (levelIndex === 3) {
        updateBossAttacks(frame);
      } else {
        bossAttacks = [];
      }

      // Coleta corações de cura.
      for (let i = heartDrops.length - 1; i >= 0; i--) {
        const heart = heartDrops[i];

        if (player.health < 3 && overlaps(player, heart)) {
          player.health++;

          spawnBurst(
            heart.x + heart.w / 2,
            heart.y + heart.h / 2,
            "#ff6caa",
            12
          );

          heartDrops.splice(i, 1);
          updateHud();
        }
      }

      // Atualiza partículas.
      for (const p of particles) {
        p.x += p.vx * frame;
        p.y += p.vy * frame;
        p.vy += 0.14 * frame;
        p.life -= frame;
      }

      particles = particles.filter(p => p.life > 0);

      // Avança de fase ou começa o resgate.
      if (enemies.every(e => !e.alive)) {
        if (levelIndex < stages.length - 1) {
          loadStage(levelIndex + 1);
        } else if (!princeRescued) {
          startEnding();
        }
      }

      updateHud();
    }

    function drawBossHealthBar(boss) {
      if (!boss || !boss.alive) return;

      const barW = 360;
      const barH = 22;
      const barX = (W - barW) / 2;
      const barY = 77;

      ctx.fillStyle = "#100b1bef";
      ctx.fillRect(barX - 12, barY - 21, barW + 24, 55);

      ctx.textAlign = "center";
      ctx.font = "bold 15px Nunito, sans-serif";
      ctx.fillStyle = "#ffe4f0";
      ctx.fillText("REI DAS SOMBRAS", W / 2, barY - 6);

      ctx.fillStyle = "#4b263f";
      ctx.fillRect(barX, barY, barW, barH);

      const ratio = Math.max(0, boss.hp / boss.maxHp);

      ctx.fillStyle = ratio < 0.3 ? "#ff263f" : "#d83e72";
      ctx.fillRect(barX + 3, barY + 3, (barW - 6) * ratio, barH - 6);

      ctx.fillStyle = "#ff9fcb";
      ctx.fillRect(barX + 3, barY + 3, (barW - 6) * ratio, 3);

      ctx.strokeStyle = "#f3c1dd";
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barW, barH);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px Nunito, sans-serif";
      ctx.fillText(`${Math.max(0, boss.hp)} / ${boss.maxHp}`, W / 2, barY + 16);
    }

    function drawKiss(knightX, princeX, princeY, t) {
      const progress = Math.max(
        0,
        Math.min(1, (t - 4800) / 1200)
      );

      const kissX = knightX + progress * 20;
      const kissY = GROUND - player.h;

      ctx.save();
      ctx.translate(kissX + 18, kissY + 30);
      ctx.rotate(-0.12 * progress);
      ctx.translate(-(kissX + 18), -(kissY + 30));

      drawKnight(kissX, kissY, 1, false);

      ctx.restore();

      if (t >= 5400) {
        const pulse = 1 + Math.sin(t * 0.012) * 0.15;
        const hx = princeX + 8;
        const hy = princeY - 24;

        ctx.save();
        ctx.translate(hx, hy);
        ctx.scale(pulse, pulse);
        drawHeart(0, 0, 8, "#ff4f91");
        ctx.restore();

        for (let i = 0; i < 5; i++) {
          const float = (t * 0.025 + i * 22) % 70;
          const x = princeX - 5 +
            Math.sin(t * 0.003 + i) * 24;
          const y = princeY - 15 - float;

          ctx.globalAlpha = Math.max(0.15, 1 - float / 75);
          drawHeart(x, y, 4, i % 2 ? "#ff8fbd" : "#ffd875");
        }

        ctx.globalAlpha = 1;
      }
    }

    function drawEndingScene() {
      const t = endingTime;
      const floorY = GROUND - player.h;

      const approach = Math.max(0, Math.min(1, (t - 1200) / 2800));
      const knightX = 620 + approach * 135;

      const princeX = 785;
      const princeY = GROUND - player.h;

      // Brilho mágico dourado.
      const glow = 0.12 + Math.sin(t * 0.004) * 0.06;
      ctx.globalAlpha = glow;
      ctx.fillStyle = "#ffd875";
      ctx.fillRect(0, 0, W, GROUND);
      ctx.globalAlpha = 1;

      // Partículas mágicas onde o rei desapareceu.
      if (t < 3000) {
        for (let i = 0; i < 25; i++) {
          const px = 690 + Math.sin(t * 0.002 + i * 2.1) * (15 + i * 3);
          const py = GROUND - 25 - ((t * 0.035 + i * 19) % 130);

          ctx.globalAlpha = Math.max(0, 1 - t / 3000);
          pixel(px, py, i % 2 ? "#ff75b5" : "#ffe8a1", 4, 4);
        }

        ctx.globalAlpha = 1;
      }

      // Luzes flutuantes pelo salão.
      for (let i = 0; i < 12; i++) {
        const sx = (i * 83 + t * 0.012) % W;
        const sy = 160 + Math.sin(t * 0.002 + i) * 80;

        pixel(sx, sy, "#ffe9a6", 3, 3);
      }

      // Correntes do príncipe no início da cena.
      if (t < 3000) {
        pixel(princeX + 1, princeY + 36, "#a88dbb", 5, 26);
        pixel(princeX + 28, princeY + 36, "#a88dbb", 5, 26);
        pixel(princeX - 1, princeY + 47, "#d7c5e5", 37, 4);
      }

      // Brilho quando as correntes se quebram.
      if (t >= 2800 && t < 4300) {
        const alpha = Math.max(0, 1 - (t - 2800) / 1500);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#fff0a8";
        ctx.beginPath();
        ctx.arc(princeX + 18, princeY + 35, 55, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (t < 3500) {
          for (let i = 0; i < 14; i++) {
            const angle = i * Math.PI / 7;
            const radius = 18 + (t - 2800) * 0.035;
            const px = princeX + 18 + Math.cos(angle) * radius;
            const py = princeY + 35 + Math.sin(angle) * radius;

            pixel(px, py, "#fff2b5", 4, 4);
          }
        }
      }

      // Desenha a cavaleira uma única vez.
      if (t >= 4800) {
        drawKiss(knightX, princeX, princeY, t);
      } else {
        drawKnight(knightX, floorY, 1, false);
      }

      // Príncipe visível durante toda a cena.
      drawPrince(princeX, princeY);

      ctx.textAlign = "center";
      ctx.font = "bold 25px Nunito, sans-serif";
      ctx.fillStyle = "#fff2c9";
      ctx.shadowColor = "#e89bff";
      ctx.shadowBlur = 12;

      if (t < 1800) {
        ctx.fillText("O Rei das Sombras foi derrotado!", W / 2, 135);
      } else if (t < 3300) {
        ctx.fillText("A cavaleira encontrou seu príncipe...", W / 2, 135);
      } else if (t < 5200) {
        ctx.fillText("Você está livre, meu amor! ❤️", W / 2, 135);
      } else if (t < 8200) {
        ctx.fillText("O amor venceu! ❤️", W / 2, 135);
      }

      ctx.shadowBlur = 0;

      // Corações flutuando ao redor do casal.
      if (t >= 4800 && t < 10500) {
        for (let i = 0; i < 9; i++) {
          const cycle = (t * 0.045 + i * 37) % 150;
          const hx = 790 + Math.sin(t * 0.002 + i * 1.7) * 48;
          const hy = GROUND - 78 - cycle;

          ctx.globalAlpha = Math.max(0.15, 1 - cycle / 180);
          drawHeart(hx, hy, 5, i % 2 ? "#ff5b9e" : "#ffd66b");
        }

        ctx.globalAlpha = 1;
      }

      // Mensagem final.
      if (t >= 8200) {
        ctx.fillStyle = "#17102ddd";
        ctx.fillRect(130, 170, W - 260, 100);

        ctx.strokeStyle = "#ffd875";
        ctx.lineWidth = 3;
        ctx.strokeRect(130, 170, W - 260, 100);

        ctx.fillStyle = "#ffe8a1";
        ctx.font = "bold 27px Nunito, sans-serif";
        ctx.fillText("E viveram felizes para sempre...", W / 2, 210);

        ctx.font = "18px Nunito, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("Uma história de coragem e amor ❤️", W / 2, 245);
      }
    }

    function draw() {
      drawBackground();

      // Cena final.
      if (endingMode) {
        drawEndingScene();
        return;
      }

      // Nome da fase.
      ctx.fillStyle = "#17162bd9";
      ctx.fillRect(W / 2 - 190, 24, 380, 42);
      ctx.fillStyle = "#fff4df";
      ctx.font = "bold 20px Nunito, sans-serif";
      ctx.textAlign = "center";

      ctx.fillText(
        `Fase ${levelIndex + 1}: ${stages[levelIndex].name}`,
        W / 2,
        51
      );

      // Príncipe esperando o resgate.
      if (levelIndex === 3) {
        pixel(850, 330, "#201b32", 65, 126);
        pixel(860, 340, "#8c72a9", 45, 116);
        drawPrince(867, 365);
      }

      for (const e of enemies) {
        drawEnemy(e);
      }

      if (levelIndex === 3) {
        drawBossAttacks();
      }

      // Barra de vida do chefão.
      if (levelIndex === 3) {
        const boss = enemies.find(e => e.type === "boss" && e.alive);

        if (boss) {
          drawBossHealthBar(boss);
        } else {
          ctx.fillStyle = "#fff4df";
          ctx.font = "bold 18px Nunito, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("O Rei das Sombras foi derrotado!", W / 2, 104);
        }
      }

      for (const heart of heartDrops) {
        drawHeartDrop(heart);
      }

      drawKnight(
        player.x,
        player.y,
        player.facing,
        !player.onGround
      );

      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / 30);
        pixel(p.x, p.y, p.color, p.size, p.size);
      }

      ctx.globalAlpha = 1;

      if (player.invuln > 0 && Math.floor(time / 90) % 2 === 0) {
        ctx.fillStyle = "#ffffff55";
        ctx.fillRect(player.x, player.y, player.w, player.h);
      }
    }

    function loop(timestamp) {
      if (!running) return;

      const dt = lastTime ? timestamp - lastTime : 16.67;
      lastTime = timestamp;

      update(dt);
      draw();

      if (running) {
        requestAnimationFrame(loop);
      }
    }

    function endGame(won) {
      running = false;
      overlay.classList.remove("hidden");

      overlayTitle.textContent = won
        ? "Príncipe resgatado! ❤️"
        : "Fim de jogo!";

      overlayText.textContent = won
        ? `Você derrotou o Rei das Sombras e resgatou o príncipe! Pontuação final: ${score}.`
        : `A cavaleira ficou sem vida. Você fez ${score} pontos. Tente novamente!`;

      startButton.textContent = won
        ? "Jogar novamente"
        : "Tentar de novo";
    }

    function startGame() {
      score = 0;
      levelIndex = 0;
      princeRescued = false;

      endingMode = false;
      endingTime = 0;

      player.health = 3;
      player.invuln = 0;
      player.vx = 0;
      player.vy = 0;

      particles = [];
      heartDrops = [];
      bossAttacks = [];
      attackTimer = 0;

      for (const key in keys) {
        keys[key] = false;
      }

      running = true;
      lastTime = 0;
      time = 0;

      loadStage(0);
      overlay.classList.add("hidden");
      draw();

      requestAnimationFrame(loop);
    }

    startButton.addEventListener("click", startGame);

    window.addEventListener("keydown", event => {
      const gameKeys = [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "Space",
        "KeyA",
        "KeyD",
        "KeyW",
        "KeyJ",
        "KeyX",
        "KeyR"
      ];

      if (gameKeys.includes(event.code)) {
        event.preventDefault();
      }

      keys[event.code] = true;

      if (
        !event.repeat &&
        (event.code === "KeyJ" || event.code === "KeyX")
      ) {
        attack();
      }

      if (!event.repeat && event.code === "KeyR") {
        startGame();
      }
    });

    window.addEventListener("keyup", event => {
      keys[event.code] = false;
    });

    window.addEventListener("blur", () => {
      for (const key in keys) {
        keys[key] = false;
      }
    });

    // Inicializa o jogo sem começar a partida automaticamente.
    loadStage(0);
    draw();
  }

  // Garante que o HTML esteja carregado antes de acessar seus elementos.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGame, { once: true });
  } else {
    initGame();
  }
})();
