// store/slice/authSlice.ts
import { db, addDoc, collection, doc, GoogleAuthProvider, setDoc, signInWithPopup, signOut, serverTimestamp, getDoc } from '@/lib/firebase';

export const createAuthSlice = (set: any, get: any) => ({
  token: null,
  setToken: (token: string) => set({ token }),

  loginWithGoogle: async () => {
    try {
      await signInWithPopup(get().auth, new GoogleAuthProvider());
    } catch (error) {
      console.error("Login with Google failed:", error);
    }
  },

  loginWithTestId: async (userId: any) => {
    if (!userId || !userId.trim()) {
      console.error("Test User ID cannot be empty.");
      // You can also show a toast message to the user here.
      return;
    }
    const mockUser: any = {
      displayName: `Test User (${userId.trim()})`,
      email: `${userId.trim()}@test.com`,
      photoURL: '/images/avatar.png',
      isTestUser: true, // Flag to identify this special user
      roles: ['guest'],
    };

    const testUserRef = collection(db, "test_users");
    const docRef = await addDoc(testUserRef, {
      ...mockUser,
      created_at: serverTimestamp(),
    });
    mockUser["uid"] = docRef.id;
    
    //setDoc로 사용할 경우 컬렉션이 없으면 자동 생성
    const newDocRef = doc(testUserRef); // 새 랜덤 ID 생성
    await setDoc(newDocRef, {
      ...mockUser,
      created_at: serverTimestamp(),
    });
    mockUser["uid"] = newDocRef.id;

    // This function is defined in the main store file (store/index.js)
    get().setUserAndLoadData(mockUser);
  },

  logout: async () => {
    try {
      if (get().user?.isTestUser) {
        // For test users, just clear the data locally
        get().clearUserAndData();
      } else {
        // For real Firebase users, signing out will trigger onAuthStateChanged, which handles the cleanup
        await signOut(get().auth);
      }
    } catch (error) {
        console.error("Logout failed:", error);
    }
  },
});
