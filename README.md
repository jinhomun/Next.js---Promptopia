# Promptopia
Promptopia는 Next.js 14 AI 프롬프트 공유 애플리케이션 입니다.  
### 설치
`npx create-next-app@latest`
<details>

```js
√ What is your project named? ... next.js-project
√ Would you like to use TypeScript? ... `No` / Yes
√ Would you like to use ESLint? ... `No` / Yes
√ Would you like to use Tailwind CSS? ... No / `Yes`
√ Would you like to use `src/` directory? ... `No` / Yes
√ Would you like to use App Router? (recommended) ...`No` / Yes
√ Would you like to customize the default import alias (@ / *)? ... No / `Yes`
√ What import alias would you like configured? ... @ / *
Creating a new Next.js app in C:\Users\line\Desktop\Next.js-Project\next.js-project.

Using npm.
```

</details>

```js
`npm i bcrypt`
`npm i mongodb` 
`npm i mongoose`
`npm i next-auth`
`npm i tailwindcss`  --> apply 에러 수정하기 위해서 설치.
확장 프로그램 `Tailwind CSS IntelliSense` 설치 후 재시작.
```

### 실행
`npm run dev`

### 폴더 셋팅
components 폴더 -> Feed.jsx, Form.jsx, Nav.jsx, Profile.jsx, PromptCard.jsx, Provider.jsx   
models 폴더(mongoDB스키마 생성) -> prompt.js(prompt정보), user.js(로그인정보)  
public 폴더-> assets 폴더 -> icons폴더,images폴더  
styles 폴더 생성 -> global.css(tailwindcss)   
utils 폴더 생성 -> database.js(mongoDB 데이터베이스 연결)   
.env파일 생성 -> 환경변수(민감한 정보를 담고 있을 수 있기 때문에 외부에 노출되지 않도록 주의해야 합니다.)  

## app
app폴더 -> api폴더 생성(Next.js에서 제공하는 서버리스(Serverless) 기능을 활용하여 서버의 역할을 수행합니다.)  

### app > api > auth > [...nextauth] > route.js   
Next.js 애플리케이션에 Google OAuth를 통한 소셜 로그인을 추가하고, MongoDB를 사용하여 사용자 정보를 저장하는데 활용됩니다.
<details>

<summary>1. 모듈 가져오기</summary>
- next-auth와 Google OAuth를 통한 로그인을 지원하는 next-auth/providers/google 모듈을 가져옵니다.<br>   
- MongoDB 모델(User)과 데이터베이스 연결을 위한 유틸리티 함수(connectToDB)도 가져옵니다.  

```js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import User from '@models/user';
import { connectToDB } from '@utils/database';
```

</details>

<details>

<summary>2. NextAuth 구성</summary>
- NextAuth 함수를 호출하여 Next.js 애플리케이션에 인증을 추가합니다.<br>   
- GoogleProvider를 이용하여 Google OAuth를 설정하고, 클라이언트 ID와 클라이언트 비밀키는 환경 변수에서 가져옵니다<br>
- 환경변수를 가져올때는 process.env."키 이름" <br> 

```js
const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // ...
  },
});
```

</details>

<details>

<summary>3. Callback 함수 설정</summary>
- session 콜백은 사용자가 로그인할 때마다 세션에 관련된 정보를 추가합니다. 여기서는 MongoDB에서 사용자 ID를 가져와 세션에 저장합니다.<br>   
- signIn 콜백은 사용자가 로그인할 때 추가적인 동작을 정의합니다.<br>
여기서는 MongoDB에 사용자가 이미 존재하는지 확인하고, 없으면 새로운 사용자를 생성하여 저장합니다.<br>


```js
callbacks: {
  async session({ session }) {
    // MongoDB의 사용자 ID를 세션에 저장
    const sessionUser = await User.findOne({ email: session.user.email });
    session.user.id = sessionUser._id.toString();
    return session;
  },
  async signIn({ account, profile, user, credentials }) {
    // ...
  },
},
```

</details>

<details>

<summary>4. MongoDB 연결 및 사용자 생성</summary>
- signIn 콜백에서는 MongoDB에 연결하고, 사용자가 이미 존재하는지 확인한 후, 없으면 새로운 사용자를 생성하여 저장합니다.<br>   

```js
async signIn({ account, profile, user, credentials }) {
  try {
    await connectToDB();

    const userExists = await User.findOne({ email: profile.email });

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
```

</details>

<details>

<summary>5. export</summary>
- handler 함수를 GET 및 POST 요청에 대한 핸들러로 익스포트합니다. 이렇게 함으로써 Next.js 애플리케이션에서 해당 인증 핸들러를 사용할 수 있습니다.<br>   

