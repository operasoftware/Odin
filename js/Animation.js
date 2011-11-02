'use strict';

function evaluateAttribute(attr, component, t) {
    var p0,p1,p2,p3,c0,c1,t0,t1,sc,sc2,sc3,s2,s3;
    var v = 0;

    var comp = attr[component];

    if (attr.time.length > 1) {

        // Use constant post and pre infinity.
        if (t <= attr.time[0]) {
            return comp.pos[0];
        } else if (t >= attr.time[attr.time.length - 1]) {
            return comp.pos[attr.time.length - 1];
        }

        // Find the start of the segment to interpolate.
        var from = 0;
        while (from < attr.time.length - 1 && t > attr.time[from + 1]) {
            from++;
        }

        // If it's a step curve we don't need to interpolate.
        if (attr.type === 'STEP') {
            v = comp.pos[from];
        } else {
            // Calculate s [0..1] the interpolation value for the segment.
            var s = (t - attr.time[from]) / (attr.time[from + 1] - attr.time[from]);
            // This isn't entirely true. If the tangents have different magnitudes along the t axis we should do a
            // De-casteljau approximation to find s, but in favor of speed we ignore that as it's not that common.

            if (attr.type === 'BEZIER') {
                p0 = comp.pos[from];
                p1 = comp.pos[from + 1];
                c0 = comp.outtan[from * 2 + 1];
                c1 = comp.intan[(from + 1) * 2 + 1];
                sc = 1 - s;
                sc2 = sc * sc;
                sc3 = sc2 * sc;
                s2 = s * s;
                s3 = s2 * s;
                v = p0 * sc3 + 3 * c0 * s * sc2 + 3 * c1 * s2 * sc + p1 * s3;
            } else if (attr.type === 'HERMITE') {
                p0 = comp.pos[from];
                p1 = comp.pos[from + 1];
                t0 = comp.outtan[from * 2 + 1];
                t1 = comp.intan[(from + 1) * 2 + 1];
                s2 = s * s;
                s3 = s2 * s;
                v = p0 * (2 * s3 - 3 * s2 + 1) +
                    t0 * (s3 - 2 * s2 + s) +
                    p1 * (-2 * s3 + 3 * s2) +
                    t1 * (s3 - s2);
            } else if (attr.type === 'BSPLINE') {
                if (from != 0) {
                    p0 = comp.pos[from-1];
                } else {
                    p0 = 2 * comp.pos[0] - comp.pos[1];
                }
                p1 = comp.pos[from];
                p2 = comp.pos[from + 1];
                if (from == attr.time.length - 2) {
                    p3 = 2 * comp.pos[from + 2] - comp.pos[from + 1];
                } else {
                    p3 = comp.pos[from + 2];
                }
                s2 = s * s;
                s3 = s2 * s;
                v = p0 * (s3 + 3 * s2 - 3 * s + 1) +
                    p1 * (3 * s2 + 4) +
                    p2 * (-3 * s3 + 3 * s2 + 3 * s + 1) +
                    p3 * s3;
            } else if (attr.type === 'CARDINAL') {
                throw 'CARDINAL not handled.'
            } else if ('LINEAR') {
                v = comp.pos[from] + (comp.pos[from + 1] - comp.pos[from]) * s;
            }
        }
    } else {
        v = comp.pos[0];
    }
    return v;
}

function getMaxTime(obj) {
    var maxT = obj.time ? obj.time[obj.time.length - 1] : 0;
    for (var x in obj) {
        if (typeof obj[x] === 'object' && !(obj[x] instanceof Array)) {
            maxT = Math.max(maxT, getMaxTime(obj[x]));
        }
    }
    return maxT;
}
