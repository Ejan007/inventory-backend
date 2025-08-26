/**
 * Update Email Batcher
 * Aggregates multiple item updates within a short window into one summary email per org+store.
 */
const { PrismaClient } = require("@prisma/client");
const { getNotifyEmails } = require("../config/permissions");
const { createTransport } = require("./inviteMailer");

const prisma = new PrismaClient();

// Helper function to format day breakdown
function formatDayBreakdown(dayBreakdown) {
	if (!dayBreakdown || !Array.isArray(dayBreakdown)) {
		return "";
	}

	const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	return dayBreakdown
		.map((entry) => {
			if (
				entry &&
				typeof entry === "object" &&
				typeof entry.dayIdx === "number" &&
				typeof entry.qty === "number" &&
				entry.dayIdx >= 0 &&
				entry.dayIdx < 7
			) {
				return `${entry.qty} ${days[entry.dayIdx]}`;
			}
			return "";
		})
		.filter(Boolean)
		.join(", ");
}

// Configuration
const BATCH_ENABLED =
	(process.env.EMAIL_BATCH_ENABLED || "true").toLowerCase() !== "false";
const BATCH_WINDOW_MS = parseInt(
	process.env.EMAIL_BATCH_WINDOW_MS || "120000",
	10
); // 2 minutes

// Internal state: key => { timer, items: Map(name=>payload), meta }
const batches = new Map();

function keyFor(orgId, storeId) {
	return `${orgId || "noorg"}:${storeId}`;
}

async function flushBatch(key) {
	const entry = batches.get(key);
	if (!entry) return;
	clearTimeout(entry.timer);
	batches.delete(key);

	const items = Array.from(entry.items.values());
	if (!items.length) return;

	const recipients = getNotifyEmails();
	if (!recipients || !recipients.length) return;

	const { orgId, storeId } = entry.meta;
	let storeName = `Store ${storeId}`;
	try {
		const store = await prisma.store.findUnique({
			where: { id: Number(storeId) },
		});
		if (store?.name) storeName = store.name;
	} catch {}

	const subject = `StockIT: Items updated (${storeName}) — ${
		items.length
	} change${items.length > 1 ? "s" : ""}`;

	// Build copy-friendly block
	const lines = [];
	for (const it of items) {
		console.log("Item dayBreakdown:", JSON.stringify(it.dayBreakdown, null, 2));
		const dayBreakdown = it.dayBreakdown
			? ` (${formatDayBreakdown(it.dayBreakdown)})`
			: "";
		console.log("Formatted dayBreakdown:", dayBreakdown);
		lines.push(`- ${it.name} — Qty: ${it.quantity}${dayBreakdown}`);
	}
	const copyBlock = lines.join("\n");

	// Build simple HTML table
	const rowsHtml = items
		.map((it) => {
			const prev =
				typeof it.previousQuantity !== "undefined" &&
				it.previousQuantity !== null
					? it.previousQuantity
					: "";
			const dayBreakdown = it.dayBreakdown
				? ` (${formatDayBreakdown(it.dayBreakdown)})`
				: "";
			return `<tr>
      <td style="padding:8px;border:1px solid #ddd;">${it.name}</td>
      <td style="padding:8px;border:1px solid #ddd;">${
				it.category || "Other"
			}</td>
      <td style="padding:8px;border:1px solid #ddd;">${prev}</td>
      <td style="padding:8px;border:1px solid #ddd;">${it.quantity}</td>
    </tr>`;
		})
		.join("\n");

	const html = `
    <div style="font-family:Arial,sans-serif;">
      <h3>Items Update Summary</h3>
      <p><strong>Store:</strong> ${storeName}</p>
      <div style="background:#fff8e1;border:1px dashed #e0c200;padding:12px;border-radius:4px;margin:15px 0;">
        <div style="font-weight:bold;margin-bottom:8px;">Copy &amp; Paste Summary:</div>
        <pre style="white-space:pre-wrap;font-family:Consolas, 'Courier New', monospace;font-size:13px;line-height:1.5;margin:0;">${copyBlock}</pre>
      </div>
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr style="background:#f2f2f2;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Item</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Category</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Quantity</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Day Breakdown</th>
          </tr>
        </thead>
        <tbody>
          ${items
						.map((it) => {
							const dayBreakdown = Array.isArray(it.dayBreakdown)
								? formatDayBreakdown(it.dayBreakdown)
								: "";
							return `<tr>
              <td style="padding:8px;border:1px solid #ddd;">${it.name}</td>
              <td style="padding:8px;border:1px solid #ddd;">${
								it.category || "Other"
							}</td>
              <td style="padding:8px;border:1px solid #ddd;">${it.quantity}</td>
              <td style="padding:8px;border:1px solid #ddd;">${
								dayBreakdown || "-"
							}</td>
            </tr>`;
						})
						.join("\n")}
        </tbody>
      </table>
      <p style="color:#555;margin-top:12px;">Tip: Copy the summary block above to share quickly.</p>
    </div>
  `;

	try {
		const transporter = createTransport();
		await transporter.sendMail({
			from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
			to: recipients.join(", "),
			subject,
			html,
		});
	} catch (e) {
		console.warn("Email batch flush failed:", e.message);
	}
}

function queueItemUpdate({ orgId, storeId, item }) {
	if (!BATCH_ENABLED) return; // fallback: if disabled, caller should handle direct email
	const key = keyFor(orgId, storeId);
	let entry = batches.get(key);
	if (!entry) {
		entry = { items: new Map(), meta: { orgId, storeId }, timer: null };
		batches.set(key, entry);
		entry.timer = setTimeout(() => flushBatch(key), BATCH_WINDOW_MS);
	}
	// Deduplicate by item id or name
	const itemKey = String(item.id || item.name);
	console.log(
		"queueItemUpdate dayBreakdown:",
		JSON.stringify(item.dayBreakdown, null, 2)
	);
	entry.items.set(itemKey, {
		id: item.id,
		name: item.name,
		category: item.category,
		quantity: item.quantity,
		previousQuantity: item.previousQuantity,
		dayBreakdown: item.dayBreakdown,
	});
}

module.exports = {
	queueItemUpdate,
	// exposed for testing
	_flushNow: (orgId, storeId) => flushBatch(keyFor(orgId, storeId)),
};
