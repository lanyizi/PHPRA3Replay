<template>
    <table :class="displayClasses" class="replay-item-compact">
        <tr>
            <td class="replay-id">
                <div class="replay-id-box">
                    <div>
                        <span class="replay-id-hashtag">#</span>
                        {{ replayId }}
                    </div>
                    <div v-if="replay.newVersion != null">
                        <span class="replay-id-hashtag">#</span>
                        {{ replay.newVersion }}
                    </div>
                </div>
            </td>
            <td class="replay-minimap">
                <div class="replay-minimap-container">
                    <img :src="mapImagePath" @error="onMapPathFailed" />
                </div>
            </td>
            <td class="replay-players">
                <div
                    v-for="(team, i) in nonObserverTeams"
                    :key="i"
                    :class="{ 'replay-not-first-team': i !== 0 }"
                    class="replay-team"
                >
                    <div
                        v-for="(player, j) in team"
                        :key="j"
                        class="replay-player"
                    >
                        <img
                            :src="player.factionIcon"
                            class="replay-player-faction"
                        />
                        {{ player.name }}
                    </div>
                </div>
                <div v-if="observers.length > 0" class="replay-observers">
                    <div
                        v-for="(obs, i) in observers"
                        :key="i"
                        class="replay-player"
                    >
                        <img
                            :src="obs.factionIcon"
                            class="replay-player-faction"
                        />
                        {{ obs.name }}
                    </div>
                </div>
            </td>
            <td class="replay-information">
                <div class="replay-information-box">
                    <span class="replay-title">{{ title }}</span>
                    <table>
                        <tr v-for="(row, i) in replayInformation" :key="i">
                            <td
                                v-for="data in row"
                                :key="data.text"
                                :class="data.type"
                            >
                                <span>{{ data.text }}</span>
                            </td>
                        </tr>
                    </table>
                    <div class="replay-tags">
                        <router-link
                            v-for="(tag, i) in replay.tags"
                            :key="tag"
                            :to="{ path: '/', query: tagsToQuery[i] }"
                            class="replay-tag"
                        >
                            <div>{{ tag }}</div>
                        </router-link>
                    </div>
                </div>
            </td>
            <td class="replay-details-button">
                <a
                    @click="$emit('replay-details', replayId)"
                    class="replay-button"
                >
                    <div>{{ $t('viewDetails') }}</div>
                    <div>{{ $tc('numberOfReplies', 0) }}</div>
                </a>
            </td>
            <td class="replay-download-button">
                <a
                    :href="replay.url"
                    :download="downloadFileName"
                    @click="updateDownloads"
                    class="replay-button"
                >
                    <div>{{ $t('download') }}</div>
                    <div>{{ numberOfDownloadsText }}</div>
                </a>
            </td>
        </tr>
    </table>
</template>
<script lang="ts">
import Vue from 'vue';
import { apiUrl, replaySettings } from '../commonConfig';
import { toQuery as filtersToQuery } from './replayFilters.vue';

interface PlayerWithFactionIcon {
    name: string;
    factionIcon: string;
}

interface ReplayInfoEntry {
    text: string;
    type: 'replay-info-header' | 'replay-info-data';
}

interface Player {
    name: string;
    faction: number;
    isSaver: boolean;
    factionIcon?: string;
}

export const emptyReplayData = () => ({
    description: '',
    isPartial: '',
    fileName: '',
    fileSize: '',
    mapName: '',
    mapPath: '',
    timeStamp: '',
    uploadDate: '',
    downloads: '',
    players: [] as Player[][],
    totalFrames: null as string | null,
    title: null as string | null,
    newVersion: null as string | null,
    url: '',
    tags: [] as string[]
});

export type Replay = ReturnType<typeof emptyReplayData>;

