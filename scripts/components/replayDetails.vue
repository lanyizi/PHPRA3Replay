<template>
    <div class="replay-details">
        <replay-item
            :replay-id="replayId"
            display-mode="no-details-button"
            @replay-fetched="Object.assign(replay, $event)"
        ></replay-item>
        <div class="replay-description-container">
            <i18n path="mapName" tag="p" class="map-name-container">
                <template #name>
                    <span class="map-name">{{ replay.mapName }}</span>
                </template>
            </i18n>
            <p class="replay-saver">
                {{ replaySaver }}
                <span
                    class="hint replay-saver-hint"
                >{{ $t('replaySaverHint') }}</span>
            </p>
            <p class="number-of-replies">
                {{ $tc('numberOfReplies', 0) }}
                <span
                    class="hint number-of-replies-hint"
                >{{ $t('repliesNotImplementedHint') }}</span>
                <span
                    class="hint number-of-replies-hint-2"
                >{{ $t('repliesNotImplementedHint2') }}</span>
            </p>
            <p
                v-if="replay.description"
                class="replay-description"
            >{{ replay.description }}</p>
        </div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
import { TranslateResult } from 'vue-i18n';
import ReplayItem, { emptyReplayData } from './replayItem.vue';

export default Vue.extend({
    components: {
        'replay-item': ReplayItem
    },
    data: () => ({
        replay: emptyReplayData()
    }),
    props: {
        replayId: String
    },
    computed: {
        replaySaver(): TranslateResult {
            const saver = this.replay.players.flat().find(x => x.isSaver);
            if (saver !== undefined) {
                return this.$t('replaySaver', saver);
            }

            return this.$t('noReplaySaver');
        }
    },
    i18n: {
        messages: {
            zh: {
                mapName: '地图名称：{name}',
                replaySaver: '这个录像文件是由{name}保存的',
                replaySaverHint: '至于是谁把它传上来的那就不知道了',
                noReplaySaver: '不知道是谁保存的录像',
                numberOfReplies: '这个录像共有{n}条回复',
                repliesNotImplementedHint: '因为回复功能还根本没有做出来',
                repliesNotImplementedHint2:
                    '（就连圣诞帽怪人也不知道回复功能什么时候才能做出来）'
            }
        }
    }
});
</script>
<style>
.replay-description-container {
    min-width: 1024px;
    width: 80%;
    margin: 0 auto;
    padding: 1.5em 2em;
    margin-top: -2em;
    padding-top: 2.5em;
    background: #151515;
    color: #e0e0e0;
    border-left: 1px solid #404040;
    border-right: 1px solid #404040;
}

.replay-description-container p {
    padding-bottom: 0.5em;
}

.hint {
    margin-left: 0.5em;
}

.map-name-container,
.replay-saver,
.number-of-replies {
    font-size: 90%;
    vertical-align: middle;
}

.map-name {
    font-weight: bold;
}

.replay-saver-hint,
.number-of-replies-hint,
.number-of-replies-hint-2 {
    color: #808080;
}

.number-of-replies-hint-2 {
    font-size: 80%;
}

.replay-description {
    padding-top: 1em;
}
</style>