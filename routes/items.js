/**
 * Item Routes
 */
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const {
	authenticateToken,
	filterByOrganization,
	hasFullAccess,
	staffCanAccessStore,
} = require("../middleware");
const {
	getFullAccessStoreIds,
	getNotifyEmails,
} = require("../config/permissions");
const { createTransport } = require("../utils/inviteMailer");
const { queueItemUpdate } = require("../utils/updateEmailBatcher");

const prisma = new PrismaClient();

/**
 * Create an inventory item
 */
router.post("/", authenticateToken, filterByOrganization, async (req, res) => {
	const {
		name,
		category,
		quantity,
		mondayRequired,
		tuesdayRequired,
		wednesdayRequired,
		thursdayRequired,
		fridayRequired,
		saturdayRequired,
		sundayRequired,
		storeId,
	} = req.body;
	try {
		// Validate required fields
		if (!name || !storeId) {
			return res
				.status(400)
				.json({ error: "Name and storeId are required fields" });
		}
		// RBAC: Only ADMIN/HEADOFFICE/MANAGER in full-feature stores can create, or STORE role if their store is whitelisted
		const fullIds = getFullAccessStoreIds();
		const isFullAccessUser = req.user?.permissions?.isFullAccess === true;
		const userStoreIds = Array.isArray(req.user.storeIds)
			? req.user.storeIds.map(Number)
			: [];
		const isAllowedCreate =
			isFullAccessUser ||
			req.user.role === "ADMIN" ||
			req.user.role === "HEADOFFICE" ||
			(req.user.storeRole === "MANAGER" &&
				userStoreIds.includes(Number(storeId))) ||
			fullIds.includes(Number(storeId));
		if (!isAllowedCreate) {
			return res
				.status(403)
				.json({ error: "Forbidden: insufficient permissions to create items" });
		}

		const item = await prisma.item.create({
			data: {
				name,
				category: category || "Other", // Use the provided category or default to 'Other'
				quantity,
				mondayRequired,
				tuesdayRequired,
				wednesdayRequired,
				thursdayRequired,
				fridayRequired,
				saturdayRequired,
				sundayRequired,
				storeId,
				organizationId: req.user.organizationId,
			},
		});
		// Phase 1: Notify by email on item creation
		try {
			const recipients = getNotifyEmails();
			if (recipients && recipients.length) {
				const transporter = createTransport();
				const subject = `StockIT: New item created - ${item.name} (Store ${item.storeId})`;
				const actor = req.user?.email || "Unknown";
				const html = `
        <div style="font-family:Arial,sans-serif;">
          <h3>New Item Created</h3>
          <ul>
            <li><strong>Name:</strong> ${item.name}</li>
            <li><strong>Category:</strong> ${item.category || "Other"}</li>
            <li><strong>Quantity:</strong> ${item.quantity}</li>
            <li><strong>Store ID:</strong> ${item.storeId}</li>
            <li><strong>Organization ID:</strong> ${item.organizationId}</li>
            <li><strong>By:</strong> ${actor}</li>
          </ul>
          <p>Time: ${new Date().toLocaleString()}</p>
        </div>`;
				await transporter.sendMail({
					from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
					to: recipients.join(", "),
					subject,
					html,
				});
			}
		} catch (e) {
			console.warn("Email notify (create) failed:", e.message);
		}
		res.json(item);
	} catch (error) {
		console.error("Error creating item:", error);
		res
			.status(500)
			.json({ error: "Failed to add item", details: error.message });
	}
});

/**
 * Get a single inventory item
 */
router.get(
	"/:id",
	authenticateToken,
	filterByOrganization,
	async (req, res) => {
		const { id } = req.params;
		try {
			const item = await prisma.item.findUnique({
				where: { id: Number(id) },
			});
			res.json(item);
		} catch (error) {
			res.status(500).json({ error: "Failed to retrieve item" });
		}
	}
);

/**
 * Get all inventory items
 */
router.get("/", authenticateToken, filterByOrganization, async (req, res) => {
	try {
		const { organizationId } = req.query;
		const baseWhere = organizationId
			? { organizationId: parseInt(organizationId) }
			: {};
		const userStoreIds = Array.isArray(req.user.storeIds)
			? req.user.storeIds.map(Number)
			: [];
		let where = { ...baseWhere };
		// Constrain by store scope for store-scoped users
		if (req.user.storeRole === "STORE" || req.user.storeRole === "MANAGER") {
			const paramStoreId = req.query.storeId ? Number(req.query.storeId) : null;
			if (paramStoreId !== null) {
				if (!userStoreIds.includes(paramStoreId)) {
					return res
						.status(403)
						.json({ error: "Forbidden: not assigned to this store" });
				}
				where.storeId = paramStoreId;
			} else {
				if (userStoreIds.length === 0) return res.json([]);
				where.storeId = { in: userStoreIds };
			}
		}
		const items = await prisma.item.findMany({ where });
		res.json(items);
	} catch (error) {
		console.error("Error fetching items:", error);
		res.status(500).json({ error: "Failed to retrieve items" });
	}
});

