
// require and module are from requirejs
declare module 'require' {
    const require: any;
    export default require;
}

declare module 'module' {
    const value: any;
    export default value;
}

declare module './internalTranspiler' {
    import ts from 'typescript';

    function define();

    interface InternalTranspiler {
        moduleId: string,
        load(...args: LoaderContext),
        transpile(
            code: string,
            transformer: ts.CustomTransformers
        ): Promise<string>;
    }

    const value: InternalTranspiler;
    export default value;
}

interface LoaderContext {
    name: string;
    parentRequire: any;
    onload: any;
    config: any;
}

interface MyLoader {
    loaderId: string;
    load(context: LoaderContext): Promise<boolean>;
}

declare module 'http-vue-loader' {
    const httpVueLoader: any;
    export default httpVueLoader;
}