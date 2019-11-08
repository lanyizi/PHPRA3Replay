<?php

require_once('Medoo-master/src/Medoo.php');
use Medoo\Medoo;

function main() {
    try {
        header('Content-Type: application/json;charset=utf-8');

        $input = json_decode(file_get_contents('php://input'), true);
        $database = new Medoo([
            // required
            'database_type' => 'mysql',
            'database_name' => 'my_lanyi',
            'server' => 'localhost',
            'username' => 'lanyi',
            'password' => '',
            'charset' => 'utf8mb4',
	        'collation' => 'utf8mb4_general_ci',
            'option' => [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            ],
        ]);

        $server = new RA3Replay($input, $database);
        return $server->doAction($_GET['do']);
    }
    catch(Exception $exception) {
        http_response_code(500);
        return [
            'exception' => $exception->getMessage()
        ];
    }
}

class MyException extends Exception {
    public function __construct($message) {
        parent::__construct($message);
    }
}

class ReplayAlreadyExistsException extends MyException {
    public $id;
    public function __construct($id) {
        parent::__construct("Replay already exists: $id");
        $this->id = $id;
    }
}

class RA3Replay {

    /**
     * @var Medoo
     */
    private $database;

    private $input;

    /**
     * @var string
     */
    private $replayDirectory;

    public function __construct($input, Medoo $database) {
        $this->input = $input;
        $this->database = $database;
        $this->replayDirectory = 'uploadedReplays';

        $this->database->create('new_replays',  [
            'id' => [
                'INT',
                'NOT NULL',
                'AUTO_INCREMENT',
                'PRIMARY KEY'
            ],
            'description'   => [ 'TEXT',    'NOT NULL' ],
            'isPartial'     => [ 'BOOLEAN', 'NOT NULL' ],
            'fileName'      => [ 'TEXT',    'NOT NULL' ],
            'fileSize'      => [ 'INT',     'NOT NULL' ],
            'mapPath'       => [ 'TEXT',    'NOT NULL' ],
            'mapName'       => [ 'TEXT',    'NOT NULL' ],
            'players'       => [ 'TEXT',    'NOT NULL' ],
            'seed'          => [ 'INT',     'NOT NULL' ],
            'timeStamp'     => [ 'BIGINT',  'NOT NULL' ],
            'totalFrames'   => [ 'INT' ],
            'title'         => [ 'TEXT' ],
            'newVersion'    => [ 'INT' ],
            'deletedBy'     => [ 'TEXT' ],
            'deletedDate'   => [ 'BIGINT' ],
        ]);

        $this->database->create('new_replays_tags',  [
            'replayId' =>   [ 'INT',    'NOT NULL' ],
            'tag' =>        [ 'TEXT',   'NOT NULL' ]
        ]);

        if(!is_dir($this->replayDirectory)) {
            if(!mkdir($this->replayDirectory, 0777, true)) {
                throw new Exception('failed to create replay directory');
            }
        }
    }

    public function doAction($what) {
        if(!method_exists($this, $what)) {
            http_response_code(400);
            return null;
        }

        $methodInfo = new ReflectionMethod($this, $what);
        if(!$methodInfo->isPublic()) {
            http_response_code(400);
            return null;
        }

        return $this->$what();
    }

    public function getReplayList() {
        $list = null;
        if(empty($_GET['tag'])) {
            $list = $this->database->select('new_replays', [
                'id'
            ], [
                'deletedDate' => null
            ]);
        }
        else {
            $list = $this->database->select('new_replays', [
                '[><]new_replays_tags' => ['id' => 'replayId']
            ], [
                'new_replays.id (id)'
            ], [
                'deletedDate' => null
            ]);
        }
        return [
            'replays' => $list
        ];
    }

    public function getTagList() {
        $list = $this->database->select('new_replays', [
            'tag'
        ], [
            'GROUP' => 'tag'
        ]);
        return [
            'tags' => $list
        ];
    }

    public function getReplayInformation() {
        $id = $_GET['id'];
        $replayData = $this->database->get('new_replays', [
            'description',
            'isPartial',
            'fileName',
            'fileSize',
            'mapName',
            'mapPath',
            'timeStamp',
            'players',
            'totalFrames',
            'title',
            'newVersion'
        ], [
            'AND' => [
                'deletedDate' => null,
                'id' => $id
            ],
        ]);

        if(empty($replayData)) {
            $replayData = null;
        }
        else {
            $tags = $this->database->select('new_replays_tags', [
                'tag'
            ], [
                'replayId' => $id
            ]);

            $replayData['players'] = json_decode($replayData['players'], true);
            $replayData['url'] = $this->getFinalReplayName($id);
            $replayData['tags'] = array_column($tags, 'tag');
        }

        return [
            'replay' => $replayData
        ];
    }

