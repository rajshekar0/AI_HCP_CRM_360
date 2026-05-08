import { API_BASE_URL } from "../../config";

export const fetchLeadsAPI = async () => {
  const res = await fetch(`${API_BASE_URL}/leads`);
  return res.json();
};
