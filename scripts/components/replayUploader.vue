<template>
    <div class="replay-uploader">
        <div class="replay-uploader-title">
            {{ $t('uploadReplay') }}
            <span
                v-if="showTournamentHints"
                class="tournament-hints"
            >{{ $t('tournamentHint') }}</span>
        </div>
        <input
            type="text"
            v-model="uploadData.title"
            :placeholder="$t('replayTitle')"
            :disabled="uploading"
            class="high-input-as-tag-input"
        />
        <my-tags-input
            :placeholder="$t('replayType')"
            :values="uploadData.tags"
            :autocomplete-items="availableTags"
            @tags-changed="uploadData.tags = $event"
            :add-only-from-autocomplete="false"
            :autocomplete-min-length="0"
            :disabled="uploading"
        ></my-tags-input>
        <br />
        <textarea
            class="input-description"
            v-model="uploadData.description"
            :placeholder="$t('replayDescription')"
            :disabled="uploading"
        ></textarea>
        <br />
        <label
            @drop.prevent="handleDrop"
            @dragleave="dragEnter = false"
            @dragover.prevent="dragEnter = true"
            :class="{ 'file-picker-active': dragEnter }"
            class="file-picker"
        >
            <input
                type="file"
                multiple
                @input="addFiles($event.target.files)"
            />
            {{ $t('selectFile') }}
            <br />
            <span
                class="file-picker-hint drag-drop-hint"
            >{{ $t('dragDropHint') }}</span>
            <br />
            <span
                v-if="uploading"
                class="file-picker-hint uploading-hint"
            >{{ $t('uploadingHint') }}</span>
        </label>
        <status-bar
            :updating="loading"
            :error="errors"
            class="replay-status"
        >
            <button
                :disabled="!canUpload"
                @click="uploadReplays"
                class="upload-button"
            >{{ $t('uploadReplay') }}</button>
            <span v-if="statusText">{{ statusText }}</span>
        </status-bar>

        <!--p :class="uploadStatusClasses">{{ uploadStatus }}</p-->
        <div v-if="files.length > 0" class="replay-previews">
            {{ $t('replayPreviews') }}
            <span
                class="replay-previews-hint"
            >{{ $t('replayPreviewsHint') }}</span>
        </div>
        <div
            v-for="(info, index) in filesInfo"
            :key="index"
            class="replay-previews-item"
        >
            <status-bar
                :updating="info.loading"
                :error="info.hasErrors || info.isDuplicate"
                class="replay-status"
            >
                <span>{{ $t('uploadItem', { id: index + 1 }) }}</span>
                <span v-if="info.statusText">{{ info.statusText }}</span>
                <double-confirm-button
                    v-if="!info.loading"
                    :action-text="$t('remove')"
                    @click="files.splice(index, 1)"
                    main-class="delete-button"
                ></double-confirm-button>
            </status-bar>
            <replay-item
                v-if="info.showReplay"
                :replay-data="info.details"
                :succinct-mode="true"
            ></replay-item>
        </div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
import { isAnyOf } from '../utils';
import { apiUrl } from '../commonConfig';
import MyTagsInput from './myTagsInput.vue';
import StatusBar from './statusBar.vue';
import ReplayItem, { emptyReplayData, Replay } from './replayItem.vue';
import DoubleConfirmButton from './doubleConfirmButton.vue';

const readBlobAsBase64 = (blob: Blob) => {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = event =>
            reject(event.target ? event.target.error : 'unknown error');
        reader.onload = event => {
            try {
                if (event.target == null) {
                    throw Error('event.target is null');
                }
                if (event.target.result == null) {
                    throw Error('event.target.result is null');
                }
                if (typeof event.target.result !== 'string') {
                    throw Error('event.target.result is not string');
                }

                let base64 = event.target.result.split(',', 2)[1];
                if (base64.length % 4 > 0) {
                    base64 += '='.repeat(4 - (base64.length % 4));
                }
                return resolve(base64);
            } catch (error) {
                reject(error);
            }
        };
        reader.readAsDataURL(blob);
    });
};

enum Status {
    readingFile,
    parsingReplay,
    localError,
    localDuplicates,
    readyForUpload,
    uploading,
    uploaded,
    uploadError,
    duplicate
}

enum UploaderStatus {
    ready,
    zeroFiles,
    uploaded,
    someDuplicates,
    duplicates,
    someUploadErrors,
    uploadErrors,
    readingFiles,
    localDuplicates,
    localErrors,
    uploading
}

type ReplayFile = {
    fileName: string;
    base64: string | null;
    details: (Replay & { seed: number }) | null;
    error: string | null;
    status: keyof typeof Status;
    uploadedId: string | null;
};

const emptyUploadData = () => ({
    title: '',
    description: '',
    tags: [] as string[],
    data: '',
    fileName: '',
    isPartial: false
});

type UploadData = ReturnType<typeof emptyUploadData>;

