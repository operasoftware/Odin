function Light(scene, template) {
    this.lastUpdateFrame = 0;
    this.castsShadows = false;

    this.type = template.type;
    this.subtype = template.subtype;
    this.falloff_angle = template.falloff_angle;
    this.falloff_exponent = template.falloff_exponent;
    this.color = template.color;
    this.constant_attenuation = template.constant_attenuation;
    this.linear_attenuation = template.linear_attenuation;
    this.quadratic_attenuation = template.quadratic_attenuation;

//    this.radius = 100; // TODO: Use attenuation values?
    this.radius = this.linear_attenuation * 10;
    if (this.subtype == 'spot') {
        this.projectionMatrix = M4x4().makePerspective(this.falloff_angle, 1.0, 0.1, this.radius);
    } else if (this.subtype == 'point') {
        this.projectionMatrix = I4x4();
    } else {
        // FIXME: the coordinates here is the size in ws units which the shadowmap covers. Should be calculated using som sort of bbox not using the fallof angle
        this.projectionMatrix = M4x4().makeOrtho(-this.falloff_angle, this.falloff_angle, -this.falloff_angle, this.falloff_angle, 0, this.radius);
    }

    this.shadowmapSize = 1024;
    this.shadowTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (this.subtype != 'point') {
        // Create a texture and FBO for shadowmapping
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.shadowmapSize, this.shadowmapSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        this.shadowDepth = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.shadowDepth);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.shadowmapSize, this.shadowmapSize);
        this.shadowFBO = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFBO);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.shadowTexture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.shadowDepth);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
        // point light does not have shadows. Set the distance to max to achieve that effect
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255,255,255,255]));
    }
}

function LightPrototype() {
    this.beginShadowmapRendering = function() {
            if (this.subtype == 'point') {
                return false;
            }
            // bind the shadowmap FBO
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFBO);
            gl.viewport(0,0,this.shadowmapSize,this.shadowmapSize);
            gl.clearColor(1,1,1,1);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.clearColor(0.75, 0.75, 0.75, 1.0);
                
            this.backupProjection = projectionMatrix().copy();
            this.backupView = viewMatrix().copy();

            projectionMatrix().make(this.projectionMatrix);
            viewMatrix().make(this.getAccumulatedTransform()).invertRigidBody();
            return true;
    }

    this.endShadowmapRendering = function() {
            projectionMatrix().make(this.backupProjection);
            viewMatrix().make(this.backupView);
    }

    this.viewProjectionMatrix = function() {
            var view = M4x3().make(this.getAccumulatedTransform()).invertRigidBody();
            return this.projectionMatrix.copy().multiply(view);
    }

    this.getType = function() {
        // 0 = point, 1 = spot, 2 = directional
        if (this.subtype == 'spot') {
            return 1;
        } else if (this.subtype == 'directional') {
            return 2;
        } else {
            return 0;
        }
    }

    this.drawSkeleton = function(dbgDraw, frames) {
        if (this.subtype == 'point') {
          var alen = 0.3
          dbgDraw.drawLine(-alen,0,0, alen,0,0, dbgDraw.RED,frames, 1);
          dbgDraw.drawLine(0,-alen,0, 0,alen,0, dbgDraw.RED,frames, 1);
          dbgDraw.drawLine(0,0,-alen, 0,0,alen, dbgDraw.RED,frames, 1);
        }
    }
}

LightPrototype.prototype = Node.prototype;
Light.prototype = new LightPrototype();

