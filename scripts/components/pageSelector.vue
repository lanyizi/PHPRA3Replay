<template>
    <div class="page-selector">
        <numeric-input
            v-model="displayedPageSize"
            :string="$tc('replaysPerPage', displayedPageSize)"
            :padding-string="$tc('replaysPerPage', 99999)"
            :placeholder="$tc('replaysPerPage', displayedPageSize)"
            class="page-selector-input"
        ></numeric-input>
        <numeric-input
            v-model="displayedCurrentPage"
            :string="$tc('currentPage', displayedCurrentPage)"
            :padding-string="$tc('currentPage', 99999)"
            :placeholder="$tc('goToPage', displayedCurrentPage)"
            class="page-selector-input"
        ></numeric-input>
        <button
            v-on:click="displayedCurrentPage -= 1"
        >{{ $t('previousPage') }}</button>
        <button v-on:click="displayedCurrentPage += 1">{{ $t('nextPage') }}</button>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
import { Query, firstString, InputQuery } from '../routerUtils';
import NumericInput from './numberInput.vue';

const defaultPageData = () => {
    return { pageSize: 10, pageNumber: 0 };
};
type PageData = ReturnType<typeof defaultPageData>;
type PageDataKey = keyof PageData;
const pageDataKeys = Object.keys(defaultPageData()) as PageDataKey[];

export const fromQuery = (query: Query) => {
    const defaultValue = defaultPageData();
    return pageDataKeys.reduce(
        (data, key) => {
            const value = firstString(query[key]);
            data[key] = value ? parseInt(value) : NaN;
            data[key] = (isNaN(data[key]) ? defaultValue : data)[key];
            return data;
        },
        {} as PageData
    );
};

export const toQuery = (pageData: PageData): InputQuery => {
    const defaultValue = defaultPageData();
    return pageDataKeys.reduce(
        (query, key) => {
            try {
                if (pageData[key] !== defaultValue[key]) {
                    query[key] = pageData[key].toString();
                    return query;
                }
            } catch {}
            query[key] = undefined;
            return query;
        },
        {} as InputQuery
    );
};

export default Vue.extend({
    components: {
        'numeric-input': NumericInput
    },
    data: () => ({
        lastPageData: defaultPageData()
    }),
    props: {
        pageData: {
            type: Object as () => PageData,
            default: defaultPageData
        },
        totalReplayCount: {
            type: Number
        }
    },
    computed: {
        myPageData(): PageData {
            return { ...defaultPageData(), ...(this.pageData || {}) };
        },
        displayedCurrentPage: {
            get(): number {
                return this.myPageData.pageNumber + 1;
            },
            set(value: number) {
                this.updateValue('pageNumber', value - 1);
            }
        },
        displayedPageSize: {
            get(): number {
                return this.myPageData.pageSize;
            },
            set(value: number) {
                this.updateValue('pageSize', value);
            }
        }
    },
    methods: {
        updateValue<Field extends keyof PageData>(
            field: Field,
            value: PageData[Field]
        ) {
            const copy: PageData = { ...this.myPageData };
            copy[field] = value;
            this.onValuesUpdated(copy);
        },
        onValuesUpdated(pageData: PageData) {
            const asPositive = (x: number) => Math.max(0, Math.floor(x));

            const newPageSize = Math.max(1, Math.floor(pageData.pageSize));
            const newPageNumber = asPositive(pageData.pageNumber);
            const totalReplayCount = asPositive(this.totalReplayCount);
            const maxPage = Math.ceil(totalReplayCount / newPageSize);
            const maxPageNumber = asPositive(maxPage - 1);

            const copy: PageData = {
                pageSize: newPageSize,
                pageNumber: Math.min(maxPageNumber, newPageNumber)
            };

            const fieldChanged = (field: keyof PageData) =>
                this.lastPageData[field] !== copy[field];

            if (pageDataKeys.some(fieldChanged)) {
                this.lastPageData = copy;
                this.$emit('update-data', copy);
            }
        }
    },
    watch: {
        $props: {
            handler(prop) {
                const pageData =
                    !prop || !prop.pageData
                        ? defaultPageData()
                        : prop.pageData;
                this.onValuesUpdated(pageData);
            },
            deep: true
        }
    },
    i18n: {
        messages: {
            zh: {
                replaysPerPage: '每页显示{n}个录像',
                currentPage: '现在是第{n}页',
                goToPage: '转到第{n}页',
                previousPage: '上一页',
                nextPage: '下一页'
            }
        }
    }
});
</script>
<style scoped>
.page-selector {
    padding: 0.5em;
}

.page-selector-input {
    margin-right: 0.5em;
}
</style>