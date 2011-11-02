'use strict';

window.materialCache = {
    loadedMaterials : [],

    newMaterialLoaded : function (filename) {
        var mat = this.loadedMaterials[filename];
        InfoMessage('New material ' + filename + ' is loaded.');
        for(var l in mat.listeners) {
            mat.listeners[l](mat.material);
        }
        mat.listeners = [];
    },

    loadMaterial : function (filename, callback, shadowReceiver) {
        if (this.loadedMaterials[filename]) {
            if (this.loadedMaterials[filename].material.outstandingRequests) {
                this.loadedMaterials[filename].listeners.push(callback);
            } else {
                callback(filename);
            }
        } else {
            var that = this;
            var json = undefined;
            if (filename === 'shadowgen') {
                json = { 'name': 'shadowgen', 'diffuse': [0, 0, 0, 1], 'type': 'shadowmap' };
            } else if (filename === 'shadowgenskinned') {
                json = { 'name': 'shadowgenskinned', 'diffuse': [0, 0, 0, 1], 'type': 'shadowmap', 'skinned': true };
            }
            this.loadedMaterials[filename] = {'material' : new Material(json ? json : filename, function() { that.newMaterialLoaded(filename); }, shadowReceiver), 'listeners' : [callback]};
        }
        return this.loadedMaterials[filename].material;
    }
};
