import * as Utils from './libs/Utils.js';
import TombalaGame from './libs/TombalaGame.js';
import { parseTombalaCommand } from './libs/TombalaCommandParser.js';
import TombalaManager from './libs/TombalaManager.js';
import GameButton from './components/GameButton.vue';
import GameComponent from './components/GameComponent.vue';
import config from '../config.json';

function getOrCreateTombalaGame(games, channelName, seed = channelName) {
    if (!games.has(channelName)) {
        let game = new TombalaGame(channelName);
        game.setSeed(seed);
        game.setStatus('registering');
        games.set(channelName, game);
    }
    return games.get(channelName);
}

function sendChannelMessage(network, channelName, message) {
    if (typeof network.ircClient.say === 'function') {
        network.ircClient.say(channelName, message);
        return;
    }

    let msg = new network.ircClient.Message('PRIVMSG', channelName, message);
    msg.prefix = network.nick;
    network.ircClient.raw(msg);
}

// eslint-disable-next-line no-undef
kiwi.plugin('tombala', (kiwi) => {
    let mediaViewerOpen = false;
    let tombalaGames = new Map();

    kiwi.addUi('header_query', GameButton);

    kiwi.on('irc.raw.PRIVMSG', (command, event, network) => {
        if (!event.params || event.params.length < 2) {
            return;
        }

        let channelName = event.params[0];
        let text = (event.params[1] || '').trim();
        if (!text.startsWith('!tombala')) {
            return;
        }

        let parts = text.split(/\s+/);
        let subcmd = (parts[1] || '').toLowerCase();

        if (subcmd === 'kazan') {
            let game = getOrCreateTombalaGame(tombalaGames, channelName, `${network.name}:${channelName}`);
            game.registerPlayer(event.nick);

            if (game.status === 'registering' || game.status === 'idle') {
                game.setStatus('running');
                for (let i = 0; i < 15; i++) {
                    game.drawNumber();
                }
            }

            let claimResult = game.verifyClaim(event.nick);
            sendChannelMessage(network, channelName, claimResult.message);
        }
    let configuredInterval = 30000;

    if (kiwi.config && kiwi.config.tombala && kiwi.config.tombala.intervalMs) {
        configuredInterval = Number(kiwi.config.tombala.intervalMs) || configuredInterval;
    }

    const tombala = new TombalaManager({ drawIntervalMs: configuredInterval });

    const operatorModes = ['q', 'a', 'o'];
    const tombalaRestrictedCommands = new Set([
        '!tombala baslat',
        '!tombala basla',
        '!tombala seed',
        '!tombala bitir',
    ]);

    function isChannelName(name) {
        return typeof name === 'string' && ['#', '&', '+', '!'].includes(name.charAt(0));
    }

    function isAllowedChannel(channelName) {
        return config.allowedChannels.includes(channelName);
    }

    function findModeCollectionForUser(buffer, nick) {
        if (!buffer) {
            return [];
        }

        const users = buffer.users || (typeof buffer.getUsers === 'function' ? buffer.getUsers() : []);
        const userFromCollection = (typeof users.get === 'function') ? users.get(nick) : users[nick];
        const user = userFromCollection || (typeof buffer.getUser === 'function' ? buffer.getUser(nick) : null);

        if (!user) {
            return [];
        }

        if (Array.isArray(user.modes)) {
            return user.modes;
        }

        if (typeof user.modes === 'string') {
            return user.modes.split('');
        }

        if (Array.isArray(user.mode)) {
            return user.mode;
        }

        if (typeof user.mode === 'string') {
            return user.mode.split('');
        }

        if (Array.isArray(user.channels?.[buffer.name]?.modes)) {
            return user.channels[buffer.name].modes;
        }

        return [];
    }

    function hasChannelOperatorStatus(buffer, nick) {
        const modeCollection = findModeCollectionForUser(buffer, nick);
        return operatorModes.some((mode) => modeCollection.includes(mode));
    }

    function sendChannelNotice(network, channelName, message) {
        if (!network || !network.ircClient || !isChannelName(channelName)) {
            return;
        }

        network.ircClient.say(channelName, message);
    }

    function parseTombalaCommand(text) {
        if (typeof text !== 'string') {
            return null;
        }

        const normalized = text.trim().replace(/\s+/g, ' ').toLowerCase();
        if (!normalized.startsWith('!tombala')) {
            return null;
        }

        return normalized;
    }

    kiwi.addUi('header_query', GameButton);

    const sendTombalaReply = (network, channel, message) => {
        if (!network || !channel || !message) {
            return;
        }
        network.ircClient.raw('PRIVMSG', channel, message);
    };

    const onIncomingChat = (event, network) => {
        if (!event || !event.message || !network) {
            return;
        }
        const channel = event.target || (event.params && event.params[0]);
        if (!channel || channel.charAt(0) !== '#') {
            return;
        }
        const parsed = parseTombalaCommand(event.message);
        if (!parsed) {
            return;
        }

        tombala.handleCommand({
            channel,
            nick: event.nick,
            command: parsed.cmd,
            args: parsed.args,
            reply: (message) => sendTombalaReply(network, channel, message),
        });
    };

    kiwi.on('irc.privmsg', (event, network) => onIncomingChat(event, network));
    kiwi.on('irc.message', (event, network) => onIncomingChat(event, network));
    kiwi.on('irc.raw.PRIVMSG', (command, event, network) => {
        const target = event?.params?.[0];
        const message = event?.params?.[1];
        const commandText = parseTombalaCommand(message);

        if (!commandText || !target || !isChannelName(target)) {
            return;
        }

        if (!isAllowedChannel(target)) {
            return;
        }

        if (!tombalaRestrictedCommands.has(commandText)) {
            return;
        }

        const buffer = kiwi.state.getBufferByName(network.id, target);
        if (!hasChannelOperatorStatus(buffer, event.nick)) {
            sendChannelNotice(
                network,
                target,
                event.nick + ': Bu komut sadece kanal operatörleri tarafından kullanılabilir (q/a/o).'
            );
            return;
        }

        kiwi.emit('plugin-tictactoe.tombala-command', {
            command: commandText,
            channel: target,
            nick: event.nick,
            network,
            autoDrawIntervalMs: config.autoDrawIntervalMs,
            singleWinnerPerStage: config.singleWinnerPerStage,
        });
    });

    // Listen to incoming messages
    kiwi.on('irc.raw.TAGMSG', (command, event, network) => {
        if (event.params[0] !== network.nick ||
            event.nick === network.nick ||
            !event.tags['+kiwiirc.com/tombala'] ||
            event.tags['+kiwiirc.com/tombala'].charAt(0) !== '{'
        ) {
            return;
        }
        let data = JSON.parse(event.tags['+kiwiirc.com/tombala']);

        let buffer = kiwi.state.getOrAddBufferByName(network.id, event.nick);
        let game = Utils.getGame(event.nick);

        switch (data.cmd) {
        case 'invite': {
            if (!game) {
                Utils.newGame(network, network.nick, event.nick);
            }
            game = Utils.getGame(event.nick);
            game.setShowInvite(true);
            kiwi.emit('plugin-tombala.update-button');
            kiwi.state.addMessage(buffer, {
                nick: '*',
                message: 'You have been invited to play Tombala!',
                type: 'message',
            });
            Utils.sendData(network, event.nick, { cmd: 'invite_received' });
            if (!mediaViewerOpen && kiwi.state.getActiveBuffer().name === event.nick) {
                kiwi.emit('mediaviewer.show', { component: GameComponent });
            }
            break;
        }
        case 'invite_received': {
            let inviteTimeout = game.getInviteTimeout();
            if (inviteTimeout) {
                window.clearTimeout(inviteTimeout);
                game.setInviteTimeout(null);
            }
            break;
        }
        case 'invite_accepted': {
            kiwi.state.addMessage(buffer, {
                nick: '*',
                message: event.nick + ' accepted your invite to play Tombala!',
                type: 'message',
            });
            game.startGame(data.startPlayer);
            game.setInviteSent(false);
            game.setTurnMessage();
            if (!mediaViewerOpen && kiwi.state.getActiveBuffer().name === game.getRemotePlayer()) {
                kiwi.emit('mediaviewer.show', { component: GameComponent });
            }
            break;
        }
        case 'invite_declined': {
            kiwi.state.addMessage(buffer, {
                nick: '*',
                message: event.nick + ' declined your invite to play Tombala!',
                type: 'message',
            });
            game.setInviteSent(false);
            break;
        }
        case 'action': {
            if (data.clicked && game.getGameBoard()[data.clicked[0]][data.clicked[1]].val === '') {
                game.getGameBoard()[data.clicked[0]][data.clicked[1]].val = game.getMarker();
                if (game.getGameTurn() !== data.turn) {
                    game.setGameOver(true);
                    let message = 'Error: Game turn out of sync :(';
                    game.setGameMessage = message;
                    Utils.sendData(network, game.getRemotePlayer(), { cmd: 'error', message: message });
                } else {
                    game.incrementGameTurn();
                    game.checkGame();
                }

                if (!game.getGameOver()) {
                    game.setTurnMessage();
                }
            }
            break;
        }
        case 'error': {
            if (game) {
                game.setGameOver(true);
                game.setGameMessage(data.message);
            }
            break;
        }
        case 'terminate': {
            game.setGameOver(true);
            game.setGameMessage('Game ended by ' + event.nick);
            kiwi.state.addMessage(buffer, {
                nick: '*',
                message: event.nick + ' ended the game of Tombala!',
                type: 'message',
            });
            break;
        }
        default: {
            // eslint-disable-next-line no-console
            console.error('TombalaGame: Something bad happened', event);
            break;
        }
        }
        if (data.cmd && data.cmd !== 'invite_received') {
            Utils.incrementUnread(buffer);
        }
    });

    kiwi.on('mediaviewer.show', (url) => {
        mediaViewerOpen = url.component === GameComponent;
    });

    kiwi.on('mediaviewer.hide', (event) => {
        if (mediaViewerOpen && event && event.source === 'user') {
            let buffer = kiwi.state.getActiveBuffer();
            let game = Utils.getGame(buffer.name);
            if (game) {
                Utils.terminateGame(game);
            }
        }
        mediaViewerOpen = false;
    });

    kiwi.on('irc.nick', (event, network, ircEventObj) => {
        if (event.nick === network.nick) {
            Object.keys(Utils.getGames()).forEach((key) => {
                let game = Utils.getGame(key);
                if (game) {
                    if (game.getStartPlayer() === event.nick) {
                        game.setStartPlayer(event.new_nick);
                    }
                    game.setLocalPlayer(event.new_nick);
                }
            });
            return;
        }

        let game = Utils.getGame(event.nick);
        if (game) {
            if (game.getStartPlayer() === event.nick) {
                game.setStartPlayer(event.new_nick);
            }
            game.setRemotePlayer(event.new_nick);
            Utils.setGame(event.new_nick, game);
            Utils.setGame(event.nick, null);
        }
    });

    kiwi.on('irc.quit', (event, network, ircEventObj) => {
        if (event.nick === network.nick) {
            Object.keys(Utils.getGames()).forEach((key) => {
                let game = Utils.getGame(key);
                if (game && game.getInviteSent()) {
                    Utils.setGame(game.getRemotePlayer(), null);
                }
            });
            kiwi.emit('plugin-tombala.update-button');
            return;
        }

        let game = Utils.getGame(event.nick);
        if (game && game.getInviteSent()) {
            Utils.setGame(game.getRemotePlayer(), null);
            kiwi.emit('plugin-tombala.update-button');
        }
    });

    kiwi.state.$watch('ui.active_buffer', () => {
        let buffer = kiwi.state.getActiveBuffer();
        let game = Utils.getGame(buffer.name);
        if (game && (game.getShowGame() || game.getShowInvite()) && !mediaViewerOpen) {
            kiwi.emit('mediaviewer.show', { component: GameComponent });
        } else if (!game && mediaViewerOpen) {
            kiwi.emit('mediaviewer.hide');
        }
    });
});
