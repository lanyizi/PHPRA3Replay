export const isString = (x: any): x is string => {
    return typeof x === 'string';
}

export const arrayEquals = <T>(
    array1: T[],
    array2: T[],
    elementEquals: (x: T, y: T) => boolean = (x, y) => x === y
) => {
    return (array1.length === array2.length) &&
        array1.every((x, i) => elementEquals(x, array2[i]));
}

export const asArray = <T>(
    array: unknown,
    typeChecker: (x: any) => x is T
) => {
    return Array.isArray(array) ? array.filter(typeChecker) : [];
}

export const isAnyOf = <T>(check: T, ...values: T[]) => {
    return values.includes(check);
}