import TombalaButton from './components/TombalaButton.vue';
import TombalaPanel from './components/TombalaPanel.vue';

// eslint-disable-next-line no-undef
kiwi.plugin('tombala', (kiwi) => {
    let mediaViewerOpen = false;

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
