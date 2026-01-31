import TombolaGame from './TombolaGame.js';

const games = {};
const cardStoragePrefix = 'tombola-card';
let allowedChannels = [];

export function newGame(network, channel, localPlayer) {
    const storedCard = loadCard(network, channel, localPlayer);
    games[channel] = new TombolaGame(network, channel, localPlayer, storedCard);
}

export function getGame(key) {
    return games[key];
}

export function setGame(key, game) {
    games[key] = game;
}

export function removeGame(key) {
    delete games[key];
}

export function getGames() {
    return games;
}

export function sendData(network, target, data) {
    let msg = new network.ircClient.Message('TAGMSG', target);
    msg.prefix = network.nick;
    msg.tags['+ayna.org/tombola'] = JSON.stringify(data);
    network.ircClient.raw(msg);
}

export function setAllowedChannels(channels) {
    allowedChannels = Array.isArray(channels)
        ? channels.map((channel) => channel.toLowerCase())
        : [];
}

export function isAllowedChannel(channel) {
    if (!channel) {
        return false;
    }
    if (!allowedChannels.length) {
        return false;
    }
    return allowedChannels.includes(channel.toLowerCase());
}

export function storageKey(network, channel, nick) {
    return `${cardStoragePrefix}:${network.id}:${channel}:${nick}`;
}

export function storeCard(network, channel, nick, card) {
    try {
        window.localStorage.setItem(storageKey(network, channel, nick), JSON.stringify(card));
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Tombola: unable to store card', error);
    }
}

export function loadCard(network, channel, nick) {
    try {
        const stored = window.localStorage.getItem(storageKey(network, channel, nick));
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        return null;
    }
}

export function incrementUnread(buffer) {
    // eslint-disable-next-line no-undef
    let activeBuffer = kiwi.state.getActiveBuffer();
    if (activeBuffer && activeBuffer !== buffer) {
        buffer.incrementFlag('unread');
    }
}
