(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const hpText = document.getElementById('hpText');
  const hpFill = document.getElementById('hpFill');
  const weaponText = document.getElementById('weaponText');
  const grenadeText = document.getElementById('grenadeText');
  const scoreText = document.getElementById('scoreText');
  const stageText = document.getElementById('stageText');
  const vehicleText = document.getElementById('vehicleText');
  const msgText = document.getElementById('msgText');
  const stateText = document.getElementById('stateText');

  const titleScreen = document.getElementById('titleScreen');
  const pauseScreen = document.getElementById('pauseScreen');
  const overScreen = document.getElementById('overScreen');
  const overTitle = document.getElementById('overTitle');
  const overDesc = document.getElementById('overDesc');

  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const pauseRestartBtn = document.getElementById('pauseRestartBtn');
  const overRestartBtn = document.getElementById('overRestartBtn');

  const joystickBase = document.getElementById('joystickBase');
  const joystickStick = document.getElementById('joystickStick');
  const shootBtn = document.getElementById('shootBtn');
  const jumpBtn = document.getElementById('jumpBtn');
  const grenadeBtn = document.getElementById('grenadeBtn');
  const dashBtn = document.getElementById('dashBtn');

  const rand = (a,b) => Math.random() * (b-a) + a;
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  const hit = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;

  const LIMITS = { bullets: 110, enemyBullets: 80, grenades: 12, particles: 170, explosions: 18, enemies: 16, pickups: 14 };

  const input = {
    left: false, right: false, jump: false, shoot: false, grenade: false, dash: false,
    jumpPressed: false, grenadePressed: false, dashPressed: false,
    keys: new Set(),
    joyX: 0
  };

  const world = { width: 7600, ground: 590, cam: 0 };
  const game = {
    mode: 'title', score: 0, timer: 0, msg: '点击开始任务', msgTime: 999,
    shake: 0, paused: false, won: false,
    stageIndex: 0, segmentIndex: 0, spawnCd: 1.5, bossAlive: false
  };

  const stages = [
    { name: '1-1', label: '沙漠突袭', theme: 'desert', length: 2100, boss: 'scorpion' },
    { name: '1-2', label: '废墟推进', theme: 'ruins', length: 2500, boss: 'walker' },
    { name: '1-3', label: '钢铁要塞', theme: 'fortress', length: 2800, boss: 'dreadnought' }
  ];

  const player = {
    x: 120, y: world.ground - 92, w: 56, h: 86,
    vx: 0, vy: 0, facing: 1, hp: 100, onGround: false,
    shootCd: 0, grenadeCd: 0, dashCd: 0, dashTime: 0, invul: 0,
    grenades: 3, weapon: 'MG', weaponTimer: 0,
    vehicle: false, vehicleHp: 0, flash: 0
  };

  const bullets = [], enemyBullets = [], grenades = [], particles = [], explosions = [], enemies = [], pickups = [], props = [], prisoners = [];

  function playerBox() { return player.vehicle ? { x: player.x, y: player.y, w: 96, h: 78 } : player; }
  function setMsg(t, time = 1.8) { game.msg = t; game.msgTime = time; }
  function aliveEnemies() { let n = 0; for (const e of enemies) if (!e.dead) n++; return n; }
  function pushCapped(arr, obj, max) { if (arr.length >= max) arr.shift(); arr.push(obj); }

  function clearEntities() {
    bullets.length = enemyBullets.length = grenades.length = particles.length = explosions.length = enemies.length = pickups.length = props.length = prisoners.length = 0;
  }

  function resetPlayer() {
    Object.assign(player, {
      x: 120, y: world.ground - 92, w: 56, h: 86,
      vx: 0, vy: 0, facing: 1, hp: 100, onGround: false,
      shootCd: 0, grenadeCd: 0, dashCd: 0, dashTime: 0, invul: 0,
      grenades: 3, weapon: 'MG', weaponTimer: 0,
      vehicle: false, vehicleHp: 0, flash: 0
    });
  }

  function startGame() {
    game.mode = 'intro';
    game.paused = false;
    game.won = false;
    game.score = 0;
    game.timer = 0;
    game.stageIndex = 0;
    game.segmentIndex = 0;
    game.bossAlive = false;
    world.cam = 0;
    clearEntities();
    resetPlayer();
    buildStage();
    setMsg(`任务开始：${stages[0].label}`, 2.5);
    titleScreen.classList.remove('active');
    pauseScreen.classList.remove('active');
    overScreen.classList.remove('active');
  }

  function restartCurrentRun() {
    startGame();
  }

  function buildStage() {
    clearEntities();
    const stage = stages[game.stageIndex];
    const base = game.stageIndex * 2600;
    world.width = base + stage.length + 900;
    player.x = base + 120;
    player.y = world.ground - 92;

    for (let i = 0; i < 16; i++) props.push({ type: 'dune', x: base + i * 280, y: 512 + rand(-6,6), w: 340, h: 82 + rand(-10,10), theme: stage.theme });
    for (let i = 1; i < 10; i++) props.push({ type: 'crate', x: base + i * 250 + rand(-20,50), y: world.ground - 32, w: 48, h: 32 });
    for (let i = 1; i < 8; i++) props.push({ type: 'flag', x: base + i * 360 + rand(-25,35), y: world.ground - 160, w: 30, h: 160, theme: stage.theme });

    props.push({ type: 'weaponbox', x: base + 620, y: world.ground - 34, w: 44, h: 34, opened: false });
    props.push({ type: 'weaponbox', x: base + 1420, y: world.ground - 34, w: 44, h: 34, opened: false });
    props.push({ type: 'tank', x: base + 980, y: world.ground - 46, w: 124, h: 46, active: true });
    prisoners.push({ x: base + 1180, y: world.ground - 60, w: 26, h: 60, rescued: false, given: false, bob: 0 });
    prisoners.push({ x: base + 1860, y: world.ground - 60, w: 26, h: 60, rescued: false, given: false, bob: 1.2 });

    game.segmentIndex = 0;
    game.spawnCd = 1.5;
    game.bossAlive = false;
  }

  function nextStage() {
    game.stageIndex++;
    if (game.stageIndex >= stages.length) {
      game.mode = 'over';
      game.won = true;
      overTitle.textContent = '任务完成';
      overDesc.textContent = '你通关了整个战区';
      overScreen.classList.add('active');
      setMsg('MISSION COMPLETE', 999);
      return;
    }
    game.mode = 'intro';
    buildStage();
    setMsg(`进入区域：${stages[game.stageIndex].label}`, 2.5);
  }

  function dropPickup(x, y, boss = false) {
    if (pickups.length >= LIMITS.pickups) return;
    const pool = boss ? ['med','grenade','HMG','SG','FL'] : ['med','med','grenade','HMG','SG'];
    pickups.push({ type: pool[(Math.random() * pool.length) | 0], x, y, w: 30, h: 30, vy: -180, bob: rand(0, Math.PI*2), dead: false });
  }

  function collectPickup(p) {
    if (p.type === 'med') player.hp = clamp(player.hp + 28, 0, 100);
    else if (p.type === 'grenade') player.grenades = clamp(player.grenades + 2, 0, 9);
    else { player.weapon = p.type; player.weaponTimer = 16; }
    p.dead = true;
    game.score += 60;
    setMsg(p.type === 'med' ? '生命恢复' : p.type === 'grenade' ? '手雷补充' : `${p.type} 武器到手`, 1.5);
  }

  function addParticle(x, y, color = '#ffd257', count = 4, spread = 60) {
    for (let i = 0; i < count; i++) pushCapped(particles, { x, y, vx: rand(-spread, spread), vy: rand(-spread, spread), life: rand(.14, .3), size: rand(2, 5), color }, LIMITS.particles);
  }

  function explode(x, y, r, dmg, friendly = true) {
    pushCapped(explosions, { x, y, r, life: .34, friendly }, LIMITS.explosions);
    game.shake = Math.max(game.shake, Math.min(12, r * .08));
    addParticle(x, y, '#ffb648', 10, 170);
    const area = { x: x-r, y: y-r, w: r*2, h: r*2 };
    if (friendly) {
      for (const e of enemies) if (!e.dead && hit(area, e)) damageEnemy(e, dmg * (e.type === 'boss' ? .72 : 1));
    } else if (hit(area, playerBox()) && player.invul <= 0) damagePlayer(dmg);
  }

  function damageEnemy(e, dmg) {
    e.hp -= dmg;
    addParticle(e.x + e.w/2, e.y + e.h/2, '#d94b3d', 5, 90);
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      game.score += e.type === 'boss' ? 2200 : e.type === 'rocket' ? 160 : e.type === 'shield' ? 160 : e.type === 'turret' ? 180 : 110;
      explode(e.x + e.w/2, e.y + e.h/2, e.type === 'boss' ? 120 : 48, 0, true);
      if (Math.random() < (e.type === 'boss' ? 1 : .25)) dropPickup(e.x + e.w/2, e.y + 24, e.type === 'boss');
      if (e.type === 'boss') {
        game.bossAlive = false;
        setMsg('Boss 击破！推进下一段', 2.5);
      }
    }
  }

  function damagePlayer(dmg) {
    if (player.invul > 0) return;
    if (player.vehicle) {
      player.vehicleHp -= dmg;
      player.invul = .35;
      if (player.vehicleHp <= 0) {
        player.vehicle = false;
        player.vehicleHp = 0;
        explode(player.x + 50, player.y + 34, 76, 0, false);
        setMsg('坦克被击毁！', 2);
      }
      return;
    }
    player.hp -= dmg;
    player.invul = .7;
    player.flash = .14;
    game.shake = Math.max(game.shake, 6);
    if (player.hp <= 0) {
      player.hp = 0;
      game.mode = 'over';
      game.won = false;
      overTitle.textContent = '任务失败';
      overDesc.textContent = '敌军火力太猛了，再试一次';
      overScreen.classList.add('active');
      setMsg('MISSION FAILED', 999);
      explode(player.x + 28, player.y + 34, 84, 0, false);
    }
  }

  function spawnEnemy(type = 'soldier', x = null) {
    if (enemies.length >= LIMITS.enemies) return;
    const stage = stages[game.stageIndex];
    const base = game.stageIndex * 2600;
    const ex = x ?? clamp(player.x + rand(700, 1200), base + 360, base + stage.length - 220);
    if (type === 'turret') enemies.push({ type, x: ex, y: world.ground - 62, w: 72, h: 62, hp: 50, maxHp: 50, shootCd: rand(1, 1.8), dead: false });
    else if (type === 'shield') enemies.push({ type, x: ex, y: world.ground - 84, w: 58, h: 84, hp: 60, maxHp: 60, shootCd: rand(1.2, 2.2), dead: false });
    else if (type === 'rocket') enemies.push({ type, x: ex, y: world.ground - 84, w: 56, h: 84, hp: 42, maxHp: 42, shootCd: rand(1.4, 2.6), dead: false });
    else if (type === 'boss') {
      const bossName = stage.boss;
      enemies.push({ type: 'boss', bossName, x: base + stage.length - 260, y: world.ground - 178, w: 260, h: 178, hp: 620, maxHp: 620, shootCd: 1, bombCd: 2.8, vx: -42, dead: false });
      game.bossAlive = true;
      setMsg('警报！Boss 出现', 3);
    } else enemies.push({ type, x: ex, y: world.ground - 84, w: 54, h: 84, hp: 34, maxHp: 34, shootCd: rand(1.1, 2.2), dead: false });
  }

  function spawnSegmentEnemies() {
    if (game.bossAlive) return;
    const stage = stages[game.stageIndex];
    const p = (player.x - game.stageIndex * 2600);
    if (game.segmentIndex === 0 && p > 340) {
      spawnEnemy('soldier'); spawnEnemy('soldier'); spawnEnemy('turret', player.x + 900);
      game.segmentIndex++;
      setMsg('敌军前哨！', 1.8);
    } else if (game.segmentIndex === 1 && p > 820) {
      spawnEnemy('shield'); spawnEnemy('soldier'); spawnEnemy('rocket');
      game.segmentIndex++;
      setMsg('火箭兵来了！', 1.8);
    } else if (game.segmentIndex === 2 && p > 1340) {
      spawnEnemy('soldier'); spawnEnemy('soldier'); spawnEnemy('turret'); spawnEnemy('rocket');
      game.segmentIndex++;
      setMsg('重兵区域！', 1.8);
    } else if (game.segmentIndex === 3 && p > stage.length - 620 && aliveEnemies() === 0) {
      spawnEnemy('boss');
      game.segmentIndex++;
    }
  }

  function shootPlayer() {
    if (player.shootCd > 0 || game.mode !== 'play') return;
    if (player.vehicle) {
      player.shootCd = .2;
      pushCapped(bullets, { x: player.x + 60 + player.facing*12, y: player.y + 28, vx: player.facing * 760, vy: 0, w: 26, h: 10, dmg: 28, color: '#ffd257', dead: false }, LIMITS.bullets);
      addParticle(player.x + 62, player.y + 28, '#fff1ad', 5, 28);
      return;
    }
    if (player.weapon === 'SG') {
      player.shootCd = .3;
      for (let i = 0; i < 5; i++) pushCapped(bullets, { x: player.x + 30 + player.facing*18, y: player.y + 30, vx: player.facing * rand(620, 760), vy: rand(-75, 75), w: 10, h: 5, dmg: 8, color: '#ffe18a', dead: false }, LIMITS.bullets);
    } else if (player.weapon === 'HMG') {
      player.shootCd = .055;
      pushCapped(bullets, { x: player.x + 30 + player.facing*18, y: player.y + 30, vx: player.facing * 920, vy: rand(-8, 8), w: 20, h: 6, dmg: 14, color: '#ffd257', dead: false }, LIMITS.bullets);
    } else if (player.weapon === 'FL') {
      player.shootCd = .08;
      pushCapped(bullets, { x: player.x + 30 + player.facing*18, y: player.y + 30, vx: player.facing * 560, vy: rand(-18, 18), w: 34, h: 12, dmg: 10, color: '#ff8b38', flame: true, dead: false }, LIMITS.bullets);
    } else {
      player.shootCd = .12;
      pushCapped(bullets, { x: player.x + 30 + player.facing*18, y: player.y + 30, vx: player.facing * 800, vy: rand(-6, 6), w: 18, h: 6, dmg: 10, color: '#ffd257', dead: false }, LIMITS.bullets);
    }
    addParticle(player.x + 32 + player.facing*18, player.y + 30, '#fff1ad', 4, 24);
  }

  function throwGrenade() {
    if (player.grenadeCd > 0 || game.mode !== 'play') return;
    if (!player.vehicle && player.grenades <= 0) return;
    player.grenadeCd = player.vehicle ? .56 : .45;
    if (!player.vehicle) player.grenades--;
    pushCapped(grenades, { x: player.x + 30, y: player.y + 22, vx: player.facing*(player.vehicle?360:300), vy: player.vehicle ? -240 : -420, r: player.vehicle ? 12 : 10, t: player.vehicle ? .84 : 1.15, tank: player.vehicle, dead: false }, LIMITS.grenades);
  }

  function updateInputFromKeys() {
    input.left = input.keys.has('ArrowLeft') || input.keys.has('KeyA') || input.joyX < -0.22;
    input.right = input.keys.has('ArrowRight') || input.keys.has('KeyD') || input.joyX > 0.22;
    input.jump = input.keys.has('ArrowUp') || input.keys.has('KeyW') || input.keys.has('Space') || input.jump;
    input.shoot = input.keys.has('KeyJ') || input.shoot;
    input.grenade = input.keys.has('KeyK') || input.grenade;
    input.dash = input.keys.has('KeyL') || input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') || input.dash;
  }

  function update(dt) {
    game.timer += dt;
    if (game.msgTime > 0) game.msgTime -= dt;
    player.shootCd -= dt; player.grenadeCd -= dt; player.dashCd -= dt; player.dashTime -= dt; player.invul -= dt; player.weaponTimer -= dt; player.flash -= dt;
    if (player.weaponTimer <= 0 && player.weapon !== 'MG') player.weapon = 'MG';

    updateInputFromKeys();

    if (game.paused) { updateEffects(dt); updateHUD(); clearOneShotInputs(); return; }
    if (game.mode === 'title') { updateEffects(dt); updateHUD(); clearOneShotInputs(); return; }
    if (game.mode === 'intro') {
      if (game.msgTime <= 0) { game.mode = 'play'; setMsg('推进开始！', 1.3); }
      updateEffects(dt); updateHUD(); clearOneShotInputs(); return;
    }
    if (game.mode === 'over') { updateEffects(dt); updateHUD(); clearOneShotInputs(); return; }

    const moveSpeed = player.vehicle ? 270 : 360;
    if (player.dashTime > 0 && !player.vehicle) player.vx = player.facing * 780;
    else {
      const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      player.vx = dir * moveSpeed;
      if (dir) player.facing = dir;
    }

    if (input.jumpPressed && player.onGround && !player.vehicle) {
      player.vy = -700;
      player.onGround = false;
    }
    if (input.dashPressed && player.dashCd <= 0 && !player.vehicle) {
      player.dashTime = .18;
      player.dashCd = 1.2;
      player.invul = Math.max(player.invul, .2);
    }
    if (input.shoot) shootPlayer();
    if (input.grenadePressed) throwGrenade();

    for (const p of props) {
      if (p.type === 'tank' && p.active && !player.vehicle && hit(playerBox(), { x:p.x, y:p.y-18, w:p.w, h:p.h+18 }) && input.jumpPressed) {
        player.vehicle = true;
        player.vehicleHp = 90;
        p.active = false;
        player.y = world.ground - 76;
        setMsg('载具到手：轻型坦克', 2);
      }
      if (p.type === 'weaponbox' && !p.opened && hit(playerBox(), p) && input.shoot) {
        p.opened = true;
        dropPickup(p.x + 12, p.y - 10, true);
        setMsg('武器箱打开！', 1.2);
      }
    }

    player.vy += (player.vehicle ? 2100 : 1600) * dt;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    const groundY = world.ground - (player.vehicle ? 76 : player.h);
    if (player.y >= groundY) {
      player.y = groundY;
      player.vy = 0;
      player.onGround = true;
    }

    const stageBase = game.stageIndex * 2600;
    const stageEnd = stageBase + stages[game.stageIndex].length;
    player.x = clamp(player.x, stageBase + 20, stageEnd + 180);

    spawnSegmentEnemies();

    for (const b of bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.flame) addParticle(b.x, b.y, '#ff8b38', 1, 10);
      if (b.x < 0 || b.x > world.width) b.dead = true;
      for (const e of enemies) {
        if (!e.dead && hit(b, e)) {
          damageEnemy(e, b.dmg * (e.type === 'shield' && !b.flame ? .45 : 1));
          if (!b.flame) b.dead = true;
          break;
        }
      }
    }

    for (const g of grenades) {
      g.t -= dt;
      g.vy += 1200 * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      if (g.y > world.ground - g.r) {
        g.y = world.ground - g.r;
        g.vy *= -.38;
        g.vx *= .7;
      }
      if (g.t <= 0) {
        explode(g.x, g.y, g.tank ? 102 : 84, g.tank ? 50 : 34, true);
        g.dead = true;
      }
    }

    for (const e of enemies) {
      if (e.dead) continue;
      e.shootCd -= dt;
      if (e.type === 'soldier') {
        const dir = player.x < e.x ? -1 : 1;
        if (Math.abs(player.x - e.x) > 200) e.x += dir * 82 * dt;
        if (e.shootCd <= 0 && Math.abs(player.x - e.x) < 520) {
          e.shootCd = rand(1, 2.1);
          pushCapped(enemyBullets, { x:e.x+e.w/2, y:e.y+28, vx:dir*410, vy:0, w:12, h:5, dmg:9, dead:false, color:'#ff7583' }, LIMITS.enemyBullets);
        }
        if (hit(playerBox(), e) && player.invul <= 0) damagePlayer(14);
      } else if (e.type === 'shield') {
        const dir = player.x < e.x ? -1 : 1;
        if (Math.abs(player.x - e.x) > 160) e.x += dir * 60 * dt;
        if (e.shootCd <= 0 && Math.abs(player.x - e.x) < 420) {
          e.shootCd = rand(1.3, 2.4);
          pushCapped(enemyBullets, { x:e.x+e.w/2, y:e.y+28, vx:dir*360, vy:0, w:12, h:5, dmg:10, dead:false, color:'#ffa15c' }, LIMITS.enemyBullets);
        }
        if (hit(playerBox(), e) && player.invul <= 0) damagePlayer(16);
      } else if (e.type === 'rocket') {
        if (e.shootCd <= 0 && Math.abs(player.x - e.x) < 650) {
          e.shootCd = rand(1.8, 2.8);
          const dx = playerBox().x + playerBox().w/2 - (e.x + e.w/2);
          const dy = playerBox().y + 24 - (e.y + 24);
          const len = Math.hypot(dx, dy) || 1;
          pushCapped(enemyBullets, { x:e.x+e.w/2, y:e.y+24, vx:dx/len*300, vy:dy/len*300, w:18, h:7, dmg:14, rocket:true, dead:false, color:'#ff9d69' }, LIMITS.enemyBullets);
        }
      } else if (e.type === 'turret') {
        if (e.shootCd <= 0) {
          e.shootCd = rand(1.2, 1.9);
          const pb = playerBox();
          const dx = pb.x + pb.w/2 - (e.x + e.w/2);
          const dy = pb.y + 24 - (e.y + 20);
          const len = Math.hypot(dx, dy) || 1;
          pushCapped(enemyBullets, { x:e.x+e.w/2, y:e.y+20, vx:dx/len*430, vy:dy/len*430, w:12, h:5, dmg:10, dead:false, color:'#ff6678' }, LIMITS.enemyBullets);
        }
      } else if (e.type === 'boss') {
        e.bombCd -= dt;
        e.x += e.vx * dt;
        if (e.x < player.x + 360) e.vx = 42;
        if (e.x > player.x + 860) e.vx = -42;
        if (e.shootCd <= 0) {
          e.shootCd = e.hp < e.maxHp * .45 ? .7 : 1.05;
          const shots = e.hp < e.maxHp * .45 ? 7 : 4;
          for (let i = 0; i < shots; i++) {
            const ang = (-.18 * (shots-1) / 2) + i * .18;
            const base = player.x < e.x ? Math.PI : 0;
            pushCapped(enemyBullets, { x:e.x+(player.x<e.x?18:e.w-18), y:e.y+58, vx:Math.cos(base+ang)*520, vy:Math.sin(base+ang)*520, w:16, h:6, dmg:11, dead:false, color:'#ff8894' }, LIMITS.enemyBullets);
          }
        }
        if (e.bombCd <= 0) {
          e.bombCd = e.hp < e.maxHp * .45 ? 2.1 : 3.1;
          explode(player.x + rand(-40, 180), world.ground - 10, 68, 15, false);
        }
        if (hit(playerBox(), e) && player.invul <= 0) damagePlayer(20);
      }
    }

    for (const b of enemyBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.rocket) addParticle(b.x, b.y, '#ff9d69', 1, 8);
      if (b.x < 0 || b.x > world.width || b.y < 0 || b.y > H) b.dead = true;
      if (!b.dead && hit(b, playerBox()) && player.invul <= 0) {
        damagePlayer(b.dmg);
        if (b.rocket) explode(b.x, b.y, 54, 10, false);
        b.dead = true;
      }
    }

    for (const p of pickups) {
      p.vy += 900 * dt;
      p.y += p.vy * dt;
      if (p.y + p.h > world.ground - 4) { p.y = world.ground - p.h - 4; p.vy = 0; }
      p.bob += dt * 4;
      if (!p.dead && hit(playerBox(), p)) collectPickup(p);
    }

    for (const pr of prisoners) {
      pr.bob += dt * 4;
      if (!pr.rescued && Math.abs((player.x+20) - pr.x) < 44) {
        pr.rescued = true;
        game.score += 160;
        setMsg('俘虏获救！', 1.5);
      }
      if (pr.rescued && !pr.given) {
        pr.given = true;
        dropPickup(pr.x + 8, pr.y, false);
      }
    }

    updateEffects(dt);
    world.cam = clamp(player.x - W * .34, stageBase, stageBase + stages[game.stageIndex].length - W + 320);

    if (!game.bossAlive && game.segmentIndex >= 4 && aliveEnemies() === 0 && player.x > stageBase + stages[game.stageIndex].length - 200) {
      nextStage();
    }

    updateHUD();
    clearOneShotInputs();
  }

  function updateEffects(dt) {
    for (const p of particles) { p.life -= dt; p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 420*dt; }
    for (const e of explosions) e.life -= dt;
    game.shake = Math.max(0, game.shake - dt * 18);
    for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].dead) bullets.splice(i, 1);
    for (let i = enemyBullets.length - 1; i >= 0; i--) if (enemyBullets[i].dead) enemyBullets.splice(i, 1);
    for (let i = grenades.length - 1; i >= 0; i--) if (grenades[i].dead) grenades.splice(i, 1);
    for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
    for (let i = explosions.length - 1; i >= 0; i--) if (explosions[i].life <= 0) explosions.splice(i, 1);
    for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead) enemies.splice(i, 1);
    for (let i = pickups.length - 1; i >= 0; i--) if (pickups[i].dead) pickups.splice(i, 1);
  }

  function clearOneShotInputs() {
    input.jumpPressed = false;
    input.grenadePressed = false;
    input.dashPressed = false;
    input.jump = false;
    input.grenade = false;
    input.dash = false;
  }

  function updateHUD() {
    hpText.textContent = player.vehicle ? `${Math.max(0, player.hp|0)} + 车 ${Math.max(0, player.vehicleHp|0)}` : `${Math.max(0, player.hp|0)} / 100`;
    hpFill.style.width = `${player.hp}%`;
    weaponText.textContent = player.vehicle ? 'CANNON' : player.weapon;
    grenadeText.textContent = String(player.grenades).padStart(2, '0');
    scoreText.textContent = String(game.score).padStart(6, '0');
    stageText.textContent = stages[game.stageIndex]?.name || '--';
    vehicleText.textContent = player.vehicle ? 'TANK' : 'FOOT';
    msgText.textContent = game.msgTime > 0 ? game.msg : '推进中';
    stateText.textContent = game.mode === 'title' ? 'READY' : game.mode === 'intro' ? 'START' : game.mode === 'over' ? (game.won ? 'WIN' : 'KO') : game.paused ? 'PAUSE' : player.vehicle ? 'ARMOR' : player.dashTime > 0 ? 'DASH' : 'RUN';
  }

  function drawSky(theme) {
    const g = ctx.createLinearGradient(0,0,0,H);
    if (theme === 'ruins') { g.addColorStop(0,'#92b0c7'); g.addColorStop(.48,'#c8d4dc'); g.addColorStop(.76,'#cbb08b'); g.addColorStop(1,'#9f7657'); }
    else if (theme === 'fortress') { g.addColorStop(0,'#7d93a6'); g.addColorStop(.48,'#aebec9'); g.addColorStop(.76,'#b49378'); g.addColorStop(1,'#6b4e3f'); }
    else { g.addColorStop(0,'#8fc1ea'); g.addColorStop(.48,'#c7def4'); g.addColorStop(.76,'#e4c28a'); g.addColorStop(1,'#ce945c'); }
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = 'rgba(255,241,207,.85)'; ctx.beginPath(); ctx.arc(170,100,36,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.78)';
    for (let i = 0; i < 6; i++) cloud(((i*240-world.cam*.12)%(W+260))-120, 78+(i%3)*26, 1+(i%2)*.25);
    ctx.fillStyle='rgba(255,220,160,.09)'; for(let i=0;i<3;i++) ctx.fillRect(0, 180+i*80+Math.sin(game.timer*2+i)*8, W, 18);
  }
  function cloud(x,y,s){ ctx.beginPath(); ctx.arc(x,y,24*s,0,Math.PI*2); ctx.arc(x+24*s,y-8*s,22*s,0,Math.PI*2); ctx.arc(x+50*s,y,18*s,0,Math.PI*2); ctx.fill(); }
  function mountain(off,color,y,h){ ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(-40,H); for(let i=-1;i<9;i++){ const x=i*220-(off%220); ctx.lineTo(x,y); ctx.lineTo(x+110,y-h-(i%2?22:0)); ctx.lineTo(x+220,y); } ctx.lineTo(W+40,H); ctx.closePath(); ctx.fill(); }
  function drawMountains(theme){ if(theme==='ruins'){ mountain(world.cam*.2,'#7c7269',420,74); mountain(world.cam*.38,'#655b54',485,92); mountain(world.cam*.52,'#4f4843',540,70);} else if(theme==='fortress'){ mountain(world.cam*.2,'#6f6660',420,80); mountain(world.cam*.38,'#5b5551',485,98); mountain(world.cam*.52,'#463f3c',540,76);} else { mountain(world.cam*.2,'#8f7a68',420,74); mountain(world.cam*.38,'#6f6158',485,92); mountain(world.cam*.52,'#5b5049',540,70);} }
  function drawCrate(x,y,w,h){ ctx.fillStyle='#7b4f2a'; ctx.fillRect(x,y,w,h); ctx.fillStyle='#bd7f3c'; ctx.fillRect(x+4,y+4,w-8,h-8); ctx.strokeStyle='#4e3018'; ctx.lineWidth=3; ctx.strokeRect(x+3,y+3,w-6,h-6); ctx.beginPath(); ctx.moveTo(x+6,y+6); ctx.lineTo(x+w-6,y+h-6); ctx.moveTo(x+w-6,y+6); ctx.lineTo(x+6,y+h-6); ctx.stroke(); }
  function drawFlag(x,y,w,h,theme){ ctx.fillStyle='#4d3524'; ctx.fillRect(x+11,y,6,h); ctx.fillStyle=theme==='fortress'?'#6e2a2a':'#8c2f24'; ctx.beginPath(); ctx.moveTo(x+17,y+12); ctx.lineTo(x+56+Math.sin(game.timer*6)*3,y+24); ctx.lineTo(x+17,y+38); ctx.closePath(); ctx.fill(); }
  function drawTankPickup(x,y,w,h){ ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x+62,y+h+10,52,11,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#60794a'; ctx.fillRect(x+18,y+10,68,24); ctx.fillRect(x+38,y,22,16); ctx.fillStyle='#33412a'; ctx.fillRect(x,y+28,124,18); ctx.fillStyle='#1f271c'; for(let i=0;i<5;i++){ ctx.beginPath(); ctx.arc(x+16+i*23,y+46,8,0,Math.PI*2); ctx.fill(); } ctx.fillStyle='#2d3338'; ctx.fillRect(x+52,y+8,42,6); }
  function drawWeaponBox(x,y,w,h,opened){ ctx.fillStyle=opened?'#5d4330':'#835428'; ctx.fillRect(x,y,w,h); ctx.fillStyle=opened?'#3a2c1d':'#f0bf58'; ctx.fillRect(x+4,y+4,w-8,h-8); ctx.fillStyle='#24160a'; ctx.font='bold 16px sans-serif'; ctx.textAlign='center'; ctx.fillText('W',x+w/2,y+22); }
  function drawPrisoner(pr){ const x=pr.x-world.cam, y=pr.y+Math.sin(pr.bob)*2; if(x<-40||x>W+40) return; ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x+13,y+62,12,5,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle=pr.rescued?'#ebdfc2':'#c8bfae'; ctx.fillRect(x+6,y,14,14); ctx.fillStyle='#c8ac57'; ctx.fillRect(x+5,y+14,16,20); ctx.fillStyle='#8b7441'; ctx.fillRect(x+7,y+34,5,20); ctx.fillRect(x+15,y+34,5,20); if(pr.rescued){ ctx.fillStyle='#fff4d8'; ctx.fillRect(x-1,y+18,8,4); ctx.fillRect(x+20,y+18,8,4); } }

  function drawHumanSprite(x,y,face,weapon,flash=false,runPhase=0,variant='hero') {
    ctx.save(); ctx.translate(x+28,y+43); ctx.scale(face,1); ctx.translate(-28,-43);
    ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(28,88,20,7,0,0,Math.PI*2); ctx.fill();
    const legSwing = Math.sin(runPhase)*4;
    const cloth = variant==='enemy' ? '#66744d' : variant==='shield' ? '#5f616d' : variant==='rocket' ? '#7d5b45' : '#66785a';
    const vest = variant==='enemy' ? '#7b5230' : variant==='shield' ? '#56606b' : '#b28b53';
    ctx.fillStyle='#2e241b'; ctx.fillRect(8,64+Math.max(0,legSwing),14,18); ctx.fillRect(30,64+Math.max(0,-legSwing),14,18);
    ctx.fillStyle='#1a130e'; ctx.fillRect(6,78+Math.max(0,legSwing),18,6); ctx.fillRect(28,78+Math.max(0,-legSwing),18,6);
    ctx.fillStyle=cloth; ctx.fillRect(8,44,14,22); ctx.fillRect(30,44,14,22);
    ctx.fillStyle=vest; ctx.fillRect(10,18,32,28); ctx.fillStyle='#6c4a29'; ctx.fillRect(12,20,28,8); ctx.fillStyle='#4a3220'; ctx.fillRect(20,18,6,28);
    ctx.fillStyle='#ecc38d'; ctx.fillRect(4,24,8,15); ctx.fillRect(40,24,8,14);
    ctx.fillStyle=flash?'#ffd2c5':'#f2c48e'; ctx.fillRect(15,2,20,18); ctx.fillStyle='#cab060'; ctx.fillRect(12,0,26,8); ctx.fillStyle='#8b7a40'; ctx.fillRect(10,6,30,5); ctx.fillStyle='#2f241b'; ctx.fillRect(20,10,10,3);
    if (variant === 'shield') { ctx.fillStyle='#3f4852'; ctx.fillRect(40,18,18,28); ctx.fillStyle='#8c99a8'; ctx.fillRect(44,22,10,20); }
    else if(weapon==='SG'){ ctx.fillStyle='#4a3524'; ctx.fillRect(40,24,20,8); ctx.fillRect(58,26,14,4); }
    else if(weapon==='HMG'){ ctx.fillStyle='#30363d'; ctx.fillRect(38,24,24,8); ctx.fillStyle='#7c8694'; ctx.fillRect(58,23,16,10); }
    else if(weapon==='RK'){ ctx.fillStyle='#5f4638'; ctx.fillRect(38,22,18,10); ctx.fillRect(54,24,18,6); }
    else { ctx.fillStyle='#30363d'; ctx.fillRect(40,26,18,6); ctx.fillRect(56,24,12,8); }
    ctx.restore();
  }

  function drawPlayer(){
    const x=player.x-world.cam, y=player.y;
    if(player.vehicle) return drawPlayerTank(x,y);
    ctx.save(); if(player.invul>0&&Math.floor(player.invul*16)%2===0) ctx.globalAlpha=.55; drawHumanSprite(x,y,player.facing,player.weapon,player.flash>0,game.timer*10*(Math.abs(player.vx)>10?1:0),'hero'); if(player.dashTime>0){ ctx.fillStyle='rgba(255,212,92,.25)'; for(let i=0;i<4;i++) ctx.fillRect(x-10-i*18,y+18+i*6,24,10); } ctx.restore();
  }
  function drawPlayerTank(x,y){ ctx.save(); if(player.invul>0&&Math.floor(player.invul*16)%2===0) ctx.globalAlpha=.55; ctx.translate(x+46,y+38); ctx.scale(player.facing,1); ctx.translate(-46,-38); ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(46,80,42,10,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#627b4b'; ctx.fillRect(18,24,56,28); ctx.fillRect(36,10,22,16); ctx.fillStyle='#35452b'; ctx.fillRect(0,42,94,22); ctx.fillStyle='#1f271c'; for(let i=0;i<4;i++){ ctx.beginPath(); ctx.arc(16+i*20,64,8,0,Math.PI*2); ctx.fill(); } ctx.fillStyle='#30363d'; ctx.fillRect(50,14,34,6); ctx.fillStyle='#f2c48e'; ctx.fillRect(38,0,16,12); ctx.fillStyle='#cab060'; ctx.fillRect(35,0,22,6); ctx.restore(); }

  function drawEnemy(e){
    const x=e.x-world.cam, y=e.y;
    if(e.type==='soldier') drawHumanSprite(x,y,-1,'MG',false,game.timer*9*(Math.abs(player.x-e.x)>210?1:0),'enemy');
    else if(e.type==='shield') drawHumanSprite(x,y,-1,'MG',false,game.timer*7,'shield');
    else if(e.type==='rocket') drawHumanSprite(x,y,-1,'RK',false,game.timer*7,'rocket');
    else if(e.type==='turret'){ ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x+35,y+65,24,7,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#5a626d'; ctx.fillRect(x+6,y+24,58,38); ctx.fillStyle='#2d333a'; ctx.fillRect(x,y+16,34,8); ctx.fillStyle='#8d96a4'; ctx.fillRect(x+24,y+8,20,18); ctx.fillStyle='#cb4b44'; ctx.fillRect(x+28,y+12,12,6); }
    else { ctx.fillStyle='rgba(0,0,0,.24)'; ctx.beginPath(); ctx.ellipse(x+125,y+178,80,14,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#3b444c'; ctx.fillRect(x+22,y+74,202,72); ctx.fillStyle='#cd4a3e'; ctx.fillRect(x+36,y+40,172,72); ctx.fillStyle='#8391a0'; ctx.fillRect(x+80,y,84,40); ctx.fillStyle='#f7c37e'; ctx.fillRect(x+94,y+46,50,18); ctx.fillStyle='#1f252b'; ctx.fillRect(x,y+64,46,16); ctx.fillRect(x+204,y+64,46,16); ctx.fillRect(x+30,y+146,38,24); ctx.fillRect(x+182,y+146,38,24); ctx.fillStyle='#7c8896'; ctx.fillRect(x+60,y+114,124,20); ctx.fillStyle='#30363d'; ctx.fillRect(x+198,y+56,30,8); }
    drawEnemyHP(e,x,y);
  }
  function drawEnemyHP(e,x,y){ const r=clamp(e.hp/e.maxHp,0,1); ctx.fillStyle='rgba(16,10,7,.75)'; ctx.fillRect(x,y-12,e.w,7); ctx.fillStyle=e.type==='boss'?'#d94b3d':'#67b35c'; ctx.fillRect(x+1,y-11,(e.w-2)*r,5); }
  function drawProjectile(b){ ctx.fillStyle=b.color; ctx.fillRect(b.x-world.cam,b.y,b.w,b.h); }
  function drawGrenade(g){ const x=g.x-world.cam; ctx.fillStyle=g.tank?'#f0bb45':'#4a7f4c'; ctx.beginPath(); ctx.arc(x,g.y,g.r,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#eef6d8'; ctx.fillRect(x-3,g.y-10,6,4); }
  function drawPickup(p){ const x=p.x-world.cam, y=p.y+Math.sin(p.bob)*4; ctx.fillStyle=p.type==='med'?'#63c363':p.type==='grenade'?'#f2c14e':p.type==='HMG'?'#f59a4c':p.type==='FL'?'#ff8b38':'#72c7ff'; ctx.fillRect(x,y,p.w,p.h); ctx.fillStyle='#22160c'; ctx.font='bold 13px sans-serif'; ctx.textAlign='center'; const t=p.type==='med'?'+':p.type==='grenade'?'G':p.type; ctx.fillText(t,x+p.w/2,y+19); }
  function drawEffects(){ for(const p of particles){ ctx.globalAlpha=Math.max(0,p.life*3); ctx.fillStyle=p.color; ctx.fillRect(p.x-world.cam,p.y,p.size,p.size); } ctx.globalAlpha=1; for(const e of explosions){ const a=clamp(e.life/.34,0,1), r=e.r*(1-a*.3); const g=ctx.createRadialGradient(e.x-world.cam,e.y,0,e.x-world.cam,e.y,r); g.addColorStop(0,'rgba(255,255,255,.95)'); g.addColorStop(.3,e.friendly?'rgba(255,218,102,.92)':'rgba(255,145,145,.92)'); g.addColorStop(1,'rgba(217,75,61,0)'); ctx.globalAlpha=a; ctx.fillStyle=g; ctx.beginPath(); ctx.arc(e.x-world.cam,e.y,r,0,Math.PI*2); ctx.fill(); } ctx.globalAlpha=1; }

  function drawGround(theme){
    for(const p of props) if(p.type==='dune'){ const x=p.x-world.cam; if(x<-300||x>W+300) continue; const c1=theme==='fortress'?'#8a765f':theme==='ruins'?'#b19473':'#d3a067'; const c2=theme==='fortress'?'#6d5b4d':theme==='ruins'?'#98775b':'#b7854c'; ctx.fillStyle=c1; ctx.beginPath(); ctx.ellipse(x+160,p.y+42,p.w/2,p.h/2,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle=c2; ctx.beginPath(); ctx.ellipse(x+118,p.y+50,p.w/2.5,p.h/3.6,0,0,Math.PI*2); ctx.fill(); }
    ctx.fillStyle=theme==='fortress'?'#5e4a3d':theme==='ruins'?'#695345':'#745339'; ctx.fillRect(0,world.ground,W,H-world.ground);
    ctx.fillStyle=theme==='fortress'?'#7e5f4e':theme==='ruins'?'#8a6952':'#956845'; ctx.fillRect(0,world.ground,W,18);
    ctx.fillStyle='#4f3827'; for(let i=0;i<44;i++) ctx.fillRect(i*30,world.ground+18,22,8);
    for(const p of props){ const x=p.x-world.cam; if(x<-200||x>W+200) continue; if(p.type==='crate') drawCrate(x,p.y,p.w,p.h); if(p.type==='flag') drawFlag(x,p.y,p.w,p.h,p.theme); if(p.type==='tank'&&p.active) drawTankPickup(x,p.y,p.w,p.h); if(p.type==='weaponbox') drawWeaponBox(x,p.y,p.w,p.h,p.opened); }
    prisoners.forEach(drawPrisoner);
  }

  function render(){
    const theme = stages[game.stageIndex]?.theme || 'desert';
    ctx.save();
    ctx.translate(game.shake?rand(-game.shake,game.shake):0, game.shake?rand(-game.shake,game.shake):0);
    drawSky(theme); drawMountains(theme); drawGround(theme); pickups.forEach(drawPickup); bullets.forEach(drawProjectile); enemyBullets.forEach(drawProjectile); grenades.forEach(drawGrenade); enemies.forEach(drawEnemy); drawPlayer(); drawEffects();
    ctx.restore();
  }

  let last = performance.now();
  function loop(now){ const dt = Math.min(.033, (now - last)/1000); last = now; update(dt); render(); requestAnimationFrame(loop); }

  function bindKeyboard() {
    addEventListener('keydown', e => {
      if (["ArrowLeft","ArrowRight","ArrowUp","Space","KeyA","KeyD","KeyW","KeyJ","KeyK","KeyL","ShiftLeft","ShiftRight"].includes(e.code)) e.preventDefault();
      input.keys.add(e.code);
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') input.jumpPressed = true;
      if (e.code === 'KeyK') input.grenadePressed = true;
      if (e.code === 'KeyL' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.dashPressed = true;
    });
    addEventListener('keyup', e => input.keys.delete(e.code));
  }

  function bindButtons() {
    startBtn.onclick = startGame;
    restartBtn.onclick = startGame;
    overRestartBtn.onclick = startGame;
    pauseRestartBtn.onclick = startGame;
    pauseBtn.onclick = () => {
      if (game.mode === 'play' || game.mode === 'intro') {
        game.paused = true;
        pauseScreen.classList.add('active');
      }
    };
    resumeBtn.onclick = () => {
      game.paused = false;
      pauseScreen.classList.remove('active');
    };

    const holdBtn = (el, onStart, onEnd) => {
      const start = e => { e.preventDefault(); onStart(); };
      const end = e => { e.preventDefault(); onEnd(); };
      el.addEventListener('touchstart', start, { passive:false });
      el.addEventListener('touchend', end, { passive:false });
      el.addEventListener('mousedown', start); el.addEventListener('mouseup', end); el.addEventListener('mouseleave', end);
    };
    holdBtn(shootBtn, () => input.shoot = true, () => input.shoot = false);
    holdBtn(jumpBtn, () => { input.jump = true; input.jumpPressed = true; }, () => input.jump = false);
    holdBtn(grenadeBtn, () => { input.grenade = true; input.grenadePressed = true; }, () => input.grenade = false);
    holdBtn(dashBtn, () => { input.dash = true; input.dashPressed = true; }, () => input.dash = false);
  }

  function bindJoystick() {
    let active = false;
    let baseRect = null;
    const resetStick = () => { joystickStick.style.transform = `translate(0px, 0px)`; input.joyX = 0; active = false; };
    const move = (clientX, clientY) => {
      if (!baseRect) baseRect = joystickBase.getBoundingClientRect();
      const cx = baseRect.left + baseRect.width/2;
      const cy = baseRect.top + baseRect.height/2;
      let dx = clientX - cx, dy = clientY - cy;
      const len = Math.hypot(dx, dy) || 1;
      const max = 34;
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      joystickStick.style.transform = `translate(${dx}px, ${dy}px)`;
      input.joyX = dx / max;
    };
    const start = e => { e.preventDefault(); active = true; baseRect = joystickBase.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; move(t.clientX, t.clientY); };
    const moving = e => { if (!active) return; e.preventDefault(); const t = e.touches ? e.touches[0] : e; move(t.clientX, t.clientY); };
    const end = e => { if (!active) return; e.preventDefault(); resetStick(); };
    joystickBase.addEventListener('touchstart', start, { passive:false });
    joystickBase.addEventListener('touchmove', moving, { passive:false });
    joystickBase.addEventListener('touchend', end, { passive:false });
    joystickBase.addEventListener('mousedown', start);
    addEventListener('mousemove', moving);
    addEventListener('mouseup', end);
  }

  bindKeyboard();
  bindButtons();
  bindJoystick();
  if ('serviceWorker' in navigator) {
    const registerSW = () => navigator.serviceWorker.register('./service-worker.js', { scope: './' }).catch(() => {});
    window.addEventListener('load', registerSW);
    registerSW();
  }
  updateHUD();
  requestAnimationFrame(loop);
})();
