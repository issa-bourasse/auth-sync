import { useState, useEffect } from 'react';
import { auth } from '../firebase';

export default function useMongoUser() {
  const [mongoUser, setMongoUser] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        setMongoUser(null);
        return;
      }
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMongoUser(await res.json());
      }
    });
    return unsub;
  }, []);

  return mongoUser;
}