const CARD_ROWS = 3;
const CARD_COLS = 9;
const NUMBERS_PER_ROW = 5;
const MAX_PER_COLUMN = 3;

function createSeededRng(seed = Date.now()) {
    const seedStr = String(seed);
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i += 1) {
        h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return function rng() {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        const t = (h ^= h >>> 16) >>> 0;
        return t / 4294967296;
    };
}

function columnRange(colIndex) {
    const min = colIndex === 0 ? 1 : (colIndex * 10);
    const max = colIndex === 8 ? 90 : (colIndex * 10) + 9;
    return { min, max };
}

function randomInt(rng, min, max) {
    return min + Math.floor(rng() * ((max - min) + 1));
}

function sampleUniqueNumbers(rng, min, max, count) {
    const nums = [];
    for (let i = min; i <= max; i += 1) {
        nums.push(i);
    }
    for (let i = nums.length - 1; i > 0; i -= 1) {
        const j = randomInt(rng, 0, i);
        [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    return nums.slice(0, count).sort((a, b) => a - b);
}

function generateCard(seed) {
    const rng = createSeededRng(seed);
    const card = Array.from({ length: CARD_ROWS }, () => Array(CARD_COLS).fill(null));

    const columnCounts = Array(CARD_COLS).fill(1);
    let remaining = (CARD_ROWS * NUMBERS_PER_ROW) - CARD_COLS;
    while (remaining > 0) {
        const col = randomInt(rng, 0, CARD_COLS - 1);
        if (columnCounts[col] < MAX_PER_COLUMN) {
            columnCounts[col] += 1;
            remaining -= 1;
        }
    }

    const rowSlots = Array(CARD_ROWS).fill(NUMBERS_PER_ROW);

    for (let col = 0; col < CARD_COLS; col += 1) {
        const need = columnCounts[col];
        const possibleRows = rowSlots
            .map((slots, row) => ({ slots, row }))
            .filter((item) => item.slots > 0)
            .sort((a, b) => b.slots - a.slots || a.row - b.row)
            .slice(0, need)
            .map((item) => item.row)
            .sort((a, b) => a - b);

        possibleRows.forEach((row) => {
            rowSlots[row] -= 1;
        });

        const { min, max } = columnRange(col);
        const values = sampleUniqueNumbers(rng, min, max, need);
        possibleRows.forEach((row, idx) => {
            card[row][col] = values[idx];
        });
    }

    return card;
}

function drawOrder(seed) {
    const rng = createSeededRng(seed);
    const nums = Array.from({ length: 90 }, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i -= 1) {
        const j = randomInt(rng, 0, i);
        [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    return nums;
}

function evaluateCard(card, drawnNumbers) {
    const drawn = new Set(drawnNumbers);
    const rowHits = card.map((row) => row.filter((n) => n !== null && drawn.has(n)).length);
    const rowTotals = card.map((row) => row.filter((n) => n !== null).length);
    const completedRows = rowHits.filter((hits, idx) => hits === rowTotals[idx]).length;
    const allNumbers = card.flat().filter((n) => n !== null);
    const tombala = allNumbers.every((n) => drawn.has(n));

    return { completedRows, tombala };
}

function validateClaim(card, drawnNumbers, claimType) {
    const state = evaluateCard(card, drawnNumbers);
    if (claimType === 'cinko') {
        return state.completedRows >= 1;
    }
    if (claimType === 'tombala') {
        return state.tombala;
    }
    return false;
}

module.exports = {
    columnRange,
    createSeededRng,
    drawOrder,
    evaluateCard,
    generateCard,
    validateClaim,
};
