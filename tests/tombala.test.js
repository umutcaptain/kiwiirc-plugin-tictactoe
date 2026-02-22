const test = require('node:test');
const assert = require('node:assert/strict');
const {
    columnRange,
    drawOrder,
    generateCard,
    validateClaim,
} = require('../src/libs/tombala');

test('kart üretimi: 3x9 ve satır başına 5 sayı', () => {
    const card = generateCard('card-rules');
    assert.equal(card.length, 3);
    card.forEach((row) => {
        assert.equal(row.length, 9);
        assert.equal(row.filter((n) => n !== null).length, 5);
    });
});

test('kart üretimi: kolon aralıkları doğru', () => {
    const card = generateCard('range-check');
    card.forEach((row) => {
        row.forEach((value, col) => {
            if (value === null) {
                return;
            }
            const { min, max } = columnRange(col);
            assert.ok(value >= min && value <= max, `kolon ${col} için ${value} aralık dışı`);
        });
    });
});

test('seedli çekiliş deterministik', () => {
    const a = drawOrder('fixed-seed');
    const b = drawOrder('fixed-seed');
    const c = drawOrder('other-seed');

    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
    assert.equal(new Set(a).size, 90);
    assert.equal(Math.min(...a), 1);
    assert.equal(Math.max(...a), 90);
});

test('çinko ve tombala doğrulama senaryoları', () => {
    const card = [
        [1, 12, 23, 34, 45, null, null, null, null],
        [null, null, null, null, null, 56, 67, 78, 89],
        [2, 13, 24, 35, 46, null, null, null, null],
    ];

    const cinkoDrawn = [1, 12, 23, 34, 45];
    const almostTombala = [1, 12, 23, 34, 45, 56, 67, 78, 89, 2, 13, 24, 35];
    const fullTombala = [1, 12, 23, 34, 45, 56, 67, 78, 89, 2, 13, 24, 35, 46];

    assert.equal(validateClaim(card, cinkoDrawn, 'cinko'), true);
    assert.equal(validateClaim(card, cinkoDrawn, 'tombala'), false);
    assert.equal(validateClaim(card, almostTombala, 'tombala'), false);
    assert.equal(validateClaim(card, fullTombala, 'tombala'), true);
});
