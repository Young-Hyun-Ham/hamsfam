import axios from "axios";
import type {
  AdminTokenUser,
  ChargeUserTokenInput,
} from "../types";

const BASE = "/api/user-token";

/* ========================= 목록 조회 ========================= */
export async function fetchUserList(
  args?: any
): Promise<AdminTokenUser[]> {
  const res = await axios.get(`${BASE}`, {
    params: {
      backend: "postgres",
      keyword: args?.keyword ?? "",
    },
  });
  return res.data.items;
}

// ========================= 토큰 충전 =========================
export async function chargeUserToken(
  args: ChargeUserTokenInput
): Promise<void> {
  const res = await axios.post(`${BASE}`, {
    params: {
      backend: "postgres",
      userId: args.userId,
      amount: args.amount,
      memo: args.memo,
    },
  });
}

export async function fetchUserTokenHistory(
  args: string
): Promise<any[]> {
  const res = await axios.post(`${BASE}`, {
    params: {
      userId: args,
    }
  });
  return [];
}
