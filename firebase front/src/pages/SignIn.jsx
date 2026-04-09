import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { Form, Input, Button, Typography, Divider, message } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';

const { Title } = Typography;
const googleProvider = new GoogleAuthProvider();

export default function SignIn() {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const syncToMongo = async (user) => {
    const token = await user.getIdToken();
    await fetch('/api/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  };

  const onFinish = async ({ email, password }) => {
    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      await syncToMongo(user);
      message.success('Signed in!');
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      await syncToMongo(user);
      message.success('Signed in with Google!');
    } catch (err) {
      message.error(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Form layout="vertical" onFinish={onFinish} style={{ maxWidth: 400, margin: '80px auto' }}>
      <Title level={3}>Sign In</Title>
      <Form.Item name="email" rules={[{ required: true, type: 'email' }]}><Input placeholder="Email" /></Form.Item>
      <Form.Item name="password" rules={[{ required: true }]}><Input.Password placeholder="Password" /></Form.Item>
      <Button type="primary" htmlType="submit" loading={loading} block>Sign In</Button>
      <Divider>or</Divider>
      <Button icon={<GoogleOutlined />} onClick={handleGoogleSignIn} loading={googleLoading} block>Sign in with Google</Button>
    </Form>
  );
}