import { useAuth } from '@clerk/react';
import { useEffect, useState } from 'react';

export default function useMongoUser() {
  const { getToken } = useAuth();
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      const token = await getToken();
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(await res.json());
    }
    fetchUser();
  }, [getToken]);

  return user;
}