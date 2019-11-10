<template>
<div class="replay-item-compact">
    <div class="id-container inline-block">
        <span class="replay-id">
            <span class="replay-id-hashtag">
                #
            </span>
            {{ replayId }}
        </span>
        <span v-if="replay.newVersion != null" class="replay-id">
            <span class="replay-id-hashtag">
               → #
            </span>
            {{ replay.newVersion }}
        </span>
    </div>

    <div class="replay-minimap img-container inline-block">
        <img :src="mapImagePath" v-on:error="onMapPathFailed"/>
    </div>
    
    <div class="replay-players inline-block">
        <table>
            <tr v-for="(team, i) in nonObserverTeams" :key="i">
                <td class="replay-player" v-for="(player, j) in team" :key="j">
                    <div class="replay-player-faction img-container inline-block">
                        <img :src="player.factionIcon" />
                    </div>
                    {{ player.name }}
                </td>
            </tr>
            <tr>
                <td class="replay-player" v-for="(obs, i) in observers" :key="i">
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
            <!--<span v-for="tag in replay.tags" :key="tag" class="replay-tag">
                {{ tag }};
            </span>-->
            <span class="replay-title">
                {{ title }}
            </span>
        </div>
        <div>
            <span class="replay-uploaddate">
                上传日期 {{ uploadDate }}
            </span>
            <span class="replay-filesize">
                录像大小 {{ (parseInt(replay.fileSize) / 1024).toFixed(2) }} KB
            </span>
            <br />
            <span class="replay-date">
                录像日期 {{ date }}
            </span>
            <span class="replay-duration">
                录像长度 {{ duration }}
            </span>
        </div>
    </div>
    <button v-if="replayDescriptionOverflowing" class="replay-show-full" @click="expanded = !expanded">
        {{ expanded ? '收起' : '显示' }}说明
    </button>
    <a 
        :href="'/replays/replay.php?downloadReplay&id=' + replayId" 
        :download="downloadFileName" 
        @click="replay.downloads += 1"
        class="replay-download inline-block">
        <div class="replay-download-container">
            <div class="replay-download-main">
                下载录像
            </div>
            <div class="replay-download-number-of-downloads">
                已被下载{{ replay.downloads }}次
            </div>
        </div>
    </a>
    <div class="replay-description inline-block" v-if="expanded">
        {{ replay.description }} <br/>
        地图名称：{{ replay.mapName }} <br/>
        玩家列表：{{ replay.players.map(team => team.map(player => player.name).join(', ')).join(' vs ') }}<br/>
        录像是{{ replaySaver }}保存的
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

.img-container::after {
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
    align-items: center;
    flex-wrap: wrap;
    font-family: 'Microsoft YaHei', Arial, Helvetica, sans-serif;
}

.replay-item-compact .id-container {
    width: 5%;
    padding-right: 1em;
}

.replay-item-compact .id-container .replay-id {
    float: right;
}

.replay-item-compact .id-container .replay-id .replay-id-hashtag {
    vertical-align: baseline;
    font-size: 70%;
    color: #404040;
}

.replay-item-compact .replay-minimap {
    width: 7.5%;
}

.replay-item-compact .replay-players {
    width: 32.5%;
    padding-left: 1em;
}

.replay-item-compact .replay-players table {
    width: 100%;
    table-layout: fixed;
}

.replay-item-compact .replay-players .replay-player {
    overflow: hidden;
    white-space: nowrap;
    font-size: 90%;
}

.replay-item-compact .replay-players .replay-player-faction {
    width: 1.7em;
    vertical-align: middle;
}

.replay-item-compact .replay-players .replay-player-faction::after {
    padding-bottom: 60%;
}

.replay-item-compact .replay-information {
    width: 35%;
}

.replay-item-compact .replay-information .replay-title {
    font-weight: bold;
}

.replay-item-compact .replay-information .replay-uploaddate,
.replay-item-compact .replay-information .replay-filesize,
.replay-item-compact .replay-information .replay-date,
.replay-item-compact .replay-information .replay-duration {
    font-size: 85%;
    color: #404040;
    padding-right: 1em;
}

.replay-item-compact .replay-description {
    width: 100%;
    padding-left: 5%;
}

.replay-item-compact .replay-show-full {
    width: 10%;
}

.replay-item-compact .replay-download {
    width: 10%;
    text-align: center;
}

.replay-item-compact .replay-download .replay-download-container {
    position:  relative;
    background: darkslategrey;
    padding: 1em 0;
}

.replay-item-compact .replay-download .replay-download-container:hover {
    background: rgb(54, 114, 114);
}

.replay-item-compact .replay-download .replay-download-container .replay-download-main {
    color: white;
    padding-top: 0.5em;
}

.replay-item-compact .replay-download .replay-download-container .replay-download-number-of-downloads {
    color: grey;
    font-size: 70%;
    padding-bottom: 0.2em;
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
                newVersion: null,
            },
            expanded: false
        };
    },
    props: ['replayId', 'defaultMapImagePath', 'mapImageFormat', 'factionIconFormat'],
    mounted() {
        this.fetchData(this.replayId);
    },
    methods: {
        fetchData(replayId) {
            fetch('/replays/replay.php?do=getReplayInformation&id=' + replayId)
            .then(response => response.json())
            .then(parsed => {
                if (parsed) {
                    Object.assign(this.replay, parsed.replay);
                }
            });
        },
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
        padTwoDigits(x) { return x < 10 ? '0' + x.toString() : x.toString(); },
        getDateString(timeStamp) {
            const date = new Date(timeStamp * 1000);
            const dateMethods = ['getFullYear', 'getMonth', 'getDate'];
            const dateString = dateMethods
            .map((method, i) => this.padTwoDigits(date[method]() + (i == 1)))
            .join('-');

            const timeMethods = ['getHours', 'getMinutes'];
            const timeString = timeMethods
            .map(method => this.padTwoDigits(date[method]()))
            .join(':');

            return dateString + ' ' + timeString;
        }
    },
    watch: {
        replayId(newValue, oldValue) {
            if(newValue != oldValue) {
                this.fetchData(newValue);
            }
        }
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
            return this.getDateString(this.replay.timeStamp);
        },
        uploadDate() {
            if(!this.replay.uploadDate) {
                return '大概是2019-11-10之前吧';
            }
            return this.getDateString(this.replay.uploadDate);
        },
        replayDescriptionOverflowing() {
            return true; // TODO 
        },
        downloadFileName() {
            return this.replay.fileName;
        },
        replaySaver() {
            const saverContainer = this.replay.players
            .map(team => team.filter(player => player.isSaver).map(player => player.name))
            .filter(team => team.length > 0);
            
            if(saverContainer.length == 1 && saverContainer[0].length == 1) {
                return saverContainer[0][0];
            }

            return '未知玩家';
        }
    },
}
</script>