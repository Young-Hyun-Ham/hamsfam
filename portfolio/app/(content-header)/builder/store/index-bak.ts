// app/store/index.js
import { create } from "zustand";
import { scenarioSlice } from "./slice/scenarioSlice";
import { nodeSlice } from "./slice/nodeSlice";

export const useBuilderStore: any = create((set: any, get: any) => ({

  ...scenarioSlice(set, get),
  ...nodeSlice(set, get),

}));