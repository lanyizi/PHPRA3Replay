<template>
    <div class="replay-filters">
        <my-tags-input
            v-for="filterKey in filterKeys"
            :key="filterKey"
            :class="filterKey"
            :placeholder="$t('hints.' + filterKey)"
            :values="myFilters[filterKey]"
            :autocomplete-items="availableValues[filterKey]"
            @tags-changed="tryUpdateTags(filterKey, $event)"
            :add-only-from-autocomplete="true"
            :autocomplete-min-length="0"
            :custom-values-to-tags="valuesToTags[filterKey]"
        ></my-tags-input>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
import { isString, arrayEquals, asArray } from '../utils';
import { Query, InputQuery, firstString } from '../routerUtils';
import MyTagsInput, { Tag } from './myTagsInput.vue';

const sortOrders = ['ASC', 'DESC'] as const;
type SortOption = {
    column: string;
    order: typeof sortOrders[number];
};
const isSortOption = (x: any): x is SortOption => {
    return !!x && isString(x.column) && sortOrders.includes(x.order);
};
const sortOptionEquals = (x: SortOption, y: SortOption) => {
    return x.column === y.column && x.order === y.order;
};

const filterDefinition = [
    { key: 'includes', value: [] as string[] },
    { key: 'excludes', value: [] as string[] },
    { key: 'sorts', value: [] as SortOption[] }
] as const;

type FilterDefinition = (typeof filterDefinition)[number];
type FilterKey = FilterDefinition['key'];
type Filters = {
    [K in FilterKey]: Extract<FilterDefinition, { key: K }>['value'];
};
const filterKeys: FilterKey[] = filterDefinition.map(x => x.key);

export const filterModes = [
    'allReplays',
    'tournamentsOnly',
    'excludeTournaments'
] as const;
type FilterMode = typeof filterModes[number];
type FiltersProp = Filters & {
    mode: FilterMode;
};
export const normalizeFiltersProp = (value: unknown): FiltersProp => {
    const from = value ? (value as any) : {};
    return {
        mode: filterModes.includes(from.mode) ? from.mode : 'allReplays',
        includes: asArray(from.includes, isString),
        excludes: asArray(from.excludes, isString),
        sorts: asArray(from.sorts, isSortOption)
    };
};

export const fromQuery = (query: Query) => {
    const filters = filterKeys.reduce(
        (filters, key) => {
            try {
                const value = firstString(query[key]);
                filters[key] = value ? JSON.parse(value) : [];
            } catch {}
            return filters;
        },
        {} as Record<FilterKey, unknown>
    );

    return { ...filters, mode: firstString(query['mode']) };
};

export const toQuery = (filtersProp: FiltersProp): InputQuery => {
    const query = filterKeys.reduce(
        (query, key) => {
            try {
                const field = filtersProp[key];
                if (Array.isArray(field) && field.length > 0) {
                    query[key] = JSON.stringify(field);
                    return query;
                }
            } catch {}
            query[key] = undefined;
            return query;
        },
        {} as InputQuery
    );

    if (filtersProp.mode === 'allReplays') {
        query['mode'] = undefined;
    } else if (filterModes.includes(filtersProp.mode)) {
        query['mode'] = filtersProp.mode;
    }

    return query;
};

