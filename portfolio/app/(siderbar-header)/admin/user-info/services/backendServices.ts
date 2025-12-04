// app/(sider-header)/admin/user-info/services/backendServices.ts
import * as firebaseApi from "../dto/firebaseApi";
import * as postgresApi from "../dto/postgresApi";

import type {
  AdminUser,
  UserSearchParams,
  UserUpsertPayload,
} from "../types";

/* 공통 인터페이스 */
export interface BackendService {
  fetchUserList: (args?: UserSearchParams) => Promise<AdminUser[]>;
  upsertUser: (payload: UserUpsertPayload) => Promise<AdminUser>;
  deleteUser: (subOrId: string) => Promise<void>;
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

export const fetchUserList = (backend: any, args?: UserSearchParams) => getService(backend).fetchUserList(args);
export const upsertUser = (backend: any, payload: UserUpsertPayload) => getService(backend).upsertUser(payload);
export const deleteUser = (backend: any, subOrId: string) => getService(backend).deleteUser(subOrId);
