// Load .vue files with RequireJs
// mainLoader.ts must be loaded before this one

// Based on:
// https://github.com/chitoku-k/homomaid.vue
// https://github.com/FranckFreiburger/http-vue-loader/pull/59#issuecomment-449585300
// https://github.com/vuejs/vue-loader/blob/c8a212518829a010877de66dcd35cf72a091b983/lib/runtime/componentNormalizer.js#L18

// TODO: code inside <template> is not transpiled, 
//       so they might not work on old browsers

import httpVueLoader from 'http-vue-loader';
import require from 'require';
import module from 'module';
import { asyncRequire, importDefault, tsTranspiler } from '../mainLoader';


httpVueLoader.httpRequest = (url: string) =>
    fetch(url).then(response => response.text());

httpVueLoader.scriptExportsHandler = async function (script: string) {
    const [component] = await asyncRequire(require, [this.component.name]);
    const defaultExport = importDefault(component);

    // Vue.extend constructor export interop
    return typeof defaultExport === 'function'
        ? defaultExport.options
        : defaultExport;
}

httpVueLoader.langProcessor.ts = function (code: string) {
    code = `///<amd-module name="${this.name}" />\r\n${code}`;
    return tsTranspiler(code);
}    

const loader: MyLoader = {
    loaderId: module.id,
    async load(context) {
        const { name, parentRequire } = context;
        if (!name.toLowerCase().endsWith('.vue')) {
            return false;
        }
        
        const sfcUrl: string = parentRequire.toUrl(name);

        const vueComponent = await httpVueLoader(sfcUrl, name)();
        const [fullModule] = await asyncRequire(parentRequire, [name]);

        if (fullModule.__esModule) {
            fullModule.default = vueComponent;
            context.onload(fullModule);
        }
        else {
            context.onload(vueComponent);
        }
        
        return true;
    }
}

export default loader;