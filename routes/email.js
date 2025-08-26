/**
 * Email Service Routes
 */
const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
const rateLimit = require("express-rate-limit");
const { authenticateToken } = require("../middleware");
const { logEmailActivity } = require("../utils/emailLogger");

// Configure rate limiter
const emailRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // Limit each IP to 10 email requests per windowMs
	message: {
		success: false,
		error: "Too many email requests, please try again later.",
	},
	standardHeaders: true,
	legacyHeaders: false,
});

// Create email transporter based on environment variables
const transporter = nodemailer.createTransport({
	host: process.env.EMAIL_HOST || "smtp.example.com",
	port: parseInt(process.env.EMAIL_PORT || "587"),
	secure: process.env.EMAIL_SECURE === "true",
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASSWORD,
	},
	// Gmail specific settings for better deliverability
	tls: {
		rejectUnauthorized: false, // Helps with some certificate issues
	},
});

// Set email templates directory path
const TEMPLATE_DIR = path.join(__dirname, "../email-templates");

// Maximum number of recipients allowed per email
const MAX_RECIPIENTS = 20;

/**
 * Build a copy-friendly plain text block for inventory items
 * Format:
 *   Category
 *   - Item Name — Qty: X / Req: Y (Status)
 */
const buildCopyBlock = (categoriesInput) => {
	if (!categoriesInput) return "";
	const categories = Array.isArray(categoriesInput)
		? categoriesInput
		: Object.values(categoriesInput);

	const lines = [];
	for (const cat of categories) {
		if (!cat || !cat.items || !cat.items.length) continue;
		lines.push(`${cat.name}`);
		for (const it of cat.items) {
			const status = it.isLow ? "LOW" : "OK";
			lines.push(
				`- ${it.name} — Qty: ${it.quantity} / Req: ${it.required} (${status})`
			);
		}
		lines.push("");
	}
	return lines.join("\n");
};

/**
 * Build CSV content for inventory items
 * Columns: Category, Item, Quantity, Required, Status
 */
const buildCsv = (categoriesInput) => {
	if (!categoriesInput) return "";
	const categories = Array.isArray(categoriesInput)
		? categoriesInput
		: Object.values(categoriesInput);
	const rows = [["Category", "Item", "Quantity", "Required", "Status"]];
	for (const cat of categories) {
		if (!cat || !cat.items || !cat.items.length) continue;
		for (const it of cat.items) {
			const status = it.isLow ? "Low Stock" : "In Stock";
			// Escape commas/quotes
			const esc = (v) => {
				const s = String(v ?? "");
				return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
			};
			rows.push([
				esc(cat.name),
				esc(it.name),
				esc(it.quantity),
				esc(it.required),
				esc(status),
			]);
		}
	}
	return rows.map((r) => r.join(",")).join("\n");
};

/**
 * Basic HTML sanitizer to prevent XSS attacks in custom emails
 * @param {string} html - HTML content to sanitize
 * @returns {string} - Sanitized HTML
 */
const sanitizeHtml = (html) => {
	if (!html) return "";

	// Replace potentially dangerous tags
	return html
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
		.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
		.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
		.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
		.replace(/on\w+="[^"]*"/gi, "") // Remove event handlers
		.replace(/on\w+='[^']*'/gi, "")
		.replace(/on\w+=\w+/gi, "");
};

/**
 * Validate email recipients
 * @param {string|string[]} recipients - Email recipients
 * @returns {boolean} - Whether recipients are valid
 */
const validateRecipients = (recipients) => {
	const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	if (Array.isArray(recipients)) {
		// Check if number of recipients exceeds the maximum allowed
		if (recipients.length > MAX_RECIPIENTS) {
			return false;
		}
		return recipients.every((email) => emailPattern.test(email));
	} else if (typeof recipients === "string") {
		// Handle single email address as string
		return emailPattern.test(recipients);
	}

	return false;
};

/**
 * Log email activity for monitoring and auditing
 * @param {string} type - Email type
 * @param {string|string[]} recipients - Email recipients
 * @param {string} userId - ID of user sending the email (if authenticated)
 * @param {boolean} success - Whether email was sent successfully
 * @param {string} [errorMessage] - Error message if email failed
 */

