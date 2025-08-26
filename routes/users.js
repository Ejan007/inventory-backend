/**
 * Users Routes (frontend expects /api/users)
 */
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("../middleware");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/users - list users in current org
router.get("/", authenticateToken, async (req, res) => {
	try {
		const orgId = req.user.organizationId;
		if (!orgId)
			return res.status(400).json({ error: "No organization context" });
		const users = await prisma.user.findMany({
			where: { organizationId: orgId },
			select: {
				id: true,
				email: true,
				role: true,
				organizationId: true,
				createdAt: true,
				updatedAt: true,
			},
		});
		return res.json(users);
	} catch (e) {
		console.error("Error fetching users:", e);
		return res.status(500).json({ error: "Failed to fetch users" });
	}
});

module.exports = router;
