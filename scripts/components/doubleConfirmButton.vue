<template>
    <span :class="{ pending }" class="double-confirm-button">
        <button
            v-if="pending"
            v-on:click="pending = false"
            :disabled="disabled"
            class="button-confirm"
        >{{ cancel }}</button>
        <button
            @click="onAction"
            :disabled="disabled"
            :class="mainClass"
        >{{ action }}</button>
    </span>
</template>
<script lang="ts">
import Vue from 'vue';
import { TranslateResult } from 'vue-i18n';
export default Vue.extend({
    data: () => ({
        pending: false
    }),
    props: {
        confirmText: String,
        actionText: String,
        cancelText: String,
        mainClass: {
            type: String,
            default: 'button-main'
        },
        disabled: Boolean
    },
    computed: {
        action(): TranslateResult {
            if (this.pending) {
                return this.$t('confirm');
            }
            return this.actionText;
        },
        cancel(): TranslateResult {
            return this.$t('cancel');
        }
    },
    methods: {
        onAction() {
            if (this.pending) {
                this.$emit('click');
            }
            this.pending = !this.pending;
        }
    },
    i18n: {
        messages: {
            zh: {
                confirm: '确认',
                cancel: '取消'
            }
        }
    }
});
</script>