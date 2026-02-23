import config from '../config.json';
import TombalaButton from './components/TombalaButton.vue';
import TombalaPanel from './components/TombalaPanel.vue';

function isChannelName(name) {
    return typeof name === 'string' && /^([#&+!])/.test(name);
}

function defaultState() {
    return {
        status: 'idle',
        hasCard: false,
        card: Array.from({ length: 3 }, () => Array(9).fill(null)),
        markedNumbers: [],
        drawnNumbers: [],
        winners: {
            cinko1: [],
            cinko2: [],
            tombala: [],
        },
    };
}

function applyEventToState(state, event, localNick) {
    var next = Object.assign({}, state);

    if (event.type === 'state') {
        next.status = event.status || next.status;
        next.drawnNumbers = Array.isArray(event.drawnNumbers) ? event.drawnNumbers : next.drawnNumbers;
        next.winners = event.winners || next.winners;
        return next;
    }

    if (event.type === 'draw') {
        if (typeof event.number === 'number' && next.drawnNumbers.indexOf(event.number) === -1) {
            next.drawnNumbers = next.drawnNumbers.concat([event.number]);
        }
        return next;
    }

    if (event.type === 'card' && event.nick && localNick && event.nick.toLowerCase() === localNick.toLowerCase()) {
        next.hasCard = true;
        next.card = Array.isArray(event.card) ? event.card : next.card;
        return next;
    }

    if (event.type === 'reset') {
        return defaultState();
    }

    return next;
}

function recomputeMarks(state) {
    if (!state.hasCard) {
        state.markedNumbers = [];
        return;
    }

    state.markedNumbers = state.card
        .flat()
        .filter((n) => n !== null && state.drawnNumbers.indexOf(n) !== -1);
}

function say(network, target, text) {
    if (network && network.ircClient && typeof network.ircClient.say === 'function') {
        network.ircClient.say(target, text);
    }
}

// eslint-disable-next-line no-undef
kiwi.plugin('tombala', function (kiwi) {
    var uiStore = new Map();
    kiwi.state.$tombala = uiStore;
    kiwi.state.$tombalaAllowed = config.allowedChannels;

    kiwi.addUi('header_channel', TombalaButton);

    function updateUi(channel) {
        kiwi.emit('plugin-tombala.update-ui', { channel: channel });
    }

    kiwi.on('plugin-tombala.join', function (payload) {
        var buffer = payload && payload.buffer;
        var network = payload && payload.network;

        if (!buffer || !network || !isChannelName(buffer.name)) {
            return;
        }
        if (config.allowedChannels.indexOf(buffer.name) === -1) {
            return;
        }

        say(network, buffer.name, '!tombala katil');

        if (!uiStore.has(buffer.name)) {
            uiStore.set(buffer.name, defaultState());
        }

        updateUi(buffer.name);
        kiwi.emit('mediaviewer.show', { component: TombalaPanel });
    });

    function handleWireEvent(event, network) {
        var params = event && event.params ? event.params : [];
        var message = params[1];

        if (typeof message !== 'string') {
            return;
        }

        if (message.indexOf('!tombala-event ') !== 0) {
            return;
        }

        var jsonPayload = message.substring('!tombala-event '.length);
        var eventData = null;

        try {
            eventData = JSON.parse(jsonPayload);
        } catch (err) {
            return;
        }

        var channel = eventData && eventData.channel;
        if (!isChannelName(channel)) {
            return;
        }
        if (config.allowedChannels.indexOf(channel) === -1) {
            return;
        }

        var state = uiStore.get(channel) || defaultState();
        var localNick = network ? network.nick : null;
        var nextState = applyEventToState(state, eventData, localNick);
        recomputeMarks(nextState);
        uiStore.set(channel, nextState);
        updateUi(channel);
    }

    kiwi.on('irc.raw.PRIVMSG', function (command, event, network) {
        handleWireEvent(event, network);
    });

    kiwi.on('irc.raw.NOTICE', function (command, event, network) {
        handleWireEvent(event, network);
    });

    kiwi.state.$watch('ui.active_buffer', function () {
        var buffer = kiwi.state.getActiveBuffer();
        if (!buffer || !isChannelName(buffer.name)) {
            return;
        }

        if (config.allowedChannels.indexOf(buffer.name) === -1) {
            return;
        }

        if (!uiStore.has(buffer.name)) {
            uiStore.set(buffer.name, defaultState());
        }

        updateUi(buffer.name);
    });
});
