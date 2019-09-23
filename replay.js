Vue.component('replay', {
    data: function() {
        return {
            replay: {
                description: '',
                isPartial: '',
                fileName: '',
                fileSize: '',
                mapName: '',
                mapPath: '',
                players: [],
                timeStamp: '',
                url: ''
            },
        };
    },
    props: ['replayid', 'defaultmapimagepath', 'mapimageformat', 'factioniconformat'],
    mounted: function () {
        let self = this;
        fetch('/replays/replay.php?do=getReplayInformation&id=' + this.replayid)
            .then(response => { self.replay = response.json() || self.replay; });
    },
    methods: {
        onMapPathFailed: function () {
            if (this.mapImagePath != this.defaultmapimagepath) {
                this.mapImagePath = this.defaultmapimagepath;
            }
        }
    },
    computed: {
        mapImageFormat: function () {
            if (this.mapimageformat === undefined) {
                return '';
            }
            return this.mapimageformat.replace('*', self.replay.mapPath);
        },
        factionIconFormat: function () {
            if (this.factioniconformat === undefined) {
                return '';
            }
            return this.factioniconformat.replace('*', player.faction);
        }
    },
    template: 
    `<div>
        <span class="replay-fileName">
            <a v-if="!!(replay.url)" :href="replay.url" :download="replay.fileName">
                {{ replay.fileName }}
            </a>
            <span v-else>
                正在加载...
            </span>
        </span>
        <span v-if="!!(replay.fileSize)" class="replay-fileSize">
            {{ (parseInt(replay.fileSize) / 1024).toFixed(2) }} KB
        </span>
        <br />
        <table>
            <tr>
                <td class="replay-map-container">
                    <img :src="mapImagePath" v-on:error="onMapPathFailed" />
                    <span class="replay-map-name">
                        {{ replay.mapName }}
                    </span>
                </td>
                <td class="replay-player-teams-container">
                    <ul class="replay-player-team">
                        <li v-for="team in replay.players">
                            <span v-for="player in team" :key="player.name">
                                <img :src="factionIconFormat" />
                                {{ player.name }}
                            </span>
                        </li>
                    </ul>
                </td>
            </tr>
            <tr>
                <td rowspan="2">{{ replay.description }}</td>
            </tr>
        </table>
    </div>`
});

