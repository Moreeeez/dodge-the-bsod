(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const frame = document.getElementById("gameFrame");

  const ui = {
    score: document.getElementById("scoreValue"),
    high: document.getElementById("highScoreValue"),
    health: document.getElementById("healthValue"),
    combo: document.getElementById("comboValue"),
    shield: document.getElementById("shieldValue"),
    power: document.getElementById("powerValue"),
    status: document.getElementById("statusText"),
    warning: document.getElementById("warningFlash"),
    event: document.getElementById("eventBadge"),
    bossBar: document.getElementById("bossBar"),
    bossHealth: document.getElementById("bossHealth"),
    start: document.getElementById("startScreen"),
    pause: document.getElementById("pauseScreen"),
    gameOver: document.getElementById("gameOverScreen"),
    finalScore: document.getElementById("finalScore"),
    bestScore: document.getElementById("bestScore"),
    finalTime: document.getElementById("finalTime"),
    finalCombo: document.getElementById("finalCombo"),
    finalDodged: document.getElementById("finalDodged"),
    finalPowerups: document.getElementById("finalPowerups"),
    finalBosses: document.getElementById("finalBosses"),
    finalDifficulty: document.getElementById("finalDifficulty"),
    finalMessage: document.getElementById("finalMessage"),
    gameOverLeaderboard: document.getElementById("gameOverLeaderboardList"),
    leaderboard: document.getElementById("leaderboardList"),
    nameError: document.getElementById("nameError"),
    nameInput: document.getElementById("playerNameInput"),
    pauseButton: document.getElementById("pauseButton")
  };
  ui.refreshScores = document.getElementById("refreshScoresButton");
  ui.submitStatus = document.getElementById("submitStatus");

  const W = canvas.width;
  const H = canvas.height;
  const keys = new Set();
  let lastTime = 0;
  let audioCtx;
  let highScore = Number(localStorage.getItem("bsodHighScore") || 0);
  let playerName = sanitizeName(localStorage.getItem("bsodPlayerName") || "");
  let cachedScores = [];

  const difficulties = {
    chill: { label: "Chill", spawn: 0.72, speed: 0.82, damage: 0.72, events: 1.35, maxSpeed: 260 },
    normal: { label: "Normal", spawn: 1, speed: 0.96, damage: 0.95, events: 1, maxSpeed: 310 },
    nightmare: { label: "Nightmare", spawn: 1.25, speed: 1.08, damage: 1.08, events: 0.82, maxSpeed: 355 }
  };

  const messages = [
    "Windows is checking for a solution. It found none.",
    "Your cursor has stopped responding emotionally.",
    "Installing update 1 of 999. Please panic.",
    "Low disk space, high personal stress.",
    "A suspicious file says it is totally safe.",
    "The error report has an error report.",
    "Task failed successfully.",
    "Please restart your entire personality.",
    "Antivirus trial expired in 2009. Still judging you.",
    "Activation watermark has entered the chat.",
    "RAM upgrade found extra tabs you forgot about.",
    "The registry looked at you and sighed."
  ];

  const gameOverMessages = [
    "Windows has recovered from an unexpected player.",
    "Your survival.exe has stopped working.",
    "Critical failure: too many rectangles.",
    "The system tried its best. Allegedly.",
    "A forced update ended your hopes and dreams.",
    "Blue screen any% speedrun complete."
  ];

  const enemyTypes = [
    { type: "bsod", label: ":(", w: 130, h: 82, speed: 135, damage: 28, score: 18, color: "#0057d8", weight: 1 },
    { type: "popup", label: "Not Responding", w: 118, h: 62, speed: 170, damage: 14, score: 11, color: "#ece9d8", weight: 1.35 },
    { type: "antivirus", label: "Threats Found!", w: 132, h: 66, speed: 158, damage: 16, score: 13, color: "#fff3b0", weight: 1.05 },
    { type: "virus", label: "VIRUS!", w: 74, h: 66, speed: 205, damage: 18, score: 13, color: "#39ff88", weight: 1.05 },
    { type: "malware", label: "MAL", w: 34, h: 34, speed: 245, damage: 8, score: 7, color: "#baff39", weight: 1.18 },
    { type: "update", label: "Update", w: 112, h: 58, speed: 125, damage: 16, score: 12, color: "#5fa8ff", weight: 1.1 },
    { type: "error", label: "!", w: 42, h: 42, speed: 265, damage: 10, score: 8, color: "#f04438", weight: 1.22 },
    { type: "warning", label: "!", w: 48, h: 44, speed: 230, damage: 11, score: 9, color: "#fdb022", weight: 1.08 },
    { type: "file", label: "BAD", w: 58, h: 58, speed: 190, damage: 13, score: 10, color: "#b7c4d3", weight: 1 },
    { type: "watermark", label: "Activate Windows", w: 166, h: 48, speed: 112, damage: 18, score: 15, color: "#101828", weight: 0.75 },
    { type: "disk", label: "LOW DISK", w: 116, h: 52, speed: 155, damage: 15, score: 12, color: "#fdb022", weight: 1 }
  ];

  const powerTypes = [
    { type: "taskmgr", label: "Task Manager", color: "#32d583" },
    { type: "shield", label: "Antivirus Shield", color: "#7dd3fc" },
    { type: "bomb", label: "Reformat Bomb", color: "#fdb022" },
    { type: "ssd", label: "SSD Boost", color: "#ffffff" },
    { type: "ram", label: "RAM Slow-mo", color: "#c084fc" }
  ];

  const icons = Array.from({ length: 13 }, (_, i) => ({
    x: 32 + (i % 7) * 108,
    y: 34 + Math.floor(i / 7) * 76,
    bob: Math.random() * Math.PI * 2,
    label: ["My PC", "Recycle", "Docs", "Setup", "Patch", "Logs", "Win32", "Help", "Drivers", "Games", "Readme", "Temp", "Backup"][i]
  }));

  const player = {
    x: W / 2,
    y: H - 78,
    r: 17,
    vx: 0,
    vy: 0,
    invincible: 0,
    shield: 0,
    boost: 0
  };

  const state = {
    mode: "start",
    selectedDifficulty: "normal",
    countdown: 0,
    score: 0,
    health: 100,
    elapsed: 0,
    difficulty: 1,
    combo: 1,
    maxCombo: 1,
    streak: 0,
    dodged: 0,
    hits: 0,
    powerupsUsed: 0,
    bossesDefeated: 0,
    spawnTimer: 0,
    powerTimer: 8,
    messageTimer: 0,
    eventTimer: 7,
    event: null,
    eventLeft: 0,
    warningLeft: 0,
    lagLeft: 0,
    invertLeft: 0,
    updateWallLeft: 0,
    glitchLeft: 0,
    stormLeft: 0,
    infectionLeft: 0,
    storageLeft: 0,
    slowmoLeft: 0,
    bossTimer: 34,
    boss: null,
    bossShotTimer: 0,
    shakePower: 0,
    enemies: [],
    powerups: [],
    particles: []
  };

  function resetGame() {
    const name = sanitizeName(ui.nameInput.value);
    if (!name) {
      ui.nameError.hidden = false;
      ui.nameError.textContent = "Enter a display name first.";
      return;
    }
    playerName = name;
    localStorage.setItem("bsodPlayerName", playerName);
    ui.nameError.hidden = true;
    state.selectedDifficulty = document.querySelector("input[name='difficulty']:checked")?.value || "normal";
    const profile = difficulties[state.selectedDifficulty];
    Object.assign(state, {
      mode: "playing",
      countdown: 0,
      score: 0,
      health: 100,
      elapsed: 0,
      difficulty: 1,
      combo: 1,
      maxCombo: 1,
      streak: 0,
      dodged: 0,
      hits: 0,
      powerupsUsed: 0,
      bossesDefeated: 0,
      spawnTimer: 0.35,
      powerTimer: 7,
      messageTimer: 0,
      eventTimer: 6 * profile.events,
      event: null,
      eventLeft: 0,
      warningLeft: 0,
      lagLeft: 0,
      invertLeft: 0,
      updateWallLeft: 0,
      glitchLeft: 0,
      stormLeft: 0,
      infectionLeft: 0,
      storageLeft: 0,
      slowmoLeft: 0,
      bossTimer: 30,
      boss: null,
      bossShotTimer: 0,
      shakePower: 0,
      enemies: [],
      powerups: [],
      particles: []
    });
    Object.assign(player, { x: W / 2, y: H - 78, vx: 0, vy: 0, invincible: 0, shield: 0, boost: 0 });
    ui.start.hidden = true;
    ui.pause.hidden = true;
    ui.gameOver.hidden = true;
    ui.warning.hidden = true;
    ui.bossBar.hidden = true;
    frame.classList.remove("glitch");
    setStatus(`Booted in ${profile.label}. Dodge responsibly.`);
    beep(520, 0.08, "square", 0.04);
  }

  function update(dt) {
    if (state.mode === "countdown") {
      state.countdown -= dt;
      if (state.countdown <= 0) {
        state.mode = "playing";
        setStatus("Resumed. The errors politely waited.");
      }
      updateUi();
      return;
    }
    if (state.mode !== "playing") return;

    const profile = difficulties[state.selectedDifficulty];
    state.elapsed += dt;
    state.difficulty = 1 + Math.min(2.6, state.elapsed / 60);
    state.score += dt * 12 * state.combo * (state.boss ? 1.35 : 1);
    state.messageTimer -= dt;
    player.invincible = Math.max(0, player.invincible - dt);
    player.shield = Math.max(0, player.shield - dt);
    player.boost = Math.max(0, player.boost - dt);
    state.slowmoLeft = Math.max(0, state.slowmoLeft - dt);
    state.shakePower = Math.max(0, state.shakePower - dt * 12);

    tickEvents(dt, profile);
    const lagScale = state.lagLeft > 0 ? 0.38 : 1;
    const slowScale = state.slowmoLeft > 0 ? 0.52 : 1;
    const gameDt = dt * lagScale * slowScale;
    updatePlayer(gameDt);
    updateBoss(dt);
    updateSpawning(gameDt, profile);
    updatePowerups(gameDt);
    updateEnemies(gameDt);
    updateParticles(dt);
    updateCollisions(profile);
    updateUi();

    if (state.messageTimer <= 0) setStatus(messages[Math.floor(Math.random() * messages.length)]);
    if (state.health <= 0) endGame();
  }

  function tickEvents(dt, profile) {
    state.eventTimer -= dt;
    state.warningLeft = Math.max(0, state.warningLeft - dt);
    state.lagLeft = Math.max(0, state.lagLeft - dt);
    state.invertLeft = Math.max(0, state.invertLeft - dt);
    state.updateWallLeft = Math.max(0, state.updateWallLeft - dt);
    state.glitchLeft = Math.max(0, state.glitchLeft - dt);
    state.stormLeft = Math.max(0, state.stormLeft - dt);
    state.infectionLeft = Math.max(0, state.infectionLeft - dt);
    state.storageLeft = Math.max(0, state.storageLeft - dt);
    ui.warning.hidden = state.warningLeft <= 0;
    frame.classList.toggle("glitch", state.glitchLeft > 0 || state.infectionLeft > 0);

    if (state.eventTimer <= 0 && !state.event && !state.boss) {
      const events = ["lag", "glitch", "update", "invert", "storm", "infection", "storage"];
      startEvent(events[Math.floor(Math.random() * events.length)]);
    }

    if (state.event) {
      state.eventLeft -= dt;
      if (state.event === "storm" && Math.random() < dt * 5.5) spawnEnemy("popup", true);
      if (state.event === "update" && Math.random() < dt * 2.1) spawnEnemy("update", true);
      if (state.event === "infection" && Math.random() < dt * 4.6) spawnEnemy("malware", true);
      if (state.event === "storage" && Math.random() < dt * 1.8) spawnEnemy("disk", true);
      if (state.eventLeft <= 0) {
        state.event = null;
        ui.event.textContent = "NORMAL CHAOS";
        state.eventTimer = rand(10, 17) * profile.events / Math.min(1.65, state.difficulty);
      }
    }
  }

  function startEvent(name) {
    state.event = name;
    state.eventLeft = rand(3.8, 6.2);
    const labels = {
      lag: ["LAG SPIKE", "Frames are taking a coffee break.", "lagLeft"],
      glitch: ["SCREEN GLITCH", "Display driver has entered interpretive dance mode.", "glitchLeft"],
      update: ["FORCED UPDATE", "Forced update incoming. Consent not found.", "updateWallLeft"],
      invert: ["MOUSE INVERTED", "Mouse settings changed by absolutely nobody.", "invertLeft"],
      storm: ["POPUP STORM", "Popup spam storm. Close buttons are decorative.", "stormLeft"],
      infection: ["VIRUS INFECTION", "Malware swarm detected. It brought friends.", "infectionLeft"],
      storage: ["LOW STORAGE", "Disk space is low. Anxiety space is full.", "storageLeft"]
    };
    const [badge, text, timer] = labels[name];
    state[timer] = state.eventLeft;
    ui.event.textContent = badge;
    setStatus(text);
    if (name === "update" || name === "storm" || name === "infection") state.warningLeft = 1.6;
    if (name === "update") setTimeout(() => state.mode === "playing" && spawnBsodWall(), 850);
    beep(220, 0.08, "sawtooth", 0.05);
  }

  function updatePlayer(dt) {
    let ax = 0;
    let ay = 0;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) ax -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) ax += 1;
    if (keys.has("ArrowUp") || keys.has("KeyW")) ay -= 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) ay += 1;
    if (state.invertLeft > 0) {
      ax *= -1;
      ay *= -1;
    }
    const len = Math.hypot(ax, ay) || 1;
    ax /= len;
    ay /= len;
    const targetSpeed = player.boost > 0 ? 430 : 320;
    const response = 1 - Math.pow(0.025, dt);
    player.vx += (ax * targetSpeed - player.vx) * response;
    player.vy += (ay * targetSpeed - player.vy) * response;
    player.vx *= Math.pow(0.94, dt);
    player.vy *= Math.pow(0.94, dt);
    player.x = clamp(player.x + player.vx * dt, player.r + 8, W - player.r - 8);
    player.y = clamp(player.y + player.vy * dt, player.r + 8, H - player.r - 50);
  }

  function updateBoss(dt) {
    state.bossTimer -= dt;
    if (!state.boss && state.bossTimer <= 0) spawnBoss();
    if (!state.boss) return;

    const boss = state.boss;
    boss.t += dt;
    boss.x += (W / 2 + Math.sin(boss.t * 1.3) * 210 - boss.x) * (1 - Math.pow(0.04, dt));
    boss.y += (48 + Math.sin(boss.t * 2.1) * 14 - boss.y) * (1 - Math.pow(0.06, dt));
    state.bossShotTimer -= dt;
    if (state.bossShotTimer <= 0) {
      state.warningLeft = 0.9;
      const pattern = Math.floor(boss.t) % 3;
      if (pattern === 0) spawnBossRain();
      if (pattern === 1) spawnBossSweep();
      if (pattern === 2) spawnBsodWall();
      state.bossShotTimer = Math.max(1.35, 2.8 - state.difficulty * 0.16);
    }
    boss.hp -= dt * (0.8 + state.combo * 0.08);
    if (boss.hp <= 0) {
      state.bossesDefeated++;
      state.score += 800 * state.combo;
      pop(boss.x, boss.y + 50, "#32d583", 80);
      setStatus("Critical System Failure dismissed by Task Manager energy.");
      state.boss = null;
      state.bossTimer = 34;
      ui.bossBar.hidden = true;
      beep(760, 0.18, "triangle", 0.06);
    }
  }

  function spawnBoss() {
    state.boss = { x: W / 2, y: -90, w: 360, h: 126, hp: 100, maxHp: 100, t: 0 };
    state.bossShotTimer = 1.4;
    ui.bossBar.hidden = false;
    ui.event.textContent = "BOSS FIGHT";
    state.warningLeft = 2;
    setStatus("Critical System Failure boss loaded. This one has a manager.");
    beep(110, 0.35, "sawtooth", 0.07);
  }

  function updateSpawning(dt, profile) {
    state.spawnTimer -= dt;
    state.powerTimer -= dt;
    if (state.spawnTimer <= 0 && !state.boss) {
      const pattern = Math.random();
      if (pattern < 0.12) spawnLanePattern();
      else if (pattern < 0.24) spawnEnemy("watermark");
      else spawnEnemy();
      const pressure = state.stormLeft > 0 || state.infectionLeft > 0 ? 1.7 : 1;
      state.spawnTimer = rand(0.45, 1.05) / (state.difficulty * pressure * profile.spawn);
    }
    if (state.powerTimer <= 0) {
      spawnPowerup();
      state.powerTimer = rand(8, 14);
    }
  }

  function spawnEnemy(forcedType, chaotic = false) {
    const base = forcedType ? enemyTypes.find(enemy => enemy.type === forcedType) : weightedEnemy();
    const profile = difficulties[state.selectedDifficulty];
    state.enemies.push({
      ...base,
      x: chooseSpawnX(base.w),
      y: -base.h - rand(44, 140),
      vx: rand(-38, 38) * (chaotic ? 2.2 : 1),
      vy: Math.min(profile.maxSpeed, base.speed * rand(0.82, 1.08) * state.difficulty * profile.speed),
      wobble: rand(0, Math.PI * 2),
      hit: false,
      counted: false
    });
    if ((base.type === "bsod" || base.type === "watermark") && Math.random() < 0.35) state.warningLeft = 1.1;
  }

  function weightedEnemy() {
    const total = enemyTypes.reduce((sum, enemy) => sum + enemy.weight, 0);
    let roll = Math.random() * total;
    for (const enemy of enemyTypes) {
      roll -= enemy.weight;
      if (roll <= 0) return enemy;
    }
    return enemyTypes[0];
  }

  function spawnLanePattern() {
    const type = Math.random() < 0.5 ? "error" : "warning";
    const gap = Math.floor(rand(0, 5));
    for (let i = 0; i < 6; i++) {
      if (i === gap) continue;
      const base = enemyTypes.find(enemy => enemy.type === type);
      state.enemies.push({ ...base, x: 48 + i * 132, y: -120 - i * 16, vx: 0, vy: Math.min(difficulties[state.selectedDifficulty].maxSpeed, base.speed * state.difficulty), wobble: rand(0, 9), hit: false, counted: false });
    }
    state.warningLeft = 1.35;
  }

  function spawnBsodWall() {
    const gap = rand(120, W - 250);
    for (let x = 20; x < W - 120; x += 145) {
      if (x > gap && x < gap + 150) continue;
      const base = enemyTypes[0];
      state.enemies.push({ ...base, x, y: -150, vx: 0, vy: Math.min(difficulties[state.selectedDifficulty].maxSpeed, 170 * state.difficulty), wobble: rand(0, 10), hit: false, counted: false });
    }
  }

  function spawnBossRain() {
    for (let i = 0; i < 7; i++) spawnEnemy(i % 2 ? "bsod" : "error", true);
  }

  function spawnBossSweep() {
    for (let i = 0; i < 8; i++) {
      const base = enemyTypes.find(enemy => enemy.type === "file");
      state.enemies.push({ ...base, x: i * 112, y: -70 - i * 28, vx: i % 2 ? 60 : -60, vy: Math.min(difficulties[state.selectedDifficulty].maxSpeed, 205 * state.difficulty), wobble: rand(0, 8), hit: false, counted: false });
    }
  }

  function spawnPowerup() {
    const base = powerTypes[Math.floor(Math.random() * powerTypes.length)];
    state.powerups.push({ ...base, x: rand(42, W - 42), y: -40, r: 18, vy: rand(105, 145), wobble: rand(0, 7) });
  }

  function updateEnemies(dt) {
    for (const enemy of state.enemies) {
      enemy.wobble += dt * 3;
      enemy.x += (enemy.vx + Math.sin(enemy.wobble) * 24) * dt;
      enemy.y += enemy.vy * dt;
      enemy.x = clamp(enemy.x, 4, W - enemy.w - 4);
      if (!enemy.counted && enemy.y > H + 12) {
        enemy.counted = true;
        state.dodged++;
        state.streak++;
        state.combo = 1 + Math.min(12, Math.floor(state.streak / 7));
        state.maxCombo = Math.max(state.maxCombo, state.combo);
        state.score += enemy.score * state.combo;
        pop(enemy.x + enemy.w / 2, H - 34, "#32d583", 6);
      }
    }
    state.enemies = state.enemies.filter(enemy => enemy.y < H + 150 && !enemy.remove);
  }

  function updatePowerups(dt) {
    for (const power of state.powerups) {
      power.wobble += dt * 4;
      power.y += power.vy * dt;
      power.x += Math.sin(power.wobble) * 30 * dt;
    }
    state.powerups = state.powerups.filter(power => power.y < H + 70 && !power.remove);
  }

  function updateParticles(dt) {
    for (const p of state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 80 * dt;
      p.life -= dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);
  }

  function updateCollisions(profile) {
    for (const power of state.powerups) {
      if (power.remove || Math.hypot(player.x - power.x, player.y - power.y) > player.r + power.r) continue;
      power.remove = true;
      activatePowerup(power.type);
      pop(power.x, power.y, power.color, 20);
      beep(720, 0.08, "triangle", 0.045);
    }

    for (const enemy of state.enemies) {
      if (enemy.hit || player.invincible > 0) continue;
      const rect = shrinkRect(enemy, enemy.type === "malware" ? 0.62 : 0.74, 0.68);
      if (!circleRect(player.x, player.y, player.r * 0.68, rect)) continue;
      enemy.hit = true;
      if (player.shield > 0) {
        player.shield = Math.max(0, player.shield - 2.6);
        enemy.remove = true;
        pop(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#7dd3fc", 18);
        setStatus("Shield absorbed an error. Subscription temporarily worth it.");
        continue;
      }
      state.health -= enemy.damage * profile.damage;
      state.hits++;
      state.streak = 0;
      state.combo = 1;
      player.invincible = 1.35;
      shake(1);
      pop(player.x, player.y, "#f04438", 22);
      setStatus(`${enemy.label} hit you. Windows suggests blaming hardware.`);
      beep(96, 0.16, "sawtooth", 0.08);
    }
  }

  function activatePowerup(type) {
    state.powerupsUsed++;
    const labels = {
      taskmgr: "Task Manager cleared visible nonsense.",
      shield: "Antivirus shield online. Very premium.",
      bomb: "Reformat bomb deployed. Files are nervous.",
      ssd: "SSD boost. Cursor has discovered caffeine.",
      ram: "RAM upgrade active. Time got more memory."
    };
    setStatus(labels[type]);
    ui.power.textContent = powerTypes.find(power => power.type === type)?.label || "Utility";
    if (type === "taskmgr") clearEnemies(0.65);
    if (type === "shield") player.shield = 8;
    if (type === "bomb") clearEnemies(1);
    if (type === "ssd") player.boost = 6;
    if (type === "ram") state.slowmoLeft = 6;
  }

  function clearEnemies(fraction) {
    const count = Math.ceil(state.enemies.length * fraction);
    for (let i = 0; i < count; i++) {
      const enemy = state.enemies[i];
      if (!enemy) continue;
      enemy.remove = true;
      pop(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#ffffff", 10);
      state.score += 12 * state.combo;
    }
    shake(0.5);
  }

  function draw() {
    drawDesktop();
    drawBoss();
    drawEnemies();
    drawPowerups();
    drawPlayer();
    drawParticles();
    drawEffects();
  }

  function drawDesktop() {
    const t = performance.now() / 1000;
    const gradient = ctx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, "#154e9f");
    gradient.addColorStop(0.5 + Math.sin(t * 0.4) * 0.05, "#0f7fd5");
    gradient.addColorStop(0.57, "#3e9a42");
    gradient.addColorStop(1, "#1d6b2d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    for (const icon of icons) {
      const bob = Math.sin(t * 1.6 + icon.bob) * 3;
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(icon.x, icon.y + bob, 42, 42);
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.font = "bold 10px Tahoma";
      ctx.textAlign = "center";
      ctx.fillText(icon.label, icon.x + 21, icon.y + bob + 56);
    }

    ctx.fillStyle = "#245edb";
    ctx.fillRect(0, H - 42, W, 42);
    ctx.fillStyle = "#39a935";
    ctx.fillRect(0, H - 42, 112, 42);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px Tahoma";
    ctx.textAlign = "left";
    ctx.fillText("start", 28, H - 15);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(W - 154, H - 35, 136, 28);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px Tahoma";
    ctx.fillText(state.event ? "CPU 99%" : "3:33 PM", W - 112, H - 16);
  }

  function drawEnemies() {
    for (const enemy of state.enemies) {
      if (enemy.type === "bsod") drawBsod(enemy);
      else if (enemy.type === "popup") drawPopup(enemy);
      else if (enemy.type === "antivirus") drawAntivirus(enemy);
      else if (enemy.type === "virus" || enemy.type === "malware") drawVirus(enemy);
      else if (enemy.type === "update") drawUpdate(enemy);
      else if (enemy.type === "error") drawErrorIcon(enemy);
      else if (enemy.type === "warning") drawWarningIcon(enemy);
      else if (enemy.type === "file") drawFile(enemy);
      else if (enemy.type === "watermark") drawWatermark(enemy);
      else drawDisk(enemy);
    }
  }

  function drawBoss() {
    if (!state.boss) return;
    const b = state.boss;
    drawWindow(b.x - b.w / 2, b.y, b.w, b.h, "CRITICAL SYSTEM FAILURE", "Your PC ran into a boss.", "#0057d8", true);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 46px Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText(":(", b.x, b.y + 83);
  }

  function drawBsod(e) {
    ctx.fillStyle = "#0057d8";
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px Consolas, monospace";
    ctx.fillText(e.label, e.x + 10, e.y + 26);
    ctx.font = "10px Consolas, monospace";
    ctx.fillText("A problem has been detected", e.x + 10, e.y + 48);
    ctx.fillText("0x000000DODGE", e.x + 10, e.y + 64);
  }

  function drawPopup(e) {
    drawWindow(e.x, e.y, e.w, e.h, "Application", e.label, "#ece9d8");
  }

  function drawAntivirus(e) {
    drawWindow(e.x, e.y, e.w, e.h, "Definitely Antivirus", e.label, e.color);
    ctx.fillStyle = "#f04438";
    ctx.fillRect(e.x + 14, e.y + e.h - 18, e.w - 28, 7);
  }

  function drawVirus(e) {
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(e.x + e.w / 2, e.y + e.h / 2, e.w * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = e.color;
    ctx.lineWidth = e.type === "malware" ? 2 : 4;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + e.wobble;
      ctx.beginPath();
      ctx.moveTo(e.x + e.w / 2, e.y + e.h / 2);
      ctx.lineTo(e.x + e.w / 2 + Math.cos(a) * e.w * 0.46, e.y + e.h / 2 + Math.sin(a) * e.h * 0.46);
      ctx.stroke();
    }
    ctx.fillStyle = e.color;
    ctx.font = "bold 11px Tahoma";
    ctx.textAlign = "center";
    ctx.fillText(e.label, e.x + e.w / 2, e.y + e.h / 2 + 4);
  }

  function drawUpdate(e) {
    drawWindow(e.x, e.y, e.w, e.h, "Windows Update", "Please wait...", "#d8ecff");
    ctx.fillStyle = "#245edb";
    ctx.fillRect(e.x + 12, e.y + e.h - 18, (e.w - 24) * ((Math.sin(e.wobble) + 1) / 2), 8);
  }

  function drawErrorIcon(e) {
    ctx.fillStyle = "#f04438";
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px Tahoma";
    ctx.textAlign = "center";
    ctx.fillText("!", e.x + e.w / 2, e.y + 34);
  }

  function drawWarningIcon(e) {
    ctx.fillStyle = "#fdb022";
    ctx.beginPath();
    ctx.moveTo(e.x + e.w / 2, e.y);
    ctx.lineTo(e.x + e.w, e.y + e.h);
    ctx.lineTo(e.x, e.y + e.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#101828";
    ctx.stroke();
    ctx.fillStyle = "#101828";
    ctx.font = "bold 26px Tahoma";
    ctx.textAlign = "center";
    ctx.fillText("!", e.x + e.w / 2, e.y + e.h - 8);
  }

  function drawFile(e) {
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x, e.y + 10, e.w, e.h - 10);
    ctx.fillStyle = "#e7eef7";
    ctx.beginPath();
    ctx.moveTo(e.x + e.w - 18, e.y + 10);
    ctx.lineTo(e.x + e.w, e.y + 28);
    ctx.lineTo(e.x + e.w - 18, e.y + 28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#344054";
    ctx.font = "bold 12px Tahoma";
    ctx.textAlign = "center";
    ctx.fillText(e.label, e.x + e.w / 2, e.y + 43);
  }

  function drawWatermark(e) {
    ctx.fillStyle = "rgba(16,24,40,0.68)";
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Tahoma";
    ctx.textAlign = "center";
    ctx.fillText(e.label, e.x + e.w / 2, e.y + 21);
    ctx.font = "10px Tahoma";
    ctx.fillText("Go to Settings to dodge Windows", e.x + e.w / 2, e.y + 36);
  }

  function drawDisk(e) {
    drawWindow(e.x, e.y, e.w, e.h, "Warning", e.label, "#fff6d0");
  }

  function drawPowerups() {
    for (const p of state.powerups) {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(p.x + 4, p.y + 8, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 18, p.y - 18, 36, 36);
      ctx.strokeStyle = "#061a44";
      ctx.lineWidth = 3;
      ctx.strokeRect(p.x - 18, p.y - 18, 36, 36);
      ctx.fillStyle = "#061a44";
      ctx.font = "bold 9px Tahoma";
      ctx.textAlign = "center";
      ctx.fillText(powerGlyph(p.type), p.x, p.y + 4);
    }
  }

  function powerGlyph(type) {
    return { taskmgr: "TM", shield: "AV", bomb: "FMT", ssd: "SSD", ram: "RAM" }[type] || "?";
  }

  function drawWindow(x, y, w, h, title, body, fill, bsod = false) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = bsod ? "#ffffff" : "#061a44";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = bsod ? "#003f9e" : "#245edb";
    ctx.fillRect(x, y, w, 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px Tahoma";
    ctx.textAlign = "left";
    ctx.fillText(title, x + 6, y + 14);
    ctx.fillStyle = bsod ? "#ffffff" : "#101828";
    ctx.font = "bold 12px Tahoma";
    ctx.fillText(body, x + 10, y + 42);
  }

  function drawPlayer() {
    ctx.save();
    ctx.globalAlpha = player.invincible > 0 && Math.floor(performance.now() / 80) % 2 ? 0.45 : 1;
    ctx.translate(player.x, player.y);
    if (player.shield > 0) {
      ctx.strokeStyle = "rgba(125,211,252,0.9)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 2, 30 + Math.sin(performance.now() / 100) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(5, 13, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = player.boost > 0 ? "#dcfce7" : "#ffffff";
    ctx.strokeStyle = "#061a44";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, -18);
    ctx.lineTo(18, 2);
    ctx.lineTo(4, 6);
    ctx.lineTo(11, 20);
    ctx.lineTo(2, 24);
    ctx.lineTo(-5, 10);
    ctx.lineTo(-14, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles() {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawEffects() {
    const shakeX = state.shakePower > 0 ? rand(-state.shakePower, state.shakePower) : 0;
    const shakeY = state.shakePower > 0 ? rand(-state.shakePower, state.shakePower) : 0;
    canvas.style.transform = shakeX || shakeY ? `translate(${shakeX}px, ${shakeY}px)` : "";

    if (state.glitchLeft > 0 || state.infectionLeft > 0) {
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i % 2 ? "rgba(255,0,80,0.18)" : "rgba(0,255,255,0.18)";
        ctx.fillRect(rand(0, W), rand(0, H), rand(80, 300), rand(3, 13));
      }
    }
    if (state.lagLeft > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.24)";
      ctx.font = "bold 36px Tahoma";
      ctx.textAlign = "center";
      ctx.fillText("BUFFERING...", W / 2, H / 2);
    }
    if (state.storageLeft > 0) {
      ctx.fillStyle = "rgba(253,176,34,0.15)";
      ctx.fillRect(0, 0, W, H);
    }
    if (state.mode === "countdown") {
      ctx.fillStyle = "rgba(6,26,68,0.38)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 76px Tahoma";
      ctx.textAlign = "center";
      ctx.fillText(Math.max(1, Math.ceil(state.countdown)), W / 2, H / 2);
    }
  }

  function updateUi() {
    const score = Math.floor(state.score);
    ui.score.textContent = score.toLocaleString();
    ui.high.textContent = highScore.toLocaleString();
    ui.health.textContent = Math.max(0, Math.ceil(state.health));
    ui.combo.textContent = `x${state.combo}`;
    ui.shield.textContent = player.shield > 0 ? `${Math.ceil(player.shield)}s` : "Off";
    if (player.boost <= 0 && state.slowmoLeft <= 0 && player.shield <= 0) ui.power.textContent = "None";
    if (state.boss) ui.bossHealth.style.width = `${Math.max(0, state.boss.hp / state.boss.maxHp * 100)}%`;
  }

  function endGame() {
    state.mode = "over";
    const score = Math.floor(state.score);
    highScore = Math.max(highScore, score);
    localStorage.setItem("bsodHighScore", String(highScore));
    ui.finalScore.textContent = score.toLocaleString();
    ui.bestScore.textContent = highScore.toLocaleString();
    ui.finalTime.textContent = `${Math.floor(state.elapsed)}s`;
    ui.finalCombo.textContent = `x${state.maxCombo}`;
    ui.finalDodged.textContent = state.dodged.toLocaleString();
    ui.finalPowerups.textContent = state.powerupsUsed.toLocaleString();
    ui.finalBosses.textContent = state.bossesDefeated.toLocaleString();
    ui.finalDifficulty.textContent = difficulties[state.selectedDifficulty].label;
    ui.finalMessage.textContent = gameOverMessages[Math.floor(Math.random() * gameOverMessages.length)];
    ui.gameOver.hidden = false;
    ui.bossBar.hidden = true;
    ui.submitStatus.textContent = "Submitting score...";
    submitScore(score);
    beep(130, 0.18, "sawtooth", 0.07);
    setTimeout(() => beep(82, 0.22, "square", 0.06), 130);
  }

  function togglePause(force) {
    if (state.mode !== "playing" && state.mode !== "paused") return;
    if (force === "playing" || state.mode === "paused") {
      state.mode = "countdown";
      state.countdown = 3;
      ui.pause.hidden = true;
      ui.pauseButton.textContent = "II";
      return;
    }
    state.mode = "paused";
    ui.pause.hidden = false;
    ui.pauseButton.textContent = ">";
  }

  function setStatus(text) {
    ui.status.textContent = text;
    state.messageTimer = 3.8;
  }

  function shake(amount = 1) {
    state.shakePower = Math.max(state.shakePower, 7 * amount);
    frame.classList.remove("shake");
    void frame.offsetWidth;
    frame.classList.add("shake");
  }

  function pop(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      state.particles.push({ x, y, vx: rand(-135, 135), vy: rand(-180, 80), size: rand(3, 8), life: rand(0.35, 0.9), color });
    }
  }

  function beep(freq, duration, type, volume) {
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Browsers can block audio until a user gesture; gameplay still works.
    }
  }

  function loop(now) {
    const dt = Math.min(0.034, (now - lastTime) / 1000 || 0);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function circleRect(cx, cy, r, rect) {
    const nx = clamp(cx, rect.x, rect.x + rect.w);
    const ny = clamp(cy, rect.y, rect.y + rect.h);
    return (cx - nx) ** 2 + (cy - ny) ** 2 <= r ** 2;
  }

  function shrinkRect(rect, sx, sy) {
    const w = rect.w * sx;
    const h = rect.h * sy;
    return { x: rect.x + (rect.w - w) / 2, y: rect.y + (rect.h - h) / 2, w, h };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function chooseSpawnX(width) {
    let x = rand(16, W - width - 16);
    const nearPlayer = Math.abs((x + width / 2) - player.x) < Math.max(95, width * 0.9);
    if (nearPlayer && player.y < 210) {
      x = player.x < W / 2 ? rand(W * 0.55, W - width - 16) : rand(16, W * 0.35);
    }
    return clamp(x, 16, W - width - 16);
  }

  function sanitizeName(value) {
    return String(value || "")
      .replace(/[<>]/g, "")
      .replace(/[^\w .-]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 16);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "unknown";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function renderLeaderboard(target, scores) {
    if (!target) return;
    if (!scores.length) {
      target.innerHTML = "<li>No scores yet. Be the first crash survivor.</li>";
      return;
    }
    target.innerHTML = scores.slice(0, 10).map(entry => (
      `<li><b>${escapeHtml(entry.name)}</b> - ${Number(entry.score).toLocaleString()} pts, ` +
      `${Number(entry.survivalTime || 0)}s, ${escapeHtml(entry.difficulty)}, ${formatDate(entry.date)}</li>`
    )).join("");
  }

  function readLocalScores() {
    try {
      return JSON.parse(localStorage.getItem("bsodLocalScores") || "[]");
    } catch {
      return [];
    }
  }

  function writeLocalScores(scores) {
    localStorage.setItem("bsodLocalScores", JSON.stringify(scores.slice(0, 10)));
  }

  async function loadLeaderboard() {
    try {
      const response = await fetch("/api/scores", { cache: "no-store" });
      if (!response.ok) throw new Error("Leaderboard unavailable");
      const data = await response.json();
      cachedScores = Array.isArray(data.scores) ? data.scores : [];
    } catch {
      cachedScores = readLocalScores();
    }
    renderLeaderboard(ui.leaderboard, cachedScores);
    renderLeaderboard(ui.gameOverLeaderboard, cachedScores);
  }

  async function submitScore(score) {
    const payload = {
      name: playerName,
      score,
      survivalTime: Math.floor(state.elapsed),
      difficulty: difficulties[state.selectedDifficulty].label
    };

    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Score rejected");
      cachedScores = data.scores || [];
      ui.submitStatus.textContent = "Score submitted to leaderboard.";
    } catch {
      cachedScores = [...readLocalScores(), { ...payload, date: new Date().toISOString() }]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      writeLocalScores(cachedScores);
      ui.submitStatus.textContent = "Saved locally. Online leaderboard unavailable.";
    }
    renderLeaderboard(ui.leaderboard, cachedScores);
    renderLeaderboard(ui.gameOverLeaderboard, cachedScores);
  }

  window.addEventListener("keydown", event => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
    if (event.code === "KeyP" && !event.repeat) togglePause();
    keys.add(event.code);
  });

  window.addEventListener("keyup", event => keys.delete(event.code));

  document.getElementById("startButton").addEventListener("click", resetGame);
  document.getElementById("restartButton").addEventListener("click", resetGame);
  document.getElementById("resumeButton").addEventListener("click", () => togglePause("playing"));
  ui.pauseButton.addEventListener("click", () => togglePause());
  ui.refreshScores.addEventListener("click", loadLeaderboard);
  ui.nameInput.value = playerName;
  ui.nameInput.addEventListener("input", () => {
    ui.nameInput.value = sanitizeName(ui.nameInput.value);
    ui.nameError.hidden = true;
  });

  ui.high.textContent = highScore.toLocaleString();
  updateUi();
  loadLeaderboard();
  requestAnimationFrame(time => {
    lastTime = time;
    loop(time);
  });
})();
