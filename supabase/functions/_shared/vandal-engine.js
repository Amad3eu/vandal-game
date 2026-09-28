// src/data/gameModes.ts
var RUNNER_TUNING = {
  initialSpeed: 6,
  maxSpeed: 10,
  /** ~53s para ir de 6 a 10. Antes a velocidade máxima chegava em ~8s. */
  accelerationPerMs: 75e-6,
  /** Velocidade extra liberada nas fases 1, 2 e 3. */
  phaseSpeedBonus: [0, 0.6, 1.3],
  /** Tempo entre obstáculos em ms, sorteado entre min e max: [no início, na velocidade máxima]. */
  minGapMs: [1050, 880],
  maxGapMs: [1900, 1400]
};
var FREE_TUNING = {
  walkSpeed: 5.4,
  crouchSpeedFactor: 0.45,
  groundAcceleration: 0.7,
  groundDeceleration: 0.9,
  /** Menos controle no ar do que no chão, mas sem perder o embalo. */
  airAcceleration: 0.4,
  airDeceleration: 0.08,
  dashSpeed: 12,
  /** Empurrão para longe da parede no wall-jump. */
  wallKick: 2.5,
  /** Fração da largura da tela a partir da qual a câmera passa a andar junto. */
  cameraLine: 0.42,
  leftLimit: 8,
  /** Distância em px entre obstáculos, sorteada entre min e max. */
  minGap: 380,
  maxGap: 680,
  /** Pássaros continuam voando devagar em direção ao jogador. */
  birdDrift: 1.3
};

// src/game/config.ts
var BASE_CONFIG = {
  playerSize: 100,
  // Jump arc tuned with a frame-by-frame replay of the game loop: a full jump clears a spray
  // with a ~280ms timing window at the starting speed (it used to be impossible).
  jumpPower: 13.5,
  gravity: 0.96,
  riseGravityScale: 0.55,
  fallGravityScale: 0.9,
  obstacleWidth: 36,
  obstacleHeight: 62,
  initialSpeed: RUNNER_TUNING.initialSpeed,
  maxSpeed: RUNNER_TUNING.maxSpeed,
  scrollSpeed: 1
};
var FRAME_TIME = 1e3 / 60;
var TICK_MS = FRAME_TIME;
var ENGINE_VERSION = 2;
var GROUND_RATIO = 0.76;
var MIN_WORLD_WIDTH = 820;
var MIN_WORLD_HEIGHT = 560;
var BASE_X = 72;
var JUMP_BUFFER_MS = 130;
var COYOTE_TIME_MS = 90;
var SKATE_DURATION_MS = 15e3;
var SKATE_SPEED_MULTIPLIER = 1.28;
var SKATE_SPAWN_SCORE = 300;
var SKATE_SPAWN_CHANCE = 0.07;
var SLAM_MS = 1100;
var SLAM_SLOWDOWN = 0.35;
var RECOVER_MS = 1600;
var METERS_PER_PX = 1 / 55;
var LIGHTNING_DURATION_MS = 3e3;
var JUMP_BOOST_DURATION_MS = 4500;
var JUMP_BOOST_MULTIPLIER = 1.2;
var DUCK_HEIGHT = 80;
var BIRD_ALTITUDE = 104;
var TRAMPOLINE_BOOST = 1.12;
var COIN_SCORE = 25;
var OBSTACLE_PASSED_SCORE = 100;
var GRAFFITI_SIGNATURE_SCORE = 150;
var POWERUP_SIZE = 84;
var TRAIN_PLATFORM_WIDTH = 240;
var TRAIN_PLATFORM_HEIGHT = 80;
var BUILDING_EXTRA_AIRTIME_FRAMES = 40;
var TRAMPOLINE_EXTRA_AIRTIME_FRAMES = 30;
var PHASE_2_SCORE = 1200;
var PHASE_3_SCORE = 3500;
var CHECKPOINT_BONUS = 250;
var CLIMB_RETRY_SPAWNS = 5;
var CLIMB_STEPS = { 2: 4, 3: 5 };
var CLIMB_FIRST_STEP = 88;
var CLIMB_STEP_RISE = 80;
var CLIMB_STEP_FRAMES = 48;
var CLIMB_GAP_FRAMES = 10;
var CLIMB_TOP_FRAMES = 58;
var CLIMB_PLATFORM_THICKNESS = 22;
var CHECKPOINT_FLAG_WIDTH = 56;
var CHECKPOINT_FLAG_HEIGHT = 130;
var CLIMB_DROP_FRAMES = 50;
var INTRO_RUN_AT_MS = 2e3;
var INTRO_RAMP_MS = 700;
var INTRO_PLAYER_OFFSET = 200;
var INTRO_OFFSET_DECAY = 0.97;
var INTRO_HOP_POWER = 0.7;
var INTRO_WALL_WIDTH = 264;
var INTRO_WALL_HEIGHT = 150;
var CHASER_ENTER_MS = 800;
var CHASER_SPEED = 7;
var CHASER_GAP = 190;
var CHASER_MIN_GAP = 120;
var CHASER_KEEP_UP = 0.86;
var CHASER_FREE_SPEED = 4.2;
var CHASER_FREE_CHASE_MS = 2600;
var CHECKPOINT_DROP_HEIGHT = 240;
var CAMERA_TOP_MARGIN = 0.26;
var CAMERA_FOLLOW_UP = 0.2;
var CAMERA_FOLLOW_DOWN = 0.14;
var JUMP_CUT_MULTIPLIER = 0.6;
var MIN_JUMP_HEIGHT = 115;
var FAST_FALL_GRAVITY = 2.5;
var FAST_FALL_MIN_VELOCITY = 3;
var DASH_DURATION_MS = 190;
var DASH_COOLDOWN_MS = 780;
var DASH_LUNGE = 96;
var DASH_LUNGE_DECAY = 0.8;
var GRIND_TICK_MS = 260;
var GRIND_TICK_SCORE = 12;
var WALL_CLING_SLIDE = 1.1;
var WALL_JUMP_POWER_MULT = 1.16;
var WALL_CLING_MAX_MS = 520;
var BUILDING_WIDTH = 78;
var WALL_CONTACT_INSET_X = 14;
var ROOF_STEP_TOLERANCE = 8;

