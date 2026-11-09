import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ESLint 9 (flat config)。Next 16 で `next lint` が廃止されたため、eslint を直接実行する (npm run lint)。
// eslint-plugin-react / import / jsx-a11y が ESLint 10 に未対応なので、eslint は 9 系に固定している。
// 対象は tsc と同じ src/ と tests/ (tsconfig.json の include)。
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // @praha/drizzle-factory の resolver が渡す `use` (他ファクトリの参照) は React Hook ではない。
    // 名前が `use` なので react-hooks/rules-of-hooks が誤検知する。
    files: ["tests/factories/**"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "next-env.d.ts",
    "repomix-output.xml",
  ]),
]);

export default eslintConfig;
