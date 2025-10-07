import 'dotenv/config';

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error(
    'API_KEY가 설정되지 않았습니다. 프로젝트 루트에 .env 파일을 만들고 API_KEY=your_key 값을 추가하세요.'
  );
  process.exit(1);
}

const maskApiKey = (key) => {
  if (!key) return '';
  if (key.length <= 4) return '*'.repeat(key.length);
  return key.slice(0, 2) + '*'.repeat(Math.max(0, key.length - 4)) + key.slice(-2);
};

console.log(`API 키가 로드되었습니다: ${maskApiKey(apiKey)}`);
console.log('이 키를 사용하여 외부 API 요청을 보낼 수 있습니다. (데모용 출력)');

// 실제로는 fetch/axios 등을 사용해 요청을 보낼 수 있습니다.
// 예: await fetch('https://api.example.com/data', { headers: { 'Authorization': `Bearer ${apiKey}` } })

