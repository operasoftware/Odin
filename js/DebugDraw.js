/*
 DebugDraw:

 draw()
 Draws the queued up debug info and decrement life of all primitives with 1.

 drawLine(ax,ay,az,bx,by,bz,col,life)
 Draw a line from (ax,ay,az) to (bx,by,bz). A life of 0 means forever.
*/
function DebugDraw() {
    this.mVertexPositionBuffer = gl.createBuffer();
    this.lines = new Array();
    this.initialize();
}

DebugDraw.prototype = new (function DebugDrawPrototype(callback) {
    Object.defineProperty(this, 'RED', { value : 0 });
    Object.defineProperty(this, 'GREEN', { value : 1 });
    Object.defineProperty(this, 'BLUE', { value : 2 });
    Object.defineProperty(this, 'WHITE', { value : 3 });
    Object.defineProperty(this, 'BLACK', { value : 4 });
    Object.defineProperty(this, 'cols', { value : [[1, 0, 0, 1], [0, 1, 0, 1], [0, 0, 1, 1], [1, 1, 1, 1], [0, 0, 0, 1]] });
    this.outstandingRequests = 0;
    this.initialized = false;

    this.handleMaterialLoaded = function (mat) {
        this.outstandingRequests--;
    }

    this.draw = function () {
        if (!this.initialized || this.outstandingRequests != 0) {
            return;
        }

        modelMatrix().makeIdentity();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexPositionBuffer);
        var arr = new Array();
        for (var c in this.lines) {
            arr = arr.concat(this.lines[c].verts);
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.DYNAMIC_DRAW);

        for (var c in this.lines) {
            var line = this.lines[c];
            var mat = this.materials[line.col];
            pushModelMatrix(line.mmat);
            gl.vertexAttribPointer(mat.shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
            mat.enable();
            gl.drawArrays(gl.LINES, c * 2, 2);
            mat.disable();
            popModelMatrix();
        }

        for (var c = 0; c < this.lines.length;) {
            if (this.lines[c].life > 0) {
                this.lines[c].life -= 1;
                if (this.lines[c].life == 0) {
                    this.lines.splice(c, 1);
                    continue;
                }
            }
            ++c;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    
    this.drawLine = function(ax, ay, az, bx, by, bz, col, life) {
        this.lines.push({ 'verts' : [ax, ay, az, bx, by, bz], 'col' : col, 'life' : life, 'mmat' : modelMatrix().copy() });
    }

    this.initialize = function() {
        if (!this.initialized) {
          this.initialized = true;
          this.materials = new Array();

          var thisObj = this;
          var tempMat = { 'name': 'debugmaterial', 'diffuse': [1, 1, 1, 1], 'type' : 'matte' };
          for (var c in this.cols) {
              tempMat.diffuse = this.cols[c];
              this.outstandingRequests++;
              this.materials.push(new Material(tempMat, function(mat) { thisObj.handleMaterialLoaded(mat); }));
          }
        }
    }
})();