// src/game/physics.ts
var PLAYER_HITBOX_INSET_X = 20;
var PLAYER_HITBOX_INSET_BOTTOM = 6;
function updatePlayerPosition(dino, config, deltaFactor = 1, gravityMultiplier = 1) {
  let velocityY = dino.velocityY;
  const gravityScale = velocityY < 0 ? config.riseGravityScale : config.fallGravityScale;
  velocityY += config.gravity * gravityScale * gravityMultiplier * deltaFactor;
  let newY = dino.y + velocityY * deltaFactor;
  if (newY + dino.height >= config.groundLevel) {
    newY = config.groundLevel - dino.height;
    velocityY = 0;
    return {
      ...dino,
      y: newY,
      velocityY,
      isJumping: false
    };
  }
  return {
    ...dino,
    y: newY,
    velocityY
  };
}
function checkCollision(dino, obstacle) {
  const isDucking = Boolean(dino.isDucking);
  const dinoInsetTop = isDucking ? 8 : 10;
  const dinoLeft = dino.x + PLAYER_HITBOX_INSET_X;
  const dinoTop = dino.y + dinoInsetTop;
  const dinoRight = dino.x + dino.width - PLAYER_HITBOX_INSET_X;
  const dinoBottom = dino.y + dino.height - PLAYER_HITBOX_INSET_BOTTOM;
  const obstacleInsetX = obstacle.type === "bird" ? 8 : obstacle.type === "spray" ? 14 : obstacle.type === "skate" ? 10 : obstacle.type === "power-lightning" || obstacle.type === "power-jump" ? 4 : obstacle.type === "coin" ? 5 : obstacle.type === "floating-platform" ? 2 : obstacle.type === "trampoline" ? 6 : obstacle.type === "duck-bar" ? 4 : 4;
  const obstacleInsetY = obstacle.type === "bird" ? 6 : obstacle.type === "spray" ? 14 : obstacle.type === "skate" ? 8 : obstacle.type === "power-lightning" || obstacle.type === "power-jump" ? 4 : obstacle.type === "coin" ? 5 : obstacle.type === "floating-platform" ? 2 : obstacle.type === "trampoline" ? 6 : obstacle.type === "duck-bar" ? 2 : 2;
  const obstacleLeft = obstacle.x + obstacleInsetX;
  const obstacleTop = obstacle.y + obstacleInsetY;
  const obstacleRight = obstacle.x + obstacle.width - obstacleInsetX;
  const obstacleBottom = obstacle.y + obstacle.height - obstacleInsetY;
  return !(dinoLeft > obstacleRight || dinoRight < obstacleLeft || dinoTop > obstacleBottom || dinoBottom < obstacleTop);
}
function approach(value, target, step) {
  return value < target ? Math.min(target, value + step) : Math.max(target, value - step);
}
function moveAgainstBuildings(dino, dx, obstacles) {
  let move = dx;
  let wallContact = 0;
  const left = dino.x + WALL_CONTACT_INSET_X;
  const right = dino.x + dino.width - WALL_CONTACT_INSET_X;
  const bottom = dino.y + dino.height;
  for (const building of obstacles) {
    if (building.type !== "building" || building.knocked) continue;
    if (bottom <= building.y + ROOF_STEP_TOLERANCE) continue;
    const wallLeft = building.x + 4;
    const wallRight = building.x + building.width - 4;
    if (right <= wallLeft + 1) {
      if (move > 0 && right + move > wallLeft) {
        move = wallLeft - right;
        wallContact = 1;
      }
    } else if (left >= wallRight - 1) {
      if (move < 0 && left + move < wallRight) {
        move = wallRight - left;
        wallContact = -1;
      }
    } else {
      const pushLeft = wallLeft - right;
      const pushRight = wallRight - left;
      move = -pushLeft < pushRight ? pushLeft : pushRight;
    }
  }
  return { dx: move, wallContact };
}

// src/game/random.ts
function createRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function newSeed() {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}

