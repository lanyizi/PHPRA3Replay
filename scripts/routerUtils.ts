import { Route } from 'vue-router';

export type Query = Route['query'];
export type QueryValue = Query[string];
export type InputQuery = Record<string, string | undefined>;
export type InputQueryValue = InputQuery[string];

export const firstString = (arg: QueryValue) => {
    if (Array.isArray(arg)) {
        return arg.find(_ => true) || null;
    }
    return arg;
}