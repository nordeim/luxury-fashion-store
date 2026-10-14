import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Product/hero art comes from the reference's Unsplash CDN URLs —
      // plain <img> is deliberate (unoptimized pipeline, no sharp dep).
      "@next/next/no-img-element": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "skills/**",
      "docs/**",
      "db/**",
      "tests/e2e/.auth/**",
    ],
  },
];

export default eslintConfig;
