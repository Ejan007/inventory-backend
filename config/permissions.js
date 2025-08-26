const fs = require("fs");
const path = require("path");

const PERMISSIONS_PATH = path.join(__dirname, "permissions.json");

function readJSON() {
	try {
		const raw = fs.readFileSync(PERMISSIONS_PATH, "utf8");
		return JSON.parse(raw);
	} catch (e) {
		return { fullAccessStoreIds: [], notifyEmails: [], staff: {} };
	}
}

function getFullAccessStoreIds() {
	return readJSON().fullAccessStoreIds || [];
}

function getStaffStoreIds(email) {
	const data = readJSON();
	return (data.staff && data.staff[email]) || [];
}

function getNotifyEmails() {
	return readJSON().notifyEmails || [];
}

function getFullAccessUsers() {
	return readJSON().fullAccessUsers || [];
}

function getManagerStoreIds(email) {
	const data = readJSON();
	return (data.managers && data.managers[email]) || [];
}

module.exports = {
	getFullAccessStoreIds,
	getStaffStoreIds,
	getNotifyEmails,
	getManagerStoreIds,
	getFullAccessUsers,
};
