<template>
<div class="replay-item-compact">
    <div class="id-container inline-block">
        <span class="replay-id">
            {{ replayId }}
        </span>
        <span v-if="replay.newVerion != null" class="replay-id">
            -> {{ replay.newVerion }}
        </span>
    </div>

    <div class="replay-minimap img-container inline-block">
        <img :src="mapImagePath" v-on:error="onMapPathFailed"/>
    </div>
    
    <div class="replay-players inline-block">
        <table>
            <tr v-for="(team, i) in nonObserverTeams" :key="i">
                <td v-for="(player, j) in team" :key="j">
                    <div class="replay-player-faction img-container inline-block">
                        <img :src="player.factionIcon" />
                    </div>
                    {{ player.name }}
                </td>
            </tr>
            <tr>
                <td v-for="(obs, i) in observers" :key="i">
                    <div class="replay-player-faction img-container inline-block">
                        <img :src="obs.factionIcon" />
                    </div>
                    {{ obs.name }}
                </td>
            </tr>
        </table>
    </div>

    <div class="replay-information inline-block">
        <div>
            <span v-for="tag in replay.tags" :key="tag" class="replay-tag">
                {{ tag }};
            </span>
            <span class="replay-title">
                {{ title }}
            </span>
            <span class="replay-filesize">
                ({{ (parseInt(replay.fileSize) / 1024).toFixed(2) }} KB)
            </span>
        </div>
        <div>
            <span class="replay-duration">
                {{ duration }}
            </span>
            <span class="replay-date">
                {{ date }}
            </span>
        </div>
    </div>
    <button v-if="replayDescriptionOverflowing" class="replay-show-full" @click="expanded = !expanded">
        ...
    </button>
    <a :href="replay.url" :download="downloadFileName" class="replay-download inline-block">
        下载录像
    </a>
    <div class="replay-description inline-block" v-if="expanded">
        {{ replay.description }}            
    </div>
</div>
</template>
<style scoped>

* {
    box-sizing: border-box;
}

.inline-block {
    display: inline-block;
}

.img-container {
    position: relative;
}

.img-container:after {
  content: "";
  display: block;
  padding-bottom: 100%; /* The padding depends on the width, not on the height, so with a padding-bottom of 100% you will get a square */
}

.img-container img {
  position: absolute; /* Take your picture out of the flow */
  top: 0;
  bottom: 0;
  left: 0;
  right: 0; /* Make the picture taking the size of it's parent */
  width: 100%; /* This if for the object-fit */
  height: 100%; /* This if for the object-fit */
  object-fit: cover; /* Equivalent of the background-size: cover; of a background-image */
  object-position: center;
}

.replay-item-compact {
    position: relative;
    vertical-align: middle;
}

.replay-item-compact .id-container .replay-id {
    float: right;
}

.replay-item-compact .replay-minimap {
    width: 7.5%;
}

.replay-item-compact .replay-players {
    width: 35%;
    overflow: hidden;
}

.replay-item-compact .replay-players .replay-player-faction {
    width: 1.5em;
}

.replay-item-compact .replay-information {
    width: 32.5%;
}

.replay-item-compact .replay-description {
    width: 100%;
    overflow: scroll;
}

.replay-item-compact .replay-show-full {
    width: 7.5%;
}

.replay-item-compact .replay-download {
    width: 12.5%;
}

</style>
<script>
module.exports = {
    data() {
        return {
            replay: {
                tags: [],
                description: '',
                isPartial: '',
                fileName: '',
                fileSize: '',
                mapName: '',
                mapPath: '',
                players: [],
                timeStamp: '',
                url: '',
                totalFrames: null,
                title: null,
                newVerion: null,
            },
            expanded: false
        };
    },
    props: ['replayId', 'defaultMapImagePath', 'mapImageFormat', 'factionIconFormat'],
    mounted() {
        fetch('/replays/replay.php?do=getReplayInformation&id=' + this.replayId)
            .then(response => response.json())
            .then(parsed => {
                if (parsed) {
                    Object.assign(this.replay, parsed.replay);
                }
            });
    },
    methods: {
        onMapPathFailed() {
            if (this.replay.mapPath != this.defaultMapImagePath) {
                this.replay.mapPath = this.defaultMapImagePath;
            }
        },
        getFactionIcon(faction) {
            try {
                return this.factionIconFormat.replace('*', faction)
            }
            catch (exception) {
                return '';
            }
        },
        padTwoDigits(x) { return x < 10 ? '0' + x.toString() : x.toString(); }
    },
    computed: {
        mapImagePath() {
            if (this.replay.mapPath == this.defaultMapImagePath) {
                return this.defaultMapImagePath;
            }
            if (this.mapImageFormat === undefined) {
                return '';
            }
            return this.mapImageFormat.replace('*', this.replay.mapPath);
        },
        nonObserverTeams() {
            return this.replay.players.map(team => 
                team
                .filter(player => (![1, 3].includes(player.faction)))
                .map(player => {
                    return {
                        name: player.name,
                        factionIcon: this.getFactionIcon(player.faction),
                    };
                })
            )
            .filter(team => team.length > 0);
        },
        observers() {
            return this.replay.players
            .map(team => 
                team
                .filter(player => [1, 3].includes(player.faction))
            )
            .filter(team => team.length > 0)
            .map(team => { 
                return {
                    name: team[0].name,
                    factionIcon: this.getFactionIcon(team[0].faction)
                }; 
            });
        },
        title() {
            return this.replay.title || this.replay.fileName;
        },
        duration() {
            if(this.replay.totalFrames) {
                const totalSeconds = Math.floor(this.replay.totalFrames / 15);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                
                return this.padTwoDigits(minutes) + ':' + this.padTwoDigits(seconds);
            }
            return "??:??";
        },
        date() {
            const date = new Date(this.replay.timeStamp * 1000);
            const dateMethods = ['getFullYear', 'getMonth', 'getDate'];
            const dateString = dateMethods
            .map((method, i) => this.padTwoDigits(date[method]() + (i == 1)))
            .join('-');

            const timeMethods = ['getHours', 'getMinutes'];
            const timeString = timeMethods
            .map(method => this.padTwoDigits(date[method]()))
            .join(':');

            return dateString + ' ' + timeString;
        },
        replayDescriptionOverflowing() {
            return true; // TODO 
        },
        downloadFileName() {
            return this.replay.fileName;
        }
    },
}
</script>