
function ArcBall(w, h) {
	this.setBounds(w, h);
};

ArcBall.prototype = {
	setBounds : function(w, h) {
		this.adjustWidth  = 1 / ((w - 1) * 0.5);
		this.adjustHeight = 1 / ((h - 1) * 0.5);
	},

	click : function(x, y) {
		this.startVec = this.mapToSphere(x, y);
	},

	drag : function(x, y) {
		var endVec = this.mapToSphere(x, y);
		var perp = this.startVec.copy().cross(endVec);
		if (perp.magnitudeSquared() > 0.0000001)
		{
			// Create the quaternion.
			var q = { x : perp.x, y : perp.y, z : perp.z, w : this.startVec.dot(endVec) };

			// Build a 4x3 matrix from the quaternion.
			var n = q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w;
			var s = n > 0 ? 2 / n : 0;

			var xs = q.x * s;
			var ys = q.y * s;
			var zs = q.z * s;
			var wx = q.w * xs;
			var wy = q.w * ys;
			var wz = q.w * zs;
			var xx = q.x * xs;
			var xy = q.x * ys;
			var xz = q.x * zs;
			var yy = q.y * ys;
			var yz = q.y * zs;
			var zz = q.z * zs;

			return M4x3().make(1 - (yy + zz), xy + wz, xz - wy, xy - wz, 1 - (xx + zz), yz + wx, xz + wy, yz - wx, 1 - (xx + yy), 0, 0, 0);
		}
		else
		{
			// The start and end vectors are equal so don't rotate.
			return I4x3();
		}
	},

	mapToSphere : function(x, y) {
		// Scale down to [-1 ... 1]
		var temp = Vec3().make(x * this.adjustWidth - 1, 1 - y * this.adjustHeight, 0);
		var length = temp.magnitude();
		// If the point is outside the sphere, normalize it.
		if (length > 1) {
			temp.normalize();
		} else {
			// Map it to the sphere.
			temp.z = Math.sqrt(1 - length);
		}
		return temp;
	}
};
