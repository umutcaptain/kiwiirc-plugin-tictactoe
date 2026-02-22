import TombalaGame from './TombalaGame.js';

const games = {};

export function newGame(network, localPlayer, remotePlayer) {
    games[remotePlayer] = new TombalaGame(network, localPlayer, remotePlayer);
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

export function sendData(network, channelName, data) {
    if (!network || !channelName || !data || !data.cmd) {
        return;
    }

    let payload = ['!tombala', data.cmd];

    if (data.cmd === 'invite_accepted') {
        payload.push(data.startPlayer || '');
    } else if (data.cmd === 'action') {
        payload.push(String(data.clicked[0]), String(data.clicked[1]), String(data.turn));
    } else if (data.cmd === 'error') {
        payload.push(data.message || '');
    }

    network.ircClient.say(channelName, payload.join(' ').trim());
export function sendData(network, target, data) {
    let msg = new network.ircClient.Message('TAGMSG', target);
    msg.prefix = network.nick;
    msg.tags['+kiwiirc.com/tombala'] = JSON.stringify(data);
    network.ircClient.raw(msg);
}

export function terminateGame(game, channelName) {
    if (!game) {
        return;
    }
    let network = game.getNetwork();
    // eslint-disable-next-line no-undef
    let targetName = channelName || game.getRemotePlayer();
    // eslint-disable-next-line no-undef
    let buffer = kiwi.state.getBufferByName(network.id, targetName);

    if (network && game.getShowInvite()) {
        sendData(network, targetName, { cmd: 'invite_declined' });
    } else if (!game.getGameOver()) {
        game.setGameOver(true);
        if (network) {
            sendData(network, targetName, { cmd: 'terminate' });
        }
        if (buffer) {
            // eslint-disable-next-line no-undef
            kiwi.state.addMessage(buffer, {
                nick: '*',
                message: 'You ended the game of Tombala!',
                type: 'message',
            });
        }
    }
    let removed = false;
    Object.keys(games).forEach((key) => {
        if (games[key] === game) {
            removeGame(key);
            removed = true;
        }
    });

    if (!removed) {
        removeGame(game.getRemotePlayer());
    }
}

export function incrementUnread(buffer) {
    // eslint-disable-next-line no-undef
    let activeBuffer = kiwi.state.getActiveBuffer();
    if (activeBuffer && activeBuffer !== buffer) {
        buffer.incrementFlag('unread');
    }
}