    public function uploadReplay() {
        try {
            $id = null;

            $this->database->action(function(Medoo $database) use (&$id) {
                $replayFile = base64_decode($this->input['data']);
                $replayData = RA3Replay::parseRA3Replay($replayFile);
                $replayData['description'] = is_string($this->input['description']) ? $this->input['description'] : '';
                $replayData['isPartial'] = is_bool($this->input['isPartial']) ? $this->input['isPartial'] : false;
                // Store player data as json for simplicity
                $replayData['players'] = json_encode($replayData['players']);
                $replayData['fileName'] = $this->input['fileName'];

                if(!empty($this->input['title'])) {
                    $replayData['title'] = $this->input['title'];
                }

                // Check if this replay already exists
                $existing = $database->get('new_replays', [
                    'id',
                    'totalFrames',
                    'fileSize'
                ], [
                    'AND' => [
                        'deletedDate' => null,
                        'newVersion' => null,
                        'mapPath' => $replayData['mapPath'],
                        'players' => $replayData['players'],
                        'seed' => $replayData['seed'],
                        'timeStamp' => $replayData['timeStamp']
                    ]
                ]);
                if(!empty($existing)) {
                    // Check if we are providing a more complete file (by checking totalFrames or file size)
                    $oldId = $existing['id'];

                    // Cannot check if the new replay is corrupted
                    if(empty($replayData['totalFrames'])) {
                        throw new ReplayAlreadyExistsException($oldId);    
                    }

                    // Check file size of old replay if it's corrupted
                    if(empty($existing['totalFrames'])) {
                        if($replayData['fileSize'] <= $existing['fileSize']) {
                            throw new ReplayAlreadyExistsException($oldId);    
                        }
                    }

                    // Check number of frames
                    if($replayData['totalFrames'] <= $existing['totalFrames']) {
                        throw new ReplayAlreadyExistsException($oldId);    
                    }

                    // If new replay has more frames than the existing one
                    // Let it become a newer version
                }

                // Save to database
                $database->insert('new_replays', $replayData);
                $id = $database->id();

                // Save tags to database
                $tags = is_string($this->input['tags']) ? json_decode($this->input['tags']) : [];
                $tags = is_array($tags) ? array_map(function($tag) use($id) {
                    return [ 'replayId' => $id, 'tag' => $tag ];
                }, $tags) : [];
                if(!empty($tags)) {
                    $database->insert('new_replays_tags', $tags);
                }

                // Update existing replay's `newVersion`
                if(!empty($existing)) {
                    $database->update('new_replays', [
                        'newVersion' => $id
                    ], [
                        'id' => $existing['id']
                    ]);
                }

                // Save replay file
                $finalFileName = $this->getFinalReplayName($id);
                $writeResult = file_put_contents($finalFileName, $replayFile, LOCK_EX);
                if(!$writeResult) {
                    throw new MyException('Failed to save replay');
                }
            });

            return [
                'id' => $id,
                'isDuplicate' => false,
                'message' => 'Operation succeeded'
            ];
        }
        catch(ReplayAlreadyExistsException $exception) {
            return [
                'id' => $exception->id,
                'isDuplicate' => true,
                'message' => $exception->getMessage()
            ];
        }
        catch(MyException $exception) {
            return [
                'id' => null,
                'isDuplicate' => false,
                'message' => $exception->getMessage()
            ];
        }
        catch(Exception $exception) {
            $errorMessage = $exception->getMessage();
            return [
                'id' => null,
                'isDuplicate' => false,
                'message' => "Internal error: $errorMessage"
            ];
        }
    }
    
    function test() {
        try {
            return $this::parseRA3Replay(base64_decode($this->input['data']));
        }
        catch(Exception $exception) {
            return [
                'errorMessage' => $exception->getMessage()
            ];
        }
    }

