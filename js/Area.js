function Area(node) {
    // Extract all the triangles from the geometry
    // FIXME: Perhaps a bit nicer... (let the Node object do this, include
    // transformations etc?)
    this.mTris = [];
    var json = node.children[0].json;
    var indices = json.indices;
    var verts = json.vertexPositions[0];
    var s = 1 / 0.117; // HACK to compensate for the scaling of the character
    for (var i = 0; i < indices.length / 3; ++i) {
        var idx1 = indices[i*3]*3;
        var idx2 = indices[i*3+1]*3;
        var idx3 = indices[i*3+2]*3;
        this.mTris.push([
            [s*verts[idx1], s*verts[idx1+1], s*verts[idx1+2]],
            [s*verts[idx2], s*verts[idx2+1], s*verts[idx2+2]],
            [s*verts[idx3], s*verts[idx3+1], s*verts[idx3+2]]
        ]);
    }
};

Area.prototype = new (function AreaPrototype() {
    "use strict";

    this.pointInside = function(point) {
        var tri, dot00, dot01, dot02, dot11, dot12, u, v, inv, dist;
        var v0 = [0, 0], v1 = [0, 0], v2 = [0, 0];

        // Check against all triangles. Achtung! O(n)
        for (var i = 0; i < this.mTris.length; ++i) {
            tri = this.mTris[i];

            // Compute vectors
            v0[0] = tri[2][0] - tri[0][0], v0[1] = tri[2][2] - tri[0][2]; // C - A
            v1[0] = tri[1][0] - tri[0][0], v1[1] = tri[1][2] - tri[0][2]; // B - A
            v2[0] = point[0] - tri[0][0], v2[1] = point[2] - tri[0][2];   // P - A

            // Compute dot products
            dot00 = v0[0]*v0[0] + v0[1]*v0[1];  // dot(v0, v0)
            dot01 = v0[0]*v1[0] + v0[1]*v1[1];  // dot(v0, v1)
            dot02 = v0[0]*v2[0] + v0[1]*v2[1];  // dot(v0, v2)
            dot11 = v1[0]*v1[0] + v1[1]*v1[1];  // dot(v1, v1)
            dot12 = v1[0]*v2[0] + v1[1]*v2[1];  // dot(v1, v2)

            // Compute barycentric coordinates
            inv = 1 / (dot00 * dot11 - dot01 * dot01);
            u = (dot11 * dot02 - dot01 * dot12) * inv;
            v = (dot00 * dot12 - dot01 * dot02) * inv;

            // Check if point is in triangle
            if ((u >= 0) && (v >= 0) && (u + v <= 1))
                return true;
        }

        return false;
    }

    this.confinePoint = function(oldPoint, newPoint) {
        var dir = [newPoint[0]-oldPoint[0], newPoint[1]-oldPoint[1], newPoint[2]-oldPoint[2]];

        var tri, v12 = [0, 0], v23 = [0, 0], v31 = [0, 0], v = [0, 0], inv,
            n1 = [0, 0], n2 = [0, 0], n3 = [0, 0], d1, d2, d3,
            dist1, dist2, dist3, outside1, outside2, outside3,
            point = [0, 0, 0], dist;

        // How far should we move (squared), at most?
        var maxDist = dir[0]*dir[0] + dir[2]*dir[2];

        // Check against all triangles. Achtung! O(n)
        var bestPoint = [oldPoint[0], oldPoint[1], oldPoint[2]],
            bestDist = 0;
        for (var i = 0; i < this.mTris.length; ++i) {
            tri = this.mTris[i];

            point[0] = newPoint[0];
            point[1] = newPoint[1];
            point[2] = newPoint[2];

            v12[0] = tri[1][0] - tri[0][0], v12[1] = tri[1][2] - tri[0][2]; // Edge 1: B - A
            v23[0] = tri[2][0] - tri[1][0], v23[1] = tri[2][2] - tri[1][2]; // Edge 2: C - B
            v31[0] = tri[0][0] - tri[2][0], v31[1] = tri[0][2] - tri[2][2]; // Edge 3: A - C

            // Check edge 1
            inv = 1 / Math.sqrt(v12[0]*v12[0] + v12[1]*v12[1]);
            n1 = [v12[1] * inv, -v12[0] * inv];
            d1 = -n1[0] * tri[0][0] - n1[1] * tri[0][2];
            dist1 = point[0] * n1[0] + point[2] * n1[1] + d1;
            outside1 = dist1 > 0;

            // Check edge 2
            inv = 1 / Math.sqrt(v23[0]*v23[0] + v23[1]*v23[1]);
            n2 = [v23[1] * inv, -v23[0] * inv];
            d2 = -n2[0] * tri[1][0] - n2[1] * tri[1][2];
            dist2 = point[0] * n2[0] + point[2] * n2[1] + d2;
            outside2 = dist2 > 0;

            // Check edge 3
            inv = 1 / Math.sqrt(v31[0]*v31[0] + v31[1]*v31[1]);
            n3 = [v31[1] * inv, -v31[0] * inv];
            d3 = -n3[0] * tri[2][0] - n3[1] * tri[2][2];
            dist3 = point[0] * n3[0] + point[2] * n3[1] + d3;
            outside3 = dist3 > 0;

            if (outside1 && outside2) {
                point[0] = tri[1][0];
                point[2] = tri[1][2];
            }
            else if (outside2 && outside3) {
                point[0] = tri[2][0];
                point[2] = tri[2][2];
            }
            else if (outside3 && outside1) {
                point[0] = tri[0][0];
                point[2] = tri[0][2];
            }
            else if (outside1) {
                point[0] -= dist1 * n1[0];
                point[2] -= dist1 * n1[1];
            }
            else if (outside2) {
                point[0] -= dist2 * n2[0];
                point[2] -= dist2 * n2[1];
            }
            else if (outside3) {
                point[0] -= dist3 * n3[0];
                point[2] -= dist3 * n3[1];
            }

            // Did we get any further with this triangle?
            v[0] = point[0] - oldPoint[0];
            v[1] = point[2] - oldPoint[2];
            if ((v[0]*dir[0] + v[1]*dir[2]) > 0) {
                dist = v[0]*v[0] + v[1]*v[1];
                if ((dist > bestDist) && (dist < maxDist)) {
                    bestDist = dist;
                    bestPoint[0] = point[0];
                    bestPoint[1] = point[1];
                    bestPoint[2] = point[2];
                }
            }
        }

        // Return the best point
        newPoint[0] = bestPoint[0];
        newPoint[1] = bestPoint[1];
        newPoint[2] = bestPoint[2];
    }

    this.moveInsideArea = function(oldPoint, dir) {
        // Calculate nominal (unconstrained) movement
        var newPoint = [oldPoint[0] + dir[0], oldPoint[1], oldPoint[2] + dir[2]];

        // Confine the point to the area
        if (!this.pointInside(newPoint)) {
            this.confinePoint(oldPoint, newPoint);
        }

        return newPoint;
    }
})();