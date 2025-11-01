// scripts/insertMenuData.ts
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// __dirname 구하기 (ESM/tsx 환경)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 루트(../)에 있는 .env.local 우선, 없으면 .env
const envLocal = path.resolve(__dirname, "../.env.local");
const env = path.resolve(__dirname, "../.env");

// 순서대로 로드
const loaded = dotenv.config({ path: envLocal });
if (loaded.error) {
  dotenv.config({ path: env });
}

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId) {
    throw new Error("❌ FIREBASE_PROJECT_ID 환경변수 누락");
  }
  if (!clientEmail) {
    throw new Error("❌ FIREBASE_CLIENT_EMAIL 환경변수 누락");
  }
  if (!privateKey) {
    throw new Error("❌ FIREBASE_PRIVATE_KEY 환경변수 누락");
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const db = getFirestore();

const menus = [
  {
    id: "2b61254c-1ab7-4f2d-ba30-7362385e7c3c",
    menu_id: "main",
    label: "Main",
    href: "/main",
    order: 1,
    lev: 1,
    up_id: "",
    createdAt: "2025-08-26 15:40:03.856",
    updatedAt: "2025-08-26 15:40:03.856",
  },
  {
    id: "661c1044-9c2e-43e3-b5d4-300ef875fc61",
    menu_id: "chat",
    label: "Chat",
    href: "chat",
    order: 2,
    lev: 1,
    up_id: "",
    createdAt: "2025-08-26 15:40:03.859",
    updatedAt: "2025-08-26 15:40:03.859",
  },
  {
    id: "e1b4da86-0437-4547-ae07-971dc5acf3cd",
    menu_id: "scenario",
    label: "Scenario",
    href: "/scenario",
    order: 3,
    lev: 1,
    up_id: "",
    createdAt: "2025-08-26 15:40:03.860",
    updatedAt: "2025-08-26 15:40:03.860",
  },
  {
    id: "29cfbda5-d5c6-46ff-b237-ffbfd1fe5704",
    menu_id: "admin",
    label: "Admin",
    href: "/admin",
    order: 4,
    lev: 1,
    up_id: "",
    createdAt: "2025-08-26 15:40:03.861",
    updatedAt: "2025-08-26 15:40:03.861",
  },
  {
    id: "dba8e12d-3ee9-44e8-be8b-a104ba6f2577",
    menu_id: "commercial",
    label: "Commercial",
    href: "",
    order: 1,
    lev: 2,
    up_id: "29cfbda5-d5c6-46ff-b237-ffbfd1fe5704",
    createdAt: "2025-08-26 15:41:01.721",
    updatedAt: "2025-08-26 15:41:01.721",
  },
  {
    id: "bf51419e-35fb-41c9-9715-6ef49c5754e1",
    menu_id: "customer-service",
    label: "Customer Service",
    href: "",
    order: 2,
    lev: 2,
    up_id: "29cfbda5-d5c6-46ff-b237-ffbfd1fe5704",
    createdAt: "2025-08-26 15:46:10.426",
    updatedAt: "2025-08-26 15:46:10.426",
  },
  {
    id: "a1a1769d-9090-412f-ad85-b465d0553fe5",
    menu_id: "equipment",
    label: "Equipment",
    href: "",
    order: 3,
    lev: 2,
    up_id: "29cfbda5-d5c6-46ff-b237-ffbfd1fe5704",
    createdAt: "2025-08-26 15:46:10.439",
    updatedAt: "2025-08-26 15:46:10.439",
  },
  {
    id: "d00a8d84-d63c-441c-b0de-b460f0b6c117",
    menu_id: "logistics",
    label: "Logistics",
    href: "",
    order: 4,
    lev: 2,
    up_id: "29cfbda5-d5c6-46ff-b237-ffbfd1fe5704",
    createdAt: "2025-08-26 15:46:10.440",
    updatedAt: "2025-08-26 15:46:10.440",
  },
  {
    id: "2afe6c0c-39d2-4d52-9382-dbde523a91bd",
    menu_id: "vessel",
    label: "Vessel",
    href: "",
    order: 5,
    lev: 2,
    up_id: "29cfbda5-d5c6-46ff-b237-ffbfd1fe5704",
    createdAt: "2025-08-26 15:46:10.442",
    updatedAt: "2025-08-26 15:46:10.442",
  },
  {
    id: "c680f21a-3c07-4a10-9966-02eaae3a666d",
    menu_id: "finance",
    label: "Finance",
    href: "",
    order: 6,
    lev: 2,
    up_id: "29cfbda5-d5c6-46ff-b237-ffbfd1fe5704",
    createdAt: "2025-08-26 15:46:10.443",
    updatedAt: "2025-08-26 15:46:10.443",
  },
  {
    id: "66b201dd-fd28-428c-a161-5f0908ca95c1",
    menu_id: "basic-slot-allocation",
    label: "Basic Slot Allocation",
    href: "",
    order: 1,
    lev: 3,
    up_id: "dba8e12d-3ee9-44e8-be8b-a104ba6f2577",
    createdAt: "2025-08-26 15:48:56.463",
    updatedAt: "2025-08-26 15:48:56.463",
  },
  {
    id: "7a7600df-1db0-47b3-bf51-34485db5b70c",
    menu_id: "bsa-contract-creation",
    label: "BSA Contract Creation",
    href: "/bsa-contract-creation",
    order: 1,
    lev: 4,
    up_id: "66b201dd-fd28-428c-a161-5f0908ca95c1",
    createdAt: "2025-08-26 15:51:09.719",
    updatedAt: "2025-08-26 15:51:09.719",
  },
  {
    id: "16606e09-7f82-473e-9e13-c1d5ddf9ac19",
    menu_id: "setup-code",
    label: "Setup & Code",
    href: "/setup-code",
    order: 1,
    lev: 4,
    up_id: "66b201dd-fd28-428c-a161-5f0908ca95c1",
    createdAt: "2025-08-26 15:51:09.722",
    updatedAt: "2025-08-26 15:51:09.722",
  },
  {
    id: "3c219931-1e59-41f5-bde9-78d86be7e98e",
    menu_id: "booking",
    label: "Booking",
    href: "/booking",
    order: 1,
    lev: 3,
    up_id: "bf51419e-35fb-41c9-9715-6ef49c5754e1",
    createdAt: "2025-08-26 15:52:48.528",
    updatedAt: "2025-08-26 15:52:48.528",
  },
  {
    id: "d7902292-4a45-4b43-b552-82f190d94e96",
    menu_id: "booking-closing",
    label: "Booking Closing",
    href: "/booking-closing",
    order: 1,
    lev: 4,
    up_id: "3c219931-1e59-41f5-bde9-78d86be7e98e",
    createdAt: "2025-08-26 15:53:53.926",
    updatedAt: "2025-08-26 15:53:53.926",
  },
];

(async () => {
  const batch = db.batch();
  for (const menu of menus) {
    const ref = db.collection("menu").doc(menu.id);
    batch.set(ref, menu);
  }
  await batch.commit();
  console.log("✅ 메뉴 데이터 Firestore에 성공적으로 업로드되었습니다.");
})();