// src/game/spawn.ts
function getSpawnGap(state, speed) {
  if (state.mode === "free") {
    const phaseFactor = 1 - 0.08 * (state.phase - 1);
    return (FREE_TUNING.minGap + state.random() * (FREE_TUNING.maxGap - FREE_TUNING.minGap)) * phaseFactor;
  }
  const progress = Math.min(
    1,
    Math.max(0, (speed - RUNNER_TUNING.initialSpeed) / (RUNNER_TUNING.maxSpeed - RUNNER_TUNING.initialSpeed))
  );
  const lerp = ([start, end]) => start + (end - start) * progress;
  const minMs = lerp(RUNNER_TUNING.minGapMs);
  const maxMs = lerp(RUNNER_TUNING.maxGapMs);
  return speed * ((minMs + state.random() * (maxMs - minMs)) / FRAME_TIME);
}
function spacingAfter(state, obstacle, speed) {
  if (obstacle.type === "train") return obstacle.width;
  if (state.mode !== "runner") return 0;
  if (obstacle.type === "building") return obstacle.width + speed * BUILDING_EXTRA_AIRTIME_FRAMES;
  if (obstacle.type === "trampoline") return speed * TRAMPOLINE_EXTRA_AIRTIME_FRAMES;
  return 0;
}
function createFloatingPath(state) {
  const startX = state.worldWidth + 20;
  const y = state.config.groundLevel - TRAIN_PLATFORM_HEIGHT - 8;
  const trainCount = 2 + Math.floor(state.random() * 3);
  const totalWidth = TRAIN_PLATFORM_WIDTH * trainCount;
  const spawned = [];
  for (let i = 0; i < trainCount; i += 1) {
    spawned.push({
      id: state.nextObstacleId++,
      x: startX + i * TRAIN_PLATFORM_WIDTH,
      y,
      width: TRAIN_PLATFORM_WIDTH,
      height: TRAIN_PLATFORM_HEIGHT,
      type: "train",
      passed: false
    });
  }
  const coinCount = 4;
  for (let c = 0; c < coinCount; c += 1) {
    spawned.push({
      id: state.nextObstacleId++,
      x: startX + 40 + c * Math.floor((totalWidth - 80) / coinCount),
      y: y - 34,
      width: 18,
      height: 18,
      type: "coin",
      passed: false
    });
  }
  const powerType = state.random() < 0.55 ? "power-lightning" : "power-jump";
  spawned.push({
    id: state.nextObstacleId++,
    x: startX + totalWidth * 0.52,
    y: y - 54,
    width: POWERUP_SIZE,
    height: POWERUP_SIZE,
    type: powerType,
    passed: false
  });
  return spawned;
}
function createClimb(state, phase, speed) {
  const startX = state.worldWidth + 20;
  const groundLevel = state.config.groundLevel;
  const steps = CLIMB_STEPS[phase];
  const travel = Math.max(RUNNER_TUNING.initialSpeed, speed);
  const stepWidth = Math.round(travel * CLIMB_STEP_FRAMES);
  const stepGap = Math.round(travel * CLIMB_GAP_FRAMES);
  const spawned = [];
  let x = startX;
  for (let i = 0; i < steps; i += 1) {
    const isTop = i === steps - 1;
    const width = isTop ? Math.round(travel * CLIMB_TOP_FRAMES) : stepWidth;
    const y = groundLevel - CLIMB_FIRST_STEP - i * CLIMB_STEP_RISE;
    spawned.push({
      id: state.nextObstacleId++,
      x,
      y,
      width,
      height: CLIMB_PLATFORM_THICKNESS,
      type: "floating-platform",
      passed: false
    });
    if (isTop) {
      spawned.push({
        id: state.nextObstacleId++,
        x: x + width - CHECKPOINT_FLAG_WIDTH - 28,
        y: y - CHECKPOINT_FLAG_HEIGHT,
        width: CHECKPOINT_FLAG_WIDTH,
        height: CHECKPOINT_FLAG_HEIGHT,
        type: "checkpoint",
        phase,
        passed: false
      });
    } else {
      spawned.push({
        id: state.nextObstacleId++,
        x: x + width / 2 - 9,
        y: y - 64,
        width: 18,
        height: 18,
        type: "coin",
        passed: false
      });
    }
    x += width + (isTop ? 0 : stepGap);
  }
  return { obstacles: spawned, length: x - startX };
}
function createObstacle(state) {
  const x = state.worldWidth + 20;
  const groundLevel = state.config.groundLevel;
  const random = state.random;
  if (state.phase === 3 && random() < 0.26) {
    const height = 100 + Math.floor(random() * 77);
    return {
      id: state.nextObstacleId++,
      x,
      y: groundLevel - height - 8,
      width: BUILDING_WIDTH,
      height,
      type: "building",
      passed: false
    };
  }
  const canSpawnGraffitiArtist = state.score >= 1e3;
  if (canSpawnGraffitiArtist && random() < 0.08) {
    const artists = ["remo", "pixo", "nina"];
    const artist = artists[Math.floor(random() * artists.length)];
    return {
      id: state.nextObstacleId++,
      x,
      y: groundLevel - 80 - 8,
      width: 80,
      height: 80,
      type: "graffiti-artist",
      graffitiArtist: artist,
      passed: false
    };
  }
  const canSpawnSkate = state.score >= SKATE_SPAWN_SCORE && state.skateMs <= 0 && !state.obstacles.some((obs) => obs.type === "skate");
  if (canSpawnSkate && random() < SKATE_SPAWN_CHANCE) {
    return {
      id: state.nextObstacleId++,
      x,
      y: groundLevel - 38,
      width: 64,
      height: 30,
      type: "skate",
      passed: false
    };
  }
  const canSpawnSpray = state.score >= 600 && !state.obstacles.some((obs) => obs.type === "spray");
  if (canSpawnSpray && random() < 0.12) {
    const size2 = 80;
    return {
      id: state.nextObstacleId++,
      x,
      y: groundLevel - size2 - 8,
      width: size2,
      height: size2,
      type: "spray",
      passed: false
    };
  }
  if (state.score >= 520 && random() < 0.1) {
    return {
      id: state.nextObstacleId++,
      x,
      y: groundLevel - TRAIN_PLATFORM_HEIGHT - 8,
      width: TRAIN_PLATFORM_WIDTH,
      height: TRAIN_PLATFORM_HEIGHT,
      type: "train",
      passed: false
    };
  }
  if (state.score >= 360 && random() < 0.12) {
    return {
      id: state.nextObstacleId++,
      x,
      y: groundLevel - 24,
      width: 56,
      height: 24,
      type: "trampoline",
      passed: false
    };
  }
  if (state.score >= 280 && random() < 0.22) {
    const size2 = 80;
    return {
      id: state.nextObstacleId++,
      x,
      y: groundLevel - size2 - 8,
      width: size2,
      height: size2,
      type: "spray",
      passed: false
    };
  }
  const canSpawnBird = state.score >= 400;
  const spawnBird = canSpawnBird && random() < 0.28;
  if (spawnBird) {
    return {
      id: state.nextObstacleId++,
      x,
      y: groundLevel - BIRD_ALTITUDE,
      width: 46,
      height: 28,
      type: "bird",
      passed: false
    };
  }
  const size = 80;
  return {
    id: state.nextObstacleId++,
    x,
    y: groundLevel - size - 8,
    width: size,
    height: size,
    type: "spray",
    passed: false
  };
}

