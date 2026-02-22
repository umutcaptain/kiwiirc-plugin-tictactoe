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
import TombalaButton from './components/TombalaButton.vue';
import TombalaPanel from './components/TombalaPanel.vue';

// eslint-disable-next-line no-undef
kiwi.plugin('tombala', (kiwi) => {
    let mediaViewerOpen = false;
    let channelGames = new Map();
    let tombalaGames = new Map();

    function isChannelBuffer(buffer) {
        return !!(buffer && typeof buffer.isChannel === 'function' && buffer.isChannel());
    }

    function getChannelGame(channelName) {
        return channelGames.get(channelName) || null;
    }

    function setChannelGame(channelName, game) {
        if (!channelName) {
            return;
        }
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

    let createState = () => ({
        status: 'kayıt açık',
        card: [
            [1, null, 15, null, 42, null, 61, null, 88],
            [null, 10, null, 33, null, 58, null, 74, null],
            [5, null, 27, null, 49, null, 67, null, 90],
        ],
        markedNumbers: [],
        drawnNumbers: [],
        winners: {
            cinko1: [],
            cinko2: [],
            tombala: [],
        },
    });

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

        if (game) {
            channelGames.set(channelName, game);
            Utils.setGame(channelName, game);
        } else {
            channelGames.delete(channelName);
            Utils.removeGame(channelName);
        }
    }

    function parseTombalaCommand(message) {
        if (!message || message.indexOf('!tombala') !== 0) {
            return null;
        }

        let args = message.trim().split(/\s+/);
        let cmd = args[1];
        if (!cmd) {
            return null;
        }

        let data = { cmd: cmd };

        if (cmd === 'invite_accepted') {
            data.startPlayer = args[2] || '';
        } else if (cmd === 'action') {
            if (args.length < 5) {
                return null;
            }
            data.clicked = [Number(args[2]), Number(args[3])];
            data.turn = Number(args[4]);
            if (
                Number.isNaN(data.clicked[0]) ||
                Number.isNaN(data.clicked[1]) ||
                Number.isNaN(data.turn)
            ) {
                return null;
            }
        } else if (cmd === 'error') {
            data.message = args.slice(2).join(' ');
        }

        return data;
    }

    function handleGameCommand(network, buffer, eventNick, data, rawEvent) {
        let game = getChannelGame(buffer.name);

        if (!game && data.cmd !== 'invite') {
            return;
        }

        switch (data.cmd) {
        case 'invite': {
            if (!game) {
                Utils.newGame(network, network.nick, eventNick);
                setChannelGame(buffer.name, Utils.getGame(eventNick));
                Utils.removeGame(eventNick);
            }
            game = getChannelGame(buffer.name);
            game.setShowInvite(true);
            kiwi.emit('plugin-tombala.update-button');
            kiwi.state.addMessage(buffer, {
                nick: '*',
                message: 'You have been invited to play Tombala!',
                type: 'message',
            });
            network.ircClient.say(buffer.name, '!tombala invite_received');
            if (!mediaViewerOpen && kiwi.state.getActiveBuffer().name === buffer.name) {
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
                message: eventNick + ' accepted your invite to play Tic-Tac-Toe!',
                message: event.nick + ' accepted your invite to play Tombala!',
                type: 'message',
            });
            game.setRemotePlayer(eventNick);
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
                message: eventNick + ' declined your invite to play Tic-Tac-Toe!',
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
                    let errorMessage = 'Error: Game turn out of sync :(';
                    game.setGameMessage = errorMessage;
                    network.ircClient.say(buffer.name, '!tombala error ' + errorMessage);
                } else {
                    game.incrementGameTurn();
                    game.checkGame();
                }
    let stateByBuffer = {};

    let ensureState = (bufferName) => {
        if (!stateByBuffer[bufferName]) {
            stateByBuffer[bufferName] = createState();
        }
        return stateByBuffer[bufferName];
    };

    kiwi.state.$tombala = {
        get(bufferName) {
            return ensureState(bufferName);
        },
    };

    kiwi.addUi('header_channel', TombalaButton);

    kiwi.on('plugin-tombala.join', ({ buffer, network }) => {
        if (!buffer || !network) {
            return;
        }
        kiwi.state.addMessage(buffer, {
            nick: '*',
            message: '!tombala katil',
            type: 'message',
        });
        network.ircClient.raw('PRIVMSG', buffer.name, '!tombala katil');

        ensureState(buffer.name);
        if (!mediaViewerOpen && kiwi.state.getActiveBuffer().name === buffer.name) {
            kiwi.emit('mediaviewer.show', { component: TombalaPanel });
        }
        kiwi.emit('plugin-tombala.update-ui');
    });

    kiwi.on('irc.raw.TAGMSG', (command, event) => {
        if (!event.tags['+kiwiirc.com/tombala']) {
            return;
        }

        let data;
        try {
            data = JSON.parse(event.tags['+kiwiirc.com/tombala']);
        } catch (err) {
            return;
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
            game.setGameMessage('Game ended by ' + eventNick);
            kiwi.state.addMessage(buffer, {
                nick: '*',
                message: eventNick + ' ended the game of Tic-Tac-Toe!',
                message: event.nick + ' ended the game of Tombala!',
                type: 'message',
            });
            break;
        }
        default: {
            // eslint-disable-next-line no-console
            console.error('TicTacToe: Something bad happened', rawEvent);
            console.error('TombalaGame: Something bad happened', event);
            break;
        }
        }

        if (data.cmd && data.cmd !== 'invite_received') {
            Utils.incrementUnread(buffer);
        }
    }

    kiwi.addUi('header_query', GameButton);

    kiwi.on('irc.privmsg', (event, network) => {
        let activeBuffer = kiwi.state.getActiveBuffer();
        if (!isChannelBuffer(activeBuffer)) {
            return;
        }

        let message = event && (event.message || (event.params && event.params[1]));
        if (!event || !event.target || !message || event.target !== activeBuffer.name) {
            return;
        }

        let buffer = kiwi.state.getBufferByName(network.id, event.target);
        if (!isChannelBuffer(buffer)) {
            return;
        }

        let data = parseTombalaCommand(message);
        if (!data) {
            return;
        }

        handleGameCommand(network, buffer, event.nick, data, event);
    });

    kiwi.on('irc.raw.TAGMSG', (command, event, network) => {
        let activeBuffer = kiwi.state.getActiveBuffer();
        if (!isChannelBuffer(activeBuffer)) {
            return;
        }

        if (!event || !event.tags || !event.params || event.params.length < 1) {
            return;
        }

        let target = event.params[0];
        if (!target || target !== activeBuffer.name || event.nick === network.nick) {
            return;
        }

        let payload = event.tags['+kiwiirc.com/ttt'];
        if (!payload || payload.charAt(0) !== '{') {
            return;
        }

        let data;
        try {
            data = JSON.parse(payload);
        } catch (error) {
            return;
        }

        let buffer = kiwi.state.getBufferByName(network.id, target);
        if (!isChannelBuffer(buffer)) {
            return;
        }

        handleGameCommand(network, buffer, event.nick, data, event);

        let state = ensureState(event.params[0]);
        state.status = data.status || state.status;
        state.drawnNumbers = data.drawnNumbers || state.drawnNumbers;
        state.markedNumbers = data.markedNumbers || state.markedNumbers;
        state.winners = {
            cinko1: data.cinko1Winners || state.winners.cinko1,
            cinko2: data.cinko2Winners || state.winners.cinko2,
            tombala: data.tombalaWinners || state.winners.tombala,
        };

        if (Array.isArray(data.card) && data.card.length === 3) {
            state.card = data.card;
        }

        kiwi.emit('plugin-tombala.update-ui');
    });

    kiwi.on('mediaviewer.show', (url) => {
        mediaViewerOpen = url.component === TombalaPanel;
    });

    kiwi.on('mediaviewer.hide', (event) => {
        if (mediaViewerOpen && event && event.source === 'user') {
            let buffer = kiwi.state.getActiveBuffer();
            let game = getChannelGame(buffer.name);
            if (game) {
                Utils.terminateGame(game, buffer.name);
                setChannelGame(buffer.name, null);
            }
        }
        mediaViewerOpen = false;
    });

    kiwi.on('irc.nick', (event, network, ircEventObj) => {
        if (event.nick === network.nick) {
            channelGames.forEach((game, key) => {
                if (game) {
                    if (game.getStartPlayer() === event.nick) {
                        game.setStartPlayer(event.new_nick);
                    }
                    game.setLocalPlayer(event.new_nick);
                }
            });
            return;
        }

        channelGames.forEach((game) => {
            if (!game || game.getRemotePlayer() !== event.nick) {
                return;
            }
            if (game.getStartPlayer() === event.nick) {
                game.setStartPlayer(event.new_nick);
            }
            game.setRemotePlayer(event.new_nick);
        });
    });

    kiwi.on('irc.quit', (event, network, ircEventObj) => {
        if (event.nick === network.nick) {
            channelGames.forEach((game, key) => {
                if (game && game.getInviteSent()) {
                    setChannelGame(key, null);
                }
            });
            kiwi.emit('plugin-tombala.update-button');
            return;
        }

        channelGames.forEach((game, key) => {
            if (game && game.getRemotePlayer() === event.nick && game.getInviteSent()) {
                setChannelGame(key, null);
                kiwi.emit('plugin-tictactoe.update-button');
            }
        });
        let game = Utils.getGame(event.nick);
        if (game && game.getInviteSent()) {
            Utils.setGame(game.getRemotePlayer(), null);
            kiwi.emit('plugin-tombala.update-button');
        }
    });

    kiwi.state.$watch('ui.active_buffer', () => {
        let buffer = kiwi.state.getActiveBuffer();
        if (!isChannelBuffer(buffer)) {
            if (mediaViewerOpen) {
                kiwi.emit('mediaviewer.hide');
            }
            return;
        }

        let game = getChannelGame(buffer.name);
        if (game && (game.getShowGame() || game.getShowInvite()) && !mediaViewerOpen) {
            kiwi.emit('mediaviewer.show', { component: GameComponent });
        } else if (!game && mediaViewerOpen) {
            kiwi.emit('mediaviewer.hide');
    kiwi.on('mediaviewer.hide', () => {
        mediaViewerOpen = false;
    });

    kiwi.state.$watch('ui.active_buffer', () => {
        let buffer = kiwi.state.getActiveBuffer();
        if (buffer && buffer.isChannel() && mediaViewerOpen) {
            kiwi.emit('plugin-tombala.update-ui');
        }
    });
});
