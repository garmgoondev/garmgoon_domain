// Next.js 정적 빌드는 프리페치 파일을 out/youtube/__next.youtube/__PAGE__.txt 에 쓰지만,
// 브라우저는 /youtube/__next.youtube.__PAGE__.txt 로 요청한다. 요청 경로에 맞는 사본을 만든다.
import { copyFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";

let copied = 0;

function filesIn(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? filesIn(full) : [full];
  });
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name === "_next" || !statSync(full).isDirectory()) continue;
    if (!name.startsWith("__next.")) {
      walk(full);
      continue;
    }
    for (const file of filesIn(full)) {
      const flat = `${basename(full)}.${relative(full, file).split(sep).join(".")}`;
      copyFileSync(file, join(dirname(full), flat));
      copied++;
    }
  }
}

walk("out");
console.log(`fix-export: 프리페치 파일 ${copied}개 복사`);