export default Vue.extend({
    components: {
        'my-tags-input': MyTagsInput
    },
    data: () => ({
        tournamentTags: ['CMS', '贺岁杯'],
        lastApiQuery: {} as Record<string, string>
    }),
    props: {
        existingTags: {
            type: Array as () => string[],
            default: () => []
        },
        filters: {
            type: Object,
            default: null
        }
    },
    computed: {
        // Normalize prop
        myFilters() {
            return normalizeFiltersProp(this.filters);
        },
        availableValues(): Filters {
            let availableFilters = this.existingTags;
            switch (this.myFilters.mode) {
                case 'tournamentsOnly': {
                    availableFilters = this.tournamentTags;
                    break;
                }
                case 'excludeTournaments': {
                    availableFilters = this.existingTags.filter(
                        x => !this.tournamentTags.includes(x)
                    );
                    break;
                }
            }

            // TODO: fetch from server
            const sortTypes = [
                'id',
                'timeStamp',
                'totalFrames',
                'fileSize',
                'downloads'
            ];

            // If "ORDER BY `foo` ASC" is already present,
            // then "ORDER BY `foo` DESC" shouldn't be an available option
            const availableSortTypes = sortTypes.filter(sortType => {
                return this.myFilters.sorts.every(sortOption => {
                    return sortOption.column != sortType;
                });
            });

            const availableSortOptions = availableSortTypes.reduce(
                (reduced, sortType) => {
                    return reduced.concat(
                        sortOrders.map(order => ({
                            column: sortType,
                            order: order
                        }))
                    );
                },
                [] as SortOption[]
            );

            return {
                includes: availableFilters,
                excludes: availableFilters,
                sorts: availableSortOptions
            };
        },
        valuesToTags() {
            return {
                sorts: (values: any[]) => this.toSortOptionsTags(values)
            };
        },
        filterKeys() {
            return filterKeys;
        }
    },
    methods: {
        toSortOptionsTags(sortOptions: unknown[]): Tag<SortOption>[] {
            const t = (x: string) => `${this.$t(x)}`;
            return asArray(sortOptions, isSortOption).map(x => ({
                text:
                    t('sortBy.' + x.column) + t('sortOrder.' + x.order),
                value: x
            }));
        },
        tryUpdateTags<T extends FilterKey>(
            tagType: T,
            newValues: Filters[T]
        ) {
            const unchanged = arrayEquals<Filters[T][number]>(
                this.myFilters[tagType],
                newValues,
                (x, y) => {
                    if (tagType === 'sorts') {
                        return sortOptionEquals(
                            x as SortOption,
                            y as SortOption
                        );
                    }
                    return x === y;
                }
            );

            if (unchanged) {
                return;
            }
            const updated = { ...this.myFilters, [tagType]: newValues };
            this.$emit('update-data', updated);
        },
        onFiltersPropUpdated(newFilters: any) {
            const news = normalizeFiltersProp(newFilters);

            // Emit new api query
            const apiIncludes =
                news.mode === 'tournamentsOnly' &&
                news.includes.length === 0
                    ? this.tournamentTags
                    : news.includes;

            const apiExcludes = news.excludes.concat(
                news.mode === 'excludeTournaments'
                    ? this.tournamentTags
                    : []
            );

            const apiQuery: Record<string, string> = {
                tags: JSON.stringify(apiIncludes),
                notags: JSON.stringify(apiExcludes),
                orders: JSON.stringify(news.sorts)
            };

            const unchanged = Object.keys(apiQuery).every(
                key => apiQuery[key] === this.lastApiQuery[key]
            );
            if (unchanged) {
                return;
            }

            this.$emit('update-api-query', apiQuery);
            this.lastApiQuery = apiQuery;
        }
    },
    watch: {
        filters: {
            handler(newFilters) {
                this.onFiltersPropUpdated(newFilters);
            },
            deep: true,
            immediate: true
        }
    },
    i18n: {
        messages: {
            zh: {
                hints: {
                    includes: '过滤录像类型',
                    excludes: '剔除录像类型',
                    sorts: '排序方式'
                },
                sortBy: {
                    id: '上传时间',
                    timeStamp: '录像日期',
                    totalFrames: '录像时长',
                    fileSize: '文件大小',
                    downloads: '下载数量'
                },
                sortOrder: {
                    ASC: '升序',
                    DESC: '降序'
                }
            }
        }
    }
});
</script>
<style scoped>
.replay-filters {
    padding: 0.5em;
}

.replay-filters .includes .ti-tag,
.replay-filters .includes .ti-selected-item {
    background: darkgreen;
}

.replay-filters .excludes .ti-tag,
.replay-filters .excludes .ti-selected-item {
    background: darkred;
}

.replay-filters .sorts .ti-tag,
.replay-filters .sorts .ti-selected-item {
    background: darkcyan;
}

.replay-filters input::placeholder {
    color: lightgray;
}

.replay-filters .ti-autocomplete {
    background: #202020;
    color: lightgray;
}
</style>
