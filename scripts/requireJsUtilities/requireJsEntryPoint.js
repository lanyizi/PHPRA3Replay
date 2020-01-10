// Parse dependencies from package.json
// Then load typescript to compile loaders
// And then use compiled loaders to load main.ts
function requireJsEntryPoint(
    baseUrl,
    onComplete,
    onError
) {

    if (typeof onComplete !== 'function') {
        onComplete = function () { };
    }

    if (typeof onError !== 'function') {
        onError = function (error) { throw error; };
    }

    function isObject(what) {
        return (!!what) && typeof what === 'object';
    }

    function mapObjectEntries(object, handler) {
        return Object.fromEntries(
            Object.entries(object || {}).map(handler)
        );
    }

    // Parse package.json
    function parsePaths(config) {
        if (typeof config !== 'object') {
            throw 'invalid config';
        }

        var lanyiConfig = config['lanyi@ra3.moe'];
        if (!isObject(lanyiConfig)) {
            throw 'Invalid config: lanyiConfig';
        }

        var lanyiConfigCdn = lanyiConfig.cdn;
        if (!isObject(lanyiConfigCdn)) {
            throw 'Invalid config: lanyiConfig.cdn';
        }

        var defaultPath = lanyiConfigCdn.defaultPath;
        if (typeof defaultPath !== 'string') {
            throw 'Invalid config: lanyiConfig.cdn.defaultPath';
        }

        var dependencies = config.dependencies;
        if (!isObject(dependencies)) {
            throw 'Invalid config: dependencies';
        }

        function normalizePathConfig(currentConfig) {
            if (!isObject(currentConfig) ||
                !currentConfig.hasOwnProperty('name')) {
                throw 'createPathConfig: Invalid parameter';
            }

            if (!currentConfig.hasOwnProperty('version')) {
                currentConfig.version = '*';
            }

            if (!currentConfig.hasOwnProperty('path')) {
                currentConfig.path = defaultPath
                    .replace(':name', currentConfig.name)
                    .replace(':version', currentConfig.version);
            }

            return currentConfig;
        }

        function dependencyMapper(keyValue) {
            var name = keyValue[0];
            var version = keyValue[1];

            return [
                name,
                normalizePathConfig({ name: name, version: version })
            ];
        }
        var pathConfigs = mapObjectEntries(dependencies, dependencyMapper);

        function customPathSetter(keyValue) {
            var name = keyValue[0];
            var pathConfig = keyValue[1];
            if (!pathConfigs.hasOwnProperty(name)) {
                if (!pathConfig.hasOwnProperty('name')) {
                    pathConfig.name = name;
                }
                pathConfigs[name] = normalizePathConfig(pathConfig);
            }
            else {
                Object.assign(pathConfigs[name], pathConfig);
            }
        }
        Object.entries(lanyiConfigCdn.paths || {}).forEach(customPathSetter);

        var cdnUrl = lanyiConfigCdn.cdnUrl;
        if (typeof cdnUrl !== 'string') {
            throw 'Invalid config: lanyiConfig.cdn.cdnUrl';
        }
        
        return mapObjectEntries(pathConfigs, function (keyValue) {
            var name = keyValue[0];
            var pathConfig = keyValue[1];
            
            var jsExtension = '.js';
            var pathWithoutExtension = pathConfig.path;
            if (pathWithoutExtension.toLowerCase().endsWith('.js')) {
                pathWithoutExtension =
                    pathWithoutExtension.slice(0, -jsExtension.length);
            }

            return [
                name,
                cdnUrl
                    .replace(':name', pathConfig.name)
                    .replace(':version', pathConfig.version)
                    .replace(':path', pathWithoutExtension)
            ];
        });
    }

    function onPackageJsonReady(data) {
        var configs = {
            // To get timely, correct error triggers in IE, 
            // force a define/ shim exports check.
            enforceDefine: true,
            baseUrl: baseUrl,
            paths: parsePaths(data),
            waitSeconds: 15,
        };

        // Configure requirejs
        requirejs.config(configs);
        requirejs.onError = function (error) {
            onError(error);
            throw error;
        }

        // Define typescript module
        // We could load the 'real' typescript.js, 
        // but there isn't a minified version yet
        // So we use this hacky way to load from
        // monaco editor:
        // Load typescript
        var monacoTsModuleName =
            'vs/language/typescript/lib/typescriptServices';
        define('typescript', [monacoTsModuleName], function (ts) {
            return ts;
        });

        var internalTranspiler = 'requireJsUtilities/internalTranspiler';
        var mainLoader = 'requireJsUtilities/mainLoader';
        // Load mainLoader
        require([internalTranspiler + '!' + mainLoader], function () {
            // Load main module with plugin mainLoader
            require([mainLoader + '!main'], function () {
                onComplete();
            });
        });
    }

    fetch('/package.json')
        .then(function (response) { return response.json() })
        .then(onPackageJsonReady)
        .catch(function (reason) {
            onError(reason);
        });
}