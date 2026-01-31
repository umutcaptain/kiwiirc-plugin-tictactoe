<template>
    <div id="tombola">
        <div class="header">
            <div class="title">Tombala</div>
            <div class="status" v-if="game.getStatusMessage()">{{ game.getStatusMessage() }}</div>
            <div class="last-draw" v-if="game.getLastDraw()">
                Son çekilen sayı: {{ game.getLastDraw() }}
            </div>
        </div>
        <div class="card" v-if="card">
            <div class="row" v-for="(row, rowIndex) in card" :key="rowIndex">
                <div
                    v-for="(cell, cellIndex) in row"
                    :key="cellIndex"
                    :class="['cell', isDrawn(cell) ? 'drawn' : '']"
                >
                    {{ cell }}
                </div>
            </div>
        </div>
        <div class="empty" v-else>
            Kart bekleniyor...
        </div>
        <div class="draws" v-if="game.getDraws().length">
            <div class="draws-title">Çekilen Sayılar</div>
            <div class="draws-list">
                <span v-for="draw in game.getDraws()" :key="draw.id">{{ draw.number }}</span>
            </div>
        </div>
    </div>
</template>

<script>
import * as Utils from '../libs/Utils.js';

export default {
    computed: {
        game() {
            // eslint-disable-next-line no-undef
            const buffer = kiwi.state.getActiveBuffer();
            return Utils.getGame(buffer.name);
        },
        card() {
            const game = this.game;
            return game ? game.getCard() : null;
        },
    },
    methods: {
        isDrawn(value) {
            const game = this.game;
            if (!game || !value) {
                return false;
            }
            return game.getDraws().some((draw) => draw.number === value);
        },
    },
};
</script>

<style>
#tombola {
    position: relative;
    display: block;
    width: 100%;
    padding: 12px 0;
    text-align: center;
}

#tombola .header {
    margin-bottom: 12px;
}

#tombola .title {
    font-size: 1.3em;
    font-weight: bold;
}

#tombola .status {
    margin-top: 6px;
    font-weight: bold;
    color: var(--brand-primary);
}

#tombola .last-draw {
    margin-top: 6px;
    font-size: 1.1em;
}

#tombola .card {
    display: inline-flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px;
    border: 2px solid var(--brand-default-fg);
    border-radius: 8px;
}

#tombola .row {
    display: grid;
    grid-template-columns: repeat(5, 48px);
    gap: 6px;
}

#tombola .cell {
    width: 48px;
    height: 48px;
    line-height: 48px;
    font-weight: bold;
    border-radius: 6px;
    border: 1px solid var(--brand-default-fg);
    background: var(--brand-default-bg);
}

#tombola .cell.drawn {
    background: #6bff5e;
}

#tombola .empty {
    font-style: italic;
    padding: 12px 0;
}

#tombola .draws {
    margin-top: 12px;
}

#tombola .draws-title {
    font-weight: bold;
    margin-bottom: 6px;
}

#tombola .draws-list span {
    display: inline-block;
    margin: 0 4px 4px 0;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--brand-default-fg);
}
</style>
