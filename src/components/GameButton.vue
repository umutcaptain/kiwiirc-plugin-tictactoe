<template>
    <div><div v-if="showButton" @click="buttonClicked">
        <a>Tombala Kartı Al</a>
    </div></div>
</template>

<script>
/* global kiwi:true */

import * as Utils from '../libs/Utils.js';

export default {
    data() {
        return { count: 0 };
    },
    computed: {
        showButton() {
            // the count = count is to force the button to update when first game is created
            // eslint-disable-next-line no-unused-expressions
            this.count;

            /* eslint-disable no-undef */
            let buffer = kiwi.state.getActiveBuffer();
            let network = kiwi.state.getActiveNetwork();
            /* eslint-enable no-undef */

            if (!buffer || !network) {
                return false;
            }

            if (!Utils.isAllowedChannel(buffer.name)) {
                return false;
            }

            // If there is no game show the button
            let game = Utils.getGame(buffer.name);
            if (!game) {
                return true;
            }

            return !game.getCard();
        },
    },
    mounted() {
        this.listen(kiwi, 'plugin-tombola.update-button', () => {
            this.forceUpdateUI();
        });
    },
    methods: {
        forceUpdateUI() {
            this.count++;
        },
        buttonClicked() {
            // eslint-disable-next-line no-undef
            let buffer = kiwi.state.getActiveBuffer();
            let network = buffer.getNetwork();

            if (!Utils.isAllowedChannel(buffer.name)) {
                return;
            }

            if (!Utils.getGame(buffer.name)) {
                Utils.newGame(network, buffer.name, network.nick);
            }
            let game = Utils.getGame(buffer.name);
            if (!game.getCard()) {
                game.setStatusMessage('Kart talebi gönderildi, bekleniyor...');
            } else {
                game.setStatusMessage('Kartınız hazır.');
            }
            Utils.sendData(network, buffer.name, { cmd: 'join', nick: network.nick });
            this.forceUpdateUI();
        },
    },
};
</script>