// src/game/engine.ts
function createGameState({
  mode,
  width,
  height,
  totalCoins = 0,
  checkpoint = null,
  intro = false,
  seed,
  record = false,
  random: customRandom
}) {
  const runSeed = seed ?? (record ? newSeed() : void 0);
  const random = runSeed !== void 0 ? createRandom(runSeed) : customRandom ?? Math.random;
  const config = { ...BASE_CONFIG, groundLevel: Math.round(height * GROUND_RATIO) };
  const withIntro = intro && !checkpoint;
  const dropIn = checkpoint ? CHECKPOINT_DROP_HEIGHT : 0;
  const state = {
    mode,
    config,
    worldWidth: width,
    worldHeight: height,
    random,
    player: {
      x: BASE_X + (withIntro ? INTRO_PLAYER_OFFSET : 0),
      y: config.groundLevel - config.playerSize - dropIn,
      velocityY: 0,
      velocityX: 0,
      facing: 1,
      isJumping: dropIn > 0,
      isDucking: false,
      width: config.playerSize,
      height: config.playerSize
    },
    obstacles: [],
    nextObstacleId: 0,
    spawnDistance: 0,
    nextSpawnGap: 0,
    score: checkpoint?.score ?? 0,
    coins: checkpoint?.coins ?? 0,
    totalCoins,
    signatures: checkpoint ? [...checkpoint.signatures] : [],
    phase: checkpoint?.phase ?? 1,
    phaseMs: 0,
    checkpoint,
    climbCooldown: 0,
    cameraY: 0,
    intro: withIntro,
    introMs: 0,
    introOffset: withIntro && mode === "runner" ? INTRO_PLAYER_OFFSET : 0,
    chaser: withIntro ? { x: -130, state: "enter" } : null,
    speed: checkpoint?.speed ?? config.initialSpeed,
    effectiveSpeed: checkpoint?.speed ?? config.initialSpeed,
    jumpBufferMs: 0,
    coyoteMs: 0,
    skateMs: 0,
    slamMs: 0,
    recoverMs: 0,
    distance: 0,
    lightningMs: 0,
    jumpBoostMs: 0,
    dashMs: 0,
    dashCooldownMs: 0,
    dashLunge: 0,
    grindTimerMs: 0,
    grindCombo: 0,
    wallCling: false,
    wallClingMs: 0,
    wallSide: 1,
    wallId: null,
    grounded: dropIn === 0,
    jumpHeld: false,
    jumpCutArmed: false,
    jumpTakeoffY: 0,
    jumpsUsed: 0,
    tick: 0,
    accumulatorMs: 0,
    held: { left: false, right: false, down: false },
    log: record ? {
      version: ENGINE_VERSION,
      mode,
      width,
      height,
      seed: runSeed ?? 0,
      intro: withIntro,
      checkpoint,
      events: []
    } : null,
    paused: false,
    gameOver: false,
    artistEncounterId: null
  };
  state.nextSpawnGap = getSpawnGap(state, state.speed) * 0.5;
  if (withIntro) {
    state.obstacles.push({
      id: state.nextObstacleId++,
      x: state.player.x + 76,
      y: config.groundLevel + 6 - INTRO_WALL_HEIGHT,
      width: INTRO_WALL_WIDTH,
      height: INTRO_WALL_HEIGHT,
      type: "wall",
      passed: false
    });
  }
  return state;
}
function beforeRun(state) {
  return state.intro && state.introMs < INTRO_RUN_AT_MS;
}
function introRamp(state) {
  if (!state.intro) return 1;
  return Math.min(1, Math.max(0, (state.introMs - INTRO_RUN_AT_MS) / INTRO_RAMP_MS));
}
function logEvent(state, event) {
  state.log?.events.push(event);
}
function resizeWorld(state, width, height) {
  if (width !== state.worldWidth || height !== state.worldHeight) {
    logEvent(state, { tick: state.tick, type: "resize", width, height });
  }
  state.worldWidth = width;
  state.worldHeight = height;
  const groundLevel = Math.round(height * GROUND_RATIO);
  const groundShift = groundLevel - state.config.groundLevel;
  if (groundShift === 0) return;
  state.config = { ...state.config, groundLevel };
  state.cameraY = 0;
  state.obstacles = state.obstacles.map((obs) => ({ ...obs, y: obs.y + groundShift }));
  const size = state.config.playerSize;
  state.player = {
    ...state.player,
    y: groundLevel - size,
    velocityY: 0,
    isJumping: false,
    isDucking: false,
    width: size,
    height: size
  };
}
function dueClimb(state) {
  if (state.phase === 1 && state.score >= PHASE_2_SCORE) return 2;
  if (state.phase === 2 && state.score >= PHASE_3_SCORE) return 3;
  return null;
}
function launchJump(state, dino, power) {
  const size = state.config.playerSize;
  const y = dino.y + dino.height - size;
  state.jumpTakeoffY = y;
  state.jumpCutArmed = true;
  state.jumpBufferMs = 0;
  state.coyoteMs = 0;
  state.grounded = false;
  return {
    ...dino,
    y,
    isDucking: false,
    height: size,
    velocityY: -power,
    isJumping: true
  };
}
function pressJump(state) {
  logEvent(state, { tick: state.tick, type: "jump" });
  state.jumpHeld = true;
  if (state.paused || state.gameOver || state.slamMs > 0) return;
  if (beforeRun(state)) state.introMs = INTRO_RUN_AT_MS;
  state.jumpBufferMs = JUMP_BUFFER_MS;
  const { jumpPower } = state.config;
  const jumpPowerMultiplier = state.jumpBoostMs > 0 ? JUMP_BOOST_MULTIPLIER : 1;
  if (state.wallCling) {
    const wallJumped = {
      ...launchJump(state, state.player, jumpPower * WALL_JUMP_POWER_MULT * jumpPowerMultiplier),
      isWallClinging: false
    };
    if (state.mode === "free") wallJumped.velocityX = -state.wallSide * FREE_TUNING.wallKick;
    state.player = wallJumped;
    state.wallCling = false;
    state.wallClingMs = 0;
    state.jumpsUsed = 1;
    return;
  }
  const grounded = state.grounded;
  const maxJumps = state.jumpBoostMs > 0 ? 2 : 1;
  if (grounded || state.jumpsUsed < maxJumps) {
    const power = grounded ? jumpPower * jumpPowerMultiplier : jumpPower;
    state.player = launchJump(state, state.player, power);
    state.jumpsUsed = grounded ? 1 : state.jumpsUsed + 1;
  }
}
function releaseJump(state) {
  logEvent(state, { tick: state.tick, type: "jumpEnd" });
  state.jumpHeld = false;
}
function pressDash(state) {
  if (state.paused || state.gameOver || beforeRun(state) || state.slamMs > 0) return;
  logEvent(state, { tick: state.tick, type: "dash" });
  if (state.dashCooldownMs > 0 || state.dashMs > 0) return;
  state.dashMs = DASH_DURATION_MS;
  state.dashCooldownMs = DASH_COOLDOWN_MS;
  state.dashLunge = state.mode === "runner" ? DASH_LUNGE : 0;
  state.player = {
    ...state.player,
    isDashing: true,
    velocityY: 0
    // brief air-hover, both on ground and mid-air
  };
}
function resumeGame(state) {
  logEvent(state, { tick: state.tick, type: "resume" });
  state.paused = false;
  state.artistEncounterId = null;
}
function awardSignature(state, artist) {
  if (state.signatures.includes(artist)) return false;
  logEvent(state, { tick: state.tick, type: "signature", artist });
  state.score += GRAFFITI_SIGNATURE_SCORE;
  state.signatures = [...state.signatures, artist];
  return true;
}
function isHazard(obs) {
  return !obs.knocked && obs.type !== "skate" && obs.type !== "coin" && obs.type !== "power-lightning" && obs.type !== "power-jump" && obs.type !== "floating-platform" && obs.type !== "train" && obs.type !== "building" && obs.type !== "trampoline" && obs.type !== "checkpoint" && obs.type !== "wall";
}
function updateChaser(state, player, scroll, deltaFactor) {
  const chaser = state.chaser;
  if (!chaser || state.introMs < CHASER_ENTER_MS) return;
  const closest = player.x - CHASER_MIN_GAP;
  let x = chaser.x;
  let chaserState = chaser.state;
  if (beforeRun(state)) {
    const stop = player.x - CHASER_GAP;
    x = Math.min(stop, x + CHASER_SPEED * deltaFactor);
    chaserState = x >= stop ? "shout" : "enter";
  } else if (state.mode === "runner") {
    x += scroll * CHASER_KEEP_UP - scroll;
    chaserState = "chase";
  } else {
    const chasing = state.introMs - INTRO_RUN_AT_MS < CHASER_FREE_CHASE_MS;
    x += (chasing ? CHASER_FREE_SPEED * deltaFactor : 0) - scroll;
    chaserState = chasing ? "chase" : "giveup";
  }
  x = Math.min(x, closest);
  state.chaser = x < -160 ? null : { x, state: chaserState };
}
function stepGame(state, input, deltaMs) {
  const events = [];
  if (state.paused || state.gameOver) return events;
  const { mode } = state;
  const config = state.config;
  const deltaFactor = deltaMs / FRAME_TIME;
  state.jumpBufferMs = Math.max(0, state.jumpBufferMs - deltaMs);
  state.coyoteMs = Math.max(0, state.coyoteMs - deltaMs);
  state.skateMs = Math.max(0, state.skateMs - deltaMs);
  if (state.slamMs > 0) {
    state.slamMs = Math.max(0, state.slamMs - deltaMs);
    if (state.slamMs === 0) {
      state.recoverMs = RECOVER_MS;
      state.obstacles = state.obstacles.filter((obs) => !obs.knocked);
    }
  } else {
    state.recoverMs = Math.max(0, state.recoverMs - deltaMs);
  }
  state.lightningMs = Math.max(0, state.lightningMs - deltaMs);
  state.jumpBoostMs = Math.max(0, state.jumpBoostMs - deltaMs);
  state.dashMs = Math.max(0, state.dashMs - deltaMs);
  state.dashCooldownMs = Math.max(0, state.dashCooldownMs - deltaMs);
  state.phaseMs += deltaMs;
  const introWasRunning = beforeRun(state);
  state.introMs += deltaMs;
  const inIntro = beforeRun(state);
  const phaseMaxSpeed = config.maxSpeed + RUNNER_TUNING.phaseSpeedBonus[state.phase - 1];
  if (!inIntro) state.speed = Math.min(phaseMaxSpeed, state.speed + deltaMs * RUNNER_TUNING.accelerationPerMs);
  const dashing = state.dashMs > 0;
  const slamming = state.slamMs > 0;
  const invincible = state.lightningMs > 0 || dashing || slamming || state.recoverMs > 0;
  const speedBoost = state.skateMs > 0 || state.lightningMs > 0 ? SKATE_SPEED_MULTIPLIER : 1;
  const effectiveSpeed = state.speed * speedBoost;
  state.effectiveSpeed = effectiveSpeed;
  const moveAxis = mode === "free" && !inIntro && !slamming ? Number(input.right) - Number(input.left) : 0;
  const previous = state.player;
  let player = previous;
  let wallContact = 0;
  if (mode === "free") {
    let velocityX = previous.velocityX ?? 0;
    const facing = moveAxis !== 0 ? moveAxis : previous.facing ?? 1;
    if (dashing) {
      velocityX = facing * FREE_TUNING.dashSpeed;
    } else {
      const crouchFactor = previous.isDucking ? FREE_TUNING.crouchSpeedFactor : 1;
      const topSpeed = FREE_TUNING.walkSpeed * speedBoost * crouchFactor;
      const rate = moveAxis !== 0 ? state.grounded ? FREE_TUNING.groundAcceleration : FREE_TUNING.airAcceleration : state.grounded ? FREE_TUNING.groundDeceleration : FREE_TUNING.airDeceleration;
      velocityX = approach(velocityX, moveAxis * topSpeed, rate * deltaFactor);
    }
    const moved = moveAgainstBuildings(previous, velocityX * deltaFactor, state.obstacles);
    wallContact = moved.wallContact;
    if (wallContact !== 0) velocityX = 0;
    let x = previous.x + moved.dx;
    if (x < FREE_TUNING.leftLimit) {
      x = FREE_TUNING.leftLimit;
      velocityX = Math.max(0, velocityX);
    }
    player = { ...previous, x, velocityX, facing };
  }
  if (dashing) {
    player = { ...player, velocityY: 0, isDashing: true };
  } else {
    const fastFalling = input.down && !state.grounded && !state.wallCling;
    if (fastFalling) player = { ...player, velocityY: Math.max(player.velocityY, FAST_FALL_MIN_VELOCITY) };
    player = updatePlayerPosition(player, config, deltaFactor, fastFalling ? FAST_FALL_GRAVITY : 1);
    if (player.isDashing) player = { ...player, isDashing: false };
  }
  if (state.jumpCutArmed) {
    if (player.velocityY >= 0) {
      state.jumpCutArmed = false;
    } else if (!state.jumpHeld && state.jumpTakeoffY - player.y >= MIN_JUMP_HEIGHT) {
      player = { ...player, velocityY: player.velocityY * JUMP_CUT_MULTIPLIER };
      state.jumpCutArmed = false;
    }
  }
  if (mode === "runner") {
    state.dashLunge *= DASH_LUNGE_DECAY;
    if (Math.abs(state.dashLunge) < 0.6) state.dashLunge = 0;
    if (!inIntro && state.introOffset > 0) {
      state.introOffset *= Math.pow(INTRO_OFFSET_DECAY, deltaFactor);
      if (state.introOffset < 0.5) state.introOffset = 0;
    }
    const ridden = state.wallId === null ? void 0 : state.obstacles.find((obs) => obs.id === state.wallId);
    player = { ...player, x: ridden ? ridden.x - player.width + 2 : BASE_X + state.dashLunge + state.introOffset };
  }
  let onPlatform = false;
  for (const platform of state.obstacles) {
    if (platform.knocked || platform.type !== "floating-platform" && platform.type !== "train" && platform.type !== "building") {
      continue;
    }
    const dinoLeft = player.x + 6;
    const dinoRight = player.x + player.width - 6;
    const prevBottom = previous.y + previous.height;
    const nextBottom = player.y + player.height;
    const platformTop = platform.y;
    const overlapsX = dinoRight > platform.x + 6 && dinoLeft < platform.x + platform.width - 6;
    const fallingIntoTop = previous.velocityY >= 0 && prevBottom <= platformTop + 8 && nextBottom >= platformTop;
    if (overlapsX && fallingIntoTop) {
      player = { ...player, y: platformTop - player.height, velocityY: 0, isJumping: false };
      onPlatform = true;
      state.jumpsUsed = 0;
      break;
    }
  }
  state.wallCling = false;
  let touchingWall = false;
  const airborne = player.y + player.height < config.groundLevel - 1;
  if (!onPlatform && !dashing && mode === "free") {
    if (airborne && wallContact !== 0 && moveAxis === wallContact) {
      touchingWall = true;
      if (state.wallClingMs < WALL_CLING_MAX_MS) {
        state.wallCling = true;
        state.wallSide = wallContact;
        player = {
          ...player,
          velocityY: Math.min(player.velocityY, WALL_CLING_SLIDE),
          isJumping: true,
          isWallClinging: true
        };
        state.jumpsUsed = 0;
      }
    }
  } else if (!onPlatform && !dashing) {
    for (const wall of state.obstacles) {
      if (wall.type !== "building" || wall.knocked) continue;
      const dinoRight = player.x + player.width;
      const dinoBottom = player.y + player.height;
      const dinoTop = player.y;
      const nearLeftFace = dinoRight >= wall.x - 4 && dinoRight <= wall.x + 24;
      const withinWallBand = dinoBottom > wall.y + ROOF_STEP_TOLERANCE && dinoTop < wall.y + wall.height - 4;
      if (airborne && nearLeftFace && withinWallBand) {
        touchingWall = true;
        if (state.wallClingMs < WALL_CLING_MAX_MS) {
          state.wallCling = true;
          state.wallSide = 1;
          state.wallId = wall.id;
          player = {
            ...player,
            x: wall.x - player.width + 2,
            velocityY: Math.min(player.velocityY, WALL_CLING_SLIDE),
            isJumping: true,
            isWallClinging: true
          };
          state.dashLunge = player.x - BASE_X;
          state.jumpsUsed = 0;
        }
        break;
      }
    }
  }
  if (state.wallCling) {
    state.wallClingMs += deltaMs;
  } else {
    state.wallId = null;
    if (!touchingWall) state.wallClingMs = 0;
    if (player.isWallClinging) player = { ...player, isWallClinging: false };
  }
  const onGround = onPlatform || player.y + player.height >= config.groundLevel - 1;
  state.grounded = onGround;
  if (!onGround && !player.isJumping) {
    player = { ...player, isJumping: true };
  }
  if (onGround) {
    state.coyoteMs = COYOTE_TIME_MS;
    state.jumpsUsed = 0;
    state.wallClingMs = 0;
  }
  const wantsDuck = input.down && onGround;
  if (wantsDuck !== Boolean(player.isDucking)) {
    const height = wantsDuck ? DUCK_HEIGHT : config.playerSize;
    const bottom = player.y + player.height;
    player = { ...player, isDucking: wantsDuck, height, y: bottom - height };
  }
  if (introWasRunning && !inIntro && onGround && state.jumpBufferMs === 0) {
    player = launchJump(state, player, config.jumpPower * INTRO_HOP_POWER);
    state.jumpCutArmed = false;
    state.jumpsUsed = 1;
  }
  if (state.jumpBufferMs > 0 && state.coyoteMs > 0) {
    const jumpPowerMultiplier = state.jumpBoostMs > 0 ? JUMP_BOOST_MULTIPLIER : 1;
    player = launchJump(state, player, config.jumpPower * jumpPowerMultiplier);
    state.jumpsUsed = 1;
  }
  let scroll = effectiveSpeed * deltaFactor * introRamp(state) * (slamming ? SLAM_SLOWDOWN : 1);
  if (mode === "free") {
    const cameraX = state.worldWidth * FREE_TUNING.cameraLine;
    scroll = Math.max(0, player.x - cameraX);
    if (scroll > 0) player = { ...player, x: cameraX };
  }
  if (onPlatform && scroll > 0) {
    state.grindTimerMs += deltaMs;
    while (state.grindTimerMs >= GRIND_TICK_MS) {
      state.grindTimerMs -= GRIND_TICK_MS;
      state.grindCombo += 1;
      state.score += GRIND_TICK_SCORE * state.grindCombo;
    }
  } else {
    state.grindTimerMs = 0;
    if (onGround) state.grindCombo = 0;
  }
  state.distance += scroll;
  state.spawnDistance += scroll;
  if (state.spawnDistance >= state.nextSpawnGap) {
    const climbPhase = state.climbCooldown === 0 ? dueClimb(state) : null;
    const shouldSpawnPath = state.score >= 500 && state.random() < 0.18 && !state.obstacles.some((obs) => obs.type === "floating-platform" || obs.type === "train");
    const gap = getSpawnGap(state, effectiveSpeed);
    if (climbPhase) {
      const climb = createClimb(state, climbPhase, mode === "free" ? FREE_TUNING.walkSpeed : effectiveSpeed);
      state.obstacles = [...state.obstacles, ...climb.obstacles];
      const dropRoom = mode === "runner" ? effectiveSpeed * CLIMB_DROP_FRAMES : 0;
      state.nextSpawnGap = climb.length + dropRoom + gap;
      state.climbCooldown = CLIMB_RETRY_SPAWNS;
    } else if (shouldSpawnPath) {
      const path = createFloatingPath(state);
      const pathLength = path.filter((obs) => obs.type === "train").reduce((length, train) => length + train.width, 0);
      state.obstacles = [...state.obstacles, ...path];
      state.nextSpawnGap = pathLength + gap;
      state.climbCooldown = Math.max(0, state.climbCooldown - 1);
    } else {
      const obstacle = createObstacle(state);
      if (mode === "free" && obstacle.type === "bird") {
        const cameraX = state.worldWidth * FREE_TUNING.cameraLine;
        obstacle.x += (obstacle.x - cameraX) * FREE_TUNING.birdDrift / FREE_TUNING.walkSpeed;
      }
      state.obstacles = [...state.obstacles, obstacle];
      state.nextSpawnGap = gap + spacingAfter(state, obstacle, effectiveSpeed);
      state.climbCooldown = Math.max(0, state.climbCooldown - 1);
    }
    state.spawnDistance = 0;
  }
  updateChaser(state, player, scroll, deltaFactor);
  const birdDrift = mode === "free" ? FREE_TUNING.birdDrift * deltaFactor : 0;
  const beforeScroll = state.obstacles;
  let encounteredArtist = null;
  let reachedPhase = null;
  state.obstacles = beforeScroll.map((obs) => ({
    ...obs,
    x: obs.x - scroll - (obs.type === "bird" ? birdDrift : 0)
  })).filter((obs) => obs.x + obs.width > -10).flatMap((obs) => {
    if (obs.type === "coin" && checkCollision(player, obs)) {
      state.score += COIN_SCORE;
      state.coins += 1;
      state.totalCoins += 1;
      events.push({ type: "coin" });
      return [];
    }
    if (obs.type === "graffiti-artist" && checkCollision(player, obs)) {
      if (obs.graffitiArtist && state.artistEncounterId === null) {
        state.artistEncounterId = obs.id;
        encounteredArtist = obs.graffitiArtist;
      }
      return [];
    }
    if (obs.type === "checkpoint" && !obs.reached && checkCollision(player, obs)) {
      reachedPhase = obs.phase ?? null;
      return { ...obs, reached: true };
    }
    if (obs.type === "power-lightning" && checkCollision(player, obs)) {
      state.lightningMs = LIGHTNING_DURATION_MS;
      return [];
    }
    if (obs.type === "power-jump" && checkCollision(player, obs)) {
      state.jumpBoostMs = JUMP_BOOST_DURATION_MS;
      return [];
    }
    if (obs.type === "skate" && checkCollision(player, obs)) {
      state.skateMs = SKATE_DURATION_MS;
      return [];
    }
    if (obs.type === "trampoline" && checkCollision(player, obs)) {
      const nextPlatform = beforeScroll.filter(
        (candidate) => (candidate.type === "floating-platform" || candidate.type === "train") && candidate.x + candidate.width > player.x
      ).sort((a, b) => a.x - b.x)[0];
      const jumpBoostMultiplier = state.jumpBoostMs > 0 ? JUMP_BOOST_MULTIPLIER : 1;
      const travelDistance = nextPlatform ? Math.max(0, nextPlatform.x - player.x) : 0;
      const travelFrames = travelDistance > 0 ? travelDistance / Math.max(1, effectiveSpeed) : 0;
      const trampolineMultiplier = mode === "free" ? TRAMPOLINE_BOOST : nextPlatform ? Math.min(TRAMPOLINE_BOOST, Math.max(1, 1 + travelFrames / 220)) : 1.04;
      player = launchJump(state, player, config.jumpPower * trampolineMultiplier * jumpBoostMultiplier);
      state.jumpCutArmed = false;
      state.jumpsUsed = 1;
      return [];
    }
    if (!obs.passed && obs.x + obs.width < player.x) {
      if (!obs.knocked && obs.type !== "skate" && obs.type !== "trampoline" && obs.type !== "floating-platform" && obs.type !== "train" && obs.type !== "checkpoint" && obs.type !== "wall" && obs.type !== "coin" && obs.type !== "power-lightning" && obs.type !== "power-jump") {
        state.score += OBSTACLE_PASSED_SCORE;
      }
      return { ...obs, passed: true };
    }
    return obs;
  });
  if (reachedPhase !== null && reachedPhase > state.phase) {
    state.phase = reachedPhase;
    state.phaseMs = 0;
    state.score += CHECKPOINT_BONUS;
    state.checkpoint = {
      phase: reachedPhase,
      score: state.score,
      speed: state.speed,
      coins: state.coins,
      signatures: [...state.signatures]
    };
    events.push({ type: "checkpoint", phase: reachedPhase });
  }
  const cameraTarget = Math.max(0, state.worldHeight * CAMERA_TOP_MARGIN - player.y);
  const follow = cameraTarget > state.cameraY ? CAMERA_FOLLOW_UP : CAMERA_FOLLOW_DOWN;
  state.cameraY += (cameraTarget - state.cameraY) * Math.min(1, follow * deltaFactor);
  if (Math.abs(cameraTarget - state.cameraY) < 0.5) state.cameraY = cameraTarget;
  if (encounteredArtist) {
    state.player = player;
    state.paused = true;
    events.push({ type: "artist", artist: encounteredArtist });
    return events;
  }
  const embedded = (obs) => {
    if (mode !== "runner" || obs.type !== "building" || obs.knocked) return false;
    const dLeft = player.x + 6;
    const dRight = player.x + player.width - 6;
    const dBottom = player.y + player.height;
    return dRight > obs.x + 10 && dLeft < obs.x + obs.width - 6 && dBottom > obs.y + 44;
  };
  const hits = invincible ? [] : state.obstacles.filter((obs) => embedded(obs) || isHazard(obs) && checkCollision(player, obs));
  let slammed = false;
  if (hits.length > 0 && state.skateMs > 0) {
    slammed = true;
    const knocked = new Set(hits.map((obs) => obs.id));
    state.obstacles = state.obstacles.map((obs) => knocked.has(obs.id) ? { ...obs, knocked: true } : obs);
    state.skateMs = 0;
    state.slamMs = SLAM_MS;
    state.jumpBufferMs = 0;
    player = {
      ...player,
      y: config.groundLevel - config.playerSize,
      velocityY: 0,
      velocityX: 0,
      isJumping: false,
      isDucking: false,
      isDashing: false,
      height: config.playerSize
    };
    events.push({ type: "slam" });
  }
  state.player = player;
  const hasCollision = hits.length > 0 && !slammed;
  if (hasCollision) {
    state.gameOver = true;
    events.push({
      type: "gameOver",
      score: state.score,
      checkpoint: state.checkpoint,
      phase: state.phase,
      coins: state.coins,
      distance: Math.round(state.distance * METERS_PER_PX)
    });
  }
  return events;
}

