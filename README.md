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

<summary>Code Explanation</summary>

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
</details>


### app > api > prompt > [id] > route.js   
MongoDB를 사용하여 Prompt 모델을 조작하는 API 엔드포인트를 정의하고 있습니다.
<details>

<summary>Code Explanation</summary>

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
</details>

### app > api > prompt > new > route.js   
클라이언트로부터 받은 데이터를 사용하여 MongoDB에 새로운 Prompt를 생성하는 POST 엔드포인트를 정의하고 있습니다.
<details>

<summary>Code Explanation</summary>

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
</details>

### app > api > prompt > route.js   
MongoDB에서 모든 Prompt 객체를 검색하고, 사용자 정보를 함께 가져와 JSON 형식으로 응답하는 GET 엔드포인트를 정의하고 있습니다.
<details>

<summary>Code Explanation</summary>

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
- Prompt.find({}).populate('creator')를 호출하여 모든 Prompt 객체를 검색하고, creator 필드를 참조하여 해당 사용자 객체를 함께 검색합니다. 이렇게 함으로써 사용자 정보도 함께 반환됩니다.<br>
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
</details>

### app > api > users > [id] > posts > route.js   
특정 사용자가 작성한 Prompt 객체들을 검색하고, 해당 사용자 정보를 함께 가져와 JSON 형식으로 응답하는 GET 엔드포인트를 정의하고 있습니다.
<details>

<summary>Code Explanation</summary>

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
- Prompt.find({ creator: params.id })를 호출하여 특정 사용자(creator)가 작성한 Prompt 객체들을 검색하고, populate('creator')를 사용하여 해당 사용자   객체를 함께 가져옵니다. 이렇게 함으로써 사용자 정보도 함께 반환됩니다.<br>
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
</details>

### app > create-prompt > page.jsx 
Next.js에서 사용되는 React 컴포넌트로, 사용자가 입력한 정보를 사용하여 API에 새로운 프롬프트를 생성하는 역할을 합니다.
<details>

<summary>Code Explanation</summary>

<details>

<summary>1. Import 문</summary>
- 'use client';: Next.js에서 클라이언트 사이드 코드임을 나타내는 지시문입니다.<br> 
-  useState, useSession, useRouter 훅을 React에서 가져옵니다.<br> 
-  Form 컴포넌트를 가져와서 사용합니다.<br>

```js
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import Form from '@components/Form';
```
</details>

<details>

<summary>2. CreatePrompt 함수형 컴포넌트</summary>
- useRouter를 이용하여 현재 라우터 정보를 가져오고, useSession을 사용하여 현재 세션 정보를 가져옵니다<br> 
- submitting과 setIsSubmitting 상태를 통해 폼 제출 중인지 여부를 추적합니다.<br> 
- post와 setPost 상태를 사용하여 사용자의 입력을 추적합니다.<br>

```js
const CreatePrompt = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const [submitting, setIsSubmitting] = useState(false);
  const [post, setPost] = useState({ prompt: '', tag: '' });
```
</details>

<details>

<summary>3. createPrompt 함수</summary>
- createPrompt 함수는 폼 제출 시 호출되며, 폼 제출을 방지하고 제출 상태를 설정합니다.<br> 
- fetch 함수를 사용하여 API 엔드포인트(/api/prompt/new)로 POST 요청을 보냅니다.<br> 
- 요청 본문에는 prompt, userId, tag 정보를 JSON 형식으로 전송합니다.<br>
- 성공적인 응답이 오면 루터를 사용하여 홈페이지(/)로 이동합니다.<br>
- 에러가 발생하면 콘솔에 에러를 출력합니다.<br>
- finally 블록에서 setIsSubmitting(false)를 호출하여 제출 상태를 초기화합니다.<br>

```js
const createPrompt = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);

  try {
    const response = await fetch('/api/prompt/new', {
      method: 'POST',
      body: JSON.stringify({
        prompt: post.prompt,
        userId: session?.user.id,
        tag: post.tag,
      }),
    });

    if (response.ok) {
      router.push('/');
    }
  } catch (error) {
    console.log(error);
  } finally {
    setIsSubmitting(false);
  }
};
```
</details>

