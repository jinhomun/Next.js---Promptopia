## 설치
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
```js
`npm i bcrypt mongodb mongoose next-auth`

`npm i tailwindcss`  --> apply 에러 수정하기 위해서 설치.
확장 프로그램 `Tailwind CSS IntelliSense` 설치 후 재시작.
```
</details>

## 실행
`npm run dev`

### 폴더 셋팅
components 폴더 / models 폴더 / public 폴더 삭제후 다시 생성 / styles 폴더 생성 / utils 폴더 생성 / .env파일 생성   
app 폴더 안에 있는 파일 삭제후 layout.jsx 파일, page.jsx 파일 생성.


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

