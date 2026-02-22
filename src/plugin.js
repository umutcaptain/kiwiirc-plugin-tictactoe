import config from '../config.json';
import TombalaButton from './components/TombalaButton.vue';
import TombalaPanel from './components/TombalaPanel.vue';
import TombalaManager from './libs/TombalaManager.js';

function isChannelName(target) {
    return typeof target === 'string' && ['#', '&', '+', '!'].includes(target.charAt(0));
}

function getUserFromBuffer(buffer, nick) {
    if (!buffer || !nick) {
        return null;
    }

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
        var target = event && event.params ? event.params[0] : null;
        var message = event && event.params ? event.params[1] : null;
    kiwi.on('irc.raw.PRIVMSG', (command, event, network) => {
        const target = event && event.params ? event.params[0] : null;
        const message = event && event.params ? event.params[1] : null;

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
