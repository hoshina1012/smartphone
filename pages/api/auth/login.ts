import type { NextApiRequest, NextApiResponse } from 'next';
import { compare } from 'bcrypt';
import prisma from '@/lib/prisma';
import { serialize } from 'cookie';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { SignJWT } = await import('jose');
    const { email, password } = req.body;

    // 簡易なバリデーション
    if (!email || !password) {
      return res.status(400).json({ error: 'メールアドレスとパスワードは必須です' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({ error: 'ユーザーが見つかりません' });
    }

    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'パスワードが正しくありません' });
    }

    const token = await new SignJWT({ email: user.email, id: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('40h')
      .setIssuedAt()
      .sign(SECRET);

    res.setHeader('Set-Cookie', serialize('token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 40,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    }));

    return res.status(200).json({ message: 'サインインに成功しました', userId: user.id });
  } catch (error) {
    console.error('サインインエラー:', error);
    return res.status(500).json({ error: 'サインイン中にエラーが発生しました' });
  }
}