// src/game/replay.ts
function replayRun(log) {
  const state = createGameState({
    mode: log.mode,
    width: log.width,
    height: log.height,
    seed: log.seed,
    intro: log.intro,
    checkpoint: log.checkpoint
  });
  let held = { left: false, right: false, down: false };
  let next = 0;
  const lastTick = log.endTick ?? (log.events.length ? log.events[log.events.length - 1].tick + 1 : 0);
  while (!state.gameOver && state.tick <= lastTick) {
    while (next < log.events.length && log.events[next].tick === state.tick) {
      const event = log.events[next++];
      if (event.type === "held") held = event.held;
      else if (event.type === "jump") pressJump(state);
      else if (event.type === "jumpEnd") releaseJump(state);
      else if (event.type === "dash") pressDash(state);
      else if (event.type === "resume") resumeGame(state);
      else if (event.type === "signature") awardSignature(state, event.artist);
      else if (event.type === "resize") resizeWorld(state, event.width, event.height);
    }
    if (state.paused) break;
    stepGame(state, held, TICK_MS);
    state.tick += 1;
  }
  return state;
}
function verifyRun(log) {
  const state = replayRun(log);
  return { valid: state.gameOver && state.tick === log.endTick && state.score === log.score, score: state.score, tick: state.tick };
}

