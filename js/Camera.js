'use strict';

function Camera(scene, template) {
    this.type = template.type;
    this.subtype = template.subtype;
    this.xfov = template.xfov;
    this.yfov = template.yfov;
    this.znear = template.znear;
    this.zfar = template.zfar;
    this.xmag = template.xmag;
    this.ymag = template.ymag;
    this.aspect = scene.aspect;
    if (!this.xfov) {
      this.xfov = this.aspect * this.yfov;
    }
    if (!this.xmag) {
      this.xmag = this.aspect * this.ymag;
    }
    if (!this.ymag) {
      this.ymag = this.xmag / this.aspect;
    }
};

function CameraPrototype() {
    this.setMatrices = function() {
        viewMatrix().make(this.getAccumulatedTransform()).invertRigidBody();
        if (this.subtype == 'perspective') {
          projectionMatrix().makePerspective(this.yfov, this.aspect, this.znear, this.zfar);
        }
        else if (this.subtype == 'orthographic') {
          projectionMatrix().makeOrtho(-this.xmag, this.xmag, -this.ymag, this.ymag, this.znear, this.zfar);
        }
    }
};

CameraPrototype.prototype = Node.prototype;
Camera.prototype = new CameraPrototype();
