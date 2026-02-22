import TombalaGame from './TombalaGame.js';
import { parseTombalaCommand, getTombalaHelpText } from './TombalaCommandParser.js';
import { autoMarkCard } from './tombala/win-check.js';

const DEFAULT_INTERVAL_MS = 30000;

export default class TombalaManager {
    constructor(options = {}) {
        this.games = new Map();
        this.intervalMs = Number(options.drawIntervalMs) || DEFAULT_INTERVAL_MS;
        this.singleWinnerPerStage = options.singleWinnerPerStage !== false;
    }

    getOrCreate(channel) {
        if (!this.games.has(channel)) {
            this.games.set(channel, new TombalaGame(channel, channel));
        }
        return this.games.get(channel);
    }

    stopTimer(game) {
        if (game && game.timerId) {
            clearInterval(game.timerId);
            game.timerId = null;
        }
    }

    endGame(channel) {
        const game = this.getOrCreate(channel);
        this.stopTimer(game);
        game.status = 'finished';
    }

    getUiState(channel, nick) {
        const game = this.getOrCreate(channel);
        const player = game.getPlayer(nick);
        const card = player ? player.card : Array.from({ length: 3 }, () => Array(9).fill(null));

        return {
            status: game.status,
            hasCard: !!player,
            card,
            markedNumbers: player ? card.flat().filter((n) => n !== null && game.drawnNumbers.includes(n)) : [],
            marks: player ? autoMarkCard(card, game.drawnNumbers) : [],
            drawnNumbers: [...game.drawnNumbers],
            winners: {
                cinko1: game.winners.cinko1 ? [game.winners.cinko1] : [],
                cinko2: game.winners.cinko2 ? [game.winners.cinko2] : [],
                tombala: game.winners.tombala ? [game.winners.tombala] : [],
            },
        };
    }

    handleMessage({ channel, nick, message, isOperator, reply, announceDraw }) {
        const parsed = parseTombalaCommand(message);
        if (!parsed) {
            return false;
        }

        const game = this.getOrCreate(channel);
        const restricted = new Set(['baslat', 'basla', 'bitir', 'seed']);
        if (restricted.has(parsed.cmd) && !isOperator) {
            reply('Bu komut sadece kanal operatörleri tarafından kullanılabilir.');
            return true;
        }

        switch (parsed.cmd) {
        case 'yardim':
            reply(getTombalaHelpText());
            break;
        case 'baslat':
            this.stopTimer(game);
            this.games.set(channel, new TombalaGame(channel, channel));
            this.getOrCreate(channel).status = 'registering';
            reply('Tombala oturumu açıldı. Katılmak için: !tombala katil');
            break;
        case 'katil': {
            const activeGame = this.getOrCreate(channel);
            if (activeGame.status === 'idle' || activeGame.status === 'finished') {
                reply('Önce operatör !tombala baslat ile oyunu açmalı.');
                break;
            }
            activeGame.registerPlayer(nick);
            reply(`${nick} oyuna katıldı. Toplam oyuncu: ${activeGame.players.size}`);
            break;
        }
        case 'seed': {
            const seed = parsed.args.join(' ').trim();
            if (!seed) {
                reply('Kullanım: !tombala seed <string>');
                break;
            }
            game.setSeed(seed);
            reply(`Seed ayarlandı: ${seed}`);
            break;
        }
        case 'basla':
            if (game.status !== 'registering') {
                reply('Önce !tombala baslat ile kayıt açılmalı.');
                break;
            }
            if (!game.players.size) {
                reply('Başlatmak için en az bir oyuncu katılmalı (!tombala katil).');
                break;
            }
            game.status = 'running';
            if (!game.timerId) {
                game.timerId = setInterval(() => {
                    const drawn = game.drawNumber();
                    if (drawn === null) {
                        this.endGame(channel);
                        reply('Tüm sayılar çekildi. Oyun bitti.');
                        return;
                    }
                    announceDraw(drawn);
                }, this.intervalMs);
            }
            reply(`Oyun başladı. Otomatik çekiliş: ${this.intervalMs}ms`);
            break;
        case 'cek': {
            if (game.status !== 'running') {
                reply('Çekiliş için oyun running durumunda olmalı.');
                break;
            }
            const drawn = game.drawNumber();
            if (drawn === null) {
                this.endGame(channel);
                reply('Tüm sayılar çekildi. Oyun bitti.');
                break;
            }
            announceDraw(drawn);
            break;
        }
        case 'durum':
            reply(`Durum: ${game.status} | Oyuncu: ${game.players.size} | Çekilen: ${game.drawnNumbers.length} | Son: ${game.lastDrawn || '-'}`);
            break;
        case 'kazan': {
            if (game.status !== 'running' && game.status !== 'finished') {
                reply('Henüz başlatılmış bir oyun yok.');
                break;
            }
            const result = game.verifyClaim(nick, this.singleWinnerPerStage);
            reply(result.message);
            if (result.ok && result.stage === 'tombala') {
                this.endGame(channel);
            }
            break;
        }
        case 'bitir':
            this.endGame(channel);
            reply('Oyun sonlandırıldı ve temizlendi.');
            break;
        default:
            reply(getTombalaHelpText());
        }

        return true;
    }
}
