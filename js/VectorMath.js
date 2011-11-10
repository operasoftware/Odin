/* ex: set tabstop=4 expandtab: */
/*
Vec3()
    make(x,y,z)
    toString()
    copy()
    dot(v)
    magnitude()
    magnitudeSquared()
    normalize()
    subtract(v)
    add()
    cross(v)
    flatten()
    scale(s)

M4x3()
    make(x0, x1, x2, y0, y1, y2, z0, z1, z2, t0, t1, t2)
    makeIdentity()
    makeRotateX(angle)
    makeRotateY(angle)
    makeRotateZ(angle)
    makeRotate(angle,x,y,z)
    makeTranslate(x, y, z)
    makeLookAt(ex,ey,ez,cx,cy,cz,ux,uy,uz)
    toString()  
    copy()
    multiply(m)
    invertRigidBody()
    getX()
    getY()
    getZ()
    getT()
    flatten(transpose)

M4x4()
    make(x0, x1, x2, x3, y0, y1, y2, y3, z0, z1, z2, z3, t0, t1, t2, t3)
    make(m4x3)
    makeIdentity()
    makePerspective(fovy, aspect, znear, zfar)
    makeOrtho(left, right, bottom, top, znear, zfar)
    toString()
    copy()
    multiply(m)
    flatten(transpose)
*/

function Copy3V(x) {
  return [x[0],x[1],x[2]];
}

function Vector3() {
};

