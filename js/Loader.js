function Loader(doneCallback) {
    this.outstandingRequests = 0;
    this.loadingDone = doneCallback;
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
    }

    this.addRequest = function() {
        this.outstandingRequests++;
    }

    this.decOutstandingRequests = function() {
        this.outstandingRequests--;
        if (this.outstandingRequests == 0) {
            this.loadingDone();
        }
    }

    this.fullyLoaded = function() {
        return this.outstandingRequests == 0;
    }
})();
