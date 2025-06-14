import type { NextApiRequest, NextApiResponse } from 'next';
import { hash } from 'bcrypt';
import prisma from '@/lib/prisma';
import { serialize } from 'cookie';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { SignJWT } = await import('jose'); // ← ESMモジュールを動的にインポート

  const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'メールアドレスとパスワードは必須です' });
      return;
    }

    // 既にメールアドレス登録済みかチェック
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

    // JWTトークン作成
    const token = await new SignJWT({ email: user.email, id: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('40h')
      .setIssuedAt()
      .sign(SECRET);

    // Cookieを設定しつつレスポンス返す
    res.setHeader('Set-Cookie', serialize('token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 40, // 40時間
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    }));

    res.status(200).json({ message: 'サインアップに成功しました', userId: user.id });
  } catch (error) {
    console.error('サインアップエラー:', error);
    res.status(500).json({ error: 'サインアップ中にエラーが発生しました' });
  }
}
