import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";

/**
 * Persists a minimal user profile to Firestore.
 * Passwords are handled entirely by Firebase Auth and never stored here.
 */
export async function saveUserProfile(user, { isNew = false } = {}) {
  if (!user?.uid) return;

  const userDoc = doc(db, "users", user.uid);
  const payload = {
    email: user.email ?? "",
    lastLoginAt: serverTimestamp(),
  };

  if (isNew) {
    payload.createdAt = serverTimestamp();
  }

  await setDoc(userDoc, payload, { merge: true });
}
