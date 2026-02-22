<template>
    <div id="tombala-panel">
        <div class="status">Oyun durumu: <strong>{{ state.status }}</strong></div>

        <div class="section">
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

        <div class="section">
            <div class="title">Son çekilen sayı: {{ lastDrawnNumber || '-' }}</div>
            <div class="drawn-list">
                Çekilen sayılar: {{ state.drawnNumbers.length ? state.drawnNumbers.join(', ') : '-' }}
            </div>
        </div>

        <div class="section">
            <div class="title">Kazananlar</div>
            <ul>
                <li>Çinko 1: {{ winnerText(state.winners.cinko1) }}</li>
                <li>Çinko 2: {{ winnerText(state.winners.cinko2) }}</li>
                <li>Tombala: {{ winnerText(state.winners.tombala) }}</li>
            </ul>
        </div>
    </div>
</template>

<script>
/* global kiwi:true */

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
            let buffer = kiwi.state.getActiveBuffer();
            return kiwi.state.$tombala.get(buffer.name);
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
            return this.state.markedNumbers.includes(number);
        },
        winnerText(winners) {
            return winners && winners.length ? winners.join(', ') : '-';
        },
    },
};
</script>

<style>
#tombala-panel {
    padding: 8px;
    text-align: left;
}

#tombala-panel .status {
    margin-bottom: 8px;
}

#tombala-panel .section {
    margin-bottom: 10px;
}

#tombala-panel .title {
    font-weight: bold;
    margin-bottom: 4px;
}

#tombala-panel .card {
    border-collapse: collapse;
}

#tombala-panel .card td {
    width: 34px;
    height: 34px;
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
</style>
