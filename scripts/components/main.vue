<template>
    <div class="replays-main">
        <div class="nav-wrapper">
            <nav>
                <span>{{ $t('siteName') }}</span>
                <div
                    v-for="mode in modes"
                    :key="mode.mode"
                    class="mode-link-box"
                    :class="{ 'mode-link-active': mode.isActive }"
                >
                    <router-link :to="mode.to">{{ $t(mode.mode) }}</router-link>
                </div>
            </nav>
        </div>
        <div class="replays-main-content">
            <router-view :existing-tags="existingTags"></router-view>
        </div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
import VueRouter, { Location } from 'vue-router';
import { apiUrl } from '../commonConfig';
import ReplayList from './replayList.vue';
import {
    filterModes,
    normalizeFiltersProp,
    toQuery as modeToQuery
} from './replayFilters.vue';

type RouterLinkParam = {
    mode: string;
    isActive: boolean;
    to: Location;
};

export default Vue.extend({
    data() {
        return {
            existingTags: [] as string[]
        };
    },
    computed: {
        modes(): RouterLinkParam[] {
            const currentMode = normalizeFiltersProp({
                mode: this.$route.query.mode
            }).mode;
            return filterModes.map(mode => ({
                mode,
                isActive: mode === currentMode,
                to: {
                    path: '/',
                    query: modeToQuery({
                        includes: [],
                        excludes: [],
                        sorts: [],
                        mode
                    })
                }
            }));
        }
    },
    methods: {
        async fetchExistingTags() {
            const response = await fetch(`${apiUrl}?do=getTagList`);
            const json = await response.json();
            const tags: { tag: string }[] = json.tags;
            this.existingTags = tags.map(x => x.tag);
        }
    },
    router: new VueRouter({
        routes: [{ path: '/', component: ReplayList }]
    }),
    i18n: {
        messages: {
            zh: {
                siteName: '节操录像站',
                allReplays: '所有录像',
                excludeTournaments: '非比赛录像',
                tournamentsOnly: '比赛录像'
            }
        }
    },
    timers: {
        fetchExistingTags: {
            autostart: true,
            immediate: true,
            repeat: true,
            time: 37000
        }
    }
});
</script>
<style scoped>
* {
    font-family: 'Microsoft YaHei', Arial, Helvetica, sans-serif;
}

.replays-main {
    background: #101010;
    color: white;
}

input,
textarea,
button {
    /* background: inherit; <- does not work very well on IE */
    background: transparent;
    color: inherit;
    border: 1px solid gray;
}

button:hover {
    background: #333333;
}

input:disabled,
textarea:disabled,
button:disabled {
    color: gray;
}

button:disabled:hover {
    /* background: inherit; <- does not work very well on IE */
    background: transparent;
}

.nav-wrapper {
    background: #202020;
}

nav {
    position: relative;
    max-width: 1280px;
    margin: 0 auto;
    font-size: 150%;
    color: #e0e0e0;
    display: flex;
    align-items: center;
}

nav span {
    font-size: 125%;
    padding-left: 1ch;
    padding-right: 1.5ch;
    color: white;
}

nav .mode-link-box {
    display: inline-block;
    padding-left: 1ch;
    padding-right: 1ch;
    height: 100%;
}

nav .mode-link-box.mode-link-active,
nav .mode-link-box:hover {
    background: #181818;
}

nav a {
    display: inline-block;
    color: inherit;
    text-decoration: none;
    padding-top: 0.75em;
    padding-bottom: 0.5em;
    border-bottom: 4px solid darkgray;
}

nav .mode-link-active a {
    color: #fff;
    border-bottom: 4px solid #00bcd4;
}

.replays-main-content {
    padding: 1%;
    max-width: 1280px;
    margin: 0 auto;
}
</style>