/**
 * Compile email template with Handlebars
 * @param {string} templateName - Template filename
 * @param {Object} data - Data to inject into template
 * @returns {Promise<string>} - Compiled HTML
 */
const compileTemplate = async (templateName, data) => {
	try {
		const templatePath = path.join(TEMPLATE_DIR, templateName);
		const templateSource = await fs.promises.readFile(templatePath, "utf8");
		const template = handlebars.compile(templateSource);
		return template(data);
	} catch (error) {
		console.error(`Email template error (${templateName}):`, error);
		throw new Error(`Failed to compile email template: ${error.message}`);
	}
};

/**
 * Send email with compiled template
 * @param {Object} options - Email options
 * @returns {Promise<Object>} - Send result
 */
const sendEmail = async (options) => {
	const {
		to,
		subject,
		html,
		from,
		type = "general",
		userId = "system",
	} = options;

	try {
		const result = await transporter.sendMail({
			from:
				from ||
				`"StockIT" <${process.env.EMAIL_FROM || "notifications@stockit.com"}>`,
			to: Array.isArray(to) ? to.join(", ") : to,
			subject,
			html,
		});

		// Log successful email
		logEmailActivity(type, to, userId, true);

		return result;
	} catch (error) {
		// Log failed email attempt
		logEmailActivity(type, to, userId, false, error.message);
		console.error("Failed to send email:", error);
		throw new Error(`Failed to send email: ${error.message}`);
	}
};

/**
 * Route: Send Low Stock Alert Email
 */
router.post(
	"/low-stock-alert",
	emailRateLimiter,
	authenticateToken,
	async (req, res) => {
		try {
			const { recipient, storeName, items, urgent = false } = req.body;

			// Validate required fields
			if (
				!recipient ||
				!storeName ||
				!items ||
				!Array.isArray(items) ||
				items.length === 0
			) {
				return res.status(400).json({
					success: false,
					error: "Missing required fields",
				});
			}

			// Validate recipient emails
			if (!validateRecipients(recipient)) {
				return res.status(400).json({
					success: false,
					error: "Invalid recipient email address",
				});
			}

			// Compile email template with provided data
			const html = await compileTemplate("low-stock-alert.html", {
				storeName,
				items,
				urgent,
			});
			// Send email
			const result = await sendEmail({
				to: recipient,
				subject: urgent ? "🔴 URGENT: Low Stock Alert" : "⚠️ Low Stock Alert",
				html,
				type: "low-stock-alert",
				userId: req.user.id,
			});

			res.json({
				success: true,
				message: "Low stock alert email sent successfully",
				messageId: result.messageId,
			});
		} catch (error) {
			console.error("Low stock alert error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to send low stock alert email",
				details: error.message,
			});
		}
	}
);

/**
 * Route: Send Password Reset Email
 */
router.post("/password-reset", emailRateLimiter, async (req, res) => {
	try {
		const { recipient, resetToken, username } = req.body;

		// Validate required fields
		if (!recipient || !resetToken || !username) {
			return res.status(400).json({
				success: false,
				error: "Missing required fields",
			});
		}
		// Validate recipient email
		if (!validateRecipients(recipient)) {
			return res.status(400).json({
				success: false,
				error:
					"Invalid recipient email address or too many recipients (maximum " +
					MAX_RECIPIENTS +
					" allowed)",
			});
		}

		// Create reset URL
		const baseUrl = process.env.FRONTEND_URL || "https://stockit.app";
		const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

		// Compile email template with provided data
		const html = await compileTemplate("password-reset.html", {
			username,
			resetUrl,
			resetToken,
		});
		// Send email
		const result = await sendEmail({
			to: recipient,
			subject: "Reset Your StockIT Password",
			html,
			type: "password-reset",
			userId: "anonymous", // Password reset can be requested by unauthenticated users
		});

		res.json({
			success: true,
			message: "Password reset email sent successfully",
			messageId: result.messageId,
		});
	} catch (error) {
		console.error("Password reset email error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to send password reset email",
			details: error.message,
		});
	}
});

