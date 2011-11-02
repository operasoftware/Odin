/* -*- mode: javascript; tab-width: 4; indent-tabs-mode: nil; -*- */

var demo = new (function () {
    // Scene variables.
    this.m_scene = undefined;
    this.m_character = undefined;
    this.m_charRoot = undefined;
    this.m_walkableArea = undefined;
    this.m_area = undefined;

    // State variables.
    this.m_started = false;
    this.m_canvasTime = 0;
    this.m_lastTime = 0;
    this.m_staticCam = -1;
    this.m_enteredStaticState = false;
    this.m_walkAnimActive = false;
    this.m_turnAnimActive = false;
    this.m_walkDone = false;

    // Keyboard input variables
    this.m_leftKey = false;
    this.m_rightKey = false;
    this.m_upKey = false;
    this.m_downKey = false;
    this.m_zKey = false;
    this.m_xKey = false;
    this.m_cameraIndex = 4;


    this.handleKeyDown = function(e) {
        if (e.keyCode == 37)
            this.m_leftKey = true;
        else if (e.keyCode == 39)
            this.m_rightKey = true;
        else if (e.keyCode == 38)
            this.m_upKey = true;
        else if (e.keyCode == 40)
            this.m_downKey = true;
        else if (e.keyCode == 90) {
            this.m_zKey = true;
            this.m_cameraIndex++;
            if (this.m_cameraIndex > 4) {
                this.m_cameraIndex = 1;
            }
            var cam = this.m_scene.findNode('camera' + this.m_cameraIndex);
            if (cam) {
                this.m_scene.currentCamera = cam.children[0];
            }
        }
        else if (e.keyCode == 88)
            this.m_xKey = true;
    }

    this.handleKeyUp = function(e) {
        if (e.keyCode == 37)
            this.m_leftKey = false;
        else if (e.keyCode == 39)
            this.m_rightKey = false;
        else if (e.keyCode == 38)
            this.m_upKey = false;
        else if (e.keyCode == 40)
            this.m_downKey = false;
        else if (e.keyCode == 90)
            this.m_zKey = false;
        else if (e.keyCode == 88)
            this.m_xKey = false;
    }

    this.onCharacterLoaded = function() {
        this.m_charRoot = this.m_character.findNode('RIG_joints_grp');
        this.m_charRoot.translate = [2.5, 0, 105];
        this.m_charRoot.rotate = [0, 110, 0];
        this.start();
    }

    this.onWalkableAreaLoaded = function() {
        this.m_area = new Area(this.m_walkableArea.findNode('WalkableArea_geo'));
        this.start();
    }

    this.onSetLoaded = function () {
        var cam = this.m_scene.findNode('camera4');
        this.m_scene.currentCamera = cam.children[0];
        this.camTranslate = [cam.translate[0],cam.translate[1],cam.translate[2]];
        this.camRotate = [cam.rotate[0],cam.rotate[1],cam.rotate[2]];
        this.start();
    }

    this.isEverythingLoaded = function() {
        return this.m_character.fullyLoaded() && this.m_scene.fullyLoaded() &&
               this.m_walkableArea.fullyLoaded() &&
               this.m_character.idleAnim && this.m_character.walkAnim && this.m_character.turnAnim;
    }

    this.moveCharacter = function(dt, forward, backward, left, right) {
        // Movement
        var turnAngle = 0;
        if (forward || backward) {
            if (!this.m_walkAnimActive) {
                // Switch to walking animation
                this.m_character.setAnimation(this.m_character.walkAnim, 0, 0.15);
                this.m_walkAnimActive = true;
                this.m_turnAnimActive = false;
            }

            // Set animation direction
            this.m_character.walkAnim.backwards = !forward;

            // Calculate movement direction
            var angle = this.m_charRoot.rotate[1];
            var dx = -Math.sin(angle * Math.PI/180) * 16 * dt;
            var dz = -Math.cos(angle * Math.PI/180) * 16 * dt;
            if (!forward) {
                dx = -dx;
                dz = -dz;
            }

            // Update movement against walkable area
            var actualPoint = this.m_area.moveInsideArea(this.m_charRoot.translate, [dx, 0, dz]);
            var dx2 = actualPoint[0] - this.m_charRoot.translate[0];
            var dz2 = actualPoint[2] - this.m_charRoot.translate[2];
            this.m_charRoot.translate = actualPoint;

            // Perform turning while sliding against walking bounds
            // (Note: will be overridden by user turning)
            turnAngle = (Math.atan2(dx2, dz2) - Math.atan2(dx, dz)) * 180 / Math.PI;
            if (turnAngle > 180) turnAngle -= 360;
            if (turnAngle < -180) turnAngle += 360;
            var speed = Math.sqrt((dx2*dx2 + dz2*dz2) / (dx*dx + dz*dz));
            turnAngle *= 3*speed*dt;
        } else if (this.m_walkAnimActive) {
            // Switch to idle animation (if we shouldn't start turning)
            if (!(left || right))
                this.m_character.setAnimation(this.m_character.idleAnim, 0, 0.15);
            this.m_walkAnimActive = false;
        }

        // Turning
        if (left || right) {
            // Right or left?
            var turnright = !backward ? right : left;
            var turnDir = turnright ? 1 : -1;

            if (this.m_walkAnimActive) {
                // When walking, just rotate the model
                turnAngle = - (turnright ? 112.5 : -112.5) * dt;
            }
            else {
                if (!this.m_turnAnimActive) {
                    // Switch to turn animation
                    this.m_character.setAnimation(this.m_character.turnAnim, 0, 0.15);
                    this.m_turnAnimActive = true;
                }

                // Set animation direction
                this.m_character.turnAnim.backwards = !turnright;

                // Rotate (one turn animation cycle represents 45 degrees of rotation)
                turnAngle = -turnDir * (45 / this.m_character.turnAnim.maxTime) * dt;
            }
        }
        else if (this.m_turnAnimActive) {
            // Switch to idle animation
            this.m_character.setAnimation(this.m_character.idleAnim, 0, 0.15);
            this.m_turnAnimActive = false;
        }

        // Update rotation based on character turning
        this.m_charRoot.rotate = [0, this.m_charRoot.rotate[1] + turnAngle, 0];
    }

    this.update = function() {
        var that = this;
        setTimeout(function() { that.update(); }, 33);
        var currTime = (new Date()).getTime();
        var dt = (currTime - this.m_lastTime) / 1000.0;
        this.m_lastTime = currTime;

        if (!this.m_started) {
            return;
        }

        this.m_canvasTime += dt;

        if (this.m_canvasTime < 6.0) {
            
        } else if (this.m_canvasTime < 6.666) {
            if (!this.m_turnAnimActive) {
                // Switch to turn animation
                this.m_character.setAnimation(this.m_character.turnAnim, 0, 0.15);
                this.m_turnAnimActive = true;
                // Set animation direction
                this.m_character.turnAnim.backwards = false;
            }

            // Rotate (one turn animation cycle represents 45 degrees of rotation)
            var turnAngle = -1 * (45 / this.m_character.turnAnim.maxTime) * dt;

            // Update rotation based on character turning
            this.m_charRoot.rotate = [0, this.m_charRoot.rotate[1] + turnAngle, 0];            

        } else if (!this.m_walkDone) {
            this.moveCharacter(dt, true, false, false, this.m_canvasTime < 4.0);
            if (this.m_charRoot.translate[2] <= 1) {
                this.m_walkDone = true;
            }
        } else {
            this.moveCharacter(dt, this.m_upKey, this.m_downKey, this.m_leftKey, this.m_rightKey);            
        }


        if (this.m_canvasTime > 7) {
            var cam = this.m_scene.findNode('camera4');
            var scale = 0.117;
            var t = Math.min(1.0, this.m_canvasTime - 7.0);
            cam.translate[0] = this.camTranslate[0] * (1 - t) + (scale * this.m_charRoot.translate[0]) * t;
            cam.translate[1] = this.camTranslate[1] * (1 - t) + (scale * this.m_charRoot.translate[1] + 1.5) * t;
            cam.translate[2] = this.camTranslate[2] * (1 - t) + (scale * this.m_charRoot.translate[2] + 5) * t;
            cam.rotate[0] = this.camRotate[0] * (1 - t) - 10 * t;
            cam.rotate[1] = this.camRotate[1] * (1 - t) + 0 * t;
            cam.rotate[2] = this.camRotate[2] * (1 - t) + 0 * t;
        }

        this.m_scene.update(dt);
        this.draw();
    }

    this.start = function() {
        if (this.isEverythingLoaded() && gl && !this.m_started) {
            // Set the walk anim on the character.
            this.m_character.animation = this.m_character.idleAnim;

            // Kick off the update loop.
            this.m_started = true;
            this.m_lastTime = (new Date()).getTime();
            this.update();
        }
    };

    this.draw = function() {
        if (this.m_started) {
            gl.clear(gl.DEPTH_BUFFER_BIT);
            this.m_scene.currentCamera.setMatrices();
            modelMatrix().makeIdentity();
            this.m_scene.draw();
        }
    }
      
    this.init = function() {
        // Get the WebGL context
        window.canvas = document.getElementById('webgl');
        var gl = canvas.getContext('webgl', { 'alpha' : false }) || canvas.getContext('experimental-webgl', { 'alpha' : false });
        if (!gl) {  
            alert("Unable to initialize WebGL.");  
            return false;
        }
        // The gl variable is used by other scripts
        window.gl = gl;

        var that = this;
        window.addEventListener('resize', function(e) { that.resize(e); }, false);
        window.addEventListener('orientationchange', function(e) { that.resize(e); }, false);
        window.addEventListener('keydown', function(e) { that.handleKeyDown(e); }, false);
        window.addEventListener('keyup', function(e) { that.handleKeyUp(e); }, false);

        gl.getExtension("OES_standard_derivatives");
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.CULL_FACE);

        this.resize();

        // Preload all the data.
        var aspect = canvas.width / canvas.height;
        this.m_scene = new Scene('./json/space-station.json', function () { that.onSetLoaded(); }, aspect, {}, {'./json/space-station/MainSection_geoShape.json':true});
        this.m_scene.loadAnimation('./json/space-station_anim.json', true);
        this.m_character = new Scene('./json/character.json', function () { that.onCharacterLoaded(); }, aspect, {'./json/character/merged.json':true});
        this.m_character.loadAnimation('./json/anim-idle_anim.json', 'idleAnim', true);
        this.m_character.loadAnimation('./json/anim-walk_anim.json', 'walkAnim', true);
        this.m_character.loadAnimation('./json/anim-turn_anim.json', 'turnAnim', true);
        this.m_scene.subScenes.push(this.m_character);
        this.m_walkableArea = new Scene('./json/walkable-area.json', function () { that.onWalkableAreaLoaded(); }, aspect);
    };

    this.resize = function() {
        var gameArea = document.getElementById('webglArea');
        var widthToHeight = 16 / 9;
        var newWidth = window.innerWidth;
        var newHeight = window.innerHeight;
        var newWidthToHeight = newWidth / newHeight;

        if (newWidthToHeight > widthToHeight) {
            newWidth = newHeight * widthToHeight;
            gameArea.style.height = newHeight + 'px';
            gameArea.style.width = newWidth + 'px';
        } else {
            newHeight = newWidth / widthToHeight;
            gameArea.style.width = newWidth + 'px';
            gameArea.style.height = newHeight + 'px';
        }

        gameArea.style.marginTop = (-newHeight / 2) + 'px';
        gameArea.style.marginLeft = (-newWidth / 2) + 'px';

        canvas.offsetX = (window.innerWidth - newWidth) / 2;
        canvas.offsetY = (window.innerHeight - newHeight) / 2;
        canvas.width = newWidth;
        canvas.height = newHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        this.draw();
    }
})();

function ErrorMessage(msg) {
    alert(msg);
}

function InfoMessage(msg) {
}
