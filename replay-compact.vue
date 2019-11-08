<template>
<div class="replay-item-compact">
    <span class="title-container">
        <span class="placeholder">
        </span>
        <span class="replay-id">
            {{ replayId }}
        </span>
        <span v-if="replay.newVerion != null" class="replay-id">
            -> {{ replay.newVerion }}
        </span>
    </span>

    <div class="replay-minimap img-container inline-block">
        <img :src="mapImagePath" v-on:error="onMapPathFailed"/>
    </div>
    
    <span class="replay-players">
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
                    <img :src="obs.factionIcon" />
                    {{ obs.name }}
                </td>
            </tr>
        </table>
    </span>

    <span class="replay-information">
        <span>
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
        </span>
        <span class="replay-description" :class="{ 'replay-expanded' : expanded }">
            {{ replay.description }}            
        </span>
        <button v-if="replayDescriptionOverflowing" class="replay-show-full" @click="expanded = !expanded">
            ...
        </button>
        <a :href="replay.url" :download="downloadFileName">
            download
        </a>
    </span>
</div>
</template>
<style scoped>

.inline-block {
    display: inline-block;
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
    display: flex;
    flex-direction: row;
    vertical-align: middle;
}

.replay-item-compact .title-container {
    width: 5%;
    display: flex;
}

.replay-item-compact .title-container .placeholder {
    flex: auto;
}

.replay-item-compact .replay-minimap {
    width: 5%;
}

.replay-item-compact .replay-players {
    width: 20%;
}

.replay-item-compact .replay-players .replay-player-faction {
    width: 1.5em;
}

.replay-item-compact .replay-information {
    width: 30%;
}

.replay-item-compact .replay-description {
    flex: auto;
    overflow: hidden;
}

.replay-item-compact .replay-description.replay-expanded {
    overflow: unset;
    display: inline-block;
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
                .filter(player => (![2, 3].includes(player.faction)))
                .map(player => {
                    return {
                        name: player.name,
                        factionIconPath: this.getFactionIcon(player.faction),
                    };
                })
            )
            .filter(team => team.length > 0);
        },
        observers() {
            return this.replay.players
            .map(team => 
                team
                .filter(player => [2, 3].includes(player.faction))
            )
            .filter(team => team.length > 0)
            .map(team => team[0]);
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