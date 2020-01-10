// Treats any input files as .ts files and transpiles them

import module from 'module';
import { tsTranspiler } from '../mainLoader'

const loader: MyLoader = {
    loaderId: module.id,
    async load(context: LoaderContext) {
        const url = context.parentRequire.toUrl(`${context.name}.ts`);
        const response = await fetch(url);
        if (!response.ok) {
            throw Error('failed to load ' + url);
        }
        const sourceCode = await response.text();
        const transpiled = await tsTranspiler(sourceCode);
        context.onload.fromText(transpiled);
        return true;
    }
}

export default loader;