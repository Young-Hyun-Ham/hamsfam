import { writable } from "svelte/store";

export const user = writable({
  uid: "demo", // ✅ 나중에 lucia 붙이면 여기만 바꿔주면 됨
});