/**
 * Route: Send Welcome Email
 */
router.post("/welcome", emailRateLimiter, async (req, res) => {
	try {
		const { recipient, name, organizationName } = req.body;

		// Validate required fields
		if (!recipient || !name || !organizationName) {
			return res.status(400).json({
				success: false,
				error: "Missing required fields",
			});
		}
		// Validate recipient email
		if (!validateRecipients(recipient)) {
			return res.status(400).json({
				success: false,
				error:
					"Invalid recipient email address or too many recipients (maximum " +
					MAX_RECIPIENTS +
					" allowed)",
			});
		}

		// Compile email template with provided data
		const html = await compileTemplate("welcome.html", {
			name,
			organizationName,
		});
		// Send email
		const result = await sendEmail({
			to: recipient,
			subject: "Welcome to StockIT!",
			html,
			type: "welcome",
			userId: "system", // Since this is called during registration, there might not be a user ID yet
		});
		res.json({
			success: true,
			message: "Welcome email sent successfully",
			messageId: result.messageId,
		});
	} catch (error) {
		console.error("Welcome email error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to send welcome email",
			details: error.message,
		});
	}
});

/**
 * Route: Send Inventory Report
 */
router.post(
	"/inventory-report",
	emailRateLimiter,
	authenticateToken,
	async (req, res) => {
		try {
			const {
				recipient,
				reportType,
				storeName,
				categories,
				recommendations,
				includeCopyBlock = true,
				includeCsvAttachment = true,
			} = req.body;

			// Validate required fields
			if (!recipient || !reportType || !storeName || !categories) {
				return res.status(400).json({
					success: false,
					error: "Missing required fields",
				});
			}
			// Validate recipient emails
			if (!validateRecipients(recipient)) {
				return res.status(400).json({
					success: false,
					error:
						"Invalid recipient email address or too many recipients (maximum " +
						MAX_RECIPIENTS +
						" allowed)",
				});
			}

			// Prepare copy-friendly block and CSV
			const copyBlock = includeCopyBlock ? buildCopyBlock(categories) : "";
			const csvContent = includeCsvAttachment ? buildCsv(categories) : "";

			// Compile email template with provided data
			const html = await compileTemplate("inventory-report.html", {
				reportType,
				storeName,
				categories: Object.values(categories),
				recommendations,
				copyBlock,
				timestamp: new Date().toLocaleString(),
			});
			// Send email
			const mailOptions = {
				to: recipient,
				subject: `${reportType} Inventory Report - ${storeName}`,
				html,
				type: "inventory-report",
				userId: req.user.id,
			};

			// Attach CSV if requested
			if (csvContent) {
				mailOptions.attachments = [
					{
						filename: `${reportType.toLowerCase()}-inventory-${storeName.replace(
							/[^a-z0-9\-]/gi,
							"_"
						)}.csv`,
						content: csvContent,
						contentType: "text/csv",
					},
				];
			}

			const result = await sendEmail(mailOptions);

			res.json({
				success: true,
				message: "Inventory report email sent successfully",
				messageId: result.messageId,
			});
		} catch (error) {
			console.error("Inventory report email error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to send inventory report email",
				details: error.message,
			});
		}
	}
);

/**
 * Route: Send Custom Email
 */
router.post(
	"/custom",
	emailRateLimiter,
	authenticateToken,
	async (req, res) => {
		try {
			const { recipient, subject, body } = req.body;

			// Validate required fields
			if (!recipient || !subject || !body) {
				return res.status(400).json({
					success: false,
					error: "Missing required fields",
				});
			}
			// Validate recipient emails
			if (!validateRecipients(recipient)) {
				return res.status(400).json({
					success: false,
					error:
						"Invalid recipient email address or too many recipients (maximum " +
						MAX_RECIPIENTS +
						" allowed)",
				});
			}

			// Sanitize HTML content to prevent XSS
			const sanitizedBody = sanitizeHtml(body);
			// Send email
			const result = await sendEmail({
				to: recipient,
				subject,
				html: sanitizedBody,
				type: "custom",
				userId: req.user.id,
			});

			res.json({
				success: true,
				message: "Custom email sent successfully",
				messageId: result.messageId,
			});
		} catch (error) {
			console.error("Custom email error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to send custom email",
				details: error.message,
			});
		}
	}
);

