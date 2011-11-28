/* ex: set tabstop=4 expandtab: */
function Mesh(scene, json, shadowCaster, shadowReceiver) {
    Node.call(this, scene, json);
    scene.loader.addRequest();
    this.loadingDone = function() { scene.loader.decOutstandingRequests(); };
    this.outstandingRequests = 0;
    this.shadowCaster = shadowCaster;
    this.shadowReceiver = shadowReceiver;
    var thisObj = this;
    this.doFileRequest(json.file, function(txt) { thisObj.handleMeshLoaded(txt); });
    this.animationLOD = 0;
};

function MeshPrototype() {
    // Load the requested file and call back with the content once loaded.
    this.doFileRequest = function(file, callback) {
        this.outstandingRequests++;
        var request = new XMLHttpRequest();
        var thisObj = this;
        request.onreadystatechange = function() {
            if (request.readyState == 1) {
              request.overrideMimeType('application/json');
              request.send();
            }

            if (request.readyState == 4) {
                callback(request.responseText);
                thisObj.outstandingRequests--;
                if (thisObj.outstandingRequests == 0) {
                    thisObj.initMesh();
                    thisObj.loadingDone.call();
                }
            }
        }
        request.open('GET', file, true);
    }

    this.handleMeshLoaded = function (txt) {

        this.json = JSON.parse(txt);

        var thisObj = this;
        this.materials = new Array();
        this.materialStarts = new Array();
        for (var m in this.json.materials) {
            var mat = this.json.materials[m];
            this.outstandingRequests++;
            this.materialStarts.push(mat.start);
            this.materials.push(materialCache.loadMaterial(mat.file, function() { thisObj.handleMaterialLoaded(mat); }, thisObj.shadowReceiver));
        }
        if (this.shadowCaster) {
            this.outstandingRequests += 2;
            this.shadowGenMaterial = materialCache.loadMaterial('shadowgen', function() { thisObj.handleMaterialLoaded(mat); });
            this.shadowGenSkinnedMaterial = materialCache.loadMaterial('shadowgenskinned', function() { thisObj.handleMaterialLoaded(mat); });
        }
    }

    this.handleMaterialLoaded = function (mat) {
        this.outstandingRequests--;
        if (this.outstandingRequests == 0) {
            this.initMesh();
            this.loadingDone.call();
        }
    }

    this.initMesh = function () {

        this.needsTexCoord = false;
        this.needsNormals = false;
        this.needsEmissiveTexCoord = false;
        for (var m in this.materials) {
            var mat = this.materials[m];
            this.needsTexCoord |= mat.hasTexture();
            this.needsEmissiveTexCoord |= mat.hasEmissiveTex;
            this.needsNormals |= (mat.type != 'matte' && mat.type != 'custom' && mat.type != 'shadowmap');
        }

        if (this.needsNormals) {
            this.mVertexNormalBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexNormalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.json.vertexNormals[0]), gl.STATIC_DRAW);
            this.mVertexNormalBuffer.itemSize = 3;
            this.mVertexNormalBuffer.numItems = this.json.vertexNormals[0].length / 3;
        }

        if (this.needsTexCoord) {
            // UV coordinates
            this.mVertexTextureCoordBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexTextureCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.json.vertexTextureCoords[0]), gl.STATIC_DRAW);
            this.mVertexTextureCoordBuffer.itemSize = 2;
            this.mVertexTextureCoordBuffer.numItems = this.json.vertexTextureCoords[0].length / 2;
        }

        if (this.needsEmissiveTexCoord && this.json.vertexTextureCoords.length >= 1) {
            // Emissive texture UV coordinates (light map)
            this.mVertexEmissiveTexCoordBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexEmissiveTexCoordBuffer);
            var emissiveTexCoords = this.json.vertexTextureCoords.length > 1 ?
                                    this.json.vertexTextureCoords[1] :
                                    this.json.vertexTextureCoords[0];
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(emissiveTexCoords), gl.STATIC_DRAW);
            this.mVertexEmissiveTexCoordBuffer.itemSize = 2;
            this.mVertexEmissiveTexCoordBuffer.numItems = emissiveTexCoords.length / 2;
        }

        this.mVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.json.vertexPositions[0]), gl.STATIC_DRAW);
        this.mVertexPositionBuffer.itemSize = 3;
        this.mVertexPositionBuffer.numItems = this.json.vertexPositions[0].length / 3;

        this.mVertexIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mVertexIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.json.indices), gl.STATIC_DRAW);
        this.mVertexIndexBuffer.itemSize = 3;
        this.mVertexIndexBuffer.numItems = this.json.indices.length;

        this.lod = [{}];
        var lod0 = this.lod[0];

        // Multiply together BSM and IBMi as they're constant.
        // NOTE: The json format stores the matrices in row major to make them easier to read.
        if (this.json.bindShapeMatrix && this.json.invBindMatrices) {
          var a = this.json.bindShapeMatrix;
          var bsm = M4x4().make(a[0], a[4], a[8], a[12], a[1], a[5], a[9], a[13], a[2], a[6], a[10], a[14], a[3], a[7], a[11], a[15]);

          lod0.jointInvBindMatrices = [];
          for (var j = 0; j < this.json.invBindMatrices.length; j += 16) {
              var a = this.json.invBindMatrices;
              var m = M4x4().make(a[j+0], a[j+4], a[j+8], a[j+12], a[j+1], a[j+5], a[j+9], a[j+13], a[j+2], a[j+6], a[j+10], a[j+14], a[j+3], a[j+7], a[j+11], a[j+15]);
              var mul = bsm.copy().multiply(m);
              lod0.jointInvBindMatrices = lod0.jointInvBindMatrices.concat(mul.flatten());
          }
        }

        if (this.json.vertexWeights) {
            this.mVertexWeightBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexWeightBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.json.vertexWeights), gl.STATIC_DRAW);
            this.mVertexWeightBuffer.itemSize = 4;
            this.mVertexWeightBuffer.numItems = this.json.vertexWeights.length / 4;
        }

        if (this.json.jointIndices) {
            lod0.mVertexJointIndexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, lod0.mVertexJointIndexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.json.jointIndices), gl.STATIC_DRAW);
            lod0.mVertexJointIndexBuffer.itemSize = 4;
            lod0.mVertexJointIndexBuffer.numItems = this.json.jointIndices.length / 4;
        }

        lod0.jointNames = this.json.jointNames;
    }

    this.deleteBuffer = function(buf) {
        if (buf) {
            gl.deleteBuffer(buf);
        }
    }

    this.deinit = function() {
        this.deleteBuffer(this.mVertexNormalBuffer);
        this.deleteBuffer(this.mVertexTextureCoordBuffer);
        this.deleteBuffer(this.mVertexEmissiveTexCoordBuffer);
        this.deleteBuffer(this.mVertexPositionBuffer);
        this.deleteBuffer(this.mVertexIndexBuffer);
        if (this.hasOwnProperty('lod')) {
            for (var i = 0; i < this.lod.length; ++i) {
                this.deleteBuffer(this.lod[i].mVertexWeightBuffer);
                this.deleteBuffer(this.lod[i].mVertexJointIndexBuffer);
            }
        }
    }

    this.setupLODMeshes = function(lod) {
        var lod0 = this.lod[0];
        for (var j = 0; j < lod.length; ++j) {
            this.lod[j+1] = {};
            var thislod = this.lod[j+1];
            var mapping = {};
            for (var n = 0; n < lod0.jointNames.length; ++n) {
                var jointName = lod0.jointNames[n];
                var mapToName = lod[j][jointName];
                if (mapToName == jointName) {
                    mapping[n] = { mapto : n, thisind : -1 };
                } else {
                    for (var k = 0; k < lod0.jointNames.length; ++k) {
                        if (mapToName == lod0.jointNames[k]) {
                            mapping[n] = { mapto: k, thisind : -1 };
                            break;
                        }
                    }
                    if (!mapping.hasOwnProperty(n.toString())) { alert('Could not find the mapping!') }
                }
            }
            var num = 0;
            for (var k = 0; k < lod0.jointNames.length; ++k) {
                if (mapping[k].mapto == k) {
                    mapping[k].thisind = num;
                    ++num;
                }
            }

            if (lod0.jointInvBindMatrices) {
                thislod.jointInvBindMatrices = [];
                for (var x = 0; x < lod0.jointInvBindMatrices.length; x += 16) {
                    if (mapping[x / 16].mapto == x / 16) {
                        for (c = x; c < x + 16; ++c) {
                            thislod.jointInvBindMatrices[thislod.jointInvBindMatrices.length] = lod0.jointInvBindMatrices[c];
                        }
                    }
                }
            }

            if (this.json.jointIndices) {
                var jointIndices = new Array(this.json.jointIndices.length);
                for (var x = 0; x < this.json.jointIndices.length; ++x) {
                    jointIndices[x] = mapping[mapping[this.json.jointIndices[x]].mapto].thisind;
                }

                thislod.mVertexJointIndexBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, thislod.mVertexJointIndexBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(jointIndices), gl.STATIC_DRAW);
                thislod.mVertexJointIndexBuffer.itemSize = 4;
                thislod.mVertexJointIndexBuffer.numItems = jointIndices.length / 4;
            }

            if (this.json.jointNames)
            {
                thislod.jointNames = [];
                for (var x = 0; x < this.json.jointNames.length; ++x) {
                    if (mapping[x].mapto == x) {
                        thislod.jointNames[thislod.jointNames.length] = this.json.jointNames[x];
                    }
                }
            }
        }
        this.json = null;
    }

    this.getCurrentLOD = function() {
        if (!this.hasOwnProperty('lod')) return undefined;
        var currLOD = globalMaterialProperties.hasOwnProperty('animationLOD') ? globalMaterialProperties.animationLOD : this.animationLOD;
        return this.lod[currLOD >= this.lod.length ? this.lod.length - 1 : currLOD];
    }

    this.drawShadow = function (jointMatrices, light) {
        if (!this.shadowCaster) {
            return;
        }

        var thislod = this.getCurrentLOD();

        var lights = light ? [light] : [];

        if (thislod && thislod.jointNames) {
            this.jointMatrices = []
            for (var i = 0; i < thislod.jointNames.length; ++i) {
                var jointName = thislod.jointNames[i];
                if (jointMatrices[jointName]) {
                    this.jointMatrices = this.jointMatrices.concat(M4x4().make(jointMatrices[jointName]).flatten());
                } else {
                    this.jointMatrices = this.jointMatrices.concat(I4x4().flatten());
                }
            }
        }

        for (var m = 0; m < this.materials.length; ++m) {
            var mat = this.materials[m];
            var start = this.materialStarts[m];
            var end = this.mVertexIndexBuffer.numItems;
            if (m + 1 != this.materials.length)
                end = this.materialStarts[m + 1];

            if (mat.skinned)
                mat = this.shadowGenSkinnedMaterial;
            else
                mat = this.shadowGenMaterial;
            mat.enable(lights);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexPositionBuffer);
            gl.vertexAttribPointer(mat.shaderProgram.vertexPositionAttribute, this.mVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mVertexIndexBuffer);

            if (mat.skinned) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexWeightBuffer);
                gl.vertexAttribPointer(mat.shaderProgram.aVertexWeights, this.mVertexWeightBuffer.itemSize, gl.FLOAT, false, 0, 0);
                gl.bindBuffer(gl.ARRAY_BUFFER, thislod.mVertexJointIndexBuffer);
                gl.vertexAttribPointer(mat.shaderProgram.aJointIndices, thislod.mVertexJointIndexBuffer.itemSize, gl.FLOAT, false, 0, 0);
                gl.uniformMatrix4fv(mat.shaderProgram.jointInvBindMatrices, false, thislod.jointInvBindMatrices);
                gl.uniformMatrix4fv(mat.shaderProgram.jointMatrices, false, this.jointMatrices);
            }

            gl.drawElements(gl.TRIANGLES, end - start, gl.UNSIGNED_SHORT, start * 2);

            mat.disable(lights);
        }
    }

    this.draw = function (jointMatrices, lights) {

        var thislod = this.getCurrentLOD();

        if (thislod && thislod.jointNames) {
            this.jointMatrices = []
            for (var i = 0; i < thislod.jointNames.length; ++i) {
                var jointName = thislod.jointNames[i];
                if (jointMatrices[jointName]) {
                    this.jointMatrices = this.jointMatrices.concat(M4x4().make(jointMatrices[jointName]).flatten())
                } else {
                    this.jointMatrices = this.jointMatrices.concat(I4x4().flatten());
                }
            }
        }

        for (var m = 0; m < this.materials.length; ++m) {
            var mat = this.materials[m];
            var start = this.materialStarts[m];
            var end = this.mVertexIndexBuffer.numItems;
            if (m + 1 != this.materials.length)
                end = this.materialStarts[m + 1];

            mat.enable(lights);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexPositionBuffer);
            gl.vertexAttribPointer(mat.shaderProgram.vertexPositionAttribute, this.mVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

            if (mat.type != 'matte' && mat.type != 'custom' && mat.type != 'shadowmap') {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexNormalBuffer);
                gl.vertexAttribPointer(mat.shaderProgram.vertexNormalAttribute, this.mVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
            }

            if (mat.hasTexture()) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexTextureCoordBuffer);
                gl.vertexAttribPointer(mat.shaderProgram.textureCoordAttribute, this.mVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
            }

            if (mat.hasEmissiveTex) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexEmissiveTexCoordBuffer);
                gl.vertexAttribPointer(mat.shaderProgram.emissiveTexCoordAttribute, this.mVertexEmissiveTexCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
            }

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mVertexIndexBuffer);

            if (mat.skinned) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexWeightBuffer);
                gl.vertexAttribPointer(mat.shaderProgram.aVertexWeights, this.mVertexWeightBuffer.itemSize, gl.FLOAT, false, 0, 0);
                gl.bindBuffer(gl.ARRAY_BUFFER, thislod.mVertexJointIndexBuffer);
                gl.vertexAttribPointer(mat.shaderProgram.aJointIndices, thislod.mVertexJointIndexBuffer.itemSize, gl.FLOAT, false, 0, 0);
                gl.uniformMatrix4fv(mat.shaderProgram.jointInvBindMatrices, false, thislod.jointInvBindMatrices)
                gl.uniformMatrix4fv(mat.shaderProgram.jointMatrices, false, this.jointMatrices)
            }

            gl.drawElements(gl.TRIANGLES, end - start, gl.UNSIGNED_SHORT, start * 2);

            mat.disable(lights);
        }
    }

    this.update = function (jointMatrices) {
    }

}

MeshPrototype.prototype = Node.prototype;
Mesh.prototype = new MeshPrototype();


