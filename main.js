const GRID_SIZE = 3;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;
const BASE_GROWTH_MS = 16000;
const GROWTH_STAGES = 4;
const WHEAT_SEED_COST = 2;
const WHEAT_SELL_VALUE = 6;
const WHEAT_XP = 12;
const UPGRADE_BASE_COST = 30;
const SAVE_KEY = 'farm-life-idle-save-v1';

const stageEmojis = ['🌱', '🌿', '🌾', '🌾✨'];

const state = {
  coins: 12,
  level: 1,
  xp: 0,
  seeds: 5,
  growthUpgrade: 0,
  tiles: Array.from({ length: TOTAL_TILES }, () => createEmptyTile()),
};

const refs = {
  coins: document.getElementById('coins'),
  level: document.getElementById('level'),
  xp: document.getElementById('xp'),
  seeds: document.getElementById('seeds'),
  farmGrid: document.getElementById('farmGrid'),
  buySeedBtn: document.getElementById('buySeedBtn'),
  upgradeBtn: document.getElementById('upgradeBtn'),
  upgradeLabel: document.getElementById('upgradeLabel'),
  log: document.getElementById('log'),
};

let tileElements = [];

function createEmptyTile() {
  return {
    crop: null,
    plantedAt: 0,
    growthMs: 0,
    stage: 0,
    ready: false,
  };
}

function growthDurationWithUpgrade() {
  const reductionFactor = Math.max(0.35, 1 - state.growthUpgrade * 0.1);
  return Math.round(BASE_GROWTH_MS * reductionFactor);
}

function getUpgradeCost() {
  return UPGRADE_BASE_COST + state.growthUpgrade * 20;
}

function xpNeededForLevel(level) {
  return Math.floor(50 * Math.pow(1.35, level - 1));
}

function addXp(amount) {
  state.xp += amount;

  while (state.level < 5) {
    const needed = xpNeededForLevel(state.level);
    if (state.xp < needed) break;

    state.xp -= needed;
    state.level += 1;
    setLog(`Level up! You are now level ${state.level}.`);
  }
}

function plantWheat(index) {
  const tile = state.tiles[index];
  if (tile.crop || state.seeds <= 0) return;

  state.seeds -= 1;
  tile.crop = 'wheat';
  tile.plantedAt = Date.now();
  tile.growthMs = growthDurationWithUpgrade();
  tile.stage = 1;
  tile.ready = false;
  setLog(`Planted wheat on tile ${index + 1}.`);
}

function harvest(index) {
  const tile = state.tiles[index];
  if (!tile.ready) return;

  state.coins += WHEAT_SELL_VALUE;
  addXp(WHEAT_XP);
  state.tiles[index] = createEmptyTile();
  setLog(`Harvested wheat! +${WHEAT_SELL_VALUE} coins, +${WHEAT_XP} XP.`);
}

function updateGrowth() {
  const now = Date.now();

  state.tiles.forEach((tile) => {
    if (!tile.crop || tile.ready) return;

    const elapsed = now - tile.plantedAt;
    const progress = Math.min(elapsed / tile.growthMs, 1);
    tile.stage = Math.min(Math.floor(progress * GROWTH_STAGES) + 1, GROWTH_STAGES);

    if (progress >= 1) {
      tile.ready = true;
    }
  });
}

function onTileClick(index) {
  const tile = state.tiles[index];

  if (tile.ready) {
    harvest(index);
  } else if (!tile.crop) {
    if (state.seeds <= 0) {
      setLog('Out of seeds. Buy more wheat seeds.');
    } else {
      plantWheat(index);
    }
  } else {
    setLog(`Tile ${index + 1} is still growing.`);
  }

  render();
  saveGame();
}

function setLog(message) {
  refs.log.textContent = message;
}

function renderTile(tile, button) {
  if (!tile.crop) {
    button.className = 'tile';
    button.innerHTML = '<div class="emoji">🟫</div><div>Empty<br/>Click to plant</div>';
    return;
  }

  if (tile.ready) {
    button.className = 'tile ready';
    button.innerHTML = '<div class="emoji">🌾</div><div>Ready!<br/>Click to harvest</div>';
    return;
  }

  button.className = 'tile growing';
  button.innerHTML = `<div class="emoji">${stageEmojis[tile.stage - 1]}</div><div>Wheat stage ${tile.stage}/4</div>`;
}

function render() {
  refs.coins.textContent = String(state.coins);
  refs.level.textContent = String(state.level);
  refs.xp.textContent = `${state.xp} / ${xpNeededForLevel(state.level)}`;
  refs.seeds.textContent = String(state.seeds);

  const upgradeCost = getUpgradeCost();
  refs.upgradeBtn.textContent = `Growth Speed Upgrade (${upgradeCost} coins)`;
  refs.upgradeBtn.disabled = state.coins < upgradeCost;
  refs.upgradeLabel.textContent = `Upgrade Level: ${state.growthUpgrade}`;
  refs.buySeedBtn.disabled = state.coins < WHEAT_SEED_COST;

  state.tiles.forEach((tile, index) => renderTile(tile, tileElements[index]));
}

function buildGrid() {
  refs.farmGrid.innerHTML = '';
  tileElements = state.tiles.map((_, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tile';
    button.addEventListener('click', () => onTileClick(index));
    refs.farmGrid.appendChild(button);
    return button;
  });
}

function buySeed() {
  if (state.coins < WHEAT_SEED_COST) return;
  state.coins -= WHEAT_SEED_COST;
  state.seeds += 1;
  setLog('Bought 1 wheat seed.');
  render();
  saveGame();
}

function buyGrowthUpgrade() {
  const cost = getUpgradeCost();
  if (state.coins < cost) return;

  state.coins -= cost;
  state.growthUpgrade += 1;
  setLog(`Growth speed upgraded to level ${state.growthUpgrade}.`);
  render();
  saveGame();
}

function saveGame() {
  const payload = {
    ...state,
    savedAt: Date.now(),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.tiles) || parsed.tiles.length !== TOTAL_TILES) return;

    state.coins = Number(parsed.coins) || state.coins;
    state.level = Math.min(5, Math.max(1, Number(parsed.level) || 1));
    state.xp = Math.max(0, Number(parsed.xp) || 0);
    state.seeds = Math.max(0, Number(parsed.seeds) || 0);
    state.growthUpgrade = Math.max(0, Number(parsed.growthUpgrade) || 0);

    const now = Date.now();
    const offlineMs = Math.max(0, now - (Number(parsed.savedAt) || now));

    state.tiles = parsed.tiles.map((tile) => {
      if (!tile.crop) return createEmptyTile();

      const normalized = {
        crop: 'wheat',
        plantedAt: Number(tile.plantedAt) || now,
        growthMs: Math.max(1000, Number(tile.growthMs) || BASE_GROWTH_MS),
        stage: 1,
        ready: false,
      };

      normalized.plantedAt -= offlineMs;
      return normalized;
    });
  } catch {
    // Ignore corrupted save payloads.
  }
}

function gameLoop() {
  updateGrowth();
  render();
  requestAnimationFrame(gameLoop);
}

refs.buySeedBtn.addEventListener('click', buySeed);
refs.upgradeBtn.addEventListener('click', buyGrowthUpgrade);

loadGame();
buildGrid();
render();
gameLoop();

window.addEventListener('beforeunload', saveGame);
setInterval(saveGame, 5000);