/**
 * Route: Get Email Statistics
 */
router.get("/stats", emailRateLimiter, authenticateToken, async (req, res) => {
	try {
		// Check if user has admin privileges
		if (!req.user.isAdmin) {
			return res.status(403).json({
				success: false,
				error: "Access denied: Administrator privileges required",
			});
		}

		const { period = "day" } = req.query;

		// Validate period
		if (!["day", "week", "month"].includes(period)) {
			return res.status(400).json({
				success: false,
				error: "Invalid period. Must be one of: day, week, month",
			});
		}

		// Get email stats from the logger utility
		const { getEmailStats } = require("../utils/emailLogger");
		const stats = await getEmailStats(period);

		res.json({
			success: true,
			period,
			stats,
		});
	} catch (error) {
		console.error("Email stats error:", error);
		res.status(500).json({
			success: false,
			error: "Failed to retrieve email statistics",
			details: error.message,
		});
	}
});

module.exports = router;

/**
 * Route: Send Compact Stock List (manager-friendly format)
 * Supports two modes:
 *  - Direct items payload with per-day requirements
 *  - fetchFromStore=true with storeId to retrieve items from DB
 * Options:
 *  - days: array of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] to include notes
 *  - valueMode: 'current' | 'requiredTotal' | 'shortfall' (default 'shortfall')
 */
router.post(
	"/stock-list",
	emailRateLimiter,
	authenticateToken,
	async (req, res) => {
		const {
			recipient,
			storeId,
			storeName,
			items,
			fetchFromStore = false,
			days,
			valueMode = "shortfall",
		} = req.body;

		try {
			if (!recipient) {
				return res
					.status(400)
					.json({ success: false, error: "Missing recipient" });
			}
			if (!validateRecipients(recipient)) {
				return res
					.status(400)
					.json({ success: false, error: "Invalid recipient email address" });
			}

			// Resolve items list
			let list = Array.isArray(items) ? items : [];
			let resolvedStoreName = storeName;

			if (fetchFromStore) {
				if (!storeId) {
					return res.status(400).json({
						success: false,
						error: "storeId is required when fetchFromStore=true",
					});
				}
				const { PrismaClient } = require("@prisma/client");
				const prisma = new PrismaClient();
				// Scope: user must be allowed for this store; middleware already set org, but we also check store scoping where available
				const records = await prisma.item.findMany({
					where: {
						storeId: Number(storeId),
						...(req.user.organizationId
							? { organizationId: req.user.organizationId }
							: {}),
					},
					orderBy: { name: "asc" },
				});
				// Attach latest dayBreakdown from history where available
				let lastHistoryByItem = new Map();
				try {
					const ids = records.map((r) => r.id);
					if (ids.length) {
						const histories = await prisma.itemHistory.findMany({
							where: { itemId: { in: ids } },
							orderBy: { updatedAt: "desc" },
						});
						for (const h of histories) {
							if (!lastHistoryByItem.has(h.itemId))
								lastHistoryByItem.set(h.itemId, h);
						}
					}
				} catch {}

				list = records.map((r) => ({
					name: r.name,
					category: r.category,
					quantity: r.quantity,
					mondayRequired: r.mondayRequired,
					tuesdayRequired: r.tuesdayRequired,
					wednesdayRequired: r.wednesdayRequired,
					thursdayRequired: r.thursdayRequired,
					fridayRequired: r.fridayRequired,
					saturdayRequired: r.saturdayRequired,
					sundayRequired: r.sundayRequired,
					dayBreakdown: lastHistoryByItem.get(r.id)?.dayBreakdown || null,
				}));
				if (!resolvedStoreName) {
					try {
						const store = await prisma.store.findUnique({
							where: { id: Number(storeId) },
						});
						resolvedStoreName = store?.name || `Store ${storeId}`;
					} catch {}
				}
			}

			if (!list.length) {
				return res
					.status(400)
					.json({ success: false, error: "No items to include in stock list" });
			}

			// Days to include
			const dayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
			const includeDays =
				Array.isArray(days) && days.length
					? days.filter((d) => dayOrder.includes(d))
					: dayOrder;
			const labelMap = {
				Sun: "Sun",
				Mon: "Mon",
				Tue: "Tue",
				Wed: "Wed",
				Thu: "Thu",
				Fri: "Fri",
				Sat: "Sat",
			};

			// Helper to get per-day required from item dayBreakdown (preferred) or required fields
			const perDay = (it, code) => {
				if (Array.isArray(it.dayBreakdown)) {
					const idxMap = {
						Sun: 0,
						Mon: 1,
						Tue: 2,
						Wed: 3,
						Thu: 4,
						Fri: 5,
						Sat: 6,
					};
					const idx = idxMap[code];
					const found = it.dayBreakdown.find((d) => Number(d.dayIdx) === idx);
					return found ? Number(found.qty) : 0;
				}
				switch (code) {
					case "Mon":
						return it.mondayRequired ?? 0;
					case "Tue":
						return it.tuesdayRequired ?? 0;
					case "Wed":
						return it.wednesdayRequired ?? 0;
					case "Thu":
						return it.thursdayRequired ?? 0;
					case "Fri":
						return it.fridayRequired ?? 0;
					case "Sat":
						return it.saturdayRequired ?? 0;
					case "Sun":
						return it.sundayRequired ?? 0;
					default:
						return 0;
				}
			};

			const fmt = (n) => {
				// Render integers plainly, allow decimals if passed
				if (typeof n === "number" && Number.isInteger(n)) return String(n);
				return String(n);
			};

			// Build lines like: "8 big beef (5 Sun, 3 Sat)"
			const lines = [];
			for (const it of list) {
				const dayParts = [];
				let requiredTotal = 0;
				for (const d of includeDays) {
					const v = perDay(it, d) || 0;
					if (v && Number(v) !== 0) {
						requiredTotal += Number(v);
						dayParts.push(`${fmt(v)} ${labelMap[d]}`);
					}
				}
				const quantity = Number(it.quantity ?? 0);
				const shortfall = Math.max(0, requiredTotal - quantity);
				const leader =
					valueMode === "current"
						? quantity
						: valueMode === "requiredTotal"
						? requiredTotal
						: shortfall;
				const leaderStr = fmt(leader);
				const note = dayParts.length ? ` (${dayParts.join(", ")})` : "";
				lines.push(`${leaderStr} ${it.name}${note}`);
			}

			const preBlock = lines.join("\n");
			const titleStore =
				resolvedStoreName || (storeId ? `Store ${storeId}` : "Stock");
			const subject = `Stock List - ${titleStore}`;
			const html = `
      <div style="font-family:Arial,sans-serif;">
        <h3>Stock List</h3>
        ${
					resolvedStoreName
						? `<p><strong>Store:</strong> ${resolvedStoreName}</p>`
						: ""
				}
        <div style="background:#fff8e1;border:1px dashed #e0c200;padding:12px;border-radius:4px;margin:15px 0;">
          <div style="font-weight:bold;margin-bottom:8px;">Copy &amp; Paste Stock List:</div>
          <pre style="white-space:pre-wrap;font-family:Consolas, 'Courier New', monospace;font-size:13px;line-height:1.5;margin:0;">${preBlock}</pre>
        </div>
        <p style="color:#777;font-size:12px;">Value mode: ${valueMode}. Days: ${includeDays.join(
				", "
			)}.</p>
      </div>
    `;

			const result = await sendEmail({
				to: recipient,
				subject,
				html,
				type: "stock-list",
				userId: req.user.id,
			});

			res.json({
				success: true,
				message: "Stock list email sent",
				messageId: result.messageId,
				preview: preBlock,
			});
		} catch (error) {
			console.error("Stock list email error:", error);
			res.status(500).json({
				success: false,
				error: "Failed to send stock list email",
				details: error.message,
			});
		}
	}
);
