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
        mapImagePath: function () {
            if (this.mapimageformat === undefined) {
                return '';
            }
            return this.mapimageformat.replace('*', this.replay.mapPath);
        },
        playersWithFactionIcon: function () {
            return this.players.map(team => {
                return team.map(player => {
                    let computeFactionIcon = (faction) => {
                        try {
                            return this.factioniconformat.replace('*', faction)
                        }
                        catch (exception) {
                            return '';
                        }
                    };
                    return {
                        name: player.name,
                        factionIconPath: computeFactionIcon(player.faction),
                    };
                });
            });
        }
    },
    template: 
    `<div>
        <span class="replay-fileName">
            {{ replayid }}&nbsp;-&nbsp;
            <a v-if="!!(replay.url)" :href="replay.url" :download="replay.fileName">
                {{ replay.fileName }}
            </a>
            <span v-else>
                {{ replay.fileName }}
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
                        <li v-for="team in playersWithFactionIcon">
                            <span v-for="player in team" :key="player.name">
                                <img :src="factionIconPath" />
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

