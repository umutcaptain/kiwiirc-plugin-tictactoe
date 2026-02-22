const COLUMN_RANGES = [
    [1, 9],
    [10, 19],
    [20, 29],
    [30, 39],
    [40, 49],
    [50, 59],
    [60, 69],
    [70, 79],
    [80, 90],
];

function sampleWithoutReplacement(min, max, count, rng) {
    let values = [];
    for (let n = min; n <= max; n++) {
        values.push(n);
    }
    for (let i = values.length - 1; i > 0; i--) {
        let j = rng.nextInt(i + 1);
        [values[i], values[j]] = [values[j], values[i]];
    }
    return values.slice(0, count).sort((a, b) => a - b);
}

function generateColumnCounts(rng) {
    let counts = Array(9).fill(1);
    let remaining = 6;

    while (remaining > 0) {
        let col = rng.nextInt(9);
        if (counts[col] < 3) {
            counts[col] += 1;
            remaining -= 1;
        }
    }

    return counts;
}

function tryBuildPlacement(columnCounts, rng) {
    let rowCounts = [0, 0, 0];
    let placement = Array.from({ length: 3 }, () => Array(9).fill(false));

    for (let col = 0; col < 9; col++) {
        let needed = columnCounts[col];
        let candidateRows = [0, 1, 2].filter((row) => rowCounts[row] < 5);
        if (candidateRows.length < needed) {
            return null;
        }

        for (let i = candidateRows.length - 1; i > 0; i--) {
            let j = rng.nextInt(i + 1);
            [candidateRows[i], candidateRows[j]] = [candidateRows[j], candidateRows[i]];
        }

        let selected = candidateRows.slice(0, needed);
        selected.forEach((row) => {
            placement[row][col] = true;
            rowCounts[row] += 1;
        });
    }

    if (rowCounts.some((count) => count !== 5)) {
        return null;
    }

    return placement;
}

function buildPlacement(columnCounts, rng) {
    for (let attempt = 0; attempt < 250; attempt++) {
        let placement = tryBuildPlacement(columnCounts, rng);
        if (placement) {
            return placement;
        }
    }

    throw new Error('Could not generate a valid tombala card placement');
}

export function createEmptyCard() {
    return Array.from({ length: 3 }, () => Array(9).fill(null));
}

export function generateCard(rng) {
    let grid = createEmptyCard();
    let columnCounts = generateColumnCounts(rng);
    let placement = buildPlacement(columnCounts, rng);

    for (let col = 0; col < 9; col++) {
        let [min, max] = COLUMN_RANGES[col];
        let values = sampleWithoutReplacement(min, max, columnCounts[col], rng);
        let rows = [0, 1, 2].filter((row) => placement[row][col]);

        rows.forEach((row, index) => {
            grid[row][col] = values[index];
        });
    }

    return grid;
}

export function getColumnRanges() {
    return COLUMN_RANGES;
}
