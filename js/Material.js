/* ex: set tabstop=4 expandtab: */

var globalConeTexture = null;

function getConeTexture() {
    if (globalConeTexture == null) {
        globalConeTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, globalConeTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Generate a spot cone image
        var conecanvas = document.createElement('canvas');
        var coneLevel = 0;
        var coneTexSize = 1024;
        conecanvas.width = coneTexSize;
        conecanvas.height = coneTexSize;
        var context = conecanvas.getContext('2d');

        if (coneTexSize > 2) {
            var gradient = context.createRadialGradient(coneTexSize/2, coneTexSize/2, 0, coneTexSize/2, coneTexSize/2, coneTexSize/2);
            gradient.addColorStop(0.00, 'rgba(255,255,255,1.0)');
            gradient.addColorStop(0.85, 'rgba(235,235,235,1.0)');
            gradient.addColorStop(0.95, 'rgba(155,155,155,1.0)');
            gradient.addColorStop(1.00, 'rgba(0,0,0,1.0)');
            context.fillStyle = gradient;
            context.arc(coneTexSize/2, coneTexSize/2, coneTexSize/2-1, 0, 360, false);
            context.fill();
        }

        gl.texImage2D(gl.TEXTURE_2D, coneLevel, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, conecanvas);
    }

    return globalConeTexture;
}

function Material(json, cback, shadowReceiver) {
    this.loadingDone = cback;
    this.outstandingRequests = 0;
    this.shadowReceiver = shadowReceiver;
    var thisObj = this;
    if (typeof(json) == 'string') {
        var idx = json.search('custom');
        if (idx != -1) {
            var custom = json.substr(idx + 'custom'.length);
            var dot = custom.search('\\.');
            if (dot != -1) {
                custom = custom.substr(0, dot);
            }
            this.doFileRequest(json, function(txt) { var obj = JSON.parse(txt); obj['type'] = 'custom'; obj['custom'] = custom; thisObj.initFromJSON(obj); });            
        } else {
            this.doFileRequest(json, function(txt) { thisObj.initFromJSON(JSON.parse(txt)); });
        }
    } else {
        thisObj.initFromJSON(json);
    }
};

