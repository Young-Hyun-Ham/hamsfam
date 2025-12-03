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

