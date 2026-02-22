import config from '../config.json';
import TombalaButton from './components/TombalaButton.vue';
import TombalaPanel from './components/TombalaPanel.vue';
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

    var uiStore = new Map();
    kiwi.state.$tombala = uiStore;
    kiwi.state.$tombalaAllowed = config.allowedChannels;

    kiwi.addUi('header_channel', TombalaButton);

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
    });
});
