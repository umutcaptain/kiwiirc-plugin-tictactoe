import { getTombalaHelpText } from './TombalaCommandParser.js';

const DEFAULT_INTERVAL_MS = 30000;
const MAX_NUMBER = 90;

function hashSeed(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash * 31 + value.charCodeAt(i)) % 2147483647;
    }
    return hash || 1;
}

function createSeededRng(seed) {
    let state = hashSeed(seed) || 1;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

function createState() {
    return {
        started: false,
        players: new Set(),
        draws: [],
        winnerStages: [],
        timerId: null,
        seed: null,
        rng: Math.random,
    };
}

export default class TombalaManager {
    constructor(config = {}) {
        this.games = new Map();
        this.drawIntervalMs = Number(config.drawIntervalMs) || DEFAULT_INTERVAL_MS;
    }

    getOrCreate(channel) {
        if (!this.games.has(channel)) {
            this.games.set(channel, createState());
        }
        return this.games.get(channel);
    }

    clearTimer(state) {
        if (state.timerId) {
            window.clearInterval(state.timerId);
            state.timerId = null;
        }
    }

    endGame(channel, reason, reply) {
        const state = this.getOrCreate(channel);
        this.clearTimer(state);
        state.started = false;
        if (reason) {
            reply(reason);
        }
    }

    drawNumber(channel) {
        const state = this.getOrCreate(channel);
        if (!state.started) {
            return null;
        }

        if (state.draws.length >= MAX_NUMBER) {
            return null;
        }

        const available = [];
        for (let i = 1; i <= MAX_NUMBER; i += 1) {
            if (!state.draws.includes(i)) {
                available.push(i);
            }
        }

        const index = Math.floor(state.rng() * available.length);
        const drawn = available[index];
        state.draws.push(drawn);
        if (state.draws.length >= MAX_NUMBER) {
            this.endGame(channel, 'Tüm sayılar çekildi, oyun bitti.', () => {});
        }
        return drawn;
    }

    getStatusText(channel) {
        const state = this.getOrCreate(channel);
        const lastDraw = state.draws.length ? state.draws[state.draws.length - 1] : '-';
        const stageWinners = state.winnerStages.length ? state.winnerStages.join(', ') : '-';

        return `Durum | oyuncu sayısı: ${state.players.size}, çekilen sayı adedi: ${state.draws.length}, son çekilen sayı: ${lastDraw}, stage kazananları: ${stageWinners}`;
    }

    handleCommand({ channel, nick, command, args, reply }) {
        const state = this.getOrCreate(channel);

        switch (command) {
        case 'yardim':
            reply(getTombalaHelpText());
            break;
        case 'baslat':
            this.clearTimer(state);
            this.games.set(channel, createState());
            this.getOrCreate(channel).players.add(nick);
            reply('Tombala oyunu oluşturuldu. Katılmak için: !tombala katil');
            break;
        case 'katil':
            state.players.add(nick);
            reply(`${nick} oyuna katıldı. Toplam oyuncu: ${state.players.size}`);
            break;
        case 'seed': {
            const seedValue = args[0];
            if (!seedValue) {
                reply('Kullanım: !tombala seed <string>');
                break;
            }
            state.seed = seedValue;
            state.rng = createSeededRng(seedValue);
            reply(`Seed ayarlandı: ${seedValue}`);
            break;
        }
        case 'basla':
            if (!state.players.size) {
                reply('Oyunu başlatmak için en az bir oyuncu katılmalı.');
                break;
            }
            state.started = true;
            if (!state.timerId) {
                state.timerId = window.setInterval(() => {
                    const drawn = this.drawNumber(channel);
                    if (drawn === null) {
                        this.clearTimer(state);
                        return;
                    }
                    reply(`Sayı çekildi: ${drawn}`);
                }, this.drawIntervalMs);
            }
            reply(`Oyun başladı. Otomatik çekiliş her ${this.drawIntervalMs}ms.`);
            break;
        case 'cek': {
            const drawn = this.drawNumber(channel);
            if (drawn === null) {
                reply('Çekiliş yapılamadı. Oyun başlamamış olabilir veya sayılar bitmiş olabilir.');
                break;
            }
            reply(`Sayı çekildi: ${drawn}`);
            break;
        }
        case 'durum':
            reply(this.getStatusText(channel));
            break;
        case 'kazan':
            state.winnerStages.push(nick);
            reply(`${nick} bir stage kazandı!`);
            break;
        case 'bitir':
            this.endGame(channel, 'Oyun sonlandırıldı.', reply);
            break;
        default:
            reply(getTombalaHelpText());
            break;
        }
    }
}
