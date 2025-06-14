import type { NextApiRequest, NextApiResponse } from 'next'
import { compare } from 'bcrypt';
import prisma from '@/lib/prisma';
import { serialize } from 'cookie';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email({ message: "メールアドレスの形式が正しくありません" }),
  password: z.string().min(6, { message: "パスワードは6文字以上必要です" }),
});

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { SignJWT } = await import('jose');

    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      const formattedErrors = result.error.format();
      return res.status(400).json({ error: formattedErrors });
    }

    const { email, password } = result.data;

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

    // クッキーを設定
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
