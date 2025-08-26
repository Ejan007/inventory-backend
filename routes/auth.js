/**
 * Auth Routes
 */
const express = require("express");
const router = express.Router();
// const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { jwtConfig } = require("../config");
const bcrypt = require("bcryptjs");
const {
	getFullAccessStoreIds,
	getStaffStoreIds,
	getFullAccessUsers,
	getManagerStoreIds,
} = require("../config/permissions");

const prisma = new PrismaClient();

/**
 * Login route - supports both /login and /auth/login paths
 */
const loginHandler = async (req, res) => {
	const { email, password } = req.body;
	try {
		const user = await prisma.user.findUnique({
			where: { email },
		});

		if (!user) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		const valid = await bcrypt.compare(password, user.password);
		if (!valid) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		// Get organization name separately if needed
		let organizationName = null;
		if (user.organizationId) {
			try {
				const organization = await prisma.organization.findUnique({
					where: { id: user.organizationId },
				});
				organizationName = organization?.name;
			} catch (orgError) {
				console.log("Warning: Could not fetch organization:", orgError);
			}
		}

		const fullAccessStoreIds = getFullAccessStoreIds();
		const staffStoreIds = getStaffStoreIds(user.email);
		const managerStoreIds = getManagerStoreIds(user.email);
		const fullAccessUsers = getFullAccessUsers();
		// DB-backed store access
		const dbAccess = await prisma.userStoreAccess.findMany({
			where: { userId: user.id },
		});
		const dbStoreIds = dbAccess.map((a) => a.storeId);
		const hasManager = dbAccess.some((a) => a.storeRole === "MANAGER");
		const permissions = {
			fullAccessStoreIds,
			staffStoreIds,
			isFullAccess:
				["ADMIN", "HEADOFFICE"].includes(user.role) ||
				(fullAccessUsers || []).includes(user.email),
			isStaff: staffStoreIds && staffStoreIds.length > 0,
		};
		// Contract fields: prefer DB assignments; fallback to config
		const configStoreIds =
			(managerStoreIds && managerStoreIds.length
				? managerStoreIds
				: staffStoreIds) || [];
		const storeIds =
			dbStoreIds && dbStoreIds.length ? dbStoreIds : configStoreIds;
		const storeRole =
			dbStoreIds && dbStoreIds.length
				? hasManager
					? "MANAGER"
					: "STORE"
				: managerStoreIds && managerStoreIds.length
				? "MANAGER"
				: staffStoreIds && staffStoreIds.length
				? "STORE"
				: null;

		const token = jwt.sign(
			{
				userId: user.id,
				role: user.role,
				email: user.email,
				organizationId: user.organizationId,
				organizationName: organizationName,
				isNewOrganization: user.isNewOrganization,
				permissions,
				storeIds,
				storeRole,
			},
			jwtConfig.secret,
			{ expiresIn: jwtConfig.expiresIn }
		);

		// Enhanced response with more user information
		res.json({
			token,
			user: {
				id: user.id,
				email: user.email,
				role: user.role,
				organizationId: user.organizationId,
				organizationName: organizationName,
				isNewOrganization: user.isNewOrganization,
				permissions,
				storeIds,
				storeRole,
			},
			success: true,
		});
	} catch (error) {
		console.error("Login error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

// Login routes - multiple paths to support different client implementations
router.post("/login", loginHandler);
router.post("/auth/login", loginHandler);
router.post("/api/auth/login", loginHandler);

/**
 * Registration endpoint with organization support
 */
router.post("/auth/register", async (req, res) => {
	const {
		email,
		password,
		role = "STORE",
		organizationName,
		isNewOrganization,
		existingOrganizationId,
	} = req.body;

	try {
		// Check if user already exists
		const existingUser = await prisma.user.findUnique({
			where: { email },
		});

		if (existingUser) {
			return res.status(400).json({ error: "User already exists" });
		}

		// Hash the password
		const hashedPassword = await bcrypt.hash(password, 10);

		let organizationId;

		if (isNewOrganization) {
			// Create new organization
			const newOrganization = await prisma.organization.create({
				data: {
					name: organizationName,
					adminEmail: email,
				},
			});
			organizationId = newOrganization.id;
		} else if (existingOrganizationId) {
			// Verify existing organization
			const existingOrganization = await prisma.organization.findUnique({
				where: { id: parseInt(existingOrganizationId) },
			});

			if (!existingOrganization) {
				return res.status(404).json({ error: "Organization not found" });
			}

			organizationId = existingOrganization.id;
		}

		// Create the new user
		const newUser = await prisma.user.create({
			data: {
				email,
				password: hashedPassword,
				role: role.toUpperCase(),
				organizationId,
				isNewOrganization: isNewOrganization || false,
			},
		});

		// Generate JWT token for the new user
		const token = jwt.sign(
			{
				userId: newUser.id,
				role: newUser.role,
				organizationId,
				isNewOrganization: newUser.isNewOrganization,
			},
			jwtConfig.secret,
			{ expiresIn: jwtConfig.expiresIn }
		);

		// Return success with token and user information
		res.status(201).json({
			message: "User registered successfully",
			token,
			user: {
				id: newUser.id,
				email: newUser.email,
				role: newUser.role,
				organizationId,
				isNewOrganization: newUser.isNewOrganization,
			},
			success: true,
		});
	} catch (error) {
		console.error("Registration error:", error);
		res.status(500).json({ error: "Failed to register user" });
	}
});

module.exports = router;

/**
 * Verify invite token (no auth). Returns payload for prefill of invite accept page.
 */
router.get("/auth/verify-invite", async (req, res) => {
	try {
		const { token } = req.query;
		if (!token) return res.status(400).json({ error: "Missing token" });
		const decoded = jwt.verify(token, jwtConfig.secret);
		if (decoded.type !== "invite")
			return res.status(400).json({ error: "Invalid token type" });
		return res.json({ valid: true, invite: decoded });
	} catch (e) {
		return res.status(400).json({ valid: false, error: e.message });
	}
});

/**
 * Accept invite: set password and create user if missing
 * Body: { token, password }
 */
router.post("/auth/accept-invite", async (req, res) => {
	try {
		const { token, password } = req.body || {};
		if (!token || !password)
			return res.status(400).json({ error: "Missing token or password" });
		const decoded = jwt.verify(token, jwtConfig.secret);
		if (decoded.type !== "invite")
			return res.status(400).json({ error: "Invalid token type" });

		const email = decoded.email.toLowerCase();
		let user = await prisma.user.findUnique({ where: { email } });
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create or update user
		if (!user) {
			user = await prisma.user.create({
				data: {
					email,
					password: hashedPassword,
					role: (decoded.role || "STORE").toUpperCase(),
					organizationId: decoded.organizationId || null,
					isNewOrganization: false,
				},
			});
		} else {
			await prisma.user.update({
				where: { id: user.id },
				data: { password: hashedPassword },
			});
		}

		// Create DB-backed store access if provided in invite
		if (
			decoded.role === "STORE" &&
			Array.isArray(decoded.storeIds) &&
			decoded.storeIds.length > 0
		) {
			const rows = decoded.storeIds.map((sid) => ({
				userId: user.id,
				storeId: Number(sid),
				organizationId: decoded.organizationId || null,
				storeRole: decoded.storeRole === "MANAGER" ? "MANAGER" : "STORE",
			}));
			// Replace existing assignments for these stores
			await prisma.userStoreAccess.deleteMany({
				where: {
					userId: user.id,
					storeId: { in: decoded.storeIds.map(Number) },
				},
			});
			if (rows.length) {
				await prisma.userStoreAccess.createMany({
					data: rows,
					skipDuplicates: true,
				});
			}
		}

		// Issue login token after acceptance
		const authToken = jwt.sign(
			{
				userId: user.id,
				role: user.role,
				email: user.email,
				organizationId: user.organizationId || null,
				isNewOrganization: user.isNewOrganization,
				// Contract fields from invite
				storeIds: Array.isArray(decoded.storeIds) ? decoded.storeIds : [],
				storeRole: decoded.storeRole || null,
			},
			jwtConfig.secret,
			{ expiresIn: jwtConfig.expiresIn }
		);

		return res.json({ success: true, token: authToken });
	} catch (e) {
		console.error("Accept invite error:", e);
		return res.status(400).json({ error: e.message });
	}
});