```js
export { handler as GET, handler as POST };
```

</details>


### app > api > prompt > [id] > route.js   
MongoDB를 사용하여 Prompt 모델을 조작하는 API 엔드포인트를 정의하고 있습니다.
<details>

<summary>1. GET 엔드포인드(작성한 prompt 가져오기)</summary>
- GET 요청에 대한 핸들러로, MongoDB에서 특정 ID에 해당하는 Prompt를 찾아와 반환합니다.<br>   
- 만약 해당 ID에 대한 Prompt가 없으면 404 상태를 반환하고, 내부 서버 오류가 발생하면 500 상태를 반환합니다.<br>

```js
export const GET = async (request, { params }) => {
  try {
    await connectToDB();

    const prompt = await Prompt.findById(params.id).populate('creator');
    if (!prompt) return new Response('Prompt Not Found', { status: 404 });

    return new Response(JSON.stringify(prompt), { status: 200 });
  } catch (error) {
    return new Response('Internal Server Error', { status: 500 });
  }
};
```

</details>

<details>

<summary>2. PATCH 엔드포인트( prompt 수정하기(업데이트) )</summary>
- PATCH 요청에 대한 핸들러로, 특정 ID에 해당하는 Prompt를 찾아와서 내용과 태그를 업데이트합니다.<br>   
- 만약 해당 ID에 대한 Prompt가 없으면 404 상태를 반환하고, 내부 서버 오류가 발생하면 500 상태를 반환합니다.<br>

```js
export const PATCH = async (request, { params }) => {
  const { prompt, tag } = await request.json();

  try {
    await connectToDB();

    const existingPrompt = await Prompt.findById(params.id);

    if (!existingPrompt) {
      return new Response('Prompt not found', { status: 404 });
    }

    existingPrompt.prompt = prompt;
    existingPrompt.tag = tag;

    await existingPrompt.save();

    return new Response('Successfully updated the Prompts', { status: 200 });
  } catch (error) {
    return new Response('Error Updating Prompt', { status: 500 });
  }
};
```

</details>

<details>

<summary>3. DELETE 엔드포인트( prompt 삭제하기)</summary>
- DELETE 요청에 대한 핸들러로, 특정 ID에 해당하는 Prompt를 삭제합니다.<br>   
- 만약 해당 ID에 대한 Prompt가 없으면 404 상태를 반환하고, 내부 서버 오류가 발생하면 500 상태를 반환합니다.<br>

```js
export const DELETE = async (request, { params }) => {
  try {
    await connectToDB();

    await Prompt.findByIdAndDelete(params.id);

    return new Response('Prompt deleted successfully', { status: 200 });
  } catch (error) {
    return new Response('Error deleting prompt', { status: 500 });
  }
};
```

</details>

### app > api > prompt > new > route.js   
클라이언트로부터 받은 데이터를 사용하여 MongoDB에 새로운 Prompt를 생성하는 POST 엔드포인트를 정의하고 있습니다.
<details>

<summary>1. 모듈 가져오기</summary>
- @utils/database로부터 connectToDB 함수를 가져오고, @models/prompt로부터 Prompt 모델을 가져옵니다.<br>   


```js
import { connectToDB } from '@utils/database';
import Prompt from '@models/prompt';
```

</details>

<details>

<summary>2. POST 엔드포인트 핸들러(prompt 업로드)</summary>
- POST 요청에 대한 핸들러로, 클라이언트로부터 받은 JSON 데이터를 파싱하여 userId, prompt, tag 변수에 할당합니다.<br>   
- connectToDB 함수를 사용하여 MongoDB에 연결합니다.<br>
- new Prompt()를 사용하여 새로운 Prompt 객체를 생성하고, 받은 데이터를 사용하여 필드 값을 설정합니다.<br>
- newPrompt.save()를 호출하여 MongoDB에 새로운 Prompt를 저장합니다.<br>
- 공적으로 저장된 Prompt 객체를 JSON 형식으로 응답하며, 상태 코드를 201(Created)로 설정합니다.<br>
- 에러가 발생하면 상태 코드를 500(Internal Server Error)로 설정하고 실패 메시지를 응답합니다.<br>

```js
export const POST = async (req) => {
  const { userId, prompt, tag } = await req.json();

  try {
    await connectToDB();
    const newPrompt = new Prompt({
      creator: userId,
      prompt,
      tag,
    });

    await newPrompt.save();

    return new Response(JSON.stringify(newPrompt), { status: 201 });
  } catch (error) {
    return new Response('Failed to create a new prompt', { status: 500 });
  }
};
```
</details>

