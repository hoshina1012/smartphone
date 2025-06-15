import type { NextApiRequest, NextApiResponse } from 'next';
import { hash } from 'bcrypt';
import prisma from '@/lib/prisma';
import { serialize } from 'cookie';
import { z } from 'zod';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

// Zodスキーマでバリデーションを定義
const signupSchema = z.object({
  name: z.string().min(1, { message: '名前は1文字以上必要です' }),
  email: z.string().email({ message: 'メールアドレスの形式が正しくありません' }),
  password: z.string().min(6, { message: 'パスワードは6文字以上必要です' }),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { SignJWT } = await import('jose');

  try {
    // Zodでリクエストボディを検証
    const result = signupSchema.safeParse(req.body);

    if (!result.success) {
  const formattedErrors = result.error.format();

  console.error('バリデーションエラー:', JSON.stringify(formattedErrors, null, 2)); // ← 追加
  return res.status(400).json({ error: formattedErrors });
}

    const { email, password, name } = result.data;

    // 既に登録済みか確認
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
      return;
    }

    // パスワードをハッシュ化
    const hashedPassword = await hash(password, 10);

    // ユーザーを作成
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // JWT発行
    const token = await new SignJWT({ email: user.email, id: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('40h')
      .setIssuedAt()
      .sign(SECRET);

    // クッキーにセット
    res.setHeader('Set-Cookie', serialize('token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 40,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    }));

    res.status(200).json({ message: 'サインアップに成功しました', userId: user.id });
  } catch (error) {
    console.error('サインアップエラー:', error);
    res.status(500).json({ error: 'サインアップ中にエラーが発生しました' });
  }
}
