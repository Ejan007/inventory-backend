/**
 * Invitations Routes (frontend expects /api/invitations)
 */
const express = require("express");
const fs = require("fs");
const path = require("path");
const { authenticateToken } = require("../middleware");
const { sendInviteEmail } = require("../utils/inviteMailer");
const jwt = require("jsonwebtoken");
const { jwtConfig } = require("../config");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const router = express.Router();
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
			fullAccessUsers: [],
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

// POST /api/invitations
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
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

		// Validate role + store scoping
		let storeRole = rawStoreRole;
		if (role === "STORE") {
			if (!Array.isArray(storeIds) || storeIds.length === 0) {
				return res
					.status(400)
					.json({ error: "storeIds must be a non-empty array for STORE role" });
			}
			storeRole = storeRole || "STORE";
			// Ensure storeIds belong to the organization
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

		// Update Option A config
		const perms = readPerms();
		if (role === "STORE" && storeRole === "STORE") {
			// Map to staff permissions for standard store role
			perms.staff = perms.staff || {};
			perms.staff[email] = (storeIds || []).map(Number);
		} else if (role === "STORE" && storeRole === "MANAGER") {
			perms.staff = perms.staff || {};
			perms.managers = perms.managers || {};
			perms.managers[email] = (storeIds || []).map(Number);
		} else if (role === "ADMIN" || role === "HEADOFFICE") {
			perms.fullAccessUsers = Array.from(
				new Set([...(perms.fullAccessUsers || []), email])
			);
		}
		writePerms(perms);

		// Compose signed invite link
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

		await sendInviteEmail({ to: email, inviteLink, role, storeRole, storeIds });

		return res.json({ success: true, inviteLink, token });
	} catch (e) {
		console.error("Invitations error:", e);
		return res.status(500).json({ error: "Failed to send invitation" });
	}
});

module.exports = router;