<details>

<summary>4. return 문</summary>
- Form 컴포넌트에 속성을 전달하여 폼을 렌더링합니다. type은 "Create"로, 사용자 입력과 제출 상태 및 제출 핸들러도 전달됩니다.<br> 

```js
return <Form type="Create" post={post} setPost={setPost} submitting={submitting} handleSubmit={createPrompt} />;
```
</details>

<details>

<summary>5. export 문</summary>
- CreatePrompt 컴포넌트를 기본 내보내기로 설정합니다.<br> 

```js
export default CreatePrompt;
```
</details>
</details>

### app > profile > page.jsx 
현재 로그인한 사용자의 프로필 페이지를 나타내며, 사용자가 작성한 프롬프트를 불러와 보여주고, 수정 및 삭제 기능을 제공합니다.
<details>

<summary>Code Explanation</summary>

<details>

<summary>1. Import 문</summary>
- 'use client';: Next.js에서 클라이언트 사이드 코드임을 나타내는 지시문입니다.<br> 
- useSession, useEffect, useState 훅을 React에서 가져옵니다.<br> 
- Profile 컴포넌트를 가져와서 사용합니다.<br>

```js
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import Profile from '@components/Profile';
```
</details>

<details>

<summary>2. MyProfile 함수형 컴포넌트</summary>
- useRouter를 이용하여 현재 라우터 정보를 가져오고, useSession을 사용하여 현재 세션 정보를 가져옵니다.<br> 
- myPosts와 setMyPosts 상태를 사용하여 현재 사용자가 작성한 프롬프트를 추적합니다.<br> 

```js
const MyProfile = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const [myPosts, setMyPosts] = useState([]);
```
</details>

<details>

<summary>3. useEffect를 이용한 데이터 로딩</summary>
- 컴포넌트가 마운트될 때와 session?.user.id가 변경될 때마다 실행되는 useEffect를 사용하여 사용자가 작성한 프롬프트를 불러옵니다.<br> 
- API 엔드포인트(/api/users/${session?.user.id}/posts)로 GET 요청을 보내고, 응답 데이터를 setMyPosts를 통해 업데이트합니다.<br> 

```js
useEffect(() => {
  const fetchPosts = async () => {
    const response = await fetch(`/api/users/${session?.user.id}/posts`);
    const data = await response.json();

    setMyPosts(data);
  };

  if (session?.user.id) fetchPosts();
}, [session?.user.id]);
```
</details>

<details>

<summary>4. 수정 및 삭제 핸들러 함수</summary>
- handleEdit 함수는 특정 프롬프트의 수정 버튼이 클릭될 때 호출되며, 해당 프롬프트의 ID를 사용하여 수정 페이지로 이동합니다.<br> 
- handleDelete 함수는 특정 프롬프트의 삭제 버튼이 클릭될 때 호출되며, 사용자에게 삭제 확인 메시지를 표시한 후 확인되면 API를 통해 해당 프롬프트를 삭제하고, 프롬프트 목록에서 해당 항목을 제거합니다.<br> 

```js
const handleEdit = (post) => {
  router.push(`/update-prompt?id=${post._id}`);
};

const handleDelete = async (post) => {
  const hasConfirmed = confirm('Are you sure you want to delete this prompt?');

  if (hasConfirmed) {
    try {
      await fetch(`/api/prompt/${post._id.toString()}`, {
        method: 'DELETE',
      });

      const filteredPosts = myPosts.filter((item) => item._id !== post._id);

      setMyPosts(filteredPosts);
    } catch (error) {
      console.log(error);
    }
  }
};
```
</details>

<details>

<summary>5. Profile 컴포넌트 렌더링</summary>
- Profile 컴포넌트를 렌더링하고, 해당 컴포넌트에 사용자의 이름, 소개, 사용자가 작성한 프롬프트 데이터, 그리고 수정 및 삭제 핸들러 함수들을 전달합니다.<br> 

