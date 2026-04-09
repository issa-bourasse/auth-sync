import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { Form, Input, Button, Typography, Divider, message } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';

const { Title } = Typography;
const googleProvider = new GoogleAuthProvider();

export default function SignUp() {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const syncToMongo = async (user, body) => {
    const token = await user.getIdToken();
    await fetch('/api/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  const onFinish = async ({ email, password, firstName, lastName }) => {
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: `${firstName} ${lastName}` });
      await syncToMongo(user, { firstName, lastName });
      message.success('Account created!');
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      await syncToMongo(user);
      message.success('Signed up with Google!');
    } catch (err) {
      message.error(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Form layout="vertical" onFinish={onFinish} style={{ maxWidth: 400, margin: '80px auto' }}>
      <Title level={3}>Sign Up</Title>
      <Form.Item name="firstName" rules={[{ required: true }]}><Input placeholder="First Name" /></Form.Item>
      <Form.Item name="lastName" rules={[{ required: true }]}><Input placeholder="Last Name" /></Form.Item>
      <Form.Item name="email" rules={[{ required: true, type: 'email' }]}><Input placeholder="Email" /></Form.Item>
      <Form.Item name="password" rules={[{ required: true, min: 6 }]}><Input.Password placeholder="Password" /></Form.Item>
      <Button type="primary" htmlType="submit" loading={loading} block>Sign Up</Button>
      <Divider>or</Divider>
      <Button icon={<GoogleOutlined />} onClick={handleGoogleSignUp} loading={googleLoading} block>Sign up with Google</Button>
    </Form>
  );
}