/**
 * Get items by store
 */
router.get(
	"/store/:storeId",
	authenticateToken,
	filterByOrganization,
	async (req, res) => {
		try {
			const { storeId } = req.params;
			const { organizationId } = req.query;

			const items = await prisma.item.findMany({
				where: {
					storeId: parseInt(storeId),
					...(organizationId
						? { organizationId: parseInt(organizationId) }
						: {}),
				},
			});

			res.json(items);
		} catch (error) {
			console.error("Error fetching items by store:", error);
			res.status(500).json({ error: "Failed to retrieve items by store" });
		}
	}
);

/**
 * Update an inventory item and log history
 */
router.put(
	"/:id",
	authenticateToken,
	filterByOrganization,
	async (req, res) => {
		const { id } = req.params;
		// Debug logging
		console.log("Received update request:", {
			body: req.body,
			id: id,
			dayBreakdown: req.body.dayBreakdown,
		});

		const {
			name,
			category,
			quantity,
			mondayRequired,
			tuesdayRequired,
			wednesdayRequired,
			thursdayRequired,
			fridayRequired,
			saturdayRequired,
			sundayRequired,
			updatedBy,
			dayBreakdown,
		} = req.body;

		try {
			// Fetch current to enforce store-level checks
			const current = await prisma.item.findUnique({
				where: { id: Number(id) },
			});
			if (!current) return res.status(404).json({ error: "Item not found" });

			// Helper: required cap by dayIdx (0=Sun..6=Sat)
			const reqForDayIdx = (it, idx) => {
				switch (Number(idx)) {
					case 0:
						return Number(it.sundayRequired || 0);
					case 1:
						return Number(it.mondayRequired || 0);
					case 2:
						return Number(it.tuesdayRequired || 0);
					case 3:
						return Number(it.wednesdayRequired || 0);
					case 4:
						return Number(it.thursdayRequired || 0);
					case 5:
						return Number(it.fridayRequired || 0);
					case 6:
						return Number(it.saturdayRequired || 0);
					default:
						return 0;
				}
			};

			// STORE role: allow only quantity within assigned stores
			if (req.user.storeRole === "STORE") {
				if (!staffCanAccessStore(req.user, current.storeId)) {
					return res
						.status(403)
						.json({ error: "Forbidden: not assigned to this store" });
				}
				const updatedItem = await prisma.item.update({
					where: { id: Number(id) },
					data: { quantity },
				});

				// Optional breakdown validation for staff path
				console.log(
					"Processing dayBreakdown:",
					JSON.stringify(dayBreakdown, null, 2)
				);
				let breakdownToSave = undefined;
				if (Array.isArray(dayBreakdown)) {
					const validIdx = new Set([0, 1, 2, 3, 4, 5, 6]);
					let total = 0;
					for (const d of dayBreakdown) {
						if (!validIdx.has(Number(d.dayIdx))) {
							return res
								.status(400)
								.json({ error: "Invalid dayBreakdown: dayIdx must be 0-6" });
						}
						const q = Number(d.qty);
						if (Number.isNaN(q) || q < 0) {
							return res
								.status(400)
								.json({
									error:
										"Invalid dayBreakdown: qty must be non-negative number",
								});
						}
						total += q;
						// per-day cap by required amount
						const cap = reqForDayIdx(current, d.dayIdx);
						if (q > cap) {
							return res
								.status(400)
								.json({
									error: `Day breakdown exceeds required for dayIdx ${d.dayIdx}: ${q} > ${cap}`,
								});
						}
					}
					if (Number(total) !== Number(quantity)) {
						return res
							.status(400)
							.json({ error: "Day breakdown total must match quantity" });
					}
					breakdownToSave = dayBreakdown;
				}

				const historyData = {
					itemId: Number(id),
					quantity: Number(quantity),
					updatedBy: updatedBy || req.user.email || "Unknown",
					...(breakdownToSave ? { dayBreakdown: breakdownToSave } : {}),
				};
				console.log("Creating history with:", historyData);
				await prisma.itemHistory.create({
					data: historyData,
				});
				// Queue for batched email
				try {
					if (current.quantity !== updatedItem.quantity) {
						queueItemUpdate({
							orgId: req.user.organizationId,
							storeId: updatedItem.storeId,
							item: {
								id: updatedItem.id,
								name: updatedItem.name,
								category: updatedItem.category,
								quantity: updatedItem.quantity,
								dayBreakdown: breakdownToSave,
							},
						});
					}
				} catch (e) {
					console.warn("Batch queue (staff update) failed:", e.message);
				}
				return res.json(updatedItem);
			}

			// MANAGER can full-edit within assigned stores; others need full access/admin
			const fullIds = getFullAccessStoreIds();
			const isFullAccessUser = req.user?.permissions?.isFullAccess === true;
			const isManagerInStore =
				req.user.storeRole === "MANAGER" &&
				staffCanAccessStore(req.user, current.storeId);
			if (
				!(
					isManagerInStore ||
					isFullAccessUser ||
					req.user.role === "ADMIN" ||
					req.user.role === "HEADOFFICE" ||
					fullIds.includes(Number(current.storeId))
				)
			) {
				return res.status(403).json({
					error: "Forbidden: insufficient permissions to edit this item",
				});
			}

			const updatedItem = await prisma.item.update({
				where: { id: Number(id) },
				data: {
					name,
					category,
					quantity,
					mondayRequired,
					tuesdayRequired,
					wednesdayRequired,
					thursdayRequired,
					fridayRequired,
					saturdayRequired,
					sundayRequired,
				},
			});

			// Optional breakdown validation
			let breakdownToSave = undefined;
			if (Array.isArray(dayBreakdown)) {
				const validIdx = new Set([0, 1, 2, 3, 4, 5, 6]);
				let total = 0;
				for (const d of dayBreakdown) {
					if (!validIdx.has(Number(d.dayIdx))) {
						return res
							.status(400)
							.json({ error: "Invalid dayBreakdown: dayIdx must be 0-6" });
					}
					const q = Number(d.qty);
					if (Number.isNaN(q) || q < 0) {
						return res
							.status(400)
							.json({
								error: "Invalid dayBreakdown: qty must be non-negative number",
							});
					}
					total += q;
					// per-day cap by required amount using current (pre-update) requirements
					const cap = reqForDayIdx(current, d.dayIdx);
					if (q > cap) {
						return res
							.status(400)
							.json({
								error: `Day breakdown exceeds required for dayIdx ${d.dayIdx}: ${q} > ${cap}`,
							});
					}
				}
				if (Number(total) !== Number(quantity)) {
					return res
						.status(400)
						.json({ error: "Day breakdown total must match quantity" });
				}
				breakdownToSave = dayBreakdown;
			}

			await prisma.itemHistory.create({
				data: {
					itemId: Number(id),
					quantity: Number(quantity),
					updatedBy: updatedBy || req.user.email || "Unknown",
					...(breakdownToSave ? { dayBreakdown: breakdownToSave } : {}),
				},
			});

			// Queue for batched email (manager/full edits)
			try {
				queueItemUpdate({
					orgId: req.user.organizationId,
					storeId: updatedItem.storeId,
					item: {
						id: updatedItem.id,
						name: updatedItem.name,
						category: updatedItem.category,
						quantity: updatedItem.quantity,
						dayBreakdown: breakdownToSave,
					},
				});
			} catch (e) {
				console.warn("Batch queue (update) failed:", e.message);
			}
			res.json(updatedItem);
		} catch (error) {
			console.error("Error updating item and logging history:", error);
			res.status(500).json({ error: "Failed to update item and log history" });
		}
	}
);

/**
 * Delete an inventory item
 */
router.delete(
	"/:id",
	authenticateToken,
	filterByOrganization,
	async (req, res) => {
		const { id } = req.params;
		try {
			// Only ADMIN/HEADOFFICE and full-feature stores may delete
			const current = await prisma.item.findUnique({
				where: { id: Number(id) },
			});
			if (!current) return res.status(404).json({ error: "Item not found" });
			const fullIds = getFullAccessStoreIds();
			const isFullAccessUser = req.user?.permissions?.isFullAccess === true;
			const canDelete =
				isFullAccessUser ||
				req.user.role === "ADMIN" ||
				req.user.role === "HEADOFFICE" ||
				fullIds.includes(Number(current.storeId));
			if (!canDelete)
				return res.status(403).json({
					error: "Forbidden: insufficient permissions to delete item",
				});

			const item = await prisma.item.delete({
				where: { id: Number(id) },
			});
			res.json(item);
		} catch (error) {
			res.status(500).json({ error: "Failed to delete item" });
		}
	}
);

module.exports = router;