export default Vue.extend({
    components: {
        'my-tags-input': MyTagsInput,
        'status-bar': StatusBar,
        'replay-item': ReplayItem,
        'double-confirm-button': DoubleConfirmButton
    },
    data: () => ({
        files: [] as ReplayFile[],
        uploadData: emptyUploadData(),
        dragEnter: false
    }),
    props: {
        existingTags: {
            type: Array as () => string[],
            default: []
        },
        showTournamentHints: Boolean
    },
    computed: {
        filesInfo() {
            const numberOfFirstlocalDuplicate = (file: ReplayFile) => {
                const replay = file.details;
                if (replay === null) {
                    return null;
                }

                const index: number = this.files.findIndex(
                    ({ details }) =>
                        details != replay &&
                        details !== null &&
                        details.seed == replay.seed &&
                        details.timeStamp == replay.timeStamp
                );
                if (index === -1) {
                    return null;
                }
                return index + 1;
            };

            return this.files.map(file => {
                const duplicate = numberOfFirstlocalDuplicate(file);
                const status =
                    duplicate === null ? file.status : 'localDuplicates';

                const statusIn = (...keys: (keyof typeof Status)[]) =>
                    isAnyOf(status, ...keys);

                const statusText =
                    status !== 'readyForUpload'
                        ? this.$t(`status.${status}`, {
                              id: file.uploadedId,
                              error: file.error,
                              duplicate
                          })
                        : null;

                return {
                    ...file,
                    status,
                    statusText,
                    showReplay:
                        file.details !== null && !statusIn('uploaded'),
                    loading: statusIn('readingFile', 'uploading'),
                    hasErrors: statusIn('localError', 'uploadError'),
                    isDuplicate: statusIn('localDuplicates', 'duplicate'),
                    isUploadable: statusIn('readyForUpload', 'uploadError')
                };
            });
        },
        availableTags(): string[] {
            return this.existingTags;
        },
        status() {
            const info = this.filesInfo;
            type Checker = (x: typeof info[number]) => boolean;
            type Key = keyof typeof UploaderStatus;
            const ifSome = (checker: Checker, status: Key) => () =>
                info.some(checker) ? status : null;
            const ifEvery = <T>(checker: Checker, status: Key) => () =>
                info.length !== 0 && info.every(checker) ? status : null;
            const statusIs = (status: keyof typeof Status): Checker => x =>
                x.status === status;

            const checkers = [
                ifSome(statusIs('uploading'), 'uploading'),
                ifSome(x => x.hasErrors, 'localErrors'),
                ifSome(statusIs('localDuplicates'), 'localDuplicates'),
                ifSome(statusIs('readingFile'), 'readingFiles'),
                ifEvery(statusIs('uploadError'), 'uploadErrors'),
                ifSome(statusIs('uploadError'), 'someUploadErrors'),
                ifEvery(statusIs('duplicate'), 'duplicates'),
                ifSome(statusIs('duplicate'), 'someDuplicates'),
                ifEvery(statusIs('uploaded'), 'uploaded'),
                () => (info.length === 0 ? 'zeroFiles' : null)
            ];

            const getStatus = (index = 0): Key | null =>
                index < checkers.length
                    ? checkers[index]() || getStatus(index + 1)
                    : null;
            return getStatus();
        },
        statusText(): string | null {
            if (this.status === null) {
                return null;
            }
            return `${this.$t(`uploaderStatus.${this.status}`)}`;
        },
        loading(): boolean {
            return isAnyOf(this.status, 'uploading', 'readingFiles');
        },
        errors(): boolean {
            return isAnyOf(this.status, 'localErrors', 'uploadErrors');
        },
        uploading(): boolean {
            return this.status === 'uploading';
        },
        canUpload(): boolean {
            const info = this.filesInfo.filter(
                x => x.status !== 'uploaded'
            );
            return info.length !== 0 && info.every(x => x.isUploadable);
        }
    },
    methods: {
        post(action: string, data: any) {
            return fetch(`${apiUrl}?do=${action}`, {
                method: 'post',
                body: JSON.stringify(data),
                headers: {
                    'content-type': 'application/json'
                }
            }).then(response => response.json());
        },
        handleDrop(event: DragEvent) {
            this.dragEnter = false;
            if (!event.dataTransfer) {
                return;
            }
            this.addFiles(event.dataTransfer.files);
        },
        addFiles(files: FileList) {
            this.files = this.files.filter(
                file => file.status !== 'uploaded'
            );

            Array.from(files).forEach(async file => {
                const replayFile: ReplayFile = {
                    fileName: file.name,
                    base64: null,
                    details: null,
                    error: null,
                    status: 'readingFile',
                    uploadedId: null
                };

                try {
                    this.files.push(replayFile);
                    const base64 = await readBlobAsBase64(file);
                    replayFile.base64 = base64;

                    replayFile.status = 'parsingReplay';
                    // Only these parts are needed to parse replay data
                    const previewFile =
                        base64.length > 2048
                            ? base64.slice(0, 1536) +
                              base64.slice(base64.length - 512)
                            : base64;
                    const parsed = await this.post('test', {
                        data: previewFile
                    });

                    if (!parsed) {
                        throw Error('invalid response from server');
                    }

                    if (parsed.errorMessage) {
                        throw Error(`${parsed.errorMessage}`);
                    }

                    replayFile.details = {
                        ...emptyReplayData(),
                        ...parsed,
                        fileName: replayFile.fileName,
                        fileSize: file.size
                    };
                    replayFile.status = 'readyForUpload';
                } catch (error) {
                    replayFile.status = 'localError';
                    replayFile.error = `${error}`;
                }
            });
        },
        uploadReplays() {
            this.files = this.files.filter(
                file => file.status !== 'uploaded'
            );

            const uploadData = { ...this.uploadData };
            this.files.forEach(async (file, index) => {
                if (!this.filesInfo[index].isUploadable) {
                    file.status = 'localError';
                    file.error = `Cannot upload file with status ${status}`;
                    return;
                }

                try {
                    file.status = 'uploading';

                    const input: UploadData = {
                        ...uploadData,
                        fileName: file.fileName,
                        data: file.base64 as string
                    };

                    const result = await this.post('uploadReplay', input);
                    if (!result) {
                        throw Error('Invalid response from server');
                    }
                    if (!result.id) {
                        throw Error(result.message || 'Upload failed');
                    }
                    file.uploadedId = result.id;
                    if (result.isDuplicate) {
                        file.status = 'duplicate';
                        return;
                    }
                    file.status = 'uploaded';
                    this.$emit('replay-uploaded');
                } catch (error) {
                    file.status = 'uploadError';
                    file.error = `${error}`;
                }
            });
        }
    },
    i18n: {
        messages: {
            zh: {
                uploadReplay: '上传录像',
                tournamentHint:
                    '假如要上传比赛录像的话，' +
                    '请在下面的录像标签里写上比赛的名称',
                replayTitle: '标题（可选）',
                replayType: '录像标签（可选）',
                replayDescription: '录像说明（可选）',
                selectFile: '点击选择录像文件',
                dragDropHint: '也可以直接把录像文件拖进这个框框',
                uploadingHint:
                    '新添加的文件并不会随着正在上传的录像一起被传上去，' +
                    '之后需要重新按一下上传按钮',
                replayPreviews: '录像预览',
                replayPreviewsHint:
                    '（嗯，下面这些录像只是预览，还没有被上传）',
                uploadItem: '待上传录像 {id}',
                remove: '移除录像',
                status: {
                    readingFile: '正在读取…',
                    parsingReplay: '正在解析…',
                    localError: '错误：{error}',
                    localDuplicates:
                        '这个录像和上传列表里的第{duplicate}个录像重复了',
                    uploading: '正在上传…',
                    uploaded: '上传成功，录像ID #{id}',
                    uploadError: '上传失败 {error}',
                    duplicate:
                        '这个录像已经被其他人上传过了，它的录像ID是 #{id}'
                },
                uploaderStatus: {
                    zeroFiles: '上传列表中还没有任何录像',
                    uploaded: '上传成功',
                    someDuplicates: '有些录像已经被上传过了',
                    duplicates: '录像已经被其他人上传过了',
                    someUploadErrors: '有些录像上传失败了',
                    uploadErrors: '录像上传失败',
                    readingFiles: '正在读取录像文件…',
                    localDuplicates: '上传列表中有重复的录像',
                    localErrors: '选择的文件可能有问题',
                    uploading: '正在上传…'
                }
            }
        }
    }
});
</script>
<style scoped>
.replay-uploader {
    padding: 1em;
    color: #eaeaea;
    width: 67.5%;
    margin: 0 auto;
}

