/* eslint-disable no-console */

/**
 * Server-authoritative Tombala bot (reference implementation).
 *
 * Requires separate runtime deps in bot host environment:
 *   npm i irc-framework seedrandom
 *
 * Env:
 *   IRC_HOST, IRC_PORT, IRC_TLS, IRC_TLS_REJECT_UNAUTHORIZED, IRC_NICK,
 *   IRC_USERNAME, IRC_REALNAME, IRC_PASS(optional), IRC_ADMIN_NICKS(optional)
 *   IRC_CHANNELS="#test,#test1"
 *   TOMBALA_INTERVAL_MS=30000
 */

const IRC = require('irc-framework');
const seedrandom = require('seedrandom');
const { generateCard } = require('../src/libs/tombala');

const INTERVAL_MS = Number(process.env.TOMBALA_INTERVAL_MS || 30000);
const CHANNELS = String(process.env.IRC_CHANNELS || '#test,#test1').split(',').map((x) => x.trim()).filter(Boolean);
const ADMIN_NICKS = String(process.env.IRC_ADMIN_NICKS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
const TLS_ENABLED = String(process.env.IRC_TLS || 'true').toLowerCase() !== 'false';
const TLS_REJECT_UNAUTHORIZED = String(process.env.IRC_TLS_REJECT_UNAUTHORIZED || 'true').toLowerCase() !== 'false';

if (!process.env.IRC_HOST) {
    console.error('[tombala-bot] ERROR: IRC_HOST zorunlu. Örn: IRC_HOST=irc.sunucu.net');
    process.exit(1);
}

if (!CHANNELS.length) {
    console.error('[tombala-bot] ERROR: IRC_CHANNELS boş olamaz. Örn: IRC_CHANNELS="#test,#test1"');
    process.exit(1);
}


function normalizeNick(nick) {
    const text = String(nick || '');
    return text.replace(/^[~&@%+]+/, '').toLowerCase();
}

function modeTokenText(value) {
    if (Array.isArray(value)) {
        return value.join('');
    }
    if (typeof value === 'string') {
        return value;
    }
    return '';
}

function cardNumbers(card) {
    return card.flat().filter((n) => n !== null);
}

function cardResult(card, drawnSet) {
    const rows = card.map((row) => row.filter((n) => n !== null));
    const completedRows = rows.filter((r) => r.every((n) => drawnSet.has(n))).length;
    const total = cardNumbers(card).every((n) => drawnSet.has(n));
    return {
        cinko1: completedRows >= 1,
        cinko2: completedRows >= 2,
        tombala: total,
    };
}

function newGame(seed) {
    const rng = seedrandom(seed || String(Date.now()));
    const pool = Array.from({ length: 90 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return {
        status: 'registering',
        seed: seed || '',
        drawPool: pool,
        drawnNumbers: [],
        players: new Map(),
        winners: { cinko1: null, cinko2: null, tombala: null },
        timer: null,
    };
}

const games = new Map();

function listChannelNicks(client, channel) {
    if (!client || typeof client.channel !== 'function') {
        return [];
    }

    const ch = client.channel(channel);
    const users = ch && ch.users ? ch.users : null;
    if (!users) {
        return [];
    }

    const botNick = normalizeNick(process.env.IRC_NICK || 'TombalaBot');
    const uniq = new Set();

    Object.keys(users).forEach((key) => {
        const n = normalizeNick(key);
        if (n && n !== botNick) {
            uniq.add(n);
        }
    });

    return Array.from(uniq);
}

function sendEventToNick(client, nick, payload) {
    const text = `!tombala-event ${JSON.stringify(payload)}`;
    if (typeof client.notice === 'function') {
        client.notice(nick, text);
        return;
    }
    client.say(nick, text);
}

function emitEvent(client, channel, payload) {

    client.say(channel, `!tombala-event ${JSON.stringify(payload)}`);
}

function publishState(client, channel) {
    const game = games.get(channel);
    if (!game) {
        emitEvent(client, channel, { type: 'reset' });
        return;
    }
    emitEvent(client, channel, {
        type: 'state',
        status: game.status,
        drawnNumbers: game.drawnNumbers,
        winners: {
            cinko1: game.winners.cinko1 ? [game.winners.cinko1] : [],
            cinko2: game.winners.cinko2 ? [game.winners.cinko2] : [],
            tombala: game.winners.tombala ? [game.winners.tombala] : [],
        },
    });
}

function drawNumber(client, channel) {
    const game = games.get(channel);
    if (!game || game.status !== 'running') {
        return;
    }

    const n = game.drawPool.shift();
    if (!n) {
        game.status = 'finished';
        client.say(channel, 'Tüm sayılar çekildi. Oyun bitti.');
        publishState(client, channel);
        return;
    }

    game.drawnNumbers.push(n);
    emitEvent(client, channel, { type: 'draw', number: n });
    publishState(client, channel);
}

function getKnownModeText(event) {
    const parts = [];

    if (event && event.identify) {
        parts.push(modeTokenText(event.identify.mode));
        parts.push(modeTokenText(event.identify.modes));
        parts.push(modeTokenText(event.identify.prefix));
    }
    if (event) {
        parts.push(modeTokenText(event.mode));
        parts.push(modeTokenText(event.modes));
        parts.push(modeTokenText(event.prefix));
        parts.push(modeTokenText(event.nick));
    }

    return parts.join('');
}

function findUserFromChannelState(ch, nick) {
    const target = normalizeNick(nick);
    const users = ch && ch.users ? ch.users : null;
    if (!users) {
        return null;
    }

    const direct = users[target] || users[nick] || users['@' + target] || users['+' + target] || users['&' + target] || users['~' + target];
    if (direct) {
        return direct;
    }

    const keys = Object.keys(users);
    for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        if (normalizeNick(key) === target) {
            return users[key];
        }
    }

    return null;
}

function isOpByClientState(client, channel, nick) {
    if (!client || typeof client.channel !== 'function') {
        return false;
    }

    const ch = client.channel(channel);
    if (!ch || !ch.users) {
        return false;
    }

    const user = findUserFromChannelState(ch, nick);
    if (!user) {
        return false;
    }

    const modeText = [
        modeTokenText(user.mode),
        modeTokenText(user.modes),
        modeTokenText(user.prefix),
        modeTokenText(user.nick),
    ].join('');

    if (/[qao@&~]/.test(modeText)) {
        return true;
    }

    return !!(user.isOp || user.isOper || user.op || user.owner || user.admin);
}

function isOp(client, event, channel) {
    const nick = normalizeNick(event && event.nick ? event.nick : '');

    if (ADMIN_NICKS.includes(nick)) {
        return true;
    }

    if (/[qao@&~]/.test(getKnownModeText(event))) {
        return true;
    }

    return isOpByClientState(client, channel, event && event.nick);
}

const client = new IRC.Client();

console.log('[tombala-bot] connecting', {
    host: process.env.IRC_HOST,
    port: Number(process.env.IRC_PORT || 6697),
    tls: TLS_ENABLED,
    tlsRejectUnauthorized: TLS_REJECT_UNAUTHORIZED,
    nick: process.env.IRC_NICK || 'TombalaBot',
    channels: CHANNELS,
    intervalMs: INTERVAL_MS,
});

client.connect({
    host: process.env.IRC_HOST,
    port: Number(process.env.IRC_PORT || 6697),
    tls: TLS_ENABLED,
    rejectUnauthorized: TLS_REJECT_UNAUTHORIZED,
    nick: process.env.IRC_NICK || 'TombalaBot',
    username: process.env.IRC_USERNAME || 'tombala',
    gecos: process.env.IRC_REALNAME || 'Tombala Authority Bot',
    password: process.env.IRC_PASS || undefined,
});

client.on('registered', () => {
    console.log('[tombala-bot] registered, joining channels:', CHANNELS.join(', '));
    CHANNELS.forEach((ch) => client.join(ch));
});

client.on('join', (event) => {
    if (event.nick === (process.env.IRC_NICK || 'TombalaBot')) {
        console.log('[tombala-bot] joined channel:', event.channel);
    }
});

client.on('socket close', (evt) => {
    console.error('[tombala-bot] socket close', evt || {});
});

client.on('close', (evt) => {
    console.error('[tombala-bot] close', evt || {});
});

client.on('error', (err) => {
    console.error('[tombala-bot] error', err);
});

client.on('raw', (event) => {
    if (!event || !event.command) {
        return;
    }
    const cmd = String(event.command);
    if (/^(4|5)\d\d$/.test(cmd)) {
        console.error('[tombala-bot] IRC error reply', cmd, event.params || []);
    }
});

client.on('message', (event) => {
    const channel = event.target;
    const text = String(event.message || '').trim();

    if (!CHANNELS.includes(channel) || !text.startsWith('!tombala')) {
        return;
    }

    const parts = text.split(/\s+/);
    const cmd = (parts[1] || 'yardim').toLowerCase();

    if (cmd === 'yardim') {
        client.say(channel, '!tombala baslat | katil | basla | cek | kazan | durum | bitir | seed <deger>');
        return;
    }

    if (['baslat', 'basla', 'bitir', 'seed', 'cek'].includes(cmd) && !isOp(client, event, channel)) {
        console.warn('[tombala-bot] op-check failed', {
            nick: event.nick,
            normalizedNick: normalizeNick(event.nick),
            channel,
            identifyMode: event && event.identify ? event.identify.mode : null,
            identifyPrefix: event && event.identify ? event.identify.prefix : null,
            configuredAdmins: ADMIN_NICKS,
        });
        client.say(channel, `${event.nick}: Bu komut sadece kanal operatörleri tarafından kullanılabilir.`);
        return;
    }

    if (cmd === 'baslat') {
        const game = newGame(`${channel}:${Date.now()}`);
        games.set(channel, game);
        client.say(channel, 'Tombala oturumu açıldı. Katılmak için: !tombala katil');
        publishState(client, channel);
        return;
    }

    const game = games.get(channel);
    if (!game) {
        client.say(channel, 'Henüz aktif bir oyun yok. Önce !tombala baslat');
        return;
    }

    if (cmd === 'seed') {
        const seed = parts.slice(2).join(' ').trim();
        const replacement = newGame(seed || `${channel}:${Date.now()}`);
        replacement.players = game.players;
        replacement.status = game.status;
        games.set(channel, replacement);
        client.say(channel, `Seed ayarlandı: ${seed || '(otomatik)'}`);
        publishState(client, channel);
        return;
    }

    if (cmd === 'katil') {
        if (game.status !== 'registering') {
            client.say(channel, `${event.nick}: Kayıt aşaması kapalı.`);
            return;
        }

        const key = event.nick.toLowerCase();
        if (game.players.has(key)) {
            client.say(channel, `${event.nick}: Zaten oyuna katıldın.`);
            return;
        }

        game.players.set(key, { nick: event.nick, card: generateCard(`${channel}:${event.nick}`) });

        const player = game.players.get(key);
        emitEvent(client, channel, { type: 'card', nick: player.nick, card: player.card });
        client.say(channel, `${event.nick} oyuna katıldı. Toplam oyuncu: ${game.players.size}`);
        publishState(client, channel);
        return;
    }

    if (cmd === 'basla') {
        if (!game.players.size) {
            client.say(channel, 'Başlatmak için en az bir oyuncu katılmalı.');
            return;
        }
        game.status = 'running';
        if (game.timer) {
            clearInterval(game.timer);
        }
        game.timer = setInterval(() => drawNumber(client, channel), INTERVAL_MS);
        client.say(channel, `Oyun başladı. Otomatik çekiliş ${INTERVAL_MS}ms.`);
        publishState(client, channel);
        return;
    }

    if (cmd === 'cek') {
        drawNumber(client, channel);
        return;
    }

    if (cmd === 'durum') {
        client.say(channel, `Durum: ${game.status} | Oyuncu: ${game.players.size} | Çekilen: ${game.drawnNumbers.length} | Son: ${game.drawnNumbers[game.drawnNumbers.length - 1] || '-'}`);
        return;
    }

    if (cmd === 'kazan') {
        const player = game.players.get(event.nick.toLowerCase());
        if (!player) {
            client.say(channel, `${event.nick}: Önce oyuna katılmalısın.`);
            return;
        }

        const res = cardResult(player.card, new Set(game.drawnNumbers));
        if (res.tombala && !game.winners.tombala) {
            game.winners.tombala = event.nick;
            game.status = 'finished';
            if (game.timer) {
                clearInterval(game.timer);
                game.timer = null;
            }
            client.say(channel, `🏆 ${event.nick} TOMBALA yaptı!`);
            publishState(client, channel);
            return;
        }

        if (res.cinko2 && !game.winners.cinko2) {
            game.winners.cinko2 = event.nick;
            client.say(channel, `🎉 ${event.nick} Çinko 2 kazandı!`);
            publishState(client, channel);
            return;
        }

        if (res.cinko1 && !game.winners.cinko1) {
            game.winners.cinko1 = event.nick;
            client.say(channel, `🎉 ${event.nick} Çinko 1 kazandı!`);
            publishState(client, channel);
            return;
        }

        client.say(channel, `${event.nick}: Geçerli bir kazanım bulunamadı.`);
        return;
    }

    if (cmd === 'bitir') {
        if (game.timer) {
            clearInterval(game.timer);
        }
        games.delete(channel);
        client.say(channel, 'Oyun sonlandırıldı.');
        emitEvent(client, channel, { type: 'reset' });
    }
});
