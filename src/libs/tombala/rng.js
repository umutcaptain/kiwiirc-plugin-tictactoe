function normalizeSeed(seed) {
    let text = String(seed || '');
    let hash = 0;

    for (let i = 0; i < text.length; i++) {
        hash = (hash * 31 + text.charCodeAt(i)) % 2147483647;
    }

    if (hash <= 0) {
        return 1;
    }

    return hash;
}

export default class SeededRng {
    constructor(seed = '') {
        this.setSeed(seed);
    }

    setSeed(seed) {
        this.seed = String(seed || '');
        this.state = normalizeSeed(this.seed);
        return this;
    }

    nextFloat() {
        this.state = (this.state * 48271) % 2147483647;
        return this.state / 2147483647;
    }

    nextInt(maxExclusive) {
        return Math.floor(this.nextFloat() * maxExclusive);
    }

    shuffle(items) {
        let arr = [...items];
        for (let i = arr.length - 1; i > 0; i--) {
            let j = this.nextInt(i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}
