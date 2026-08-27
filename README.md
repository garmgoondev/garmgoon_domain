# Garmgoon

`garmgoon.com`에서 운영되는 개인 서비스 포트폴리오이자 빌드 로그입니다.

## Local development

```bash
npm install
npm run dev
```

프로덕션 정적 빌드는 `npm run build`, Cloudflare 로컬 미리보기는 `npm run preview`로 실행합니다. `main` 브랜치에 push하면 GitHub Actions가 빌드 후 Cloudflare Workers에 자동 배포합니다.

GitHub 저장소에는 다음 Actions secrets가 필요합니다.

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
