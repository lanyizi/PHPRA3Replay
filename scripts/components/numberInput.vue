<template>
    <div :class="classes" class="numeric-input">
        <input
            type="tel"
            :value="displayed"
            v-on:blur="onInput = false"
            v-on:focus="onInput = true"
            v-on:input="$emit('input', parseInt($event.target.value))"
            :disabled="disabled"
        />
        <div class="numeric-input-padding">{{ paddingString }}</div>
        <div class="numeric-input-placeholder">{{ placeholder }}</div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
export default Vue.extend({
    data: () => ({
        onInput: false
    }),
    props: {
        value: Number,
        string: String,
        placeholder: String,
        paddingString: String,
        disabled: Boolean
    },
    computed: {
        classes(): Record<string, boolean> {
            return {
                'numeric-input-use-padding': !!this.paddingString,
                'numeric-input-on-input': this.onInput
            };
        },
        displayed(): string {
            return this.onInput ? `${this.value}` : this.string;
        }
    }
});
</script>
<style scoped>
.numeric-input {
    display: inline-block;
    position: relative;
}

.numeric-input-padding {
    color: transparent;
    font-size: inherit;
    padding: 0.2em 0;
}

input {
    background: transparent;
    z-index: 1;
    font-size: inherit;
    text-align: center;
    padding: 0.2em 0;
}

.numeric-input-use-padding input {
    position: absolute;
    width: 100%;
    height: 100%;
    line-height: inherit;
    vertical-align: inherit;
}

.numeric-input-on-input input {
    text-align: left;
    padding-left: 0.5ch;
}

.numeric-input-placeholder {
    display: none;
}

.numeric-input-on-input .numeric-input-placeholder {
    display: initial;
    color: gray;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding-top: 0.2em;
    padding-bottom: 0.2em;
    padding-right: 0.5ch;
    text-align: right;
    font-size: inherit;
}
</style>