const IRC = require('irc-framework');

const config = {
    host: process.env.TOMBOLA_HOST || 'localhost',
    port: Number(process.env.TOMBOLA_PORT || 6667),
    nick: process.env.TOMBOLA_NICK || 'tombola-bot',
    username: process.env.TOMBOLA_USER || 'tombola',
    realname: process.env.TOMBOLA_REAL || 'Tombola Bot',
    channels: (process.env.TOMBOLA_CHANNELS || '')
        .split(',')
        .map((channel) => channel.trim())
        .filter(Boolean),
    minPlayers: Number(process.env.TOMBOLA_MIN_PLAYERS || 3),
    waitSeconds: Number(process.env.TOMBOLA_WAIT_SECONDS || 60),
    drawIntervalSeconds: Number(process.env.TOMBOLA_DRAW_INTERVAL || 20),
    tls: process.env.TOMBOLA_TLS === 'true',
    tlsRejectUnauthorized: process.env.TOMBOLA_TLS_REJECT_UNAUTHORIZED !== 'false',
};

const state = {
    status: 'idle',
    waitingTimer: null,
    drawTimer: null,
    players: new Map(),
    drawnNumbers: new Set(),
    winners: {
        cinko1: null,
        cinko2: null,
        tombala: null,
    },
};

function generateCard() {
    const numbers = Array.from({ length: 90 }, (_, index) => index + 1);
    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    const selected = numbers.slice(0, 15).sort((a, b) => a - b);
    return [
        selected.slice(0, 5),
        selected.slice(5, 10),
        selected.slice(10, 15),
    ];
}

function tagPayload(payload) {
    return {
        tags: {
            '+ayna.org/tombola': JSON.stringify(payload),
        },
    };
}

function sendTagMessage(client, target, payload) {
    client.raw('TAGMSG', target, tagPayload(payload));
}

function broadcast(client, payload) {
    config.channels.forEach((channel) => {
        sendTagMessage(client, channel, payload);
    });
}

function resetGame(client, message) {
    state.status = 'idle';
    state.drawnNumbers.clear();
    state.winners = { cinko1: null, cinko2: null, tombala: null };
    clearInterval(state.drawTimer);
    state.drawTimer = null;
    if (message) {
        broadcast(client, { cmd: 'status', text: message });
    }
    broadcast(client, { cmd: 'reset' });
}

function startWaiting(client) {
    if (state.status !== 'idle') {
        return;
    }
    state.status = 'waiting';
    broadcast(client, { cmd: 'status', text: 'Tombala için oyuncu bekleniyor...' });
    state.waitingTimer = setTimeout(() => {
        if (state.players.size < config.minPlayers) {
            resetGame(client, 'Yeterli oyuncu yok, oyun iptal edildi.');
            state.players.clear();
            return;
        }
        startGame(client);
    }, config.waitSeconds * 1000);
}

function startGame(client) {
    state.status = 'running';
    broadcast(client, { cmd: 'status', text: 'Tombala başlıyor!' });
    drawNumber(client);
    state.drawTimer = setInterval(() => drawNumber(client), config.drawIntervalSeconds * 1000);
}

function drawNumber(client) {
    if (state.drawnNumbers.size >= 90) {
        resetGame(client, 'Tüm sayılar çekildi, oyun bitti.');
        return;
    }
    let number;
    do {
        number = Math.floor(Math.random() * 90) + 1;
    } while (state.drawnNumbers.has(number));
    state.drawnNumbers.add(number);
    broadcast(client, { cmd: 'draw', id: Date.now(), number });
    checkWinners(client);
}

function checkLine(row) {
    return row.every((value) => state.drawnNumbers.has(value));
}

function checkWinners(client) {
    for (const [nick, card] of state.players.entries()) {
        const lineResults = card.map((row) => checkLine(row));
        const linesComplete = lineResults.filter(Boolean).length;
        if (!state.winners.cinko1 && linesComplete >= 1) {
            state.winners.cinko1 = nick;
            broadcast(client, { cmd: 'winner', type: '1. Çinko', nick });
        }
        if (!state.winners.cinko2 && linesComplete >= 2) {
            state.winners.cinko2 = nick;
            broadcast(client, { cmd: 'winner', type: '2. Çinko', nick });
        }
        if (!state.winners.tombala && linesComplete === 3) {
            state.winners.tombala = nick;
            broadcast(client, { cmd: 'winner', type: 'Tombala', nick });
            resetGame(client, 'Tombala tamamlandı, oyun bitti.');
            break;
        }
    }
}

function handleJoin(client, channel, nick) {
    if (!config.channels.includes(channel)) {
        return;
    }
    if (!state.players.has(nick)) {
        const card = generateCard();
        state.players.set(nick, card);
        sendTagMessage(client, channel, { cmd: 'card', nick, card });
    }
    if (state.status === 'idle') {
        startWaiting(client);
    }
}

function handlePartOrQuit(nick) {
    if (!state.players.has(nick)) {
        return;
    }
    state.players.delete(nick);
    if (state.status === 'running' && state.players.size < config.minPlayers) {
        resetGame(clientInstance, 'Oyuncu sayısı azaldı, oyun iptal edildi.');
        state.players.clear();
    }
}

const clientInstance = new IRC.Client();

clientInstance.on('registered', () => {
    config.channels.forEach((channel) => clientInstance.join(channel));
});

clientInstance.on('tagmsg', (event) => {
    const channel = event.target;
    if (!event.tags || !event.tags['+ayna.org/tombola']) {
        return;
    }
    let payload;
    try {
        payload = JSON.parse(event.tags['+ayna.org/tombola']);
    } catch (error) {
        return;
    }
    if (payload.cmd === 'join' && payload.nick) {
        handleJoin(clientInstance, channel, payload.nick);
    }
});

clientInstance.on('part', (event) => {
    handlePartOrQuit(event.nick);
});

clientInstance.on('quit', (event) => {
    handlePartOrQuit(event.nick);
});

clientInstance.connect({
    host: config.host,
    port: config.port,
    nick: config.nick,
    username: config.username,
    gecos: config.realname,
    tls: config.tls,
    rejectUnauthorized: config.tlsRejectUnauthorized,
});
