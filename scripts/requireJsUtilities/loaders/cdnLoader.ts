// Allow *.ts files to import modules already compiled to js from CDN

import module from 'module';
import { asyncRequire } from '../mainLoader';

const objectHasKey = (object: any, key: string) =>
    Object.prototype.hasOwnProperty.call(object, key);

const cdnLoader: MyLoader = {
    loaderId: module.id,
    async load(context: LoaderContext) {
        const name = context.name;
        // If not specified in config.paths, 
        // then it shouldn't be loaded by CDN loader
        if (!objectHasKey(context.config.paths, name)) {
            return false;
        }

        const [external] = await asyncRequire(context.parentRequire, [name]);
        context.onload(external);
        return true;
    }
}

export default cdnLoader;