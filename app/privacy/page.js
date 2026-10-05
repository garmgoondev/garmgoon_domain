export const metadata = {
  title: "개인정보처리방침 · garmgoon",
  description: "garmgoon.com과 OpenSEO(seo.garmgoon.com)의 개인정보처리방침",
};

const section = { marginTop: 28 };
const heading = { fontSize: "var(--fs-xl)", fontWeight: 700, marginBottom: 8 };
const body = { fontSize: "var(--fs-base)", lineHeight: 1.7, color: "var(--text)" };
const list = { ...body, paddingLeft: 20, margin: "8px 0" };

export default function PrivacyPage() {
  return (
    <article style={{ maxWidth: 720, margin: "24px auto 64px", padding: "0 16px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>개인정보처리방침</h1>
      <p style={{ fontSize: "var(--fs-sm)", color: "var(--text-2)" }}>시행일: 2026년 10월 5일</p>

      <p style={{ ...body, marginTop: 20 }}>
        이 방침은 garmgoon.com과, 운영자 본인이 사용하는 SEO 분석 도구 OpenSEO(seo.garmgoon.com, 이하
        &ldquo;서비스&rdquo;)가 Google 계정 데이터를 어떻게 다루는지 설명합니다. 서비스는 운영자가 소유한 웹사이트를
        분석하기 위한 개인용 도구이며, 일반 사용자에게 공개되지 않습니다.
      </p>

      <section style={section}>
        <h2 style={heading}>1. 접근하는 데이터</h2>
        <p style={body}>Google 계정으로 연결할 때 다음 권한을 읽기 전용으로만 요청합니다.</p>
        <ul style={list}>
          <li>Google Search Console: 운영자 사이트의 검색 실적(클릭, 노출, 순위)과 색인 상태 조회</li>
          <li>Google Analytics: 운영자 사이트의 보고서 데이터(세션, 사용자, 유입 경로 등) 조회</li>
          <li>기본 프로필과 이메일 주소: 연결한 Google 계정을 구분하기 위한 용도</li>
        </ul>
        <p style={body}>서비스는 Google 계정의 데이터를 수정, 삭제, 게시하지 않습니다.</p>
      </section>

      <section style={section}>
        <h2 style={heading}>2. 사용 목적</h2>
        <p style={body}>
          가져온 데이터는 운영자 사이트의 검색 성과를 분석하고 개선 보고서를 만드는 데에만 사용합니다. 광고,
          프로파일링, 판매 목적으로 사용하지 않습니다.
        </p>
      </section>

      <section style={section}>
        <h2 style={heading}>3. 저장과 보안</h2>
        <ul style={list}>
          <li>Google이 발급한 인증 토큰은 암호화해 서비스 전용 Cloudflare 데이터베이스에 저장합니다.</li>
          <li>서비스는 Cloudflare Access 로그인 뒤에 있어서, 허가된 운영자 계정만 접근할 수 있습니다.</li>
          <li>
            분석 결과(운영자 사이트의 클릭·노출·세션 같은 집계 수치와 개선 제안)는 운영자의 작업 문서로 보관하며,
            운영자가 관리하는 공개 코드 저장소에 게시될 수 있습니다. 이 문서에는 방문자 개인을 식별하는 정보가
            포함되지 않습니다.
          </li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={heading}>4. 제3자 제공</h2>
        <p style={body}>
          Google 사용자 데이터를 판매하지 않고, 광고 목적으로 제공하지 않습니다. 서비스 운영을 위해 다음 업체가
          데이터를 처리합니다.
        </p>
        <ul style={list}>
          <li>Cloudflare: 서비스 호스팅, 접근 제어, 암호화된 토큰 저장</li>
          <li>Anthropic(Claude), OpenAI(Codex), Google(Antigravity): 운영자가 요청한 분석 수행</li>
          <li>GitHub: 운영자가 게시한 분석 문서(집계 수치) 저장·공개</li>
        </ul>
        <p style={body}>
          서비스가 Google API로 받은 정보의 사용과 다른 앱으로의 전송은{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" style={{ color: "inherit" }}>
            Google API 서비스 사용자 데이터 정책
          </a>
          (제한적 사용 요구사항 포함)을 따릅니다.
        </p>
      </section>

      <section style={section}>
        <h2 style={heading}>5. 보관 기간과 삭제</h2>
        <ul style={list}>
          <li>서비스에서 해당 Google 계정을 제거하면, 저장된 토큰과 그 계정을 쓰는 프로젝트 연결을 함께 삭제합니다.</li>
          <li>
            언제든{" "}
            <a href="https://myaccount.google.com/permissions" style={{ color: "inherit" }}>
              Google 계정 권한 페이지
            </a>
            에서 접근 권한을 철회할 수 있습니다.
          </li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={heading}>6. 문의</h2>
        <p style={body}>개인정보 관련 문의: garmgoondev@gmail.com</p>
      </section>

      <section style={{ ...section, paddingTop: 20, borderTop: "1px solid var(--border, #ddd)" }}>
        <h2 style={heading}>Summary (English)</h2>
        <p style={body}>
          OpenSEO (seo.garmgoon.com) is a private SEO tool used only by the site owner to analyze websites they own.
          It requests read-only access to Google Search Console and Google Analytics data, plus basic profile and
          email to identify the connected account. Data is used solely to produce SEO reports for the owner&apos;s
          sites. It is never sold and never used for advertising. Service providers that process data: Cloudflare
          (hosting, access control, encrypted token storage); Anthropic Claude, OpenAI Codex and Google Antigravity
          (analyses the owner requests); GitHub (hosting reports the owner publishes). Reports contain aggregate
          metrics for the owner&apos;s own sites (no visitor-identifying information) and may be published in the
          owner&apos;s public code repository. OAuth tokens are stored encrypted and deleted when the
          Google account is removed from the service; access can be revoked at any time at myaccount.google.com/permissions. Use of
          information received from Google APIs adheres to the Google API Services User Data Policy, including the
          Limited Use requirements. Contact: garmgoondev@gmail.com.
        </p>
      </section>
    </article>
  );
}