function Vector3Prototype() {

    this.make = function(x,y,z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    this.toString = function() {
        return '['+this.x+','+this.y+','+this.z+']';
    }

    this.copy = function() {
        return new Vector3().make(this.x,this.y,this.z);
    }

    this.dot = function(v) {
      return this.x*v.x+this.y*v.y+this.z*v.z;
    }

    this.magnitude = function() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    this.magnitudeSquared = function() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    this.normalize = function() {
        var sqlen = this.x*this.x+this.y*this.y+this.z*this.z;
        if (sqlen != 0) {
            var invLen = 1 / Math.sqrt(sqlen);
            this.x *= invLen;
            this.y *= invLen;
            this.z *= invLen;
        }
        return this;
    }

    this.subtract = function(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    this.add = function(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    this.scale = function(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }

    this.cross = function(v) {
        var nx = this.y*v.z-this.z*v.y;
        var ny = -(this.x*v.z-this.z*v.x);
        var nz = this.x*v.y-this.y*v.x;
        this.x = nx;
        this.y = ny;
        this.z = nz;
        return this;
    }

    this.flatten = function() {
        return [this.x, this.y, this.z];
    }

} 

Vector3.prototype = new Vector3Prototype();

function Matrix4x3() {
}

function Matrix4x3Prototype() {

    this.makeIdentity = function() {
        this.x0=this.y1=this.z2=1;
        this.x1=this.x2=this.y0=this.y2=this.z0=this.z1=this.t0=this.t1=this.t2=0;
        return this;
    }

    this.make = function(x0, x1, x2, y0, y1, y2, z0, z1, z2, t0, t1, t2) {
        if (x1 == undefined) {
            this.x0 = x0.x0;
            this.x1 = x0.x1;
            this.x2 = x0.x2;
            this.y0 = x0.y0;
            this.y1 = x0.y1;
            this.y2 = x0.y2;
            this.z0 = x0.z0;
            this.z1 = x0.z1;
            this.z2 = x0.z2;
            this.t0 = x0.t0;
            this.t1 = x0.t1;
            this.t2 = x0.t2;
        } else {
            this.x0 = x0;
            this.x1 = x1;
            this.x2 = x2;
            this.y0 = y0;
            this.y1 = y1;
            this.y2 = y2;
            this.z0 = z0;
            this.z1 = z1;
            this.z2 = z2;
            this.t0 = t0;
            this.t1 = t1;
            this.t2 = t2;
        }
        return this;
    };

    this.makeRotateX = function(angle) {
        var c = Math.cos(angle), s = Math.sin(angle);
        this.x0 = 1;
        this.y1 = c;
        this.z2 = c;
        this.y2 = s;
        this.z1 = -s;
        this.x1=this.x2=this.y0=this.z0=this.t0=this.t1=this.t2=0;
        return this;
    }

    this.makeRotateY = function(angle) {
        var c = Math.cos(angle), s = Math.sin(angle);
        this.x0 = c;
        this.y1 = 1;
        this.z2 = c;
        this.x2 = -s;
        this.z0 = s;
        this.x1=this.y0=this.y2=this.z1=this.t0=this.t1=this.t2=0;
        return this;
    }

    this.makeRotateZ = function(angle) {
        var c = Math.cos(angle), s = Math.sin(angle);
        this.x0 = c;
        this.x1 = s;
        this.y0 = -s;
        this.y1 = c;
        this.z2 = 1;
        this.x2=this.y2=this.z0=this.z1=this.t0=this.t1=this.t2=0;
        return this;
    }

    this.makeRotate = function(angle,x,y,z) {
        var n;
        if (y == undefined)
            n = x.copy().normalize();
        else
            n = (new Vector3().make(x,y,z)).normalize();
        var s = Math.sin(angle), c = Math.cos(angle), t = 1 - c;
        this.x0 = t*n.x*n.x + c;
        this.x1 = t*n.x*n.y + s*n.z;
        this.x2 = t*n.x*n.z - s*n.y;
        this.y0 = t*n.x*n.y - s*n.z;
        this.y1 = t*n.y*n.y + c;
        this.y2 = t*n.y*n.z + s*n.x;
        this.z0 = t*n.x*n.z + s*n.y;
        this.z1 = t*n.y*n.z - s*n.x;
        this.z2 = t*n.z*n.z + c;
        this.t0=this.t1=this.t2=0;
        return this;
    }

    this.makeTranslate = function(x, y, z) {
        this.x0=this.y1=this.z2=1;
        this.x1=this.x2=this.y0=this.y2=this.z0=this.z1=0;
        if (y == undefined) {
            this.t0 = x.x;
            this.t1 = x.y;
            this.t2 = x.z;     
        } else {
            this.t0 = x;
            this.t1 = y;
            this.t2 = z;
        }
        return this;
    }

    this.toString = function() {
        return '['+this.x0+','+this.y0+','+this.z0+','+this.t0+']\n'+
            '['+this.x1+','+this.y1+','+this.z1+','+this.t1+']\n'+
            '['+this.x2+','+this.y2+','+this.z2+','+this.t2+']';
    }

    this.copy = function() {
        return (new Matrix4x3()).make(this.x0,this.x1,this.x2,this.y0,this.y1,this.y2,this.z0,this.z1,this.z2,this.t0,this.t1,this.t2);
    }

    this.multiply = function(m) { 
        this.make(this.x0*m.x0+this.y0*m.x1+this.z0*m.x2,
                this.x1*m.x0+this.y1*m.x1+this.z1*m.x2,
                this.x2*m.x0+this.y2*m.x1+this.z2*m.x2,

                this.x0*m.y0+this.y0*m.y1+this.z0*m.y2,
                this.x1*m.y0+this.y1*m.y1+this.z1*m.y2,
                this.x2*m.y0+this.y2*m.y1+this.z2*m.y2,

                this.x0*m.z0+this.y0*m.z1+this.z0*m.z2,
                this.x1*m.z0+this.y1*m.z1+this.z1*m.z2,
                this.x2*m.z0+this.y2*m.z1+this.z2*m.z2,

                this.x0*m.t0+this.y0*m.t1+this.z0*m.t2+this.t0,
                this.x1*m.t0+this.y1*m.t1+this.z1*m.t2+this.t1,
                this.x2*m.t0+this.y2*m.t1+this.z2*m.t2+this.t2);
        return this;
    }

    this.makeLookAt = function(ex, ey, ez, cx, cy, cz, ux, uy, uz)
    {
        var z = Vec3().make(ex,ey,ez).subtract(Vec3().make(cx,cy,cz)).normalize();
        var x = Vec3().make(ux,uy,uz).cross(z).normalize();
        var y = z.copy().cross(x.copy()).normalize();

        this.make(x.x, y.x, z.x, x.y, y.y, z.y, x.z, y.z, z.z, 0, 0, 0);
        this.multiply(M4x3().make(1,0,0,0,1,0,0,0,1,-ex,-ey,-ez));
        return this;
    }

    this.flatten = function(transpose) {
        if (transpose)
            return [this.x0, this.y0, this.z0, this.t0, this.x1, this.y1, this.z1, this.t1, this.x2, this.y2, this.z2, this.t2, 0, 0, 0, 1];
        else
            return [this.x0, this.x1, this.x2, 0, this.y0, this.y1, this.y2, 0, this.z0, this.z1, this.z2, 0, this.t0, this.t1, this.t2, 1];
    }

    this.invertRigidBody = function() {
        // Invert matrix by transposing rotation matrix part and inverting
        // translation part, then multiply transposed rotation by inverted
        // translation.
        // M^{-1} = (T*R)^{-1} = R^{-1}*T^{-1} = R^t * (-T)
        // M : final matrix
        // R : rotation part of the matrix
        // T : translation part of the matrix

        // Inverted translation.
        var ti = [-this.t0, -this.t1, -this.t2];

        // Calculate new translation part.
        this.t0 = this.x0 * ti[0] + this.x1 * ti[1] + this.x2 * ti[2];
        this.t1 = this.y0 * ti[0] + this.y1 * ti[1] + this.y2 * ti[2];
        this.t2 = this.z0 * ti[0] + this.z1 * ti[1] + this.z2 * ti[2];

        // Calculate new rotation part.
        var swap;
        swap = this.x1; this.x1 = this.y0; this.y0 = swap;
        swap = this.x2; this.x2 = this.z0; this.z0 = swap;
        swap = this.y2; this.y2 = this.z1; this.z1 = swap;

        return this;
    }

    this.getX = function() {
        return Vec3().make(this.x0,this.x1,this.x2);
    }

    this.getY = function() {
        return Vec3().make(this.y0,this.y1,this.y2);
    }

    this.getZ = function() {
        return Vec3().make(this.z0,this.z1,this.z2);
    }

    this.getT = function() {
        return Vec3().make(this.t0,this.t1,this.t2);
    }

}

Matrix4x3.prototype = new Matrix4x3Prototype();


function Matrix4x4() {
}

function Matrix4x4Prototype() {

    this.toString = function() {
        return '['+this.x0+','+this.y0+','+this.z0+','+this.t0+']\n'+
        '['+this.x1+','+this.y1+','+this.z1+','+this.t1+']\n'+
        '['+this.x2+','+this.y2+','+this.z2+','+this.t2+']\n'+
        '['+this.x3+','+this.y3+','+this.z3+','+this.t3+']';
    }

    this.copy = function() {
        return (new Matrix4x4).make(this.x0,this.x1,this.x2,this.x3,this.y0,this.y1,this.y2,this.y3,this.z0,this.z1,this.z2,this.z3,this.t0,this.t1,this.t2,this.t3);
    }

    this.makeIdentity = function() {
        this.x0=this.y1=this.z2=this.t3=1;
        this.x1=this.x2=this.x3=this.y0=this.y2=this.y3=this.z0=this.z1=this.z3=this.t0=this.t1=this.t2=0;
        return this;
    }

    this.make = function(x0, x1, x2, x3, y0, y1, y2, y3, z0, z1, z2, z3, t0, t1, t2, t3) {    
        if (x1 == undefined && x0.x3 == undefined) {
            this.x0 = x0.x0;
            this.x1 = x0.x1;
            this.x2 = x0.x2;
            this.x3 = 0;
            this.y0 = x0.y0;
            this.y1 = x0.y1;
            this.y2 = x0.y2;
            this.y3 = 0;
            this.z0 = x0.z0;
            this.z1 = x0.z1;
            this.z2 = x0.z2;
            this.z3 = 0;
            this.t0 = x0.t0;
            this.t1 = x0.t1;
            this.t2 = x0.t2;
            this.t3 = 1;    
        } else if (x1 == undefined) {
            this.x0 = x0.x0;
            this.x1 = x0.x1;
            this.x2 = x0.x2;
            this.x3 = x0.x3;
            this.y0 = x0.y0;
            this.y1 = x0.y1;
            this.y2 = x0.y2;
            this.y3 = x0.y3;
            this.z0 = x0.z0;
            this.z1 = x0.z1;
            this.z2 = x0.z2;
            this.z3 = x0.z3;
            this.t0 = x0.t0;
            this.t1 = x0.t1;
            this.t2 = x0.t2;
            this.t3 = x0.t3;
        } else {
            this.x0 = x0;
            this.x1 = x1;
            this.x2 = x2;
            this.x3 = x3;
            this.y0 = y0;
            this.y1 = y1;
            this.y2 = y2;
            this.y3 = y3;
            this.z0 = z0;
            this.z1 = z1;
            this.z2 = z2;
            this.z3 = z3;
            this.t0 = t0;
            this.t1 = t1;
            this.t2 = t2;
            this.t3 = t3;
        }
        return this;
    }

    this.multiply = function(m) {
        if (m.x3 == undefined) {
            this.make(this.x0*m.x0+this.y0*m.x1+this.z0*m.x2,
                    this.x1*m.x0+this.y1*m.x1+this.z1*m.x2,
                    this.x2*m.x0+this.y2*m.x1+this.z2*m.x2,
                    this.x3*m.x0+this.y3*m.x1+this.z3*m.x2,

                    this.x0*m.y0+this.y0*m.y1+this.z0*m.y2,
                    this.x1*m.y0+this.y1*m.y1+this.z1*m.y2,
                    this.x2*m.y0+this.y2*m.y1+this.z2*m.y2,
                    this.x3*m.y0+this.y3*m.y1+this.z3*m.y2,

                    this.x0*m.z0+this.y0*m.z1+this.z0*m.z2,
                    this.x1*m.z0+this.y1*m.z1+this.z1*m.z2,
                    this.x2*m.z0+this.y2*m.z1+this.z2*m.z2,
                    this.x3*m.z0+this.y3*m.z1+this.z3*m.z2,

                    this.x0*m.t0+this.y0*m.t1+this.z0*m.t2+this.t0,
                    this.x1*m.t0+this.y1*m.t1+this.z1*m.t2+this.t1,
                    this.x2*m.t0+this.y2*m.t1+this.z2*m.t2+this.t2,
                    this.x3*m.t0+this.y3*m.t1+this.z3*m.t2+this.t3);
        } else {
            this.make(this.x0*m.x0+this.y0*m.x1+this.z0*m.x2+this.t0*m.x3,
                    this.x1*m.x0+this.y1*m.x1+this.z1*m.x2+this.t1*m.x3,
                    this.x2*m.x0+this.y2*m.x1+this.z2*m.x2+this.t2*m.x3,
                    this.x3*m.x0+this.y3*m.x1+this.z3*m.x2+this.t3*m.x3,

                    this.x0*m.y0+this.y0*m.y1+this.z0*m.y2+this.t0*m.y3,
                    this.x1*m.y0+this.y1*m.y1+this.z1*m.y2+this.t1*m.y3,
                    this.x2*m.y0+this.y2*m.y1+this.z2*m.y2+this.t2*m.y3,
                    this.x3*m.y0+this.y3*m.y1+this.z3*m.y2+this.t3*m.y3,

                    this.x0*m.z0+this.y0*m.z1+this.z0*m.z2+this.t0*m.z3,
                    this.x1*m.z0+this.y1*m.z1+this.z1*m.z2+this.t1*m.z3,
                    this.x2*m.z0+this.y2*m.z1+this.z2*m.z2+this.t2*m.z3,
                    this.x3*m.z0+this.y3*m.z1+this.z3*m.z2+this.t3*m.z3,

                    this.x0*m.t0+this.y0*m.t1+this.z0*m.t2+this.t0*m.t3,
                    this.x1*m.t0+this.y1*m.t1+this.z1*m.t2+this.t1*m.t3,
                    this.x2*m.t0+this.y2*m.t1+this.z2*m.t2+this.t2*m.t3,
                    this.x3*m.t0+this.y3*m.t1+this.z3*m.t2+this.t3*m.t3);
            }
            return this;
    }

    this.makePerspective = function(fovy, aspect, znear, zfar) {
        var top = znear * Math.tan(fovy * Math.PI / 360.0);
        var bottom = -top;
        var left = bottom * aspect;
        var right = top * aspect;

        var X = 2*znear/(right-left);
        var Y = 2*znear/(top-bottom);
        var A = (right+left)/(right-left);
        var B = (top+bottom)/(top-bottom);
        var C = -(zfar+znear)/(zfar-znear);
        var D = -2*zfar*znear/(zfar-znear);

        this.make(X,0,0,0, 0,Y,0,0, A,B,C,-1, 0,0,D,0);
        return this;
    }

    this.makeOrtho = function(left, right, bottom, top, znear, zfar) {
        var tx = -(right+left)/(right-left);
        var ty = -(top+bottom)/(top-bottom);
        var tz = -(zfar+znear)/(zfar-znear);

        this.make(2/(right-left),0,0,0, 0,2/(top-bottom),0,0, 0,0,-2/(zfar-znear),0, tx,ty,tz,1);
        return this;
    }

    this.flatten = function(transpose) {
        if (transpose)
            return [this.x0, this.y0, this.z0, this.t0, this.x1, this.y1, this.z1, this.t1, this.x2, this.y2, this.z2, this.t2, this.x3, this.y3, this.z3, this.t3];
        else
            return [this.x0, this.x1, this.x2, this.x3, this.y0, this.y1, this.y2, this.y3, this.z0, this.z1, this.z2, this.z3, this.t0, this.t1, this.t2, this.t3];
    }

}

Matrix4x4.prototype = new Matrix4x4Prototype();

I4x3 = function() { return (new Matrix4x3()).makeIdentity(); };
I4x4 = function() { return (new Matrix4x4()).makeIdentity(); };
M4x3 = function() { return new Matrix4x3(); };
M4x4 = function() { return new Matrix4x4(); };
Vec3 = function() { return new Vector3(); };


//---------------------------------------

function GLMatrixState() {
    this.viewMatrix = M4x3().makeLookAt(0,0,0, 0,0,-1, 0,1,0);
    this.modelMatrix = M4x3().makeIdentity();
    this.projectionMatrix = M4x4().makePerspective(45, 1.0, 0.1, 100.0);
    this.modelMatrixStack = [];

    this.pushModelMatrix = function(m) {
        this.modelMatrixStack.push(this.modelMatrix.copy());
        if (m)
            this.modelMatrix = m.copy();
    }

    this.popModelMatrix = function() {
        if (this.modelMatrixStack.length == 0)
            throw 'ModelMatrix stack is empty';
        this.modelMatrix = this.modelMatrixStack.pop();
        return this.modelMatrix;
    }
};


globalGLMatrixState = new GLMatrixState();

function pushModelMatrix(m) {
    globalGLMatrixState.pushModelMatrix(m);
}

function popModelMatrix() {
    globalGLMatrixState.popModelMatrix();
}

function projectionMatrix() {
    return globalGLMatrixState.projectionMatrix;
}

function modelMatrix() {
    return globalGLMatrixState.modelMatrix;
}

function viewMatrix() {
    return globalGLMatrixState.viewMatrix;
}

function viewProjectionMatrix() {
    return globalGLMatrixState.projectionMatrix.copy().multiply(globalGLMatrixState.viewMatrix);
}

function modelViewMatrix() {
    return globalGLMatrixState.viewMatrix.copy().multiply(globalGLMatrixState.modelMatrix);
}

//-----------------------------------------------

function sphereIntersectsCone(sphere, cone)
{
    var U = cone.vertex.copy().subtract(cone.axis.copy().scale(sphere.radius / Math.sin(cone.angle)));
    var D = sphere.center.copy().subtract(U);
    if (cone.axis.dot(D) >= D.magnitude() * Math.cos(cone.angle)) {
        // center is inside K’’
        D = sphere.center.copy().subtract(cone.vertex);
        if (-cone.axis.dot(D) >= D.magnitude() * Math.sin(cone.angle)) {
            // center is inside K’’ and inside K’
            return D.magnitude() <= sphere.radius;
        } else {
            // center is inside K’’ and outside K’
            return true;
        }
    } else {
        // center is outside K’’
        return false;
    }
}
