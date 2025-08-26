/**
 * History Routes
 */
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authenticateToken, filterByOrganization } = require("../middleware");

const prisma = new PrismaClient();

/**
 * Get full history
 */
router.get(
	"/full",
	authenticateToken,
	filterByOrganization,
	async (req, res) => {
		try {
			const storeIds = Array.isArray(req.user.storeIds)
				? req.user.storeIds.map(Number)
				: null;
			const where = {};
			if (
				req.user.role === "STORE" ||
				req.user.storeRole === "STORE" ||
				req.user.storeRole === "MANAGER"
			) {
				if (!storeIds || storeIds.length === 0) return res.json([]);
				where.item = { storeId: { in: storeIds } };
			}
			const history = await prisma.itemHistory.findMany({
				where,
				include: { item: true },
				orderBy: { updatedAt: "desc" },
			});
			res.json(history);
		} catch (error) {
			console.error("Error fetching full history:", error);
			res.status(500).json({ error: "Failed to fetch full history" });
		}
	}
);

module.exports = router;
