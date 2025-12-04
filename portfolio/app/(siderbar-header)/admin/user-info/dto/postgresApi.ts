import axios from "axios";
import type {
  AdminUser,
  UserSearchParams,
  UserUpsertPayload,
} from "../types";

const BASE = "/api/users";

export async function fetchUserList(
  args?: UserSearchParams
): Promise<AdminUser[]> {
  const res = await axios.get(`${BASE}`, {
    params: {
      backend: "postgres",
      keyword: args?.keyword ?? "",
    },
  });
  return res.data.items;
}

export async function upsertUser(
  payload: UserUpsertPayload
): Promise<AdminUser> {
  const res = await axios.post(`${BASE}`, {
    backend: "postgres",
    ...payload,
  });
  return res.data;
}

export async function deleteUser(idOrSub: string): Promise<void> {
  await axios.delete(`${BASE}/${idOrSub}`, {
    params: { backend: "postgres" },
  });
}

export default {
  fetchUserList,
  upsertUser,
  deleteUser,
};
