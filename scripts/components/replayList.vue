<template>
    <div class="replay-list">
        <div class="replay-list-container">
            <replay-filters
                :existing-tags="existingTags"
                :filters="filters"
                @update-data="filters = $event"
                @update-api-query="updateApiQuery($event)"
            ></replay-filters>
            <replay-page-selector
                :total-replay-count="replays.length"
                :page-data="pageData"
                @update-data="pageData = $event"
            ></replay-page-selector>
            <status-bar :updating="updating">
                <span
                    v-for="text in statusBarTexts"
                    :key="text"
                    class="status-text"
                >{{ text }}</span>
            </status-bar>
            <div
                v-if="currentPageReplays.length === 0"
                class="empty-list-information"
            >
                <span>{{ emptyListText }}</span>
            </div>
            <replay-item
                v-for="id in currentPageReplays"
                :key="id"
                :replay-id="id"
            ></replay-item>
        </div>
        <replay-uploader
            :existing-tags="existingTags"
            :show-tournament-hints="filters.mode === 'tournamentsOnly'"
            @replay-uploaded="fetchList"
            class="replay-uploader"
        ></replay-uploader>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
import { TranslateResult } from 'vue-i18n';
import { isString } from '../utils';
import { firstString, InputQueryValue, InputQuery } from '../routerUtils';
import { apiUrl } from '../commonConfig';
import ReplayFilters, {
    fromQuery as filtersFromQuery,
    toQuery as filtersToQuery
} from './replayFilters.vue';
import ReplayPageSelector, {
    fromQuery as pageDataFromQuery,
    toQuery as pageDataToQuery
} from './pageSelector.vue';
import ReplayItem from './replayItem.vue';
import ReplayUploader from './replayUploader.vue';
import StatusBar from './statusBar.vue';

export default Vue.extend({
    components: {
        'replay-filters': ReplayFilters,
        'replay-page-selector': ReplayPageSelector,
        'replay-item': ReplayItem,
        'replay-uploader': ReplayUploader,
        'status-bar': StatusBar
    },
    data: () => ({
        apiQueries: Object.create(null) as Record<string, string>,
        fetches: [] as number[],
        lastUpdate: null as number | null,
        replays: [] as number[],
        displayedCurrentTime: Date.now()
    }),
    props: {
        existingTags: Array as () => string[]
    },
    computed: {
        updating(): boolean {
            return this.fetches.length > 0;
        },
        filters: {
            get(): any {
                return filtersFromQuery(this.$route.query);
            },
            set(value) {
                this.updateQueries(filtersToQuery(value as any));
            }
        },
        pageData: {
            get(): any {
                return pageDataFromQuery(this.$route.query);
            },
            set(value) {
                this.updateQueries(pageDataToQuery(value as any));
            }
        },
        currentPageReplays(): number[] {
            const begin = this.pageData.pageSize * this.pageData.pageNumber;
            return this.replays.slice(
                begin,
                begin + this.pageData.pageSize
            );
        },
        emptyListText(): TranslateResult {
            if (this.lastUpdate === null) {
                return this.$t('neverUpdated');
            }
            return this.$t('emptyList');
        },
        statusBarTexts(): TranslateResult[] {
            const getLastUpdateText = () => {
                if (this.lastUpdate === null) {
                    return null;
                }

                const secondsAgo = Math.round(
                    (this.displayedCurrentTime - this.lastUpdate) / 1000
                );

                return this.$tc('lastUpdateSecondsAgo', secondsAgo);
            };

            const getReplayCountDescription = () => {
                if (this.updating) {
                    return null;
                }
                if (this.replays.length === 0) {
                    return null;
                }
                const hasExplicitFilters = Object.values(
                    filtersToQuery(this.filters)
                ).some(x => x !== undefined);
                return this.$tc(
                    hasExplicitFilters
                        ? 'matchedReplayCount'
                        : 'totalReplayCount',
                    this.replays.length
                );
            };

            return [
                this.updating ? this.$t('updating') : null,
                getLastUpdateText(),
                getReplayCountDescription()
            ].filter((x): x is TranslateResult => x !== null);
        }
    },
    methods: {
        updateQuery(key: string, value: InputQueryValue) {
            const values: InputQuery = Object.create(null);
            values[key] = value;
            this.updateQueries(values);
        },
        updateQueries(values: InputQuery) {
            const query = Object.assign(
                Object.create(null),
                this.$route.query,
                values
            );

            Object.keys(query).forEach(x => {
                if (query[x] === undefined) {
                    delete query[x];
                }
            });

            this.$router.push({ query });
        },
        updateApiQuery(value: any) {
            const isStringRecord = Object.entries(value)
                .flat()
                .every(isString);
            if (!isStringRecord) {
                throw Error('value is not Record<string, string>');
            }
            this.apiQueries = Object.assign(this.apiQueries, value);
            this.fetchList();
        },
        async fetchList() {
            const queries = Object.entries(this.apiQueries)
                .map(kv => kv.map(encodeURIComponent).join('='))
                .join('&');
            const now = Date.now();
            this.fetches = this.fetches.filter(x => x >= now).concat(now);
            const response = await fetch(
                `${apiUrl}?do=getReplayList&${queries}`
            );
            const replays = (await response.json()).replays;
            if (Array.isArray(replays)) {
                this.replays = replays.map(x => x.id);
                this.fetches = this.fetches.filter(x => x > now);
                this.lastUpdate = Date.now();
            }
        },
        updateDisplayedCurrentTime() {
            this.displayedCurrentTime = Date.now();
        }
    },
    timers: {
        fetchList: {
            autostart: true,
            immediate: true,
            repeat: true,
            time: 17000
        },
        updateDisplayedCurrentTime: {
            autostart: true,
            immediate: true,
            repeat: true,
            time: 1000
        }
    },
    i18n: {
        messages: {
            zh: {
                updating: '正在更新…',
                lastUpdateSecondsAgo: '最后更新：{n}秒前',
                totalReplayCount: '目前节操录像站里总共有{n}场录像',
                matchedReplayCount: '有{n}场符合查询条件的录像',
                neverUpdated: '录像列表还没有被加载出来吧',
                emptyList: '没有找到任何符合查询条件的录像'
            }
        }
    }
});
</script>
<style scoped>
.replay-list {
    position: relative;
    color: #eaeaea;
}

.status-text {
    padding-right: 1em;
}

.empty-list-information {
    width: 100%;
    padding: 3em;
    text-align: center;
    font-size: 200%;
}
</style>