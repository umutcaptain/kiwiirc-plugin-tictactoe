import SeededRng from './tombala/rng.js';
import { generateCard } from './tombala/card.js';
import { evaluateCard } from './tombala/win-check.js';

function buildDrawPool() {
    return Array.from({ length: 90 }, (_, i) => i + 1);
}

export default class TombalaGame {
    constructor(channelName) {
        this.channelName = channelName;
        this.status = 'idle';
        this.players = new Map();
        this.drawPool = buildDrawPool();
        this.drawnNumbers = [];
        this.lastDrawn = null;
        this.seed = '';
        this.rng = new SeededRng('');
        this.winners = {
            cinko1: null,
            cinko2: null,
            tombala: null,
        };
        this.timerId = null;
    }

    setSeed(seed) {
        this.seed = String(seed || '');
        this.rng.setSeed(this.seed);
        this.drawPool = this.rng.shuffle(buildDrawPool());
        this.drawnNumbers = [];
        this.lastDrawn = null;
    }

    setStatus(status) {
        this.status = status;
    }

    registerPlayer(nick) {
        if (!this.players.has(nick)) {
            this.players.set(nick, {
                nick,
                card: generateCard(this.rng),
                claims: {
                    cinko1: false,
                    cinko2: false,
                    tombala: false,
                },
            });
        }
        return this.players.get(nick);
    }

    drawNumber() {
        if (this.drawPool.length === 0) {
            return null;
        }
        let number = this.drawPool.shift();
        this.drawnNumbers.push(number);
        this.lastDrawn = number;
        return number;
    }

    getDrawnSet() {
        return new Set(this.drawnNumbers);
    }

    verifyClaim(nick) {
        let player = this.players.get(nick);
        if (!player) {
            return {
                ok: false,
                message: `${nick} için kayıtlı kart bulunamadı.`,
            };
        }

        let result = evaluateCard(player.card, this.getDrawnSet());

        if (!this.winners.cinko1 && result.cinko1) {
            this.winners.cinko1 = nick;
            player.claims.cinko1 = true;
            return {
                ok: true,
                prize: 'cinko1',
                result,
                message: `🎉 ${nick} Çinko 1 kazandı!`,
            };
        }

        if (!this.winners.cinko2 && result.cinko2) {
            this.winners.cinko2 = nick;
            player.claims.cinko2 = true;
            return {
                ok: true,
                prize: 'cinko2',
                result,
                message: `🎉 ${nick} Çinko 2 kazandı!`,
            };
        }

        if (!this.winners.tombala && result.tombala) {
            this.winners.tombala = nick;
            this.status = 'finished';
            player.claims.tombala = true;
            return {
                ok: true,
                prize: 'tombala',
                result,
                message: `🏆 ${nick} TOMBALA yaptı!`,
            };
        }

        return {
            ok: false,
            result,
            message: `${nick} için geçerli bir kazanım bulunamadı.`,
        };
    }
}