    /**
     * Parse replay
     * ```php 
     * return [
     *     'fileSize' => 1234567890,
     *     'mapName' => 'Map name (depends on replay saver's locale)',
     *     'mapPath' => 'Map path',
     *     'timeStamp' => 1234567890,
     *     'players' => [ [ [
     *         'name' => 'Player name', faction => 5 // Faction ID
     *      ] ] ]
     * ]
     * ```
     * @param string $replayData raw replay data
     * @return array parsed replay data in associative array
     */
    public static function parseRA3Replay($replayData) {
        $replayMagic = 'RA3 REPLAY HEADER';
        $magicLength = strlen($replayMagic);
        if(substr($replayData, 0, $magicLength) !== $replayMagic) {
            throw new MyException('Not a valid Red Alert 3 Replay');
        }
    
        $skirmishFlag = ord($replayData[$magicLength]);
    
        $index = $magicLength + 19;
        $index = self::readUTF16String($replayData, $index)['newIndex']; // Skip match title
        $index = self::readUTF16String($replayData, $index)['newIndex']; // Skip match description
        $mapNameHolder = self::readUTF16String($replayData, $index); // map name
        $mapName = $mapNameHolder['string'];
        $index = $mapNameHolder['newIndex'];
        $index = self::readUTF16String($replayData, $index)['newIndex']; // Skip map ID

        $numberOfRealPlayers = ord($replayData[$index]);
        $index += 1;
        for($i = 0; $i <= $numberOfRealPlayers; ++$i) {
            $index += 4;
            $index = self::readUTF16String($replayData, $index)['newIndex'];
            if($skirmishFlag == 0x05) {
                $index += 1;
            }
        }

        $index += 38;
        $timeStamp = unpack('V', substr($replayData, $index, 4))[1];
        $index += 4;
        $index += 31;
        $headerLength = unpack('V', substr($replayData, $index, 4))[1];
        $index += 4;
        $header = substr($replayData, $index, $headerLength);
        $index += $headerLength;
        $replaySaverIndex = ord($replayData[$index]);
        $index += 1;

        $chunks = array_chunk(preg_split('/(=|;)/', $header, -1, PREG_SPLIT_NO_EMPTY), 2);
        $array = array_combine(array_column($chunks, 0), array_column($chunks, 1));
        $mapPath = substr($array['M'], 3);
        $seed = (int)($array['SD']);
        $playerArray = explode(':', $array['S']);
        $teams = [];
        foreach($playerArray as $playerIndex => $playerString) {
            $playerData = explode(',', $playerString);
            $playerName = $playerData[0];
            if($playerName[0] == 'H' || $playerName[0] == 'C') {
                $realPlayerName = substr($playerName, 1);
                $playerFaction = (int)($playerData[5]);
                $playerTeam = (int)($playerData[7]);
                $parsedPlayerData = [
                    'name' => $realPlayerName,
                    'faction' => $playerFaction,
                    'isSaver' => ($playerIndex === $replaySaverIndex)
                ];
                if($realPlayerName != 'post Commentator') {
                    if(!isset($teams[$playerTeam])) {
                        $teams[$playerTeam] = array();
                    }
                    $teams[$playerTeam][] = $parsedPlayerData;
                }
            }
        }

        if(is_array($teams[-1])) {
            foreach($teams[-1] as $playerWithoutTeam) {
                $teams[] = array($playerWithoutTeam);
            }
            unset($teams[-1]);
        }

        // read footer - totalFrames
        $totalFrames = null;
        $footerLength = unpack('V', substr($replayData, -4, 4))[1];
        $footer = substr($replayData, -$footerLength, $footerLength);
        $footerMagic = 'RA3 REPLAY FOOTER';
        $footerMagicLength = strlen($footerMagic);
        if(substr($footer, 0, $footerMagicLength) === $footerMagic) {
            $totalFramesHolder = substr($replayData, 4, 4);
            if($totalFramesHolder !== false && strlen($totalFramesHolder) === 4) {
                $totalFrames = unpack('V', substr($replayData, 4, 4))[1];
            }
        }        

        return [
            'fileSize' => strlen($replayData),
            'mapName' => $mapName,
            'mapPath' => $mapPath,
            'players' => array_values($teams),
            'seed' => $seed,
            'timeStamp' => $timeStamp,
            'totalFrames' => $totalFrames
        ];
    }

    private static function readUTF16String($data, $index) {

        $string = '';
        while(true) {
            $first = $data[$index];
            $second = $data[$index + 1];
            $index += 2;
            if((ord($first) == 0) && (ord($second) == 0)) {
                break;
            }
            $string .= $first;
            $string .= $second;
        }

        return [
            'string' => iconv('utf-16', 'utf-8', $string),
            'newIndex' => $index
        ];
    }

    private function getFinalReplayName($id) {
        return $this->replayDirectory . '/' . $id . '.RA3Replay';
    }
}

echo json_encode(main());
?>