### app > api > prompt > route.js   
MongoDB에서 모든 Prompt 객체를 검색하고, 사용자 정보를 함께 가져와 JSON 형식으로 응답하는 GET 엔드포인트를 정의하고 있습니다.
<details>

<summary>1. 모듈 가져오기</summary>
- @utils/database로부터 connectToDB 함수를 가져오고, @models/prompt로부터 Prompt 모델을 가져옵니다.<br>   

```js
import { connectToDB } from '@utils/database';
import Prompt from '@models/prompt';
```
</details>

<details>

<summary>2. GET 엔드포인트 핸들러</summary>
- GET 요청에 대한 핸들러로, connectToDB 함수를 사용하여 MongoDB에 연결합니다.<br>   
- Prompt.find({}).populate('creator')를 호출하여 모든 Prompt 객체를 검색하고, creator 필드를 참조하여 해당 사용자 객체를 함께 검색합니다. <br>
이렇게 함으로써 사용자 정보도 함께 반환됩니다.<br>
- 검색된 prompts를 JSON 형식으로 응답하며, 상태 코드를 200(OK)로 설정합니다.<br>
- 에러가 발생하면 상태 코드를 500(Internal Server Error)로 설정하고 실패 메시지를 응답합니다.<br>

```js
export const GET = async (request) => {
  try {
    await connectToDB();

    const prompts = await Prompt.find({}).populate('creator');

    return new Response(JSON.stringify(prompts), { status: 200 });
  } catch (error) {
    return new Response('Failed to fetch all prompts', { status: 500 });
  }
};
```
</details>

### app > api > users > [id] > posts > route.js   
특정 사용자가 작성한 Prompt 객체들을 검색하고, 해당 사용자 정보를 함께 가져와 JSON 형식으로 응답하는 GET 엔드포인트를 정의하고 있습니다.
<details>

<summary>1. 모듈 가져오기</summary>
- @utils/database로부터 connectToDB 함수를 가져오고, @models/prompt로부터 Prompt 모델을 가져옵니다.<br>   

```js
import { connectToDB } from '@utils/database';
import Prompt from '@models/prompt';
```
</details>

<details>

<summary>2. GET 엔드포인트 핸들러</summary>
- GET 요청에 대한 핸들러로, connectToDB 함수를 사용하여 MongoDB에 연결합니다.<br>   
- Prompt.find({ creator: params.id })를 호출하여 특정 사용자(creator)가 작성한 Prompt 객체들을 검색하고, populate('creator')를 사용하여 해당 사용자   객체를 함께 가져옵니다. <br>
이렇게 함으로써 사용자 정보도 함께 반환됩니다.<br>
- 검색된 prompts를 JSON 형식으로 응답하며, 상태 코드를 200(OK)로 설정합니다.<br>
- 에러가 발생하면 상태 코드를 500(Internal Server Error)로 설정하고 실패 메시지를 응답합니다.<br>

```js
export const GET = async (request, { params }) => {
  try {
    await connectToDB();

    const prompts = await Prompt.find({ creator: params.id }).populate('creator');
    // 특정 사용자(creator)가 작성한 모든 Prompt 객체를 검색하고, creator 필드를 참조하여 해당 사용자 객체를 함께 가져옵니다.

    return new Response(JSON.stringify(prompts), { status: 200 });
  } catch (error) {
    return new Response('Failed to fetch prompts created by user', { status: 500 });
  }
};
```
</details>



### 구글 클라우드
New project name : promptopia 생성.  
Api 및 서비스 - OAuth 동의 화면
App name: Promptopia 작성, 이메일 작성

NEXTAUTH_SECRET -> `openssl rand -base64 32` -> https://www.cryptool.org/en/cto/openssl  -> 

## 트러블 슈팅
Module not found: Can't resolve '@styles/globals.css'
```js

{
  "compilerOptions": {
    "paths": {
      "@*": [      --> "@/*" 에서  "@*" 수정
        "./*"
      ]
    }
  }
}

const RootLayout = ({}) => {}  ==>  const RootLayout = ({ children }) => {} 수정

```
.gitignore파일안에 .env 코드를 넣었는데 git 업로드 되는 현상.   
.env 파일이 로컬 및 리모트 저장소에서 제거되고, 해당 변경 내용이 커밋 기록에 남게 됩니다.    
주의해야 할 점은 .env 파일이나 다른 민감한 정보를 저장하는 파일은 버전 관리에서 제외해야 하며,    
이러한 파일들은 .gitignore 파일에 명시하여 Git이 추적하지 않도록 설정하는 것이 좋습니다.   
```js
git rm .env --cached
git add .
git commit -m "remove .env file from git"
git push

```


