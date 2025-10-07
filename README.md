## 로컬에만 API Key 저장하는 Node.js 예제

이 예제는 `.env` 에 API Key 를 저장하고, `.gitignore` 로 GitHub 에는 노출되지 않도록 하는 최소 예제입니다.

### 1) 요구 사항
- Node.js 18+

### 2) 설치
```bash
npm install
```

### 3) 환경 변수 설정 (.env)
`.env.example` 를 참고해 프로젝트 루트에 `.env` 파일을 만듭니다.
```bash
cp .env.example .env   # Windows PowerShell: Copy-Item .env.example .env
```
`.env` 에 실제 키를 입력하세요.
```
API_KEY=your_real_api_key
```

> `.env` 파일은 `.gitignore` 에 의해 Git 에 커밋되지 않습니다.

### 4) 실행
```bash
npm start
```
출력 예시:
```
API 키가 로드되었습니다: ab**********yz
이 키를 사용하여 외부 API 요청을 보낼 수 있습니다. (데모용 출력)
```

### 5) 보안 팁
- 실제 키는 `.env` 처럼 로컬 전용 파일에만 저장하세요.
- 리포지토리에는 절대 비밀값을 커밋하지 말고, 대신 `.env.example` 처럼 키 이름만 보여주세요.
- CI/CD 나 클라우드 환경에서는 각 환경의 Secret Manager(예: GitHub Actions Secrets, AWS Secrets Manager 등)를 사용하세요.

### 6) 동작 원리
- `dotenv` 가 `.env` 파일을 읽어 `process.env` 에 변수를 주입합니다.
- `index.js` 는 `process.env.API_KEY` 를 읽어 사용합니다.

