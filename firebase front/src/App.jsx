import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { Button, Layout, Space } from 'antd';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import './App.css'


const { Header, Content } = Layout;

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('signin'); // 'signin' | 'signup'

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return null;

  if (!user) {
    return (
      <>
        {page === 'signin' ? <SignIn /> : <SignUp />}
        <div style={{ textAlign: 'center' }}>
          {page === 'signin' ? (
            <Button type="link" onClick={() => setPage('signup')}>Don't have an account? Sign Up</Button>
          ) : (
            <Button type="link" onClick={() => setPage('signin')}>Already have an account? Sign In</Button>
          )}
        </div>
      </>
    );
  }

  return (
    <Layout>
      <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff' }}>Welcome, {user.displayName || user.email}</span>
        <Button onClick={() => signOut(auth)}>Sign Out</Button>
      </Header>
      <Content style={{ padding: 24 }}>
        <p>You are signed in as {user.email}</p>
      </Content>
    </Layout>
  );
}