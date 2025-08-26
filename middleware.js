/**
 * Authentication and Organization Middleware
 */
const jwt = require("jsonwebtoken");
const { jwtConfig } = require("./config");
const {
	getFullAccessStoreIds,
	getStaffStoreIds,
} = require("./config/permissions");

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = (req, res, next) => {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];

	if (!token) {
		return res.status(401).json({ error: "Access denied. No token provided" });
	}

	try {
		const decoded = jwt.verify(token, jwtConfig.secret);
		req.user = decoded;
		next();
	} catch (error) {
		return res.status(403).json({ error: "Invalid token" });
	}
};

/**
 * Middleware to filter by organization
 */
const filterByOrganization = (req, res, next) => {
	if (!req.user.organizationId) {
		return next();
	}

	// For GET requests with query params
	if (req.method === "GET") {
		req.query.organizationId = req.user.organizationId;
	}

	// For POST, PUT, DELETE with body
	if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
		req.body.organizationId = req.user.organizationId;
	}

	next();
};

module.exports = {
	authenticateToken,
	filterByOrganization,
	requireAnyRole:
		(...roles) =>
		(req, res, next) => {
			if (!req.user || !roles.includes(req.user.role)) {
				return res.status(403).json({ error: "Forbidden" });
			}
			next();
		},
	hasFullAccess: (user) => {
		if (!user) return false;
		if (user.role === "ADMIN" || user.role === "HEADOFFICE") return true;
		// Option A: full access by email list handled elsewhere; default false here
		return false;
	},
	staffCanAccessStore: (user, storeId) => {
		if (!user) return false;
		const ids = Array.isArray(user.storeIds) ? user.storeIds.map(Number) : [];
		return ids.includes(Number(storeId));
	},
};
