import * as Utils from './libs/Utils.js';
import GameButton from './components/GameButton.vue';
import GameComponent from './components/GameComponent.vue';

// eslint-disable-next-line no-undef
kiwi.plugin('tombala', (kiwi) => {
    let mediaViewerOpen = false;
    let channelGames = new Map();

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
            kiwi.emit('plugin-tictactoe.update-button');
            kiwi.state.addMessage(buffer, {
                nick: '*',
                message: 'You have been invited to play Tic-Tac-Toe!',
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
            game.setGameMessage('Game ended by ' + eventNick);
            kiwi.state.addMessage(buffer, {
                nick: '*',
                message: eventNick + ' ended the game of Tic-Tac-Toe!',
                type: 'message',
            });
            break;
        }
        default: {
            // eslint-disable-next-line no-console
            console.error('TicTacToe: Something bad happened', rawEvent);
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
    });

    kiwi.on('mediaviewer.show', (url) => {
        mediaViewerOpen = url.component === GameComponent;
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
            kiwi.emit('plugin-tictactoe.update-button');
            return;
        }

        channelGames.forEach((game, key) => {
            if (game && game.getRemotePlayer() === event.nick && game.getInviteSent()) {
                setChannelGame(key, null);
                kiwi.emit('plugin-tictactoe.update-button');
            }
        });
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
        }
    });
});
