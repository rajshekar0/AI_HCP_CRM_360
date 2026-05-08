import { API_BASE_URL } from "../config";

export async function getDashboardStats() {
  const res = await fetch(`${API_BASE_URL}/dashboard/stats`);
  return res.json();
}
