// app/store/index.js
import { create } from "zustand";
import {
  db,
  auth,
  onAuthStateChanged,
  doc,
  getDoc,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp,
  addDoc,
} from "../lib/firebase";
import { locales } from "@/app//lib/locales";
import { createAuthSlice } from "@/app/store/slice/authSlice";
import { createUISlice } from "@/app/store/slice/uiSlice";

const getInitialMessages = (lang: any = "ko") => {
  return [
    { id: "initial", sender: "bot", text: locales[lang].initialBotMessage },
  ];
};

export const useStore: any = create((set, get) => ({
  db,
  auth,

  ...createAuthSlice(set, get),
  ...createUISlice(set, get),
  
  initAuth: () => {

  },
}));

// 초기화 로직은 스토어 생성 후 바로 호출
useStore.getState().initAuth();