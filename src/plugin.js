import * as Utils from './libs/Utils.js';
import GameButton from './components/GameButton.vue';
import GameComponent from './components/GameComponent.vue';
import config from '../config.json';

// eslint-disable-next-line no-undef
kiwi.plugin('tictactoe', (kiwi) => {
    let mediaViewerOpen = false;

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
            !event.tags['+kiwiirc.com/ttt'] ||
            event.tags['+kiwiirc.com/ttt'].charAt(0) !== '{'
        ) {
            return;
        }
        let data = JSON.parse(event.tags['+kiwiirc.com/ttt']);

        let buffer = kiwi.state.getOrAddBufferByName(network.id, event.nick);
        let game = Utils.getGame(event.nick);

        switch (data.cmd) {
        case 'invite': {
            if (!game) {
                Utils.newGame(network, network.nick, event.nick);
            }
            game = Utils.getGame(event.nick);
            game.setShowInvite(true);
            kiwi.emit('plugin-tictactoe.update-button');
            kiwi.state.addMessage(buffer, {
                nick: '*',
                message: 'You have been invited to play Tic-Tac-Toe!',
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
                message: event.nick + ' accepted your invite to play Tic-Tac-Toe!',
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
                message: event.nick + ' declined your invite to play Tic-Tac-Toe!',
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
                message: event.nick + ' ended the game of Tic-Tac-Toe!',
                type: 'message',
            });
            break;
        }
        default: {
            // eslint-disable-next-line no-console
            console.error('TicTacToe: Something bad happened', event);
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
            kiwi.emit('plugin-tictactoe.update-button');
            return;
        }

        let game = Utils.getGame(event.nick);
        if (game && game.getInviteSent()) {
            Utils.setGame(game.getRemotePlayer(), null);
            kiwi.emit('plugin-tictactoe.update-button');
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
