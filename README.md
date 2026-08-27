# garmgoon_domain

Cloudflare Workers에서 호스팅하는 개인 홈페이지입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

`main` 브랜치에 push하면 GitHub Actions가 자동으로 빌드 및 배포합니다.

GitHub 저장소에는 다음 Actions secrets가 필요합니다.

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