.replay-uploader-title {
    font-size: 150%;
    margin-bottom: 0.5em;
}

.replay-uploader > * {
    margin: 0.2em 0;
}

.tournament-hints {
    font-size: 75%;
}

.high-input-as-tag-input {
    width: 24ch;
    font-size: 100%;
    padding: 7px 9px;
    border: 1px solid gray;
    vertical-align: bottom;
}

.input-description {
    width: 100%;
    padding: 1ch;
    height: 8em;
    margin-top: 0.5em;
    max-width: 100%;
}

.file-picker {
    display: block;
    text-align: center;
    padding: 2em;
    background: #151515;
    border: 1px dashed #888888;
}

.file-picker:hover,
.file-picker-active {
    background: #303030;
    border: 1px dashed #cccccc;
}

.file-picker input {
    display: none;
}

.file-picker-hint {
    font-size: 75%;
    color: #aaaaaa;
}

.file-picker-active .drag-drop-hint {
    color: lightgreen;
}

.uploading-hint {
    color: white;
}

.replay-previews {
    font-size: 125%;
    padding-top: 0.5em;
}

.replay-previews-hint {
    font-size: 62.5%;
    color: #cccccc;
}

.replay-previews-item {
    border: 1px solid #404040;
    margin: 1em 0;
}

.replay-status {
    background: #202020;
    background: linear-gradient(90deg, #202020, transparent);
}

.replay-status > * {
    margin-right: 0.5em;
    vertical-align: middle;
}

.upload-button {
    font-size: 100%;
}
</style>