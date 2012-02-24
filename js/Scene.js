/* ex: set tabstop=4 expandtab: */
function Scene(jsonfile, callback, aspect, shadowCasters, shadowReceivers) {
    if (!aspect)
      throw new Error('Zero aspect is not valid.');
    this.loadingDone = callback;
    this.loader = new Loader(callback);
    var thisObj = this;
    this.loader.load(jsonfile, function(txt) { thisObj.handleSceneLoaded(txt); });
    this.jointMatrices = { }
    this.lights = new Array();
    this.subScenes = new Array();
    this.frameNum = 0;
    this.aspect = aspect;
    this.shadowCasters = shadowCasters;
    this.shadowReceivers = shadowReceivers;
    this.enableShadows = this.shadowCasters || this.shadowReceivers;
    //this.maxShadowmapUpdatesPerFrame = this.enableShadows ? 2 : 0;
};

function ScenePrototype() {

    this.initFromJSON = function(txt, allowXMLRetry) {
        try {
            var thisObj = this;
            this.json = JSON.parse(txt, function(key, val) {
                if (val && typeof val == 'object') {
                    if (val.type == 'mesh') {
                        var shadowCaster = thisObj.shadowCasters ? thisObj.shadowCasters[val.file] == true : false;
                        var shadowReceiver = thisObj.shadowReceivers ? thisObj.shadowReceivers[val.file] == true : false;
                        return new Mesh(thisObj, val, shadowCaster, shadowReceiver);
                    } else if (val.type == 'joint') {
                        return new Joint(thisObj, val);
                    } else if (val.type == 'light') {
                        var light = new Light(thisObj, val);
                        thisObj.lights.push(light);
                        return light;
                    } else if (val.type == 'camera') {
                        var camera = new Camera(thisObj, val);
                        thisObj.currentCamera = camera;
                        return camera;
                    } else if (val.type) {
                        return new Node(thisObj, val);
                    }
                }
                return val;
            });
        } catch (e) {
            if (allowXMLRetry) {
                var parser=new DOMParser();
                var xmlDoc=parser.parseFromString(txt,'text/xml');
                var jsonString = collada2JSON(xmlDoc);
                alert(jsonString);
                this.initFromJSON(jsonString, false);
            } else {
                throw e;
            }
        }
    }

    this.handleSceneLoaded = function (txt) {
        var that = this;
        this.loader.addRequest();
        this.initFromJSON(txt, true);
        this.setParentPointers();
        this.resetToBindPose();
        this.loader.addCallback(function() { that.setupLOD(); });
        this.loader.decOutstandingRequests();
    }

    this.setParentPointers = function() {
        for (var n = 0; n < this.json.nodes.length; ++n) {
            this.json.nodes[n].setParentPointers(null);
        }
    }

    this.setupLOD = function() {
        for (var n = 0; n < this.json.nodes.length; ++n) {
            this.json.nodes[n].setupLODJoints(this);
        }
        if (this.hasOwnProperty('lod')) {
            for (var n = 0; n < this.json.nodes.length; ++n) {
                this.json.nodes[n].setupLODMeshes(this.lod);
            }
        }
    }

    this.fullyLoaded = function() {
        return this.loader.fullyLoaded();
    }

    this.deinit = function() {
         for (var n = 0; n < this.json.nodes.length; ++n) {
            this.json.nodes[n].deinit();
        }
    }

    this.culled = function(light) {
        /*if (this.bound && light && light.subtype == 'spot') {
            var lt = light.getAccumulatedTransform();
            var cone = { 'vertex' : Vec3().make(lt.t0, lt.t1, lt.t2), 'axis' : Vec3().make(-lt.z0, -lt.z1, -lt.z2), 'angle' : Math.PI * (light.falloff_angle / 2) / 180 };
            return !sphereIntersectsCone(this.bound, cone); 
        }*/
        return false;
    }

    this.distanceToLight = function(light) {
        if (this.bound && light) {
            var lt = light.getAccumulatedTransform();
            var lc = Vec3().make(lt.t0, lt.t1, lt.t2);
            var sc = this.bound.center.copy();
            var dist = lc.subtract(sc).magnitude();
            return dist;
        }
        return 0;
    }

    this.drawNodes = function(allLights) {
        // Pick light sources with influence for this scene
        var lights = [];
        for (var l = 0; l < allLights.length; ++l) {
            var light = allLights[l];
            if (!this.culled(light))
                lights.push(light);
        }

        // Sort light sources (closest first)
        var sceneObj = this;
        lights.sort(function(a, b){return sceneObj.distanceToLight(a) - sceneObj.distanceToLight(b)});

        // Draw all nodes in this scene
        for (var n = 0; n < this.json.nodes.length; ++n) {
            this.json.nodes[n].draw(this.jointMatrices, lights);
        }

        // Draw all sub scenes
        for (var j = 0; j < this.subScenes.length; ++j) {
            this.subScenes[j].drawNodes(allLights);
        }
    }

    this.drawShadow = function(light) {
        for (var n = 0; n < this.json.nodes.length; ++n) {
            this.json.nodes[n].drawShadow(this.jointMatrices, light);
        }
        for (var j = 0; j < this.subScenes.length; ++j) {
            if (!this.subScenes[j].culled(light)) {
                drawCount += 1;
                this.subScenes[j].drawShadow(light);
            }
        }
    }
    this.allSubScenesCulled = function(light) {
        for (var j = 0; j < this.subScenes.length; ++j) {
            if (!this.subScenes[j].culled(light)) {
                    return false;
            }
        }
        return true;
    }

    this.updateShadowmaps = function() {
        // Check which lights need to be updated (i.e currently casts shadows)
        var updateLights = new Array();
        for (var l = 0; l < this.lights.length; ++l) {
            /*var drawShadows = true;
            var light = this.lights[l];
            if (light.subtype != 'point') {
                if (this.allSubScenesCulled(light))
                    if (light.isRenderedWithoutSubScenes)
                        drawShadows = false;
                    else
                        light.nextIsRenderedWithoutSubScenes = true;
                else
                    light.nextIsRenderedWithoutSubScenes = false;
            } else {
                drawShadows = false;
            }
            if (drawShadows) {
                updateLights.push(light);
            } else {
                light.castsShadows = false;
            }*/
            var light = this.lights[l];
            light.castsShadows = false;
            if (light.subtype == 'spot') {
                updateLights.push(light);
                light.castsShadows = true;
            }
        }

        // Limit the number of lights to update during this pass
        var lightsToUpdate = updateLights.length;
        // FIXME: this check is not 100% acurate. Point lights does not update shadowmaps but still count as shadowmap updates
        /*if (lightsToUpdate > this.maxShadowmapUpdatesPerFrame) {
            lightsToUpdate = this.maxShadowmapUpdatesPerFrame;
            updateLights.sort(function(a, b){return a.lastUpdateFrame - b.lastUpdateFrame});
        }*/

        //alert(lightsToUpdate + '/'' + this.lights.length);
        // Update shadow maps for all the selected lights
        if (lightsToUpdate > 0) {
            //gl.blendFunc(gl.ONE, gl.ZERO);
            gl.depthFunc(gl.LEQUAL);
            for (var l = 0; l < lightsToUpdate; ++l) {
                //updateLights[l].isRenderedWithoutSubScenes = updateLights[l].nextIsRenderedWithoutSubScenes;
                if (updateLights[l].beginShadowmapRendering()) {
                    this.drawShadow(updateLights[l]);
                    updateLights[l].endShadowmapRendering();
                    //updateLights[l].lastUpdateFrame = this.frameNum;
                    //updateLights[l].castsShadows = true;
                }
            }
            if (this.postProcess) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.postProcess.backbufferFBO);
            } else {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            }
            gl.viewport(0,0,canvas.width,canvas.height);
        }
    };

    this.draw = function () {
        drawCount = 0;
        if (this.postProcess) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.postProcess.backbufferFBO);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        }
        if (this.enableShadows) {
            this.updateShadowmaps();
        }
        if (this.postProcess) {
            this.postProcess.updateBlurTexture();
        }
        this.drawNodes(this.lights);
        if (this.postProcess) {
            // apply will change the frambuffer winding back to null
            this.postProcess.apply();
        }
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthFunc(gl.LEQUAL);
        ++this.frameNum;
    }

    this.drawSkeleton = function(dbgDraw, frames) {
        for (var n = 0; n < this.json.nodes.length; ++n) {
            this.json.nodes[n].drawSkeleton(dbgDraw, frames);
        }
    }

    this.resetToBindPose = function() {
        for (var n = 0; n < this.json.nodes.length; ++n) {
            this.json.nodes[n].resetToBindPose(this, I4x3());
        }
    }

    this.getRootJoint = function() {
        var joints = this.findNodesByType('joint');
        if (joints.length)
            return joints[0];
        return null;
    }

    this.getFirstMesh = function() {
        var meshes = this.findNodesByType('mesh');
        if (meshes.length)
            return meshes[0];
        return null;
    }

    this.findNode = function(name) {
        for (var n = 0; n < this.json.nodes.length; ++n) {
            var node = this.json.nodes[n].findNode(name);
            if (node)
                return node;
        }
        return null;
    }

    this.nextCamera = function() {
        var cameras = this.findNodesByType('camera');
        if (cameras.length) {
            if (!this.currentCamera)
                this.currentCamera = cameras[0];
            else {
                var index = 0;
                for (;index != cameras.length; ++index)
                    if (this.currentCamera == cameras[index])
                        break;
                if (index < cameras.length)
                    ++index;
                this.currentCamera = cameras[index % cameras.length];
            }
        }
    }

    this.findNodesByType = function(type, returnParents) {
        var nodes = [];
        for (var n = 0; n < this.json.nodes.length; ++n) {
            this.json.nodes[n].findNodesByType(nodes, type, returnParents, null);
        }
        return nodes;
    }

    this.getNumRoots = function() {
        return this.json.nodes.length;
    }

    this.getRoots = function() {
        return this.json.nodes;
    }

    this.handleAnimationLoaded = function (txt, attribName, looping) {
        this.animation = JSON.parse(txt);
        this.animation.time = 0;
        this.animation.maxTime = getMaxTime(this.animation);
        this.animation.backwards = false;
        this.animation.fadeAnim = null;
        this.animation.fadeTime = 0;
        this.animation.fadeMax = -1;
        this.animation.looping = looping;
        if (attribName)
            this[attribName] = this.animation;
    }

    this.loadAnimation = function(anim, attribName, looping, callback) {
        var request = new XMLHttpRequest();
        var thisObj = this;
        request.onreadystatechange = function() {
            if (request.readyState == 1) {
              request.overrideMimeType('application/json');
              request.send();
            }

            if (request.readyState == 4) {
                thisObj.handleAnimationLoaded(request.responseText, attribName, looping);
                if (callback) {
                    callback();
                }
            }
        }
        request.open('GET', anim, true);
    }

    this.setAnimation = function(newAnim, time, fadeoutTime) {
        var oldAnim = this.animation;
        this.animation = newAnim;
        this.animation.time = time;
        this.animation.fadeAnim = oldAnim;
        this.animation.fadeTime = 0;
        this.animation.fadeMax = fadeoutTime;
    }

    this.update = function(dt) {
        if (this.animation) {
            // Tick animation forward/backward
            var dt2 = this.animation.backwards ? -dt : dt;
            if (this.animation.looping)
                this.animation.time = (this.animation.time + this.animation.maxTime + dt2) % this.animation.maxTime;
            else {
                this.animation.time += dt2;
                if (this.animation.time < 0)
                    this.animation.time = 0;
                else if (this.animation.time > this.animation.maxTime)
                    this.animation.time = this.animation.maxTime;
            }

            // Tick fade time
            this.animation.fadeTime += dt;

            var textNode = document.getElementById('text');
            if (textNode)
              textNode.innerHTML = 'Animation time: ' + this.animation.time.toFixed(3);

            for (var n = 0; n < this.json.nodes.length; ++n)
                this.json.nodes[n].update(this, I4x3());
        }
        for (var j = 0; j < this.subScenes.length; ++j) {
            this.subScenes[j].update(dt);
        }
    }
}

Scene.prototype = new ScenePrototype();

