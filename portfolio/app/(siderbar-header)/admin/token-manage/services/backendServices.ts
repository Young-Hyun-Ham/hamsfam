// app/(sider-header)/admin/token-manage/services/backendServices.ts

import * as firebaseApi from "../dto/firebaseApi";
import * as postgresApi from "../dto/postgresApi";

import type {
  AdminTokenUser,
  ChargeUserTokenInput,
} from "../types";

/* 공통 인터페이스 */
export interface BackendService {
  fetchUserList: (args?: any) => Promise<AdminTokenUser[]>;
  chargeUserToken: (args: ChargeUserTokenInput) => Promise<void>;
  fetchUserTokenHistory: (args: string) => Promise<any[]>;
}

/* backend → 실제 서비스 매핑 */
const services: Record<any, BackendService> = {
  firebase: firebaseApi,
  postgres: postgresApi,
};

const getService = (backend: any): BackendService => {
  const service = services[backend];
  if (!service) throw new Error(`Invalid backend: ${backend}`);
  return service;
};

/* ============================= 사용자 API ============================= */
export const fetchUserList = (backend: any, args?: any) => getService(backend).fetchUserList(args);
export const chargeUserToken = (backend: any, args: ChargeUserTokenInput) => getService(backend).chargeUserToken(args);
export const fetchUserTokenHistory = (backend: any, userId: string) => getService(backend).fetchUserTokenHistory(userId);
