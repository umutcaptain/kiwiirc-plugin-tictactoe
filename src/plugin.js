import * as Utils from './libs/Utils.js';
import GameButton from './components/GameButton.vue';
import TombolaComponent from './components/TombolaComponent.vue';

// eslint-disable-next-line no-undef
kiwi.plugin('tombola', (kiwi) => {
    let mediaViewerOpen = false;

    kiwi.addUi('header_channel', GameButton);

    const allowedChannelsSetting = kiwi.state.getSetting
        ? kiwi.state.getSetting('tombola.allowedChannels')
        : [];
    Utils.setAllowedChannels(allowedChannelsSetting);

    // Listen to incoming messages
    kiwi.on('irc.raw.TAGMSG', (command, event, network) => {
        const target = event.params[0];
        if (!target ||
            event.nick === network.nick ||
            !event.tags['+ayna.org/tombola'] ||
            event.tags['+ayna.org/tombola'].charAt(0) !== '{'
        ) {
            return;
        }
        if (!Utils.isAllowedChannel(target)) {
            return;
        }
        let data;
        try {
            data = JSON.parse(event.tags['+ayna.org/tombola']);
        } catch (error) {
            return;
        }

        let buffer = kiwi.state.getOrAddBufferByName(network.id, target);
        let game = Utils.getGame(target);
        if (!game) {
            Utils.newGame(network, target, network.nick);
            game = Utils.getGame(target);
        }

        switch (data.cmd) {
        case 'card': {
            if (Array.isArray(data.card)) {
                game.setCard(data.card);
                Utils.storeCard(network, target, network.nick, data.card);
                game.setStatusMessage('Kartınız hazırlandı.');
                if (!mediaViewerOpen && kiwi.state.getActiveBuffer().name === target) {
                    kiwi.emit('mediaviewer.show', { component: TombolaComponent });
                }
            }
            break;
        }
        case 'draw': {
            if (data.id && data.number) {
                game.addDraw({ id: data.id, number: data.number });
            }
            break;
        }
        case 'reset': {
            game.clearDraws();
            game.setStatusMessage('Yeni oyun başlıyor.');
            break;
        }
        default: {
            // eslint-disable-next-line no-console
            console.error('Tombola: Unknown command', event);
            break;
        }
        }
        Utils.incrementUnread(buffer);
    });

    kiwi.on('mediaviewer.show', (url) => {
        mediaViewerOpen = url.component === TombolaComponent;
    });

    kiwi.on('mediaviewer.hide', (event) => {
        mediaViewerOpen = false;
    });

    kiwi.on('irc.nick', (event, network, ircEventObj) => {
        if (event.nick !== network.nick) {
            return;
        }
        Object.keys(Utils.getGames()).forEach((key) => {
            let game = Utils.getGame(key);
            if (game) {
                game.setLocalPlayer(event.new_nick);
            }
        });
    });

    kiwi.on('irc.quit', (event, network, ircEventObj) => {
        if (event.nick !== network.nick) {
            return;
        }
        Object.keys(Utils.getGames()).forEach((key) => {
            Utils.setGame(key, null);
        });
        kiwi.emit('plugin-tombola.update-button');
    });

    kiwi.state.$watch('ui.active_buffer', () => {
        let buffer = kiwi.state.getActiveBuffer();
        let game = Utils.getGame(buffer.name);
        if (game && game.getCard() && !mediaViewerOpen) {
            kiwi.emit('mediaviewer.show', { component: TombolaComponent });
        } else if (!game && mediaViewerOpen) {
            kiwi.emit('mediaviewer.hide');
        }
    });
});
