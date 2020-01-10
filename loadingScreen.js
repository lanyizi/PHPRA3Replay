(function () {
    function wait(milliseconds) {
        return new Promise(function (resolve) {
            setTimeout(resolve, milliseconds);
        });
    }

    var startTime = Date.now();
    var requireJsStart = requirejs.s.contexts._.startTime;
    startTime = Math.min(startTime, requireJsStart) || startTime;

    /** @type {Set<string>} */
    var moduleSnapshot = new Set();
    var loadingList = document.getElementById('initializing');
    var lastUpdate = Date.now();
    var repeatHandle = undefined;

    function clearMyInterval() {
        if (repeatHandle !== undefined) {
            clearInterval(repeatHandle);
            repeatHandle = undefined;    
        }
    }

    window.addMyLoadingListItem = function (content, isError) {
        var last = document.createElement('li');
        if (isError) {
            last.classList.add('my-load-error');
        }
        last.innerText = content.toString();
        loadingList.appendChild(last);
    }

    function getProportionalWaitTime(totalSeconds, wait) {
        var pivot = 3;
        var minReference = 0.5;
        var maxReference = 7;
        totalSeconds = Math.min(totalSeconds, maxReference);
        totalSeconds = Math.max(totalSeconds, minReference)
        var ratio = totalSeconds / pivot;
        return wait * ratio;
    }

    window.makeMyLoadingListComplete = function () {
        clearMyInterval();
        var seconds = (Date.now() - startTime) / 1000;
        var message = 'Completed after ' + seconds + ' seconds!';
        function proportional(waitTime) {
            return getProportionalWaitTime(seconds, waitTime);
        }
        
        wait(proportional(500)).then(function () {
            window.addMyLoadingListItem(message);
            loadingList.classList.add('fade-out');
            return wait(proportional(1500));
        }).then(function () {
            loadingList.parentNode.removeChild(loadingList);
        });
    }

    window.addMyLoadingListItem('Loading modules...');

    repeatHandle = setInterval(function () {
        try {
            var moduleList = Object.keys(requirejs.s.contexts._.defined);
            moduleList.forEach(function (name) {
                name = name.substr(name.lastIndexOf('!') + 1);
                
                if (moduleSnapshot.has(name)) {
                    return;
                }

                moduleSnapshot.add(name);
                window.addMyLoadingListItem('Loading ' + name);
                lastUpdate = Date.now();
            });

            var waitSeconds = requirejs.s.contexts._.config.waitSeconds;
            var timeout = (waitSeconds || 7) * 2000;
            if ((Date.now() - lastUpdate) > timeout) {
                clearMyInterval();
            }
        }
        catch (error) {
            clearMyInterval();
            window.addMyLoadingListItem(error, true);
        }
    }, 100);
})();
