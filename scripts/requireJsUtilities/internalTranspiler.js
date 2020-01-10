// Typescript transpiler wrapper, and loader of loaders.
define(['typescript', 'module'], function (ts, module) {

    function fetchCompilerOptions(url, timeout) {
        return Promise.race([
            fetch(url).then(function(response) {
                if(!response.ok) {
                    throw Error('response not ok');
                }
                return response.json();
            }).then(function (json) {
                return json.compilerOptions || {};
            }),
            new Promise(function(resolve, reject) {
                setTimeout(
                    function() { reject(Error('timeout reached')); }, 
                    timeout
                );
            })
        ]);
    }

    var defaultCompilerOptions = {
        target: "es5",
        module: "amd",
        lib: ["es6", "dom"],
        esModuleInterop: true,
    }

    var jsConfig = fetchCompilerOptions('jsconfig.json', 5000)
        .catch(function () { return defaultCompilerOptions; })
        .then(function (compilerOptions) {
            compilerOptions.allowJs = true;
            return compilerOptions;
        });
    
    var tsConfig = fetchCompilerOptions('tsconfig.json', 5000)
        .catch(function () { return jsConfig; });

    function transpile(scriptText, transformers) {
        return tsConfig.then(function (compilerOptions) {
            compilerOptions = Object.assign(defaultCompilerOptions, compilerOptions);
            // Force amd as the module kind
            compilerOptions.module = 'amd';

            var transpileOptions = {
                reportDiagnostics: true,
                compilerOptions: compilerOptions,
                transformers: transformers
            };

            try {
                var result = ts.transpileModule(scriptText, transpileOptions);
                var transpiled = result.outputText + '';
                return transpiled;
            }
            catch (exception) {
                throw exception;
            }
        });
    }

    function loadLoader(name, req, onload, config) {
        // assume loaders are written in typescript too
        fetch(req.toUrl(name + '.ts'))
            .then(function (response) { return response.text(); })
            .then(function (text) { return transpile(text); })
            .then(function (transpiled) { onload.fromText(transpiled); })
            .catch(function (reason) {
                var what = 'Cannot load loader ' + name + ': ' + reason;
                onload.error(Error(what));
            });
    }

    return {
        load: loadLoader,
        moduleId: module.id,
        transpile: transpile
    };
})