```js
return (
  <Profile
    name="My"
    desc="Welcome to your personalized profile page. Share your exceptional prompts and inspire others with the power of your imagination"
    data={myPosts}
    handleEdit={handleEdit}
    handleDelete={handleDelete}
  />
);
```
</details>

<details>

<summary>6. export 문</summary>
- MyProfile 컴포넌트를 기본 내보내기로 설정합니다.<br> 

```js
export default MyProfile;
);
```
</details>
</details>

### app > update-prompt > page.jsx

<details>

<summary>Code Explanation</summary>

<details>

<summary>1. 라이브러리 및 훅 가져오기</summary>
- useEffect와 useState는 React 훅으로, 컴포넌트에서 부작용 및 상태를 다루는 데 사용됩니다.<br> 
- useRouter와 useSearchParams는 Next.js의 훅으로, 브라우저의 URL 및 쿼리 매개변수와 상호 작용하기 위해 사용됩니다.<br> 
- Form은 다른 컴포넌트로부터 가져온 것으로 보이며, 폼을 렌더링하고 관리하는 데 사용됩니다.<br>

```js
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Form from '@components/Form';
```
</details>

<details>

<summary>2. UpdatePrompt 컴포넌트 정의</summary>
- UpdatePrompt는 함수형 컴포넌트를 정의합니다.<br> 

```js
const UpdatePrompt = () => {
```
</details>

<details>

<summary>3. Router 및 URL 매개변수 설정</summary>
- useRouter를 사용하여 Next.js의 라우터 객체를 가져오고, useSearchParams를 사용하여 현재 URL의 쿼리 매개변수를 가져옵니다.<br> 
- promptId는 URL에서 'id' 매개변수의 값을 가져옵니다.<br>

```js
const router = useRouter();
const searchParams = useSearchParams();
const promptId = searchParams.get('id');{
```
</details>

<details>

<summary>4. 상태 및 부작용 관리</summary>
- post는 폼의 입력 상태를 관리합니다.<br> 
- submitting은 폼이 제출 중인지 여부를 나타냅니다.<br>

```js
const [post, setPost] = useState({ prompt: '', tag: '' });
const [submitting, setIsSubmitting] = useState(false);
```
</details>

<details>

<summary>5. 프롬프트 세부 정보 가져오기</summary>
- useEffect를 사용하여 컴포넌트가 마운트되거나 promptId가 변경될 때 실행되는 함수를 정의합니다.<br> 
- getPromptDetails 함수는 서버에서 특정 프롬프트의 세부 정보를 가져와 post 상태를 업데이트합니다.<br>

```js
useEffect(() => {
    const getPromptDetails = async () => {
      const response = await fetch(`/api/prompt/${promptId}`);
      const data = await response.json();

      setPost({
        prompt: data.prompt,
        tag: data.tag,
      });
    };

    if (promptId) getPromptDetails();
  }, [promptId]);
```
</details>

<details>

<summary>6. 프롬프트 업데이트 처리</summary>
- updatePrompt 함수는 폼 제출 시 서버에 업데이트된 프롬프트 정보를 전송합니다.<br> 
- 성공적으로 업데이트되면 홈페이지로 이동합니다.<br>

```js
  const updatePrompt = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!promptId) return alert('Missing PromptId!');

    try {
      const response = await fetch(`/api/prompt/${promptId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          prompt: post.prompt,
          tag: post.tag,
        }),
      });

      if (response.ok) {
        router.push('/');
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsSubmitting(false);
    }
  };
```
</details>

<details>

<summary>7. 폼 렌더링 및 전달</summary>
- Form 컴포넌트에 상태 및 처리 함수를 전달하여 폼을 렌더링합니다.<br> 
- 성공적으로 업데이트되면 홈페이지로 이동합니다.<br>

```js
  return <Form type="Edit" post={post} setPost={setPost} submitting={submitting} handleSubmit={updatePrompt} />;
```
</details>
</details>

### app > layout.jsx
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


