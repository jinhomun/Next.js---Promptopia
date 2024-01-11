import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

import User from '@models/user';
import { connectToDB } from '@utils/database';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session }) {
      // MongoDB의 사용자 ID를 세션에 저장(store the user id from MongoDB to session)
      const sessionUser = await User.findOne({ email: session.user.email });
      session.user.id = sessionUser._id.toString();

      return session;
    },
    async signIn({ account, profile, user, credentials }) {
      try {
        await connectToDB();

        // 사용자가 이미 존재하는지 확인(check if user already exists)
        const userExists = await User.findOne({ email: profile.email });

        // 그렇지 않은 경우 새 문서를 만들고 MongoDB에 사용자를 저장합니다.(if not, create a new document and save user in MongoDB)
        if (!userExists) {
          await User.create({
            email: profile.email,
            username: profile.name.replace(' ', '').toLowerCase(),
            image: profile.picture,
          });
        }

        return true;
      } catch (error) {
        console.log('Error checking if user exists: ', error.message);
        return false;
      }
    },
  },
});

export { handler as GET, handler as POST };