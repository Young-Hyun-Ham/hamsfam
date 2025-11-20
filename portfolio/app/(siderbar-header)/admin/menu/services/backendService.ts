// src/backendService.js

import * as firebaseApi from '../dto/firebaseApi';
import * as postgresApi from '../dto/postgresApi';
import { Menu, MenuSearchParams } from '../types/types';

const services: any = {
  firebase: firebaseApi,
  postgres: postgresApi,
};

const getService = (backend: any) => {
  const service = services[backend];
  if (!service) {
    throw new Error(`Invalid backend specified: ${backend}`);
  }
  return service;
};

export const fetchMenuList = (backend: any, args?: MenuSearchParams) => getService(backend).fetchMenuList(args);
export const createMenu = (backend: any, data: Menu) => getService(backend).createMenu(data);
export const updateMenu = (backend: any, id: string, data: Menu) => getService(backend).updateMenu(id, data);
export const deleteMenuById = (backend: any, id: string) => getService(backend).deleteMenuById(id);

