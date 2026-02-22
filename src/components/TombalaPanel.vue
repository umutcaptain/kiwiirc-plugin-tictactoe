<template>
    <div id="tombala-panel" v-if="state.hasCard || state.status !== 'idle'">
        <div class="status">Oyun durumu: <strong>{{ state.status }}</strong></div>

        <div class="content-grid">
            <div class="section card-section">
                <div class="title">Kartım</div>
                <table class="card">
                    <tr v-for="(row, rowIndex) in state.card" :key="rowIndex">
                        <td
                            v-for="(cell, cellIndex) in row"
                            :key="cellIndex"
                            :class="{ empty: !cell, marked: isMarked(cell) }"
                        >
                            <span v-if="cell">{{ cell }}</span>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="section side-section">
                <div class="title">Son çekilen sayı: {{ lastDrawnNumber || '-' }}</div>
                <div class="drawn-list">
                    Çekilen sayılar: {{ state.drawnNumbers.length ? state.drawnNumbers.join(', ') : '-' }}
                </div>

                <div class="title winners-title">Kazananlar</div>
                <ul>
                    <li>Çinko 1: {{ winnerText(state.winners.cinko1) }}</li>
                    <li>Çinko 2: {{ winnerText(state.winners.cinko2) }}</li>
                    <li>Tombala: {{ winnerText(state.winners.tombala) }}</li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script>
/* global kiwi:true */

const EMPTY_STATE = {
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

export default {
    data() {
        return {
            forceRefresh: 0,
        };
    },
    computed: {
        state() {
            // eslint-disable-next-line no-unused-expressions
            this.forceRefresh;
            const buffer = kiwi.state.getActiveBuffer();
            if (!buffer || !kiwi.state.$tombala) {
                return EMPTY_STATE;
            }
            return kiwi.state.$tombala.get(buffer.name) || EMPTY_STATE;
        },
        lastDrawnNumber() {
            return this.state.drawnNumbers[this.state.drawnNumbers.length - 1];
        },
    },
    mounted() {
        this.listen(kiwi, 'plugin-tombala.update-ui', () => {
            this.forceRefresh++;
        });
    },
    methods: {
        isMarked(number) {
            return !!number && this.state.markedNumbers.includes(number);
        },
        winnerText(winners) {
            return winners && winners.length ? winners.join(', ') : '-';
        },
    },
};
</script>

<style>
#tombala-panel {
    padding: 12px;
    text-align: center;
}

#tombala-panel .status {
    margin-bottom: 12px;
}

#tombala-panel .content-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    align-items: start;
}

#tombala-panel .section {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 10px;
    text-align: left;
}

#tombala-panel .title {
    font-weight: bold;
    margin-bottom: 8px;
}

#tombala-panel .winners-title {
    margin-top: 14px;
}

#tombala-panel .card {
    border-collapse: collapse;
    margin: 0 auto;
}

#tombala-panel .card td {
    width: 36px;
    height: 36px;
    border: 1px solid #777;
    text-align: center;
}

#tombala-panel .card td.empty {
    background: #f1f1f1;
}

#tombala-panel .card td.marked {
    background: #8ff58f;
    font-weight: bold;
}

#tombala-panel .drawn-list {
    line-height: 1.5;
    word-break: break-word;
}

@media (max-width: 720px) {
    #tombala-panel .content-grid {
        grid-template-columns: 1fr;
    }
}
</style>