export default Vue.extend({
    data: () => ({
        ...replaySettings,
        localReplay: emptyReplayData(),
        minimapFailed: false
    }),
    props: {
        replayId: String,
        replayData: Object,
        displayMode: String
    },
    computed: {
        replay(): Replay {
            return { ...this.localReplay, ...(this.replayData || {}) };
        },
        displayClasses(): string[] {
            const mode = this.displayMode;
            switch (mode) {
                case 'succinct':
                    return [mode];
                case 'no-details-button':
                case 'no-download-button':
                    return ['one-button-only', mode];
            }
            return [];
        },
        mapImagePath(): string {
            const useDefaultMap =
                this.minimapFailed ||
                this.replay.mapPath === this.defaultMapImagePath ||
                !this.mapImageFormat ||
                !this.replay.mapPath;

            if (useDefaultMap) {
                return this.defaultMapImagePath;
            }

            return (
                this.mapImageFormat.replace('*', this.replay.mapPath) ||
                this.defaultMapImagePath
            );
        },
        nonObserverTeams(): PlayerWithFactionIcon[][] {
            const teams = this.replay.players.map(team => {
                return team
                    .filter(player => ![1, 3].includes(player.faction))
                    .map(player => {
                        return {
                            name: player.name,
                            factionIcon: this.getFactionIcon(player.faction)
                        };
                    });
            });
            return teams.filter(team => team.length > 0);
        },
        observers(): PlayerWithFactionIcon[] {
            return this.replay.players
                .map(team =>
                    team.filter(player => [1, 3].includes(player.faction))
                )
                .filter(team => team.length > 0)
                .map(team => {
                    return {
                        name: team[0].name,
                        factionIcon: this.getFactionIcon(team[0].faction)
                    };
                });
        },
        title(): string {
            return (
                this.replay.title ||
                this.replay.fileName ||
                this.$t('loadingTitle').toString()
            );
        },
        replayInformation(): ReplayInfoEntry[][] {
            const t = (x: string) => this.$t(x).toString();

            const n = (x: number, args?: Intl.NumberFormatOptions) => {
                const fallback = `${Math.round(x)}`;
                try {
                    // https://github.com/kazupon/vue-i18n/issues/749
                    const s = this.$n(x, args as Record<string, string>);
                    return s || fallback;
                } catch {}
                return fallback;
            };

            const fromUnixTime = (x: keyof Replay) => {
                try {
                    const value = this.replay[x];
                    const number = parseInt(value + '');
                    const date = new Date(number * 1000);
                    if (isNaN(date.getTime())) {
                        return '?';
                    }
                    try {
                        return this.$d(date, 'dateTime');
                    } catch {
                        const day = [
                            date.getFullYear(),
                            date.getMonth() + 1,
                            date.getDate()
                        ].join('-');

                        const time = [
                            date.getHours(),
                            date.getMinutes()
                        ].join(':');

                        return `${day} ${time}`;
                    }
                } catch {}
                return '?';
            };

            const uploadDate = !this.replay.uploadDate
                ? t('notUploadedYet')
                : this.replay.uploadDate === '0'
                ? t('noUploadDate')
                : fromUnixTime('uploadDate');

            const fileSize =
                n(parseInt(this.replay.fileSize) / 1024, {
                    maximumSignificantDigits: 4,
                    useGrouping: false
                }) + 'KB';

            const replayDate = fromUnixTime('timeStamp');

            const getDuration = () => {
                if (!this.replay.totalFrames) {
                    return '??:??';
                }

                const totalSeconds = Math.floor(
                    parseInt(this.replay.totalFrames) / 15
                );
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;

                return [minutes, seconds]
                    .map(x => (x < 10 ? `0${x}` : `${x}`))
                    .join(':');
            };

            const getTitle = (headerId: string) => ({
                text: t(headerId),
                type: 'replay-info-header' as const
            });

            const asData = (x: string) => ({
                text: x,
                type: 'replay-info-data' as const
            });

            return [
                [
                    getTitle('uploadDate'),
                    asData(uploadDate),
                    getTitle('fileSize'),
                    asData(fileSize)
                ],
                [
                    getTitle('replayDate'),
                    asData(replayDate),
                    getTitle('replayDuration'),
                    asData(getDuration())
                ]
            ];
        },
        tagsToQuery(): ReturnType<typeof filtersToQuery>[] {
            return this.replay.tags.map(tag => {
                return filtersToQuery({
                    includes: [tag],
                    excludes: [],
                    sorts: [],
                    mode: 'allReplays'
                });
            });
        },
        numberOfDownloadsText(): string {
            return this.$tc(
                'numberOfDownloads',
                parseInt(this.replay.downloads)
            );
        },
        downloadFileName(): string {
            return this.replay.fileName;
        }
    },
    methods: {
        async fetchData() {
            if (!this.replayId) {
                return;
            }
            const response = await fetch(
                `${apiUrl}?do=getReplayInformation&id=${this.replayId}`
            );
            const parsed = await response.json();
            if (parsed) {
                try {
                    Object.assign(this.localReplay, parsed.replay);
                    this.$emit('replay-fetched', { ...this.localReplay });
                } catch {}
            }
        },
        onMapPathFailed() {
            if (this.minimapFailed !== true) {
                this.minimapFailed = true;
            }
        },
        getFactionIcon(id: number) {
            try {
                return this.factionIconFormat.replace('*', id.toString());
            } catch (exception) {
                return '';
            }
        },
        updateDownloads() {
            fetch(`${apiUrl}?do=updateDownloadCounter&id=${this.replayId}`);
            this.replay.downloads = (
                parseInt(this.replay.downloads) + 1
            ).toString();
        }
    },
    watch: {
        replayId(newValue, oldValue) {
            if (newValue !== oldValue) {
                this.fetchData();
            }
        }
    },
    i18n: {
        messages: {
            zh: {
                loadingTitle: '正在加载某个神秘录像...',
                uploadDate: '上传日期',
                noUploadDate: '大概是2019/11/10之前吧',
                notUploadedYet: '也许就是几秒钟后呢？',
                fileSize: '文件大小',
                replayDate: '录像日期',
                replayDuration: '录像时长',
                viewDetails: '详细信息',
                numberOfReplies: '{n}条回复',
                download: '下载录像',
                numberOfDownloads: '已被下载{n}次'
            }
        },
        dateTimeFormats: {
            zh: {
                dateTime: {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }
            }
        }
    },
    mounted() {
        this.fetchData();
    }
});
</script>
<style scoped>
.replay-item-compact {
    position: relative;
    width: 100%;
    color: lightgray;
    overflow: hidden;
    margin-top: 1%;
    margin-bottom: 1%;
    table-layout: fixed;
    z-index: 1;
}

td {
    vertical-align: middle;
}

.replay-id {
    width: 7.5%;
}

.replay-minimap {
    width: 10%;
}

.replay-players {
    width: 20%;
    padding-left: 1%;
    background: #303030;
    color: #eaeaea;
}

.replay-information {
    width: 40%;
}

.replay-details-button,
.replay-download-button {
    width: 11.25%;
    padding-right: 1%;
}

.replay-id-box div {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 12.5%;
    font-weight: bold;
}

.replay-id-hashtag {
    font-size: 80%;
    font-weight: normal;
}

.replay-minimap-container {
    position: relative;
}

.replay-minimap-container::after {
    content: '';
    display: block;
    padding-bottom: 100%;
}

.replay-minimap-container img {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
    background: black;
}

/*.replay-team:not(:first-child)::before, <- does not work on IE */
.replay-not-first-team::before,
.replay-observers::before {
    content: '';
    display: block;
    margin-top: 0.1em;
    margin-bottom: 0.1em;
    width: 100%;
    height: 1px;
    background: white;
    background: linear-gradient(90deg, lightgray, transparent);
}

.replay-player {
    overflow: hidden;
    white-space: nowrap;
    display: flex;
    align-items: center;
    padding: 1.5%;
}

.replay-player-faction {
    height: 1em;
    width: 1.7em;
    object-fit: cover;
    object-position: center;
    margin-right: 0.25em;
    background: black;
}

.replay-information-box {
    padding-left: 5%;
    padding-right: 2.5%;
    position: relative;
    line-height: 125%;
}

.replay-information-box .replay-title {
    font-size: inherit;
    font-weight: bold;
    color: #e4e4e4;
    line-height: 150%;
}

.replay-information-box table {
    border-collapse: separate;
    border-spacing: 1ch 0;
}

.replay-information-box td {
    font-size: 80%;
}

.replay-tags {
    padding-top: 1%;
    padding-left: 1ch;
}

.replay-tag {
    display: inline-block;
    padding-left: 1%;
    padding-right: 1%;
    color: white;
    font-size: 80%;
    text-decoration: none;
    background: darkslategray;
}

.replay-tag:hover {
    background: slategray;
}

.replay-information-box::after {
    content: '';
    position: absolute;
    background: #202020;
    top: -10%;
    left: -5000%;
    width: 10000%;
    left: -100vw;
    width: 200vw;
    height: 120%;
    z-index: -1;
}

.replay-button {
    display: block;
    text-align: center;
    background: darkslategray;
    text-decoration: none;
    color: inherit;
    padding: 0.5em;
}

.replay-button:hover {
    background: #30aaaa;
}

.replay-button div:first-child {
    color: white;
    line-height: 150%;
}

.replay-button div:not(:first-child) {
    font-size: 80%;
}
</style>

<!-- Succinct mode styles -->
<style scoped>
.succinct .replay-id {
    display: none;
}

.succinct .replay-minimap {
    width: 15%;
}

.succinct .replay-players {
    width: 30%;
    padding-left: 1%;
}

.succinct .replay-information {
    width: 55%;
}

.succinct .replay-details-button,
.succinct .replay-download-button {
    display: none;
}
</style>

<!-- Single button mode styles -->
<style scoped>
.one-button-only .replay-id {
    width: 7.5%;
}

.one-button-only .replay-minimap {
    width: 10%;
}

.one-button-only .replay-players {
    width: 25.625%;
    padding-left: 1%;
}

.one-button-only .replay-information {
    width: 45.625%;
}

.one-button-only .replay-details-button,
.one-button-only .replay-download-button {
    width: 11.25%;
    padding-right: 1%;
}

.one-button-only .no-details-button .replay-details-button,
.one-button-only .no-download-button .replay-download-button {
    display: none;
}
</style>