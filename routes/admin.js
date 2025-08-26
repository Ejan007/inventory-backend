/**
 * Admin Routes (Option A - config-backed RBAC)
 */
const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { authenticateToken } = require("../middleware");
const { sendInviteEmail } = require("../utils/inviteMailer");
const jwt = require("jsonwebtoken");
const { jwtConfig } = require("../config");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PERMISSIONS_PATH = path.join(
	__dirname,
	"..",
	"config",
	"permissions.json"
);

function readPerms() {
	try {
		return JSON.parse(fs.readFileSync(PERMISSIONS_PATH, "utf8"));
	} catch {
		return {
			fullAccessStoreIds: [],
			notifyEmails: [],
			staff: {},
			managers: {},
		};
	}
}
function writePerms(obj) {
	fs.writeFileSync(PERMISSIONS_PATH, JSON.stringify(obj, null, 2));
}

function requireAdmin(req, res, next) {
	if (
		!req.user ||
		(req.user.role !== "ADMIN" && req.user.role !== "HEADOFFICE")
	) {
		return res.status(403).json({ error: "Forbidden" });
	}
	next();
}

// Get current permissions config
router.get(
	"/config/permissions",
	authenticateToken,
	requireAdmin,
	(req, res) => {
		return res.json(readPerms());
	}
);

// Set full-feature stores (overwrites)
router.post(
	"/config/full-feature-stores",
	authenticateToken,
	requireAdmin,
	(req, res) => {
		const { storeIds } = req.body; // [1,2]
		if (!Array.isArray(storeIds))
			return res.status(400).json({ error: "storeIds must be an array" });
		const perms = readPerms();
		perms.fullAccessStoreIds = storeIds.map(Number);
		writePerms(perms);
		res.json({ success: true, fullAccessStoreIds: perms.fullAccessStoreIds });
	}
);

// Assign staff to stores (merge)
router.post("/config/staff", authenticateToken, requireAdmin, (req, res) => {
	const { email, storeIds } = req.body; // email string, storeIds array
	if (!email || !Array.isArray(storeIds))
		return res.status(400).json({ error: "email and storeIds are required" });
	const perms = readPerms();
	perms.staff = perms.staff || {};
	perms.staff[email] = storeIds.map(Number);
	writePerms(perms);
	res.json({ success: true, staff: perms.staff[email] });
});

// Assign managers to stores (merge)
router.post("/config/managers", authenticateToken, requireAdmin, (req, res) => {
	const { email, storeIds } = req.body;
	if (!email || !Array.isArray(storeIds))
		return res.status(400).json({ error: "email and storeIds are required" });
	const perms = readPerms();
	perms.managers = perms.managers || {};
	perms.managers[email] = storeIds.map(Number);
	writePerms(perms);
	res.json({ success: true, managers: perms.managers[email] });
});

// Set notification recipients (overwrites)
router.post("/config/notify", authenticateToken, requireAdmin, (req, res) => {
	const { emails } = req.body;
	if (!Array.isArray(emails))
		return res.status(400).json({ error: "emails must be an array" });
	const perms = readPerms();
	perms.notifyEmails = emails;
	writePerms(perms);
	res.json({ success: true, notifyEmails: perms.notifyEmails });
});

// Set full-access users (overwrites)
router.post(
	"/config/full-feature-users",
	authenticateToken,
	requireAdmin,
	(req, res) => {
		const { emails } = req.body; // ["admin@example.com"]
		if (!Array.isArray(emails))
			return res.status(400).json({ error: "emails must be an array" });
		const perms = readPerms();
		perms.fullAccessUsers = emails;
		writePerms(perms);
		res.json({ success: true, fullAccessUsers: perms.fullAccessUsers });
	}
);

module.exports = router;

/**
 * Organization Tab - Invitations (Option A)
 * Routes below manage user invitations via email and write to config for STAFF/MANAGER.
 */
const inviteRouter = express.Router();

// Create and send an invite; update config for STAFF/MANAGER mapping
inviteRouter.post(
	"/invite",
	authenticateToken,
	requireAdmin,
	async (req, res) => {
		try {
			const {
				email,
				role = "STORE",
				storeRole: rawStoreRole,
				storeIds = [],
				organizationId,
				inviteUrlBase,
			} = req.body;
			if (!email) return res.status(400).json({ error: "email is required" });
			const orgId = organizationId || req.user.organizationId || null;
			if (!orgId)
				return res.status(400).json({ error: "organizationId is required" });

			let storeRole = rawStoreRole;
			if (role === "STORE") {
				if (!Array.isArray(storeIds) || storeIds.length === 0) {
					return res
						.status(400)
						.json({
							error: "storeIds must be a non-empty array for STORE role",
						});
				}
				storeRole = storeRole || "STORE";
				const ids = storeIds.map(Number);
				const stores = await prisma.store.findMany({
					where: { id: { in: ids }, organizationId: Number(orgId) },
					select: { id: true },
				});
				const found = new Set(stores.map((s) => s.id));
				const missing = ids.filter((x) => !found.has(x));
				if (missing.length) {
					return res
						.status(400)
						.json({
							error: "Invalid storeIds for organization",
							details: { missing },
						});
				}
			}

			// Persist Option A mappings for STAFF/MANAGER
			const perms = readPerms();
			if (role === "STORE" && storeRole === "STORE") {
				perms.staff = perms.staff || {};
				perms.staff[email] = (storeIds || []).map(Number);
			} else if (role === "STORE" && storeRole === "MANAGER") {
				perms.managers = perms.managers || {};
				perms.managers[email] = (storeIds || []).map(Number);
			} else if (role === "ADMIN" || role === "HEADOFFICE") {
				// Add to fullAccessUsers convenience list if you want admin invite flow to reflect instant access
				perms.fullAccessUsers = Array.from(
					new Set([...(perms.fullAccessUsers || []), email])
				);
			}
			writePerms(perms);

			// Create a signed invite token and link for the frontend to handle signup / password set
			const base =
				inviteUrlBase || process.env.FRONTEND_URL || "http://localhost:3000";
			const payload = {
				email,
				role: role,
				storeRole: role === "STORE" ? storeRole || "STORE" : null,
				storeIds: role === "STORE" ? (storeIds || []).map(Number) : [],
				organizationId: Number(orgId),
				type: "invite",
			};
			const token = jwt.sign(payload, jwtConfig.secret, { expiresIn: "7d" });
			const inviteLink = `${base}/invite?token=${encodeURIComponent(token)}`;

			await sendInviteEmail({
				to: email,
				inviteLink,
				role,
				storeRole,
				storeIds,
			});

			return res.json({ success: true, inviteLink, token });
		} catch (e) {
			console.error("Invite error:", e);
			return res.status(500).json({ error: "Failed to send invite" });
		}
	}
);

// Attach invite routes under admin
router.use("/org", inviteRouter);

// Back-compat: expose a simple invitations endpoint expected by some frontends
inviteRouter.post(
	"/invitations",
	authenticateToken,
	requireAdmin,
	async (req, res, next) => {
		// Reuse the /org/invite handler logic
		req.url = "/invite";
		next();
	}
);
