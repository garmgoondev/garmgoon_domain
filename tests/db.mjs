import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";

// 모든 마이그레이션을 적용한 메모리 DB와, D1처럼 쓸 수 있는 얇은 래퍼
export function database() {
  const sqlite = new DatabaseSync(":memory:");
  const dir = new URL("../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(new URL(file, dir), "utf8"));
  }
  return { sqlite, DB: {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      const bind = (args) => ({
        bind: (...next) => bind(next),
        first: async () => statement.get(...args) || null,
        all: async () => ({ results: statement.all(...args) }),
        run: async () => statement.columns().length ? { results: statement.all(...args) } : ({ results: [], meta: { changes: Number(statement.run(...args).changes) } }),
      });
      return bind([]);
    },
    batch: (statements) => Promise.all(statements.map((s) => s.run())),
  } };
}
