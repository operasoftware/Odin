'use strict';

window.textureCache = {
    loadedTextures : [],

    newTextureLoaded : function (filename) {
        var tex = this.loadedTextures[filename];
        gl.bindTexture(gl.TEXTURE_2D, tex.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);        
        InfoMessage('New texture ' + filename + ' is loaded.');
        for(var l in tex.listeners) {
            tex.listeners[l](tex.texture);
        }
        tex.listeners = [];
    },

    loadTexture : function (filename, callback) {
        if (this.loadedTextures[filename]) {
            if (this.loadedTextures[filename].texture.outstandingRequests) {
                this.loadedTextures[filename].listeners.push(callback);
            } else {
                callback(filename);
            }
        } else {
            var that = this;
            var tex = gl.createTexture();
            var image = new Image();
            image.onload = function () {
                that.newTextureLoaded(filename);
            }
            this.loadedTextures[filename] = {'texture' : tex, 'image' : image, 'listeners' : [callback]};
            image.src = filename;
        }
        return this.loadedTextures[filename].texture;
    }
};
