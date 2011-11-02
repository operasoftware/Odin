
function JointPrototype() {

    this.calculateLocalTransform = function(translation, rotation, scale, inverseParentScale, visibility) {
        var degToRad = Math.PI / 180.0;
        this.local = M4x3().make(inverseParentScale[0],0,0,0,inverseParentScale[1],0,0,0,inverseParentScale[2],translation[0],translation[1],translation[2]);
        this.local.multiply(M4x3().makeRotateZ(this.jointOrient[2] * degToRad));
        this.local.multiply(M4x3().makeRotateY(this.jointOrient[1] * degToRad));
        this.local.multiply(M4x3().makeRotateX(this.jointOrient[0] * degToRad));
        this.local.multiply(M4x3().makeRotateZ(rotation[2] * degToRad));
        this.local.multiply(M4x3().makeRotateY(rotation[1] * degToRad));
        this.local.multiply(M4x3().makeRotateX(rotation[0] * degToRad));
        if (this.postRotate) {
            this.local.multiply(M4x3().makeRotateZ(this.postRotate[2] * degToRad));
            this.local.multiply(M4x3().makeRotateY(this.postRotate[1] * degToRad));
            this.local.multiply(M4x3().makeRotateX(this.postRotate[0] * degToRad));
        }
        this.local.multiply(M4x3().make(scale[0],0,0,0,scale[1],0,0,0,scale[2],0,0,0));
        this.visible = visibility;
    }

    this.drawSkeleton = function(dbgDraw, frames) {

        var lt = this.getLocalTransform();

        if (this.parent && this.parent.type == 'joint') {
            dbgDraw.drawLine(0, 0, 0, lt.t0, lt.t1, lt.t2, dbgDraw.WHITE, frames);
        }

        pushModelMatrix();
        modelMatrix().multiply(lt);

        var alen = 0.5
        dbgDraw.drawLine(0,0,0, alen,0,0, dbgDraw.RED,frames);
        dbgDraw.drawLine(0,0,0, 0,alen,0, dbgDraw.GREEN,frames);
        dbgDraw.drawLine(0,0,0, 0,0,alen, dbgDraw.BLUE,frames);

        if (this.children) {
            for (var i = 0; i < this.children.length; ++i) {
                this.children[i].drawSkeleton(dbgDraw, frames);
            }
        }

        popModelMatrix();
    }

    this.cacheAccumulatedTfrm = function(scene, accumulated) {
        scene.jointMatrices[this.name] = accumulated;
    }

};

function Joint(scene, template) {
    Node.call(this, scene, template);
    Object.defineProperty(this, 'bindTranslation', { value : template.bindTranslation });
    Object.defineProperty(this, 'bindRotation', { value : template.bindRotation });
    Object.defineProperty(this, 'jointOrient', { value : template.jointOrient });
    Object.defineProperty(this, 'postRotate', { value : template.postRotate });
    this.local = I4x3();
};

JointPrototype.prototype = Node.prototype;
Joint.prototype = new JointPrototype();
