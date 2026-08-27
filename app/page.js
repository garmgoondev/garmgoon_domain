const projects = [
  { number: "01", name: "Automation Lab", description: "반복되는 일을 덜어내는 개인 자동화 워크플로와 실험들.", href: "https://n8n.garmgoon.com", status: "운영 중", tone: "lime" },
  { number: "02", name: "Home Console", description: "집의 환경과 기기들을 한눈에 보고 연결하는 홈 대시보드.", href: "https://ha.garmgoon.com", status: "운영 중", tone: "blue" },
  { number: "03", name: "Next Small Thing", description: "쓸모 있는 작은 아이디어를 다음 서비스로 만드는 중입니다.", status: "준비 중", tone: "orange" },
];

const logs = [
  { date: "2026.08", tag: "BUILD", title: "새로운 집을 만들었습니다", copy: "서비스와 기록이 흩어지지 않도록 garmgoon.com을 열었습니다." },
  { date: "NOW", tag: "WORK", title: "자동화를 생활의 도구로", copy: "매일 반복되는 작은 불편을 발견하고 연결하는 작업을 계속합니다." },
  { date: "NEXT", tag: "IDEA", title: "다음 프로젝트를 찾는 중", copy: "완벽한 계획보다 빠른 프로토타입으로 가능성을 확인합니다." },
];

const Arrow = () => <span aria-hidden="true">↗</span>;

export default function Home() {
  return (
    <main>
      <nav className="nav wrap">
        <a className="brand" href="#top" aria-label="Garmgoon 홈">G<span>/</span>G</a>
        <div className="navLinks"><a href="#projects">Projects</a><a href="#log">Log</a><a href="mailto:hello@garmgoon.com">Contact</a></div>
      </nav>

      <header className="hero wrap" id="top">
        <div className="eyebrow"><i /> BUILDING IN PUBLIC · DENVER / SEOUL</div>
        <h1>작게 만들고,<br /><em>꾸준히 운영합니다.</em></h1>
        <div className="heroBottom">
          <p>아이디어를 실제 서비스로 만들고,<br />직접 운영하며 배운 것을 기록합니다.</p>
          <a className="circleLink" href="#projects" aria-label="프로젝트 보기">↓</a>
        </div>
      </header>

      <section className="marquee" aria-label="소개 문구"><div>DESIGN · CODE · AUTOMATE · SHIP · LEARN · REPEAT · DESIGN · CODE · AUTOMATE · SHIP · LEARN · REPEAT ·&nbsp;</div></section>

      <section className="section wrap" id="projects">
        <div className="sectionHead"><p>SELECTED PROJECTS</p><span>01 — 03</span></div>
        <div className="projectGrid">
          {projects.map((project) => {
            const Tag = project.href ? "a" : "article";
            return (
              <Tag className={`projectCard ${project.tone}`} href={project.href} target={project.href ? "_blank" : undefined} rel={project.href ? "noreferrer" : undefined} key={project.name}>
                <div className="projectTop"><span>{project.number}</span><b>{project.status}</b></div>
                <div className="projectMark">{project.name.charAt(0)}</div>
                <div><h2>{project.name} {project.href && <Arrow />}</h2><p>{project.description}</p></div>
              </Tag>
            );
          })}
        </div>
      </section>

      <section className="section logSection" id="log">
        <div className="wrap">
          <div className="sectionHead light"><p>FIELD NOTES</p><span>MAKING / LEARNING / LIVING</span></div>
          <div className="logIntro"><h2>만드는 과정도<br /><em>결과만큼 중요하니까.</em></h2><p>완성된 서비스뿐 아니라 시행착오, 생각의 변화,<br />일상의 작은 발견까지 남깁니다.</p></div>
          <div className="logList">
            {logs.map((log) => <article className="logItem" key={log.date}><span>{log.date}</span><b>{log.tag}</b><h3>{log.title}</h3><p>{log.copy}</p></article>)}
          </div>
        </div>
      </section>

      <footer className="footer wrap">
        <div><p>새로운 아이디어와<br />재미있는 협업은 언제나 환영합니다.</p><a href="mailto:hello@garmgoon.com">LET&apos;S TALK <Arrow /></a></div>
        <div className="footerMeta"><span>© 2026 GARMGOON</span><span>MADE WITH CURIOSITY</span></div>
      </footer>
    </main>
  );
}
