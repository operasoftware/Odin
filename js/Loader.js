function Loader(doneCallback) {
    this.outstandingRequests = 0;
    this.loadingDone = [doneCallback];
};

Loader.prototype = new (function LoaderPrototype() {

    this.load = function(file, callback) {
        this.outstandingRequests++;
        var request = new XMLHttpRequest();
        var thisObj = this;
        request.onreadystatechange = function() {
            if (request.readyState == 1) {
              request.overrideMimeType('application/json');
              request.send();
            }

            if (request.readyState == 4) {
                if (request.status == 404) {
                    alert('file does not exist');
                } else {
                    callback(request.responseText);
                }
                thisObj.decOutstandingRequests();
            }
        }
        request.open('GET', file, true);
        //request.open('GET', file + '?' + (new Date()).getTime(), true); // Debug, don't cache anything!
    }

    this.addRequest = function() {
        this.outstandingRequests++;
    }

    this.decOutstandingRequests = function() {
        this.outstandingRequests--;
        if (this.outstandingRequests == 0) {
            for (var j = 0; j < this.loadingDone.length; ++j) {
                this.loadingDone[j]();
            }
        }
    }

    this.fullyLoaded = function() {
        return this.outstandingRequests == 0;
    }

    this.addCallback = function(cb) {
        this.loadingDone.push(cb);
    }
})();
