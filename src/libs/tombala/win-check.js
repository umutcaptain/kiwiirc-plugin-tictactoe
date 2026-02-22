export function autoMarkCard(card, drawnNumbers) {
    let drawnSet = drawnNumbers instanceof Set ? drawnNumbers : new Set(drawnNumbers);
    return card.map((row) => row.map((cell) => cell !== null && drawnSet.has(cell)));
}

export function evaluateCard(card, drawnNumbers) {
    let marks = autoMarkCard(card, drawnNumbers);
    let completedRows = marks
        .map((row, rowIndex) => ({
            rowIndex: rowIndex,
            complete: row.every((isMarked, colIndex) => (
                card[rowIndex][colIndex] === null || isMarked
            )),
        }))
        .filter((row) => row.complete)
        .map((row) => row.rowIndex);

    let matchedCount = marks
        .flat()
        .reduce((sum, isMarked) => sum + (isMarked ? 1 : 0), 0);

    return {
        marks,
        completedRows,
        matchedCount,
        cinko1: completedRows.length >= 1,
        cinko2: completedRows.length >= 2,
        tombala: matchedCount === 15,
    };
}
