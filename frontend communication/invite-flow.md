# Frontend: Invite Set-Password Flow (Copy & Paste)

Purpose: Handle invite links like `/invite?token=...` so invited users can set a password and get auto-logged in.

Backend endpoints available:

- GET `/auth/verify-invite?token=...` → { valid, invite }
- POST `/auth/accept-invite` with `{ token, password }` → { success, token }

API base URL: `http://localhost:4000` (change to your deployed API). You can set `NEXT_PUBLIC_API_URL` or `VITE_API_URL` in the frontend to override.

---

## 1) Minimal API helper (fetch)

```js
// api/invite.js
const API_BASE =
	(typeof process !== "undefined" &&
		process.env &&
		(process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL)) ||
	"http://localhost:4000";

export async function verifyInvite(token) {
	const res = await fetch(
		`${API_BASE}/auth/verify-invite?token=${encodeURIComponent(token)}`
	);
	if (!res.ok) throw new Error("Invite verification failed");
	return res.json(); // { valid: true, invite: { email, role, storeRole, storeIds, organizationId } }
}

export async function acceptInvite({ token, password }) {
	const res = await fetch(`${API_BASE}/auth/accept-invite`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ token, password }),
	});
	if (!res.ok) {
		const err = await res
			.json()
			.catch(() => ({ error: "Failed to accept invite" }));
		throw new Error(err.error || "Failed to accept invite");
	}
	return res.json(); // { success: true, token }
}
```

Where to put: your frontend codebase (e.g., `src/api/invite.js`).

---

## 2) React Router page: `/invite`

```jsx
// pages/InvitePage.jsx (React Router)
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyInvite, acceptInvite } from "../api/invite";

export default function InvitePage() {
	const location = useLocation();
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [email, setEmail] = useState("");
	const [org, setOrg] = useState(null);
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");

	const params = new URLSearchParams(location.search);
	const token = params.get("token");

	useEffect(() => {
		async function run() {
			if (!token) {
				setError("Missing invite token");
				setLoading(false);
				return;
			}
			try {
				const data = await verifyInvite(token);
				if (!data.valid) throw new Error("Invalid or expired invite");
				setEmail(data.invite?.email || "");
				setOrg(data.invite?.organizationId || null);
			} catch (e) {
				setError(e.message || "Invite verification failed");
			} finally {
				setLoading(false);
			}
		}
		run();
	}, [token]);

	const onSubmit = async (e) => {
		e.preventDefault();
		setError("");
		if (password.length < 8)
			return setError("Password must be at least 8 characters");
		if (password !== confirm) return setError("Passwords do not match");
		try {
			const result = await acceptInvite({ token, password });
			// Save JWT for authenticated session
			localStorage.setItem("token", result.token);
			// Redirect to your app home/dashboard
			navigate("/");
		} catch (e) {
			setError(e.message || "Failed to accept invite");
		}
	};

	if (loading) return <div>Validating invite…</div>;
	if (error) return <div style={{ color: "red" }}>{error}</div>;

	return (
		<div
			style={{
				maxWidth: 420,
				margin: "40px auto",
				fontFamily: "system-ui, Arial",
			}}
		>
			<h2>Set your password</h2>
			<p>
				{email ? `For ${email}` : ""}
				{org ? ` • Organization ID: ${org}` : ""}
			</p>
			<form onSubmit={onSubmit}>
				<div style={{ marginBottom: 12 }}>
					<label>Password</label>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						minLength={8}
						style={{ width: "100%", padding: 8 }}
					/>
				</div>
				<div style={{ marginBottom: 12 }}>
					<label>Confirm password</label>
					<input
						type="password"
						value={confirm}
						onChange={(e) => setConfirm(e.target.value)}
						required
						minLength={8}
						style={{ width: "100%", padding: 8 }}
					/>
				</div>
				<button type="submit" style={{ padding: "10px 16px" }}>
					Continue
				</button>
			</form>
		</div>
	);
}
```

Routing: add `<Route path="/invite" element={<InvitePage/>} />`.

---

## 3) Next.js page: `/invite`

### pages router (pages/invite.js)

```jsx
// pages/invite.js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { verifyInvite, acceptInvite } from "../api/invite";

export default function Invite() {
	const router = useRouter();
	const token =
		typeof window !== "undefined"
			? new URLSearchParams(window.location.search).get("token")
			: null;
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [email, setEmail] = useState("");
	const [org, setOrg] = useState(null);
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");

	useEffect(() => {
		async function run() {
			if (!token) {
				setLoading(false);
				return;
			}
			try {
				const data = await verifyInvite(token);
				if (!data.valid) throw new Error("Invalid or expired invite");
				setEmail(data.invite?.email || "");
				setOrg(data.invite?.organizationId || null);
			} catch (e) {
				setError(e.message || "Invite verification failed");
			} finally {
				setLoading(false);
			}
		}
		run();
	}, [token]);

	const onSubmit = async (e) => {
		e.preventDefault();
		setError("");
		if (password.length < 8)
			return setError("Password must be at least 8 characters");
		if (password !== confirm) return setError("Passwords do not match");
		try {
			const result = await acceptInvite({ token, password });
			localStorage.setItem("token", result.token);
			router.push("/");
		} catch (e) {
			setError(e.message || "Failed to accept invite");
		}
	};

	if (loading) return <div>Validating invite…</div>;
	if (error) return <div style={{ color: "red" }}>{error}</div>;

	return (
		<div
			style={{
				maxWidth: 420,
				margin: "40px auto",
				fontFamily: "system-ui, Arial",
			}}
		>
			<h2>Set your password</h2>
			<p>
				{email ? `For ${email}` : ""}
				{org ? ` • Organization ID: ${org}` : ""}
			</p>
			<form onSubmit={onSubmit}>
				<div style={{ marginBottom: 12 }}>
					<label>Password</label>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						minLength={8}
						style={{ width: "100%", padding: 8 }}
					/>
				</div>
				<div style={{ marginBottom: 12 }}>
					<label>Confirm password</label>
					<input
						type="password"
						value={confirm}
						onChange={(e) => setConfirm(e.target.value)}
						required
						minLength={8}
						style={{ width: "100%", padding: 8 }}
					/>
				</div>
				<button type="submit" style={{ padding: "10px 16px" }}>
					Continue
				</button>
			</form>
		</div>
	);
}
```

### app router (app/invite/page.jsx)

```jsx
// app/invite/page.jsx
"use client";
import { useEffect, useState } from "react";
import { verifyInvite, acceptInvite } from "../../api/invite";
import { useSearchParams, useRouter } from "next/navigation";

export default function InvitePage() {
	const router = useRouter();
	const search = useSearchParams();
	const token = search.get("token");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [email, setEmail] = useState("");
	const [org, setOrg] = useState(null);
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");

	useEffect(() => {
		async function run() {
			if (!token) {
				setLoading(false);
				return;
			}
			try {
				const data = await verifyInvite(token);
				if (!data.valid) throw new Error("Invalid or expired invite");
				setEmail(data.invite?.email || "");
				setOrg(data.invite?.organizationId || null);
			} catch (e) {
				setError(e.message || "Invite verification failed");
			} finally {
				setLoading(false);
			}
		}
		run();
	}, [token]);

	const onSubmit = async (e) => {
		e.preventDefault();
		setError("");
		if (password.length < 8)
			return setError("Password must be at least 8 characters");
		if (password !== confirm) return setError("Passwords do not match");
		try {
			const result = await acceptInvite({ token, password });
			localStorage.setItem("token", result.token);
			router.push("/");
		} catch (e) {
			setError(e.message || "Failed to accept invite");
		}
	};

	if (loading) return <div>Validating invite…</div>;
	if (error) return <div style={{ color: "red" }}>{error}</div>;

	return (
		<div
			style={{
				maxWidth: 420,
				margin: "40px auto",
				fontFamily: "system-ui, Arial",
			}}
		>
			<h2>Set your password</h2>
			<p>
				{email ? `For ${email}` : ""}
				{org ? ` • Organization ID: ${org}` : ""}
			</p>
			<form onSubmit={onSubmit}>
				<div style={{ marginBottom: 12 }}>
					<label>Password</label>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						minLength={8}
						style={{ width: "100%", padding: 8 }}
					/>
				</div>
				<div style={{ marginBottom: 12 }}>
					<label>Confirm password</label>
					<input
						type="password"
						value={confirm}
						onChange={(e) => setConfirm(e.target.value)}
						required
						minLength={8}
						style={{ width: "100%", padding: 8 }}
					/>
				</div>
				<button type="submit" style={{ padding: "10px 16px" }}>
					Continue
				</button>
			</form>
		</div>
	);
}
```

---

## 4) Optional: detect token on login page

If you can’t add a separate `/invite` route, detect `?token=` on the login page:

```js
// In your Login component
const token = new URLSearchParams(window.location.search).get("token");
if (token) {
	// Show set-password UI instead of login form and follow the same submit logic as above
}
```

---

## 5) Notes

- If you deploy the backend on a different domain/port, set `NEXT_PUBLIC_API_URL` or `VITE_API_URL` accordingly.
- Re-send invites after deploying the backend changes so links include the new `token` param.
- Enforce stronger password rules in UI if needed.