function MaterialPrototype() {

    this.initFromJSON = function(jsonmaterial) {
        this.custom = jsonmaterial.custom;
        this.start = jsonmaterial.start;
        this.type = jsonmaterial.type;
        this.ambient = jsonmaterial.ambient;
        this.hasDiffuseTex = typeof(jsonmaterial.diffuse) == 'string';
        this.hasEmissiveTex = typeof(jsonmaterial.emission) == 'string';
        this.hasShininessTex = typeof(jsonmaterial.shininess) == 'string';
        this.hasNormalMapTex = typeof(jsonmaterial.bump) == 'string';
        this.hasSpecularTex = typeof(jsonmaterial.specular) == 'string';
        this.shininess = jsonmaterial.shininess;
        this.diffuse = jsonmaterial.diffuse;
        this.normalMap = jsonmaterial.bump;
        this.skinned = jsonmaterial.skinned;
        this.stitched = jsonmaterial.stitched;
        this.emission = jsonmaterial.emission;
        this.specular = jsonmaterial.specular;

        var thisObj = this;

        var standardFSCallback = function(txt, file) {
            var preprocessed = doPreprocess(txt, thisObj.defines);
            thisObj.handleFSShaderLoad(preprocessed, file);
        }

        var standardVSCallback = function(txt, file) {
            var preprocessed = doPreprocess(txt, thisObj.defines);
            thisObj.handleVSShaderLoad(preprocessed, file);
        }

        var texCallback = function(tex) {
            thisObj.requestCompleted();
        }

        if (this.hasDiffuseTex) {
            this.diffuseImage = this.doTextureRequest(this.diffuse, texCallback);
        }
        if (this.hasShininessTex) {
            this.shininessImage = this.doTextureRequest(this.shininess, texCallback);
        }
        if (this.hasNormalMapTex) {
            this.normalMapImage = this.doTextureRequest(this.normalMap, texCallback);
        }
        if (this.hasEmissiveTex) {
            this.emissionImage = this.doTextureRequest(this.emission, texCallback);
        }
        if (this.hasSpecularTex) {
            this.specularImage = this.doTextureRequest(this.specular, texCallback);
        }

        this.defines = [];
        if (this.hasDiffuseTex) {
            this.defines.push({key:'DIFFUSE_TEXTURE', value:true});
        }
        if (this.hasShininessTex) {
            this.defines.push({key:'SHININESS_TEXTURE', value:true});
        }
        if (this.hasNormalMapTex) {
            this.defines.push({key:'NORMAL_TEXTURE', value:true});
        }
        if (this.hasEmissiveTex) {
            this.defines.push({key:'EMISSIVE_TEXTURE', value:true});
        }
        if (this.hasSpecularTex) {
            this.defines.push({key:'SPECULAR_TEXTURE', value:true});
        }
        if (this.skinned) {
            this.defines.push({key:'SKINNED', value:true});
        }
        if (this.stitched) {
            this.defines.push({key:'STITCHED', value:true});
        }
        if (this.shadowReceiver) {
            this.defines.push({key:'SHADOWED', value:true});
        }
        this.defines.push({key:this.type.toUpperCase(), value:true});
        if (globalMaterialProperties.maxLights) {
            this.defines.push({key:'MAX_LIGHTS', value:globalMaterialProperties.maxLights});
        }

        if (this.custom) {
            this.doFileRequest('shaders/' + this.custom + '_vertex.txt', standardVSCallback);
            this.doFileRequest('shaders/' + this.custom + '_fragment.txt', standardFSCallback);
        } else {
            this.doFileRequest('shaders/standard_vertex.txt', standardVSCallback);
            this.doFileRequest('shaders/standard_fragment.txt', standardFSCallback);
        }
    };

    this.hasTexture = function() {
      return this.hasDiffuseTex || this.hasShininessTex || this.hasNormalMapTex || this.hasSpecularTex;
    }

    // A single request completed so check if we're all done.
    this.requestCompleted = function() {
        this.outstandingRequests--;
        if (this.outstandingRequests == 0)
            this.loadingDone(this);
    }

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
                callback(request.responseText, file);
                thisObj.requestCompleted();
            }
        }
        request.open('GET', file, true);
    }

    // Load the requested image and call back once it's loaded.
    this.doTextureRequest = function (file, callback) {
        this.outstandingRequests++;
        return textureCache.loadTexture(file, callback);
    }

    this.compileShader = function (type, txt, file) {
        var vs = gl.createShader(type);
        gl.shaderSource(vs, txt);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            ErrorMessage('Failed to compile shader: '+file+'.\n\n' + gl.getShaderInfoLog(vs) + '\n\n' + txt);
            return null;
        }
        return vs;
    }

    this.handleVSShaderLoad = function (txt, file) {
        this.vertexShader = this.compileShader(gl.VERTEX_SHADER, txt, file);
        this.vertexShaderTxt = txt;
        if (this.fragmentShader != null)
            this.initShader(file);
    }

    this.handleFSShaderLoad = function (txt, file) {
        this.fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, txt, file);
        this.fragmentShaderTxt = txt;
        if (this.vertexShader != null)
            this.initShader(file);
    }

    this.getAttribLocation = function (varName, attrib) {
        this.shaderProgram[varName] = gl.getAttribLocation(this.shaderProgram, attrib);
        if (this.shaderProgram[varName] == -1) {
            ErrorMessage("Couldn't get attrib location for attribute '" + attrib + "'.");
        }
    }

    this.getUniformLocation = function (varName, attrib) {
        this.shaderProgram[varName] = gl.getUniformLocation(this.shaderProgram, attrib);
        if (this.shaderProgram[varName] == -1) {
            ErrorMessage("Couldn't get uniform location for attribute '" + attrib + "'.");
        }
    }

    this.initShader = function (file) {
        this.shaderProgram = gl.createProgram();
        gl.attachShader(this.shaderProgram, this.vertexShader);
        gl.attachShader(this.shaderProgram, this.fragmentShader);
        gl.linkProgram(this.shaderProgram);

        if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS))
            ErrorMessage('Failed to link program ' + file + '.\n' + gl.getProgramInfoLog(this.shaderProgram));

        this.getAttribLocation('vertexPositionAttribute', 'aVertexPosition');

        this.getUniformLocation('vpMatrixUniform', 'uVPMatrix');
        this.getUniformLocation('mMatrixUniform', 'uMMatrix');

        if (this.type == 'custom') {
            if (this.hasTexture()) {
                this.getAttribLocation('textureCoordAttribute', 'aTextureCoord');
            }

            this.getUniformLocation('fxTime', 'uTime');

            if (this.hasDiffuseTex) {
                this.getUniformLocation('samplerUniform', 'uSampler');
            }
        } else {
            if (this.type != 'matte' && this.type != 'shadowmap') {
                this.getUniformLocation('numLightsUniform', 'uNumLights');
                this.getUniformLocation('nMatrixUniform', 'uNMatrix');
                this.getAttribLocation('vertexNormalAttribute', 'aVertexNormal');
                this.getUniformLocation('ambientColorUniform', 'uAmbientColor');
                this.getUniformLocation('lightLocationUniform', 'uLightLocation');
                this.getUniformLocation('lightDiffuseColorUniform', 'uLightDiffuseColor');
                this.getUniformLocation('lightTypeUniform', 'uLightType');
                this.getUniformLocation('lightViewMatixUniform', 'uLightViewMatrix');
                this.getUniformLocation('lightVPMatrixUniform', 'uLightVPMatrix');
                if (this.shadowReceiver) {
                    this.getUniformLocation('castsShadowsUniform', 'uCastsShadows');
                    this.getUniformLocation('shadowSamplerUniform', 'uShadowSampler');
                }
                this.getUniformLocation('lightConeSamplerUniform', 'uLightConeSampler');
            } else if (this.type == 'shadowmap') {
                this.getUniformLocation('lightLocationUniform', 'uLightLocation');
                this.getUniformLocation('lightTypeUniform', 'uLightType');
                this.getUniformLocation('lightViewMatixUniform', 'uLightViewMatrix');
            }

            if (this.type == 'phong') {
                this.getUniformLocation('lightSpecularColorUniform', 'uLightSpecularColor');
                this.getUniformLocation('cameraPositionUniform', 'uCameraPosition');
            }

            if (this.hasTexture()) {
                this.getAttribLocation('textureCoordAttribute', 'aTextureCoord');
            }

            if (this.hasDiffuseTex) {
                this.getUniformLocation('samplerUniform', 'uSampler');
            } else {
                this.getUniformLocation('diffuseColorUniform', 'uDiffuseColor');
            }

            if (this.hasShininessTex) {
                this.getUniformLocation('shininessSamplerUniform', 'uShininessSampler');
            } else {
                this.getUniformLocation('materialShininessUniform', 'uMaterialShininess');
            }

            if (this.hasNormalMapTex) {
                this.getUniformLocation('normalSamplerUniform', 'uNormalSampler');
            }

            if (this.hasEmissiveTex) {
                this.getAttribLocation('emissiveTexCoordAttribute', 'aEmissiveTexCoord');
                this.getUniformLocation('emissiveSamplerUniform', 'uEmissiveSampler');
            } else {
                this.getUniformLocation('emissiveColorUniform', 'uEmissiveColor');
            }

            if (this.hasSpecularTex) {
                this.getUniformLocation('specularSamplerUniform', 'uSpecularSampler');
            }

            if (this.skinned) {
                this.getAttribLocation('aVertexWeights', 'aVertexWeights');
            }

            if (this.skinned || this.stitched) {
                this.getAttribLocation('aJointIndices', 'aJointIndices');
                this.getUniformLocation('jointInvBindMatrices', 'uJointInvBindMatrices');
                this.getUniformLocation('jointMatrices', 'uJointMatrices');
            }
        }
    }

    this.setMatrixUniforms = function () {
        gl.uniformMatrix4fv(this.shaderProgram.vpMatrixUniform, false, new Float32Array(M4x4().make(viewProjectionMatrix()).flatten()));
        gl.uniformMatrix4fv(this.shaderProgram.mMatrixUniform, false, new Float32Array(M4x4().make(modelMatrix()).flatten()));

        if (this.type != 'matte' && this.type != 'shadowmap' && this.type != 'custom') {
            var normalMatrix = modelMatrix().copy().invertRigidBody();
            gl.uniformMatrix4fv(this.shaderProgram.nMatrixUniform, false, new Float32Array(M4x4().make(normalMatrix).flatten()));
        }
    }

    function flatten(arrayOfArrays)
    {
        var x = [];
        for (var i = 0; i < arrayOfArrays.length; ++i) {
            var a = arrayOfArrays[i];
            for (var j = 0; j < a.length; ++j) {
                x.push(a[j]);
            }
        }
        return x;
    }

    this.enable = function (lights) {
        // The shader supports a maximum of 8 light sources
        var numLights = lights ? Math.min(lights.length, 8) : 0;

        gl.useProgram(this.shaderProgram);

        gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);

        if (this.type == 'custom') {
            gl.blendFunc(gl.ONE, gl.ONE);

            if (this.hasTexture()) {
                gl.enableVertexAttribArray(this.shaderProgram.textureCoordAttribute);
            }

            gl.uniform1f(this.shaderProgram.fxTime, ((new Date()).getTime() - this.loadTime) / 1000);

            if (this.hasDiffuseTex) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.diffuseImage);
                gl.uniform1i(this.shaderProgram.samplerUniform, 0);
            }
        } else {
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

            if (this.type != 'matte' && this.type != 'shadowmap') {
                var ambientR = this.ambient[0];
                var ambientG = this.ambient[1];
                var ambientB = this.ambient[2];
                if (globalMaterialProperties.ambient) {
                    ambientR = Math.max(ambientR, globalMaterialProperties.ambient[0]);
                    ambientG = Math.max(ambientG, globalMaterialProperties.ambient[1]);
                    ambientB = Math.max(ambientB, globalMaterialProperties.ambient[2]);
                }
                gl.uniform3f(this.shaderProgram.ambientColorUniform, ambientR, ambientG, ambientB);

                if (this.type == 'phong') {
                    var camPos = viewMatrix().copy().invertRigidBody();
                    gl.uniform3f(this.shaderProgram.cameraPositionUniform, camPos.t0, camPos.t1, camPos.t2);
                }

                gl.enableVertexAttribArray(this.shaderProgram.vertexNormalAttribute);

                var hasSpotLight = false;
                for (var l = 0; l < numLights; ++l)
                    if (lights[l].subtype == 'spot') {
                        hasSpotLight = true;
                        break;
                    }
                if (hasSpotLight) {
                    gl.activeTexture(gl.TEXTURE3);
                    gl.bindTexture(gl.TEXTURE_2D, getConeTexture());
                    gl.uniform1i(this.shaderProgram.lightConeSamplerUniform, 3);
                }

                var lightType = [];
                var lightLocation = [];
                var lightViewMatix = [];
                var lightVPMatrix = [];
                var lightDiffuseColor = [];
                var lightSpecularColor = [];
                var lightShadowSampler = [];
                var lightCastsShadows = [];

                for (var l = 0; l < numLights; ++l) {
                    var light = lights[l];
                    lightType.push(light.getType());

                    var lightPos = light.getAccumulatedTransform();
                    if (light.subtype == 'directional')
                        lightLocation.push(-lightPos.z0, -lightPos.z1, -lightPos.z2, light.radius);
                    else
                        lightLocation.push(lightPos.t0, lightPos.t1, lightPos.t2, light.radius);
                    lightViewMatix.push(M4x4().make(lightPos).flatten());

                    lightVPMatrix.push(light.viewProjectionMatrix().flatten());

                    lightDiffuseColor.push(light.color[0], light.color[1], light.color[2]);
                    if (this.type == 'phong')
                        lightSpecularColor.push(light.color[0], light.color[1], light.color[2]);

                    if (this.shadowReceiver) {
                        lightCastsShadows.push(light.castsShadows ? 1 : 0);
                        lightShadowSampler.push(7 + l);
                    }
                }

                gl.uniform1i(this.shaderProgram.numLightsUniform, numLights);
                if (numLights > 0) {
                    gl.uniform1iv(this.shaderProgram.lightTypeUniform, lightType);
                    gl.uniform4fv(this.shaderProgram.lightLocationUniform, lightLocation);
                    gl.uniformMatrix4fv(this.shaderProgram.lightViewMatixUniform, false, flatten(lightViewMatix));
                    gl.uniformMatrix4fv(this.shaderProgram.lightVPMatrixUniform, false, flatten(lightVPMatrix));
                    gl.uniform3fv(this.shaderProgram.lightDiffuseColorUniform, lightDiffuseColor);
                    if (this.type == 'phong')
                        gl.uniform3fv(this.shaderProgram.lightSpecularColorUniform, lightSpecularColor);

                    if (this.shadowReceiver) {
                        gl.uniform1iv(this.shaderProgram.castsShadowsUniform, lightCastsShadows);
                        gl.uniform1iv(this.shaderProgram.shadowSamplerUniform, lightShadowSampler);
                        for (var l = 0; l < numLights; ++l) {
                            if (lights[l].castsShadows) {
                                gl.activeTexture(gl.TEXTURE7 + l);
                                gl.bindTexture(gl.TEXTURE_2D, lights[l].shadowTexture);
                            }
                        }
                    }

                } else if (this.type == 'shadowmap') {
                    var light = lights[0]; // HACKERY...
                    var lightPos = light.getAccumulatedTransform();
                    gl.uniform4f(this.shaderProgram.lightLocationUniform, lightPos.t0, lightPos.t1, lightPos.t2, light.radius);
                    gl.uniform1i(this.shaderProgram.lightTypeUniform, light.getType());
                    if (light.subtype=='directional')
                        gl.uniformMatrix4fv(this.shaderProgram.lightViewMatixUniform, false, lightPos.flatten());
                }
            }

            if (this.hasTexture()) {
                gl.enableVertexAttribArray(this.shaderProgram.textureCoordAttribute);
            }

            if (this.hasDiffuseTex) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.diffuseImage);
                gl.uniform1i(this.shaderProgram.samplerUniform, 0);
            } else {
                gl.uniform4f(this.shaderProgram.diffuseColorUniform, this.diffuse[0], this.diffuse[1], this.diffuse[2], this.diffuse[3]);
            }

            if (this.type != 'shadowmap' && this.type != 'matte'){
                if (this.hasShininessTex) {
                    gl.activeTexture(this.hasDiffuseTex ? gl.TEXTURE1 : gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, this.shininessImage);
                    gl.uniform1i(this.shaderProgram.shininessSamplerUniform, this.hasDiffuseTex ? 1 : 0);
                } else {
                    gl.uniform1f(this.shaderProgram.materialShininessUniform, this.shininess);
                }

                if (this.hasNormalMapTex) {
                    gl.activeTexture(gl.TEXTURE2);
                    gl.bindTexture(gl.TEXTURE_2D, this.normalMapImage);
                    gl.uniform1i(this.shaderProgram.normalSamplerUniform, 2);
                }

                if (this.hasEmissiveTex) {
                    gl.activeTexture(gl.TEXTURE4);
                    gl.bindTexture(gl.TEXTURE_2D, this.emissionImage);
                    gl.uniform1i(this.shaderProgram.emissiveSamplerUniform, 4);
                    gl.enableVertexAttribArray(this.shaderProgram.emissiveTexCoordAttribute);
                } else {
                    gl.uniform4f(this.shaderProgram.emissiveColorUniform, this.emission[0], this.emission[1], this.emission[2], this.emission[3]);
                }

                if (this.hasSpecularTex) {
                    gl.activeTexture(gl.TEXTURE5);
                    gl.bindTexture(gl.TEXTURE_2D, this.specularImage);
                    gl.uniform1i(this.shaderProgram.specularSamplerUniform, 5);
                }
            }

            if (this.skinned) {
                gl.enableVertexAttribArray(this.shaderProgram.aVertexWeights);
            }
            if (this.skinned || this.stitched) {
                gl.enableVertexAttribArray(this.shaderProgram.aJointIndices);
            }
        }
        this.setMatrixUniforms();
    }

    this.disable = function(lights) {
        if (this.type != 'matte' && this.type != 'shadowmap' && this.type != 'custom')
            gl.disableVertexAttribArray(this.shaderProgram.vertexNormalAttribute);

        if (this.hasTexture())
            gl.disableVertexAttribArray(this.shaderProgram.textureCoordAttribute);

        if (this.hasEmissiveTex)
            gl.disableVertexAttribArray(this.shaderProgram.emissiveTexCoordAttribute);

        gl.disableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);

        if (this.skinned) {
            gl.disableVertexAttribArray(this.shaderProgram.aVertexWeights);
        }
        if (this.skinned || this.stitched) {
            gl.disableVertexAttribArray(this.shaderProgram.aJointIndices);
        }

    }

    this.loadTime = (new Date()).getTime();
}

Material.prototype = new MaterialPrototype();
