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
	this.xoff = 0;
	this.yoff = 0;
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
		} else if (this.subtype == 'orthographic') {
			projectionMatrix().makeOrtho(this.xoff-this.xmag, this.xoff+this.xmag, this.yoff-this.ymag, this.yoff+this.ymag, this.znear, this.zfar);
		}
	}

	this.drawSkeleton = function(dbgDraw, frames) {
		/*var alen = 0.3
		dbgDraw.drawLine(0,0,-alen, -alen,-alen,alen, dbgDraw.RED,frames, 1);
		dbgDraw.drawLine(0,0,-alen, -alen, alen,alen, dbgDraw.RED,frames, 1);
		dbgDraw.drawLine(0,0,-alen,  alen,-alen,alen, dbgDraw.RED,frames, 1);
		dbgDraw.drawLine(0,0,-alen,  alen, alen,alen, dbgDraw.RED,frames, 1);*/
	}

	this.pan = function(h,v) {
		if (this.subtype == 'perspective') {
			var acc = this.getAccumulatedTransform();
			var x = acc.getX();
			var y = acc.getY();
			var m = M4x3().makeTranslate(x.x*h+y.x*v, x.y*h+y.y*v, x.z*h+y.z*v);
			this.parent.local = m.multiply(this.parent.local);
		} else {
			this.xoff += h;
			this.yoff += v;
		}
	}

	this.zoom = function(h,v) {
		if (this.subtype == 'perspective') {
			var acc = this.getAccumulatedTransform();
			var z = acc.getZ();
			this.parent.local = M4x3().makeTranslate(z.x * h, z.y * h, z.z * h).multiply(this.parent.local);
		} else {
			this.xmag *= (1 + h / 10);
			this.ymag *= (1 + h / 10);
		}
	}

	this.startTrack = function(x,y,arcball) {
		if (this.subtype == 'perspective') {
			arcball.click(x,y);
			this.trackTfrm = this.getAccumulatedTransform();
		}
	}

	this.track = function(x,y,arcball) {
		if (this.subtype == 'perspective') {
			// For now we always track around origin.
			var m = arcball.drag(x,y);
			m = m.invertRigidBody();
			this.parent.local = m.multiply(this.trackTfrm);
		}
	}
};

CameraPrototype.prototype = Node.prototype;
Camera.prototype = new CameraPrototype();
