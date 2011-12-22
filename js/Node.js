
function NodePrototype() {

    this.deinit = function() {
        if (this.children)
            for (var i = 0; i < this.children.length; ++i)
                this.children[i].deinit();
    }

    this.resetToBindPose = function(scene, acc) {

        this.translate = this.getBindTranslation();
        this.rotate = this.getBindRotation();
        this.scale = this.getBindScale();
        this.calculateLocalTransform(this.translate, this.rotate, this.scale, [1.0 / acc.getX().magnitude(), 1.0 / acc.getY().magnitude(), 1.0 / acc.getZ().magnitude()], true);

        var accumulated = acc.copy().multiply(this.getLocalTransform());
        this.cacheAccumulatedTfrm(scene, accumulated);

        if (this.children)
            for (var i = 0; i < this.children.length; ++i)
                this.children[i].resetToBindPose(scene, accumulated);
    }

    this.getBindTranslation = function() {
        return this.bindTranslation ? Copy3V(this.bindTranslation) : [0,0,0];
    }

    this.getBindRotation = function() {
        return this.bindRotation ? Copy3V(this.bindRotation) : [0,0,0];
    }

    this.getBindScale = function() {
        return this.bindScale ? Copy3V(this.bindScale) : [1,1,1];
    }

    this.applyToDAG = function(f) {
        pushModelMatrix();
        modelMatrix().multiply(this.getLocalTransform());

        if (this.children)
            for (var i = 0; i < this.children.length; ++i)
                f.call(this.children[i]);

        popModelMatrix();
    }

    this.drawSkeleton = function(dbgDraw, frames) {
      this.applyToDAG(function() { this.drawSkeleton(dbgDraw, frames); });
    }

    this.drawShadow = function(jointMatrices, light) {
      this.applyToDAG(function() { this.drawShadow(jointMatrices, light); });
    }

    this.draw = function(jointMatrices, lights) {
      if (this.visible)
          this.applyToDAG(function() { this.draw(jointMatrices, lights); });
    }

    this.calculateLocalTransform = function(tr, ro, sc, psi, vis) {
        this.local = M4x3().makeTranslate(tr[0], tr[1], tr[2]);

        if (ro != [0,0,0]) {
            if (this.rotatePivot)
                this.local.multiply(M4x3().makeTranslate(this.rotatePivot[0], this.rotatePivot[1], this.rotatePivot[2]));
            this.local.multiply(M4x3().makeRotateZ(ro[2] * Math.PI / 180.0));
            this.local.multiply(M4x3().makeRotateY(ro[1] * Math.PI / 180.0));
            this.local.multiply(M4x3().makeRotateX(ro[0] * Math.PI / 180.0));
            if (this.rotatePivot)
                this.local.multiply(M4x3().makeTranslate(-this.rotatePivot[0], -this.rotatePivot[1], -this.rotatePivot[2]));
        }

        if (sc != [1,1,1]) {
            if (this.scalePivot)
                this.local.multiply(M4x3().makeTranslate(this.scalePivot[0], this.scalePivot[1], this.scalePivot[2]));
            this.local.multiply(M4x3().make(sc[0],0,0,0,sc[1],0,0,0,sc[2],0,0,0));
            if (this.scalePivot)
                this.local.multiply(M4x3().makeTranslate(-this.scalePivot[0], -this.scalePivot[1],- this.scalePivot[2]));
        }

        this.visible = vis;
    }

    this.getAnimatedTransformation = function(animation) {
        var translation = Copy3V(this.translate);
        var scale = Copy3V(this.scale);
        var rotation = Copy3V(this.rotate);
        var visibility = true;
        var animNode = animation ? animation[this.name] : null;
        if (animNode) {
            var t = animation.time;

            var attrNode = animNode['translate'];
            if (attrNode) {
                if (attrNode['X'])
                  translation[0] = evaluateAttribute(attrNode, 'X', t);
                if (attrNode['Y'])
                  translation[1] = evaluateAttribute(attrNode, 'Y', t);
                if (attrNode['Z'])
                  translation[2] = evaluateAttribute(attrNode, 'Z', t);
            }

            attrNode = animNode['rotateX'];
            if (attrNode)
                rotation[0] = evaluateAttribute(attrNode, 'ANGLE', t);

            attrNode = animNode['rotateY'];
            if (attrNode)
                rotation[1] = evaluateAttribute(attrNode, 'ANGLE', t);

            attrNode = animNode['rotateZ'];
            if (attrNode)
                rotation[2] = evaluateAttribute(attrNode, 'ANGLE', t);

            var attrNode = animNode['scale'];
            if (attrNode) {
                if (attrNode['X'])
                  scale[0] = evaluateAttribute(attrNode, 'X', t);
                if (attrNode['Y'])
                  scale[1] = evaluateAttribute(attrNode, 'Y', t);
                if (attrNode['Z'])
                  scale[2] = evaluateAttribute(attrNode, 'Z', t);
            }

            attrNode = animNode['visibility'];
            if (attrNode)
                visibility = evaluateAttribute(attrNode, 'VALUE', t);
        }
        return {
            translation: translation,
            scale: scale,
            rotation: rotation,
            visibility: visibility
        };
    }

    this.update = function(scene, acc) {
        // Current animation
        var t1 = this.getAnimatedTransformation(scene.animation);

        if (scene.animation.fadeTime < scene.animation.fadeMax && scene.animation.fadeAnim) {
            // Weight factors for the fade in/out animations
            var fadeAnim = scene.animation.fadeAnim;
            var w1 = scene.animation.fadeTime / scene.animation.fadeMax;
            var w2 = 1.0 - w1;

            // Old animation
            var t2 = this.getAnimatedTransformation(fadeAnim);

            // Blend animations
            var translation = [w1 * t1.translation[0] + w2 * t2.translation[0],
                               w1 * t1.translation[1] + w2 * t2.translation[1],
                               w1 * t1.translation[2] + w2 * t2.translation[2]];
            var rotation = [w1 * t1.rotation[0] + w2 * t2.rotation[0],
                            w1 * t1.rotation[1] + w2 * t2.rotation[1],
                            w1 * t1.rotation[2] + w2 * t2.rotation[2]];
            var scale = [w1 * t1.scale[0] + w2 * t2.scale[0],
                         w1 * t1.scale[1] + w2 * t2.scale[1],
                         w1 * t1.scale[2] + w2 * t2.scale[2]];
            var visibility = t1.visibility || t2.visibility;
            this.calculateLocalTransform(translation, rotation, scale, [1.0 / acc.getX().magnitude(), 1.0 / acc.getY().magnitude(), 1.0 / acc.getZ().magnitude()], visibility);
        } else {
            this.calculateLocalTransform(t1.translation, t1.rotation, t1.scale, [1.0 / acc.getX().magnitude(), 1.0 / acc.getY().magnitude(), 1.0 / acc.getZ().magnitude()], t1.visibility);
        }

        var accumulated = acc.copy().multiply(this.getLocalTransform());

        this.cacheAccumulatedTfrm(scene, accumulated);

        if (this.children)
            for (var i = 0; i < this.children.length; ++i)
                this.children[i].update(scene, accumulated);
    }

    this.cacheAccumulatedTfrm = function(scene, accumulated) {
    }

    this.setParentPointers = function(parent) {
        this.parent = parent;
        if (this.children)
            for (var i = 0; i < this.children.length; ++i)
                this.children[i].setParentPointers(this);
    }

    this.setupLODJoints = function(scene) {
        if (this.children)
            for (var i = 0; i < this.children.length; ++i)
                this.children[i].setupLODJoints(scene);
    }

    this.setupLODMeshes = function(lod) {
        if (this.children)
            for (var i = 0; i < this.children.length; ++i)
                this.children[i].setupLODMeshes(lod);
    }

    this.getLocalTransform = function() {
        return this.local.copy();
    }

    this.getAccumulatedTransform = function() {
        var parentTfrm = this.parent ? this.parent.getAccumulatedTransform() : I4x3();
        return parentTfrm.multiply(this.getLocalTransform());
    }

    this.findNode = function(name) {
        if (this.name == name)
            return this;
        if (this.children)
            for (var i = 0; i < this.children.length; ++i) {
                var n = this.children[i].findNode(name);
                if (n)
                    return n;
            }
        return null;
    }

    this.findNodesByType = function(nodes, type, returnParents, parent) {
        if (this.type == type)
            if (returnParents)
                nodes.push(parent);
            else
                nodes.push(this);
        if (this.children)
            for (var i = 0; i < this.children.length; ++i)
                this.children[i].findNodesByType(nodes, type, returnParents, this);
    }

    this.getCoordinatePlaneIntersection = function() {
        var acc = this.getAccumulatedTransform();
        var P0 = acc.getT().scale(-1);
        var u = acc.getZ().scale(-1);
        var x = Vec3().make(1,0,0);
        var y = Vec3().make(0,1,0);
        var z = Vec3().make(0,0,1);
        var xz = u.y == 0 ? -1 : y.dot(P0) / y.dot(u);
        var xy = u.z == 0 ? -1 : z.dot(P0) / z.dot(u);
        var yz = u.x == 0 ? -1 : x.dot(P0) / x.dot(u);
        var s = -1;
        if (xz > 0 && (xz < s || s == -1))
            s = xz;
        if (xy > 0 && (xy < s || s == -1))
            s = xy;
        if (yz > 0 && (yz < s || s == -1))
            s = yz;
        if (s < 0)
            s = 10;
        return acc.getT().add(u.scale(s));
    }

};

function Node(scene, template) {
    Object.defineProperty(this, 'name', { value : template.name });
    Object.defineProperty(this, 'type', { value : template.type });
    this.bindTranslation = template.translate;
    this.bindRotation = template.rotate;
    Object.defineProperty(this, 'bindScale', { value : template.scale});
    Object.defineProperty(this, 'rotatePivot', { value : template.rotatePivot});
    Object.defineProperty(this, 'scalePivot', { value : template.scalePivot});
    this.visible = true;
    this.children = template.children;
    this.local = I4x3();
};

Node.prototype = new NodePrototype();

