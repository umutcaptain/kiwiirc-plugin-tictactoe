<template>
    <div>
        <div v-if="showButton" @click="joinGame">
            <a>Bir tombala kartı al</a>
        </div>
    </div>
</template>

<script>
/* global kiwi:true */

export default {
    data() {
        return { refreshCount: 0 };
    },
    computed: {
        showButton() {
            // eslint-disable-next-line no-unused-expressions
            this.refreshCount;
            let buffer = kiwi.state.getActiveBuffer();
            return buffer && buffer.isChannel();
        },
    },
    mounted() {
        this.listen(kiwi, 'plugin-tombala.update-ui', () => {
            this.refreshCount++;
        });
    },
    methods: {
        joinGame() {
            let buffer = kiwi.state.getActiveBuffer();
            if (!buffer || !buffer.isChannel()) {
                return;
            }
            kiwi.emit('plugin-tombala.join', {
                buffer,
                network: buffer.getNetwork(),
            });
        },
    },
};
</script>
