const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
	const adminPassword = await bcrypt.hash("admin123", 10);
	const storePassword = await bcrypt.hash("store123", 10);
	const headOfficePassword = await bcrypt.hash("headoffice123", 10);

	await prisma.user.createMany({
		data: [
			{ email: "admin@example.com", password: adminPassword, role: "ADMIN" },
			{ email: "store@example.com", password: storePassword, role: "STORE" },
			{
				email: "headoffice@example.com",
				password: headOfficePassword,
				role: "HEADOFFICE",
			},
		],
	});
	console.log("Default users created.");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
