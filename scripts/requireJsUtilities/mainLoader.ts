import require from 'require';
import module from 'module';
import ts from 'typescript'
import internalTranspiler from './internalTranspiler';

export const asyncRequire = (
    requireFunction: Function,
    moduleNames: string[]
) => {
    return new Promise<any[]>((resolve, reject) => {
        requireFunction(moduleNames, function () {
            if (arguments.length < moduleNames.length) {
                reject(Error('asyncRequire: arguments < moduleNames'));
                return;
            }

            resolve(Array.from(arguments).slice(0, moduleNames.length));
        }, reject);
    });
}

export const importDefault = (targetModule: any) => 
    (targetModule && targetModule.__esModule)
        ? targetModule.default
        : targetModule;

// Used by importReWriter
const currentModuleId = module.id;

const loadingLoaders = (async () => {
    const loaderNames = [
        'cdnLoader',
        'httpVueTsLoader',
        'tsLoader'
    ];

    // load loaders with relative path, 
    // and using plugin internalTranspiler
    const loaderPaths = loaderNames.map(x =>
        `${internalTranspiler.moduleId}!./loaders/${x}`
    );
    const loaded = await asyncRequire(require, loaderPaths)
        
    return loaded.map(importDefault) as MyLoader[];
})();

// imports will be rewritten so they will be handled by mainLoader
const importRewriter = (context => {
    const visitor: ts.Visitor = node => {
        if (ts.isImportDeclaration(node)) {
            if (ts.isStringLiteral(node.moduleSpecifier)) {
                const moduleName = node.moduleSpecifier.text;
                // every import will be handled by current plugin
                const rewritten = `${currentModuleId}!${moduleName}`;
                node.moduleSpecifier = ts.createStringLiteral(rewritten);
            }
        }

        return ts.visitEachChild(node, visitor, context);
    }
    return node => ts.visitNode(node, visitor);
}) as ts.TransformerFactory<ts.SourceFile>;

// transpile typescript, with imports rewritten
export const tsTranspiler = (code: string) =>
    internalTranspiler.transpile(code, { before: [importRewriter] });

// Errors during module loading
class LoaderError extends Error {

    public innerError?: Error;

    constructor(reason: string, innerError?: Error) {
        if (!innerError) {
            super(reason);
            return;
        }

        super(`${reason}, inner error ${innerError}`);
        this.innerError = innerError;
        if (typeof this.stack === 'string' &&
            typeof innerError.stack === 'string') {
            this.stack = `${this.stack}\n${innerError.stack}`;
        }
    }
}

export async function load(
    name: string,
    parentRequire: any,
    onload: any,
    config: any
) {
    try {
        
        const loaders = await loadingLoaders;
        for (const loader of loaders) {

            const context: LoaderContext = {
                name,
                parentRequire,
                onload,
                config
            };

            try {
                if (await loader.load(context)) {
                    return;
                }
            }
            catch (why) {
                onload.error(new LoaderError(
                    `${loader.loaderId} Failed to load ${name}`,
                    why
                ));
            }
        }

        onload.error(new LoaderError(`No loaders accepted ${name}`));
    }
    catch (why) {
        onload.error(new LoaderError(`Failed to load ${name}`, why));
    }
};

