// userService.ts
// Handles user account update and deletion API calls

import API_URL from "../config/api";
const API_BASE = `${API_URL}/api`;

export async function updateUser({ email, username, newEmail, newUsername, token }: {
  email: string;
  username?: string;
  newEmail?: string;
  newUsername?: string;
  token: string;
}) {
  const res = await fetch(`${API_BASE}/user/update`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ email, username, new_email: newEmail, new_username: newUsername }),
  });
  if (!res.ok) throw new Error("Failed to update user info");
  return res.json();
}

export async function deleteUser(email: string, token: string) {
  const res = await fetch(`${API_BASE}/user/delete?email=${encodeURIComponent(email)}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to delete account");
  return res.json();
}
