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
    props: ['replayId', 'defaultMapImagePath', 'mapImageFormat', 'factionIconFormat'],
    mounted: function () {
        fetch('/replays/replay.php?do=getReplayInformation&id=' + this.replayId)
            .then(response => response.json())
            .then(parsed => {
                if (parsed) {
                    Object.assign(this.replay, parsed.replay);
                }
            });
    },
    methods: {
        onMapPathFailed: function () {
            if (this.replay.mapPath != this.defaultMapImagePath) {
                this.replay.mapPath = this.defaultMapImagePath;
            }
        }
    },
    computed: {
        mapImagePath: function () {
            if (this.replay.mapPath == this.defaultMapImagePath) {
                return this.defaultMapImagePath;
            }
            if (this.mapImageFormat === undefined) {
                return '';
            }
            return this.mapImageFormat.replace('*', this.replay.mapPath);
        },
        playersWithFactionIcon: function () {
            return this.replay.players.map(team => {
                return team.map(player => {
                    let computeFactionIcon = (faction) => {
                        try {
                            return this.factionIconFormat.replace('*', faction)
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
            {{ replayId }}&nbsp;-&nbsp;
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
                                <img :src="player.factionIconPath" />
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

