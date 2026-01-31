function generateCardNumbers() {
    const numbers = Array.from({ length: 90 }, (_, index) => index + 1);
    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    const selected = numbers.slice(0, 15).sort((a, b) => a - b);
    return [
        selected.slice(0, 5),
        selected.slice(5, 10),
        selected.slice(10, 15),
    ];
}

export default class TombolaGame {
    constructor(network, channel, localPlayer, storedCard) {
        // eslint-disable-next-line no-undef
        this.data = new kiwi.Vue({
            data() {
                return {
                    network: network,
                    channel: channel,
                    localPlayer: localPlayer,
                    card: storedCard || null,
                    draws: [],
                    lastDraw: null,
                    statusMessage: '',
                };
            },
        });
    }

    getNetwork() {
        return this.data.network;
    }

    getChannel() {
        return this.data.channel;
    }

    getLocalPlayer() {
        return this.data.localPlayer;
    }

    setLocalPlayer(value) {
        this.data.localPlayer = value;
    }

    getCard() {
        return this.data.card;
    }

    setCard(card) {
        this.data.card = card;
    }

    ensureCard() {
        if (!this.data.card) {
            this.data.card = generateCardNumbers();
        }
        return this.data.card;
    }

    getDraws() {
        return this.data.draws;
    }

    addDraw(draw) {
        if (!this.data.draws.some((entry) => entry.id === draw.id)) {
            this.data.draws.push(draw);
            this.data.lastDraw = draw.number;
        }
    }

    clearDraws() {
        this.data.draws = [];
        this.data.lastDraw = null;
    }

    getLastDraw() {
        return this.data.lastDraw;
    }

    getStatusMessage() {
        return this.data.statusMessage;
    }

    setStatusMessage(message) {
        this.data.statusMessage = message;
    }
}
