import SeededRng from './tombala/rng.js';
import { generateCard } from './tombala/card.js';
import { evaluateCard } from './tombala/win-check.js';

function buildPool() {
    return Array.from({ length: 90 }, (_, idx) => idx + 1);
}

export default class TombalaGame {
    constructor(channelName, seed = '') {
        this.channelName = channelName;
        this.status = 'idle';
        this.seed = String(seed || channelName || '');
        this.rng = new SeededRng(this.seed);
        this.drawPool = this.rng.shuffle(buildPool());
        this.drawnNumbers = [];
        this.lastDrawn = null;
        this.players = new Map();
        this.winners = { cinko1: null, cinko2: null, tombala: null };
        this.timerId = null;
    }

    setSeed(seed) {
        this.seed = String(seed || '');
        this.rng.setSeed(this.seed);
        this.drawPool = this.rng.shuffle(buildPool());
        this.drawnNumbers = [];
        this.lastDrawn = null;
        this.winners = { cinko1: null, cinko2: null, tombala: null };
        this.players.forEach((player) => {
            player.card = generateCard(this.rng);
            player.claims = { cinko1: false, cinko2: false, tombala: false };
        });
    }

    registerPlayer(nick) {
        if (!this.players.has(nick)) {
            this.players.set(nick, {
                nick,
                card: generateCard(this.rng),
                claims: { cinko1: false, cinko2: false, tombala: false },
            });
        }
        return this.players.get(nick);
    }

    drawNumber() {
        if (this.drawPool.length === 0) {
            return null;
        }

        const n = this.drawPool.shift();
        this.drawnNumbers.push(n);
        this.lastDrawn = n;
        return n;
    }

    verifyClaim(nick, singleWinnerPerStage = true) {
        const player = this.players.get(nick);
        if (!player) {
            return { ok: false, message: `${nick} oyuna kayıtlı değil.` };
        }

        const evaluation = evaluateCard(player.card, new Set(this.drawnNumbers));

        const canAward = (stage) => {
            if (!singleWinnerPerStage) {
                return true;
            }
            return !this.winners[stage];
        };

        if (evaluation.tombala && canAward('tombala')) {
            this.winners.tombala = nick;
            player.claims.tombala = true;
            this.status = 'finished';
            return { ok: true, stage: 'tombala', message: `🏆 ${nick} TOMBALA yaptı!` };
        }

        if (evaluation.cinko2 && canAward('cinko2')) {
            this.winners.cinko2 = nick;
            player.claims.cinko2 = true;
            return { ok: true, stage: 'cinko2', message: `🎉 ${nick} Çinko 2 kazandı!` };
        }

        if (evaluation.cinko1 && canAward('cinko1')) {
            this.winners.cinko1 = nick;
            player.claims.cinko1 = true;
            return { ok: true, stage: 'cinko1', message: `🎉 ${nick} Çinko 1 kazandı!` };
        }

        return { ok: false, message: `${nick} için doğrulanmış bir kazanım yok.` };
    }
}
