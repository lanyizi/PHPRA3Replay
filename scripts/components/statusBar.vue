<template>
    <div
        class="status-bar"
        :class="classes"
    >
        <slot></slot>
    </div>
</template>
<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
    props: {
        updating: Boolean,
        error: Boolean
    },
    computed: {
        classes(): Record<string, boolean> {
            return {
                'status-bar-updating': this.updating,
                'status-bar-error': this.error
            }
        }
    }
})
</script>
<style scoped>

@keyframes Updating {
    0% {
        opacity: 0;
    }

    50% {
        opacity: 1;
    }

    100% {
        opacity: 0;
    }
}

.status-bar {
    padding: 0.5em;
    position: relative;
    z-index: 1;
}

.status-bar-updating::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background: darkslategray;
    background: linear-gradient(90deg, darkslategray, transparent);
    animation: Updating 0.75s linear;
    animation-iteration-count: infinite;
    z-index: -1;
}

.status-bar.status-bar-error {
    background: darkred;
    background: linear-gradient(90deg, darkred, transparent);
}
</style>