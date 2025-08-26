const nodemailer = require("nodemailer");

function createTransport() {
	return nodemailer.createTransport({
		host: process.env.EMAIL_HOST,
		port: Number(process.env.EMAIL_PORT || 587),
		secure: String(process.env.EMAIL_SECURE || "false") === "true",
		auth: {
			user: process.env.EMAIL_USER,
			pass: process.env.EMAIL_PASSWORD,
		},
	});
}

async function sendInviteEmail({
	to,
	inviteLink,
	role,
	storeRole,
	storeIds,
	organizationName,
}) {
	const transporter = createTransport();
	const subject = `You're invited to StockIT`;
	const plain = [
		`You've been invited to StockIT${
			organizationName ? " - " + organizationName : ""
		}.`,
		`Role: ${role}${storeRole ? " (" + storeRole + ")" : ""}`,
		storeIds && storeIds.length ? `Stores: ${storeIds.join(", ")}` : null,
		`Accept your invite: ${inviteLink}`,
	]
		.filter(Boolean)
		.join("\n");

	const html = `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
      <h2>You're invited to StockIT${
				organizationName ? " - " + organizationName : ""
			}</h2>
      <p>Role: <strong>${role}${
		storeRole ? " (" + storeRole + ")" : ""
	}</strong></p>
      ${
				storeIds && storeIds.length
					? `<p>Stores: <strong>${storeIds.join(", ")}</strong></p>`
					: ""
			}
      <p>
        <a href="${inviteLink}" style="display:inline-block; background:#2563eb; color:#fff; padding:10px 16px; text-decoration:none; border-radius:6px;">Accept Invite</a>
      </p>
      <p>Or open this link: <br/><code>${inviteLink}</code></p>
    </div>
  `;

	await transporter.sendMail({
		from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
		to,
		subject,
		text: plain,
		html,
	});
}

module.exports = { sendInviteEmail };
module.exports.createTransport = createTransport;