// src/game/submission.ts
var LIMITS = {
  /** Longest run accepted (the replay has to fit in the function's CPU time). */
  maxRunMinutes: 30,
  maxEvents: 1e5,
  /** A seed must be used within this time. */
  seedTtlMinutes: 180,
  /** Network and clock slack when comparing the run's length with the time since the seed. */
  slackMs: 2e4,
  maxWorld: 4e3
};
var EVENT_TYPES = /* @__PURE__ */ new Set(["held", "jump", "jumpEnd", "dash", "resume", "signature", "resize"]);
var ARTISTS = /* @__PURE__ */ new Set(["remo", "pixo", "nina"]);
var isInt = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
var isWorldSize = (width, height) => typeof width === "number" && typeof height === "number" && width >= MIN_WORLD_WIDTH - 1 && height >= MIN_WORLD_HEIGHT - 1 && width <= LIMITS.maxWorld && height <= LIMITS.maxWorld;
function isRunLog(value) {
  if (!value || typeof value !== "object") return false;
  const log = value;
  if (!isInt(log.version, 1) || !isInt(log.seed, 0, 4294967295)) return false;
  if (log.mode !== "runner" && log.mode !== "free") return false;
  if (typeof log.intro !== "boolean" || !isWorldSize(log.width, log.height)) return false;
  if (!isInt(log.endTick, 1) || !isInt(log.score)) return false;
  if (!Array.isArray(log.events) || log.events.length > LIMITS.maxEvents) return false;
  let lastTick = 0;
  for (const event of log.events) {
    if (!event || typeof event !== "object" || !EVENT_TYPES.has(event.type)) return false;
    if (!isInt(event.tick) || event.tick < lastTick || event.tick > log.endTick) return false;
    lastTick = event.tick;
    if (event.type === "held") {
      const held = event.held;
      if (!held || typeof held.left !== "boolean" || typeof held.right !== "boolean" || typeof held.down !== "boolean") return false;
    }
    if (event.type === "signature" && !ARTISTS.has(event.artist)) return false;
    if (event.type === "resize" && !isWorldSize(event.width, event.height)) return false;
  }
  return true;
}
function checkSubmission(log, seed, userId, now = Date.now()) {
  const fail = (reason) => ({ ok: false, reason });
  if (!seed) return fail("seed-unknown");
  if (seed.user_id !== userId) return fail("seed-not-yours");
  if (seed.used_at) return fail("seed-used");
  const issuedAt = Date.parse(seed.issued_at);
  if (!(now - issuedAt <= LIMITS.seedTtlMinutes * 6e4)) return fail("seed-expired");
  if (!isRunLog(log)) return fail("bad-log");
  if (log.version !== ENGINE_VERSION) return fail("old-version");
  if (log.seed !== seed.seed || log.mode !== seed.mode) return fail("seed-mismatch");
  if (log.checkpoint) return fail("continued-run");
  const endTick = log.endTick;
  if (endTick > LIMITS.maxRunMinutes * 6e4 / TICK_MS) return fail("too-long");
  if (endTick * TICK_MS > now - issuedAt + LIMITS.slackMs) return fail("too-fast");
  const replay = verifyRun(log);
  if (!replay.valid) return fail("replay-mismatch");
  return { ok: true, score: replay.score, endTick: replay.tick };
}
export {
  ENGINE_VERSION,
  LIMITS,
  MIN_WORLD_HEIGHT,
  MIN_WORLD_WIDTH,
  TICK_MS,
  checkSubmission,
  isRunLog,
  replayRun,
  verifyRun
};
