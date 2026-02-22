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
import TombalaManager from './libs/TombalaManager.js';

function isChannelName(name) {
    return typeof name === 'string' && /^([#&+!])/.test(name);
}

function findUser(buffer, nick) {
    if (!buffer || !nick) {
        return null;
    }

    if (typeof buffer.getUser === 'function') {
        var found = buffer.getUser(nick);
        if (found) {
            return found;
        }
    }

    var users = buffer.users || (typeof buffer.getUsers === 'function' ? buffer.getUsers() : null);
    if (!users) {
        return null;
    }

    if (typeof users.get === 'function') {
        return users.get(nick) || null;
    }

    return users[nick] || users['@' + nick] || users['+' + nick] || null;
}

function userModes(buffer, nick) {
    var user = findUser(buffer, nick);
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
function isChannelName(target) {
    if (typeof target !== 'string') {
        return false;
    }

    var first = target.charAt(0);
    return first === '#' || first === '&' || first === '+' || first === '!';
}

function getUsersCollection(buffer) {
    if (!buffer) {
        return null;
    }

    if (buffer.users) {
        return buffer.users;
    }

    if (typeof buffer.getUsers === 'function') {
        return buffer.getUsers();
    }

    return null;
}

function getUserFromBuffer(buffer, nick) {
    if (!buffer || !nick) {
        return null;
    }

    if (typeof buffer.getUser === 'function') {
        var userFromGetter = buffer.getUser(nick);
        if (userFromGetter) {
            return userFromGetter;
        }
    }

    var users = getUsersCollection(buffer);
    if (!users) {
        return null;
    }

    if (typeof users.get === 'function') {
        return users.get(nick) || null;
    }

    if (users[nick]) {
        return users[nick];
    }

    if (users['@' + nick]) {
        return users['@' + nick];
    }

    if (users['+' + nick]) {
        return users['+' + nick];
    }

    return null;
}

function getUserModes(buffer, nick) {
    var user = getUserFromBuffer(buffer, nick);
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

    return [];
}

function isOperator(buffer, nick) {
    var modes = getUserModes(buffer, nick);
    return modes.indexOf('q') !== -1 || modes.indexOf('a') !== -1 || modes.indexOf('o') !== -1;
}

function canUseRestricted(buffer, nick) {
    if (isOperator(buffer, nick)) {
        return true;
    }

    // Eğer mode bilgisi client'ta yoksa yanlış bloklamamak için izin ver
    return !getUserFromBuffer(buffer, nick);
}

// eslint-disable-next-line no-undef
kiwi.plugin('tombala', function (kiwi) {
    var manager = new TombalaManager({
        drawIntervalMs: config.autoDrawIntervalMs,
        singleWinnerPerStage: config.singleWinnerPerStage,
    });

    var uiStore = new Map();
    kiwi.state.$tombala = uiStore;
    kiwi.state.$tombalaAllowed = config.allowedChannels;

    kiwi.addUi('header_channel', TombalaButton);

    function say(network, channel, text) {
        if (network && network.ircClient && typeof network.ircClient.say === 'function') {
            network.ircClient.say(channel, text);
        }
    }

    function refreshUi(channel, network) {
        var activeNetwork = network || kiwi.state.getActiveNetwork();
        var nick = activeNetwork ? activeNetwork.nick : null;
        if (!channel || !nick) {
            kiwi.emit('plugin-tombala.update-ui');
            return;
        }

        uiStore.set(channel, manager.getUiState(channel, nick));
        kiwi.emit('plugin-tombala.update-ui');
    }

    kiwi.on('plugin-tombala.join', function (payload) {
        var buffer = payload ? payload.buffer : null;
        var network = payload ? payload.network : null;

        if (!buffer || !network || !isChannelName(buffer.name)) {
            return;
        }

        if (config.allowedChannels.indexOf(buffer.name) === -1) {
            return;
        }

        manager.handleMessage({
            channel: buffer.name,
            nick: network.nick,
            message: '!tombala katil',
            isOperator: canUseRestricted(buffer, network.nick),
            reply: function (text) {
                say(network, buffer.name, text);
            },
            announceDraw: function (n) {
                say(network, buffer.name, 'Cekilen sayi: ' + n);
            },
        });

        refreshUi(buffer.name, network);
        kiwi.emit('mediaviewer.show', { component: TombalaPanel });
    });

    kiwi.on('irc.raw.PRIVMSG', function (command, event, network) {
        var target = null;
        var message = null;

        if (event && event.params && event.params.length > 0) {
            target = event.params[0];
            message = event.params[1];
        }

        if (!isChannelName(target) || typeof message !== 'string') {
            return;
        }

        if (config.allowedChannels.indexOf(target) === -1) {
            return;
        }

        var buffer = kiwi.state.getBufferByName(network.id, target);
        var restrictedRequest = /^!tombala\s+(baslat|basla|seed|bitir)(\s|$)/i.test(message);

        var handled = manager.handleMessage({
            channel: target,
            nick: event.nick,
            message: message,
            isOperator: restrictedRequest ? canUseRestricted(buffer, event.nick) : true,
            reply: function (text) {
                say(network, target, text);
            },
            announceDraw: function (n) {
                say(network, target, 'Cekilen sayi: ' + n);
            },
        });

        if (handled) {
            refreshUi(target, network);
        }
    });

    kiwi.state.$watch('ui.active_buffer', function () {
        var buffer = kiwi.state.getActiveBuffer();
        var network = kiwi.state.getActiveNetwork();

        if (!buffer || !network || !isChannelName(buffer.name)) {
            return;
        }

        if (config.allowedChannels.indexOf(buffer.name) === -1) {
            return;
        }

        refreshUi(buffer.name, network);
    return typeof target === 'string' && ['#', '&', '+', '!'].includes(target.charAt(0));
}

function getUserFromBuffer(buffer, nick) {
    if (!buffer || !nick) {
        return null;
    }
    return [];
}

function hasOp(buffer, nick) {
    var modes = userModes(buffer, nick);
    return modes.indexOf('q') !== -1 || modes.indexOf('a') !== -1 || modes.indexOf('o') !== -1;
}

function canUseRestricted(buffer, nick) {
    if (hasOp(buffer, nick)) {
        return true;
    }

    return !findUser(buffer, nick);
}

function say(network, target, text) {
    if (network && network.ircClient && typeof network.ircClient.say === 'function') {
        network.ircClient.say(target, text);
    }
}

// eslint-disable-next-line no-undef
kiwi.plugin('tombala', function (kiwi) {
    var manager = new TombalaManager({
        drawIntervalMs: config.autoDrawIntervalMs,
        singleWinnerPerStage: config.singleWinnerPerStage,
    });

    if (typeof buffer.getUser === 'function') {
        var byGetter = buffer.getUser(nick);
        if (byGetter) {
            return byGetter;
        }
    }

    var users = buffer.users || (typeof buffer.getUsers === 'function' ? buffer.getUsers() : null);
        const u = buffer.getUser(nick);
        if (u) {
            return u;
        }
    }

    const users = buffer.users || (typeof buffer.getUsers === 'function' ? buffer.getUsers() : null);
    if (!users) {
        return null;
    }

    if (typeof users.get === 'function') {
        return users.get(nick) || null;
    }

    return users[nick] || users['@' + nick] || users['+' + nick] || null;
}

function getUserModes(buffer, nick) {
    var user = getUserFromBuffer(buffer, nick);
    return users[nick] || users[`@${nick}`] || users[`+${nick}`] || null;
}

function findUserModes(buffer, nick) {
    const user = getUserFromBuffer(buffer, nick);

function findUserModes(buffer, nick) {
    if (!buffer) {
        return [];
    }

    const users = buffer.users || (typeof buffer.getUsers === 'function' ? buffer.getUsers() : null);
    const user = users && typeof users.get === 'function' ? users.get(nick) : (users ? users[nick] : null);

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

    if (typeof user.modes === 'string') {
        return user.modes.split('');
    }

    if (typeof user.mode === 'string') {
        return user.mode.split('');
    }

    return [];
}

function isOperator(buffer, nick) {
    var modes = getUserModes(buffer, nick);
    return ['q', 'a', 'o'].some(function (mode) {
        return modes.includes(mode);
    });
}

function canUseRestricted(buffer, nick) {
    if (isOperator(buffer, nick)) {
        return true;
    if (Array.isArray(user.mode)) {
        return user.mode;
    }
    return !getUserFromBuffer(buffer, nick);
}

// eslint-disable-next-line no-undef
kiwi.plugin('tombala', function (kiwi) {
    var manager = new TombalaManager({
        drawIntervalMs: config.autoDrawIntervalMs,
        singleWinnerPerStage: config.singleWinnerPerStage,
    });

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
    function updateUi(channel, network) {
        var activeNetwork = network || kiwi.state.getActiveNetwork();
        var nick = activeNetwork ? activeNetwork.nick : null;

        if (channel && nick) {
            uiStore.set(channel, manager.getUiState(channel, nick));
        }

        kiwi.emit('plugin-tombala.update-ui');
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

        manager.handleMessage({
            channel: buffer.name,
            nick: network.nick,
            message: '!tombala katil',
            isOperator: canUseRestricted(buffer, network.nick),
            reply: function (text) {
                say(network, buffer.name, text);
            },
            announceDraw: function (n) {
                say(network, buffer.name, 'Cekilen sayi: ' + n);
            },
        });

        updateUi(buffer.name, network);
    function say(network, channel, text) {
        if (network && network.ircClient && typeof network.ircClient.say === 'function') {
            network.ircClient.say(channel, text);
        }
    }

    function refreshUi(channel, network) {
        var nick = network ? network.nick : ((kiwi.state.getActiveNetwork() || {}).nick);
    return [];
}

function hasKnownUserModes(buffer, nick) {
    return !!getUserFromBuffer(buffer, nick);
}

    return [];
}

function isOperator(buffer, nick) {
    const modes = findUserModes(buffer, nick);
    return ['q', 'a', 'o'].some((mode) => modes.includes(mode));
}

// eslint-disable-next-line no-undef
kiwi.plugin('tombala', (kiwi) => {
    const manager = new TombalaManager({
        drawIntervalMs: config.autoDrawIntervalMs,
        singleWinnerPerStage: config.singleWinnerPerStage,
    });

    const uiStore = new Map();
    kiwi.state.$tombala = uiStore;
    kiwi.state.$tombalaAllowed = config.allowedChannels;

    kiwi.addUi('header_channel', TombalaButton);

    function refreshUi(channel, network) {
        const buffer = kiwi.state.getActiveBuffer();
        const nick = network ? network.nick : (kiwi.state.getActiveNetwork() || {}).nick;
        if (!channel || !nick) {
            kiwi.emit('plugin-tombala.update-ui');
            return;
        }

        uiStore.set(channel, manager.getUiState(channel, nick));
        kiwi.emit('plugin-tombala.update-ui');
    }

    kiwi.on('plugin-tombala.join', function (payload) {
        var buffer = payload && payload.buffer;
        var network = payload && payload.network;

        if (!buffer || !network || !isChannelName(buffer.name)) {
            return;
        }
        if (!config.allowedChannels.includes(buffer.name)) {
            return;
        }

        if (buffer && isChannelName(buffer.name) && buffer.name !== channel) {
            uiStore.set(buffer.name, manager.getUiState(buffer.name, nick));
        }
        kiwi.emit('plugin-tombala.update-ui');
    }

    function say(network, channel, message) {
        if (network && network.ircClient && typeof network.ircClient.say === 'function') {
            network.ircClient.say(channel, message);
        }
    }

    function canRunRestrictedCommand(buffer, nick) {
        if (isOperator(buffer, nick)) {
            return true;
        }

        if (!hasKnownUserModes(buffer, nick)) {
            // mode bilgisini client göremiyorsa false-positive engellemek için bloklamıyoruz
            return true;
        }

        return false;
    }

    kiwi.on('plugin-tombala.join', ({ buffer, network }) => {
        if (!buffer || !network || !isChannelName(buffer.name)) {
            return;
        }

        if (!config.allowedChannels.includes(buffer.name)) {
            return;
        }

        manager.handleMessage({
            channel: buffer.name,
            nick: network.nick,
            message: '!tombala katil',
            isOperator: canUseRestricted(buffer, network.nick),
            reply: function (text) {
                say(network, buffer.name, text);
            },
            announceDraw: function (n) {
                say(network, buffer.name, 'Cekilen sayi: ' + n);
            },
            isOperator: canRunRestrictedCommand(buffer, network.nick),
            reply: (text) => say(network, buffer.name, text),
            announceDraw: (n) => say(network, buffer.name, `🎱 Çekilen sayı: ${n}`),
        });

        refreshUi(buffer.name, network);
        kiwi.emit('mediaviewer.show', { component: TombalaPanel });
    });

    kiwi.on('irc.raw.PRIVMSG', function (command, event, network) {
        var params = event && event.params ? event.params : [];
        var target = params[0];
        var message = params[1];

        if (!isChannelName(target) || typeof message !== 'string') {
            return;
        }
        if (config.allowedChannels.indexOf(target) === -1) {
            return;
        var target = event && event.params ? event.params[0] : null;
        var message = event && event.params ? event.params[1] : null;
    kiwi.on('irc.raw.PRIVMSG', (command, event, network) => {
        const target = event && event.params ? event.params[0] : null;
        const message = event && event.params ? event.params[1] : null;

        say(network, buffer.name, '!tombala katil');

        if (!uiStore.has(buffer.name)) {
            uiStore.set(buffer.name, defaultState());
        }

        updateUi(buffer.name);
        kiwi.emit('mediaviewer.show', { component: TombalaPanel });
    });

    kiwi.on('irc.raw.PRIVMSG', function (command, event, network) {
        var params = event && event.params ? event.params : [];
        var target = params[0];
        var message = params[1];

        if (!isChannelName(target) || typeof message !== 'string') {
            return;
        }
        if (config.allowedChannels.indexOf(target) === -1) {
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

        var state = uiStore.get(target) || defaultState();
        var localNick = network ? network.nick : null;
        var nextState = applyEventToState(state, eventData, localNick);
        recomputeMarks(nextState);
        uiStore.set(target, nextState);
        updateUi(target);
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
        if (!isChannelName(target) || typeof message !== 'string') {
            return;
        }

        if (!config.allowedChannels.includes(target)) {
            return;
        }

        var buffer = kiwi.state.getBufferByName(network.id, target);
        var restrictedRequest = /^!tombala\s+(baslat|basla|seed|bitir)(\s|$)/i.test(message);

        var handled = manager.handleMessage({
            channel: target,
            nick: event.nick,
            message: message,
            isOperator: restrictedRequest ? canUseRestricted(buffer, event.nick) : true,
            reply: function (text) {
                say(network, target, text);
            },
            announceDraw: function (n) {
                say(network, target, 'Cekilen sayi: ' + n);
            },
        });

        if (handled) {
            refreshUi(target, network);
        }
    });

        var buffer = kiwi.state.getBufferByName(network.id, target);
        var restricted = /^!tombala\s+(baslat|basla|seed|bitir)(\s|$)/i.test(message);

        var handled = manager.handleMessage({
            channel: target,
            nick: event.nick,
            message: message,
            isOperator: restricted ? canUseRestricted(buffer, event.nick) : true,
            reply: function (text) {
                say(network, target, text);
            },
            announceDraw: function (n) {
                say(network, target, 'Cekilen sayi: ' + n);
            },
        });

        if (handled) {
            updateUi(target, network);
        }
    });

    kiwi.state.$watch('ui.active_buffer', function () {
        var buffer = kiwi.state.getActiveBuffer();
        var network = kiwi.state.getActiveNetwork();

        if (!buffer || !network || !isChannelName(buffer.name)) {
            return;
        }
        if (config.allowedChannels.indexOf(buffer.name) === -1) {
            return;
        }

        updateUi(buffer.name, network);
    kiwi.state.$watch('ui.active_buffer', function () {
        var buffer = kiwi.state.getActiveBuffer();
        var network = kiwi.state.getActiveNetwork();

        if (!buffer || !network || !isChannelName(buffer.name)) {
            return;
        }
        if (!config.allowedChannels.includes(buffer.name)) {
            return;
        }

        refreshUi(buffer.name, network);
        const buffer = kiwi.state.getBufferByName(network.id, target);
        const restrictedRequest = /^!tombala\s+(baslat|basla|seed|bitir)(\s|$)/i.test(message);
        const handled = manager.handleMessage({
            channel: target,
            nick: event.nick,
            message,
            isOperator: restrictedRequest ? canRunRestrictedCommand(buffer, event.nick) : true,
            reply: (text) => say(network, target, text),
            announceDraw: (n) => say(network, target, `🎱 Çekilen sayı: ${n}`),
        });

    kiwi.on('plugin-tombala.join', ({ buffer, network }) => {
        if (!buffer || !network || !isChannelName(buffer.name)) {
            return;
        }

        if (!config.allowedChannels.includes(buffer.name)) {
            return;
        }

        manager.handleMessage({
            channel: buffer.name,
            nick: network.nick,
            message: '!tombala katil',
            isOperator: isOperator(buffer, network.nick),
            reply: (text) => say(network, buffer.name, text),
            announceDraw: (n) => say(network, buffer.name, `🎱 Çekilen sayı: ${n}`),
        });

        refreshUi(buffer.name, network);
        kiwi.emit('mediaviewer.show', { component: TombalaPanel });
    });

    kiwi.on('irc.raw.PRIVMSG', (command, event, network) => {
        const target = event && event.params ? event.params[0] : null;
        const message = event && event.params ? event.params[1] : null;

        if (!isChannelName(target) || typeof message !== 'string') {
            return;
        }

        if (!config.allowedChannels.includes(target)) {
            return;
        }

        const buffer = kiwi.state.getBufferByName(network.id, target);
        const handled = manager.handleMessage({
            channel: target,
            nick: event.nick,
            message,
            isOperator: isOperator(buffer, event.nick),
            reply: (text) => say(network, target, text),
            announceDraw: (n) => say(network, target, `🎱 Çekilen sayı: ${n}`),
        });

        if (handled) {
            refreshUi(target, network);
        }
    });

    kiwi.state.$watch('ui.active_buffer', () => {
        const buffer = kiwi.state.getActiveBuffer();
        const network = kiwi.state.getActiveNetwork();
        if (!buffer || !network || !isChannelName(buffer.name)) {
            return;
        }

        if (!config.allowedChannels.includes(buffer.name)) {
            return;
        }

        refreshUi(buffer.name, network);
        kiwi.emit('mediaviewer.show', { component: TombalaPanel });
    });
});
