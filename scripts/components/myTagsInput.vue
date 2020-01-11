<template>
    <vue-tags-input
        class="my-tags-input"
        :placeholder="placeholder"
        v-model="currentInput"
        :tags="tags"
        :autocomplete-items="availableTags"
        @tags-changed="emitTagsChanged($event)"
        :add-only-from-autocomplete="addOnlyFromAutocomplete"
        :autocomplete-min-length="0"
        :disabled="disabled"
    ></vue-tags-input>
</template>
<script lang="ts">
import Vue from 'vue';
import VueTagsInput from '@johmun/vue-tags-input';
import { asArray, isString } from '../utils';

export type Tag<T> = {
    text: string;
    tiClasses?: string[] | null;
    value: T;
};

const isUnknown = (x: unknown): x is unknown => true;
const isUnknownTag = (x: unknown): x is Tag<unknown> => {
    if (!x) {
        return false;
    }

    const value = x as any;
    return typeof value.text === 'string' && value.value !== 'undefined';
};

export default Vue.extend({
    components: {
        'vue-tags-input': VueTagsInput
    },
    data() {
        return {
            currentInput: ''
        };
    },
    props: {
        placeholder: String,
        values: Array,
        autocompleteItems: Array,
        addOnlyFromAutocomplete: Boolean,
        autocompleteMinLength: Number,
        customValuesToTags: Function,
        customTagsToValues: Function,
        disabled: Boolean
    },
    computed: {
        tags(): Tag<unknown>[] {
            return this.toTags(this.values);
        },
        availableTags(): Tag<unknown>[] {
            return this.toTags(this.autocompleteItems);
        }
    },
    methods: {
        toTags(values: unknown): Tag<unknown>[] {
            const array = asArray(values, isUnknown);

            if (typeof this.customValuesToTags === 'function') {
                return this.customValuesToTags(array);
            }

            return array.map(value => ({
                text: `${this.$t(`${value}`)}`,
                value
            }));
        },
        emitTagsChanged(tags: unknown) {
            const validTags = asArray(tags, isUnknownTag).filter(tag =>
                asArray(tag.tiClasses, isString).includes('ti-valid')
            );

            const processed =
                typeof this.customTagsToValues === 'function'
                    ? this.customTagsToValues(validTags)
                    : validTags.map(tag => tag.value || tag.text);
            this.$emit('tags-changed', processed);
        }
    },
    i18n: {
        messages: {
            zh: {}
        }
    }
});
</script>
<style scoped>
.vue-tags-input.my-tags-input input {
    font-size: 100%;
}

.vue-tags-input.my-tags-input {
    display: inline-block;
    background: inherit;
    color: inherit;
}

.vue-tags-input.my-tags-input * {
    border-color: gray;
}

.vue-tags-input.my-tags-input .ti-autocomplete {
    background: #202020;
    color: lightgray;
}
</style>