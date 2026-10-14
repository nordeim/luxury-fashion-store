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
      // G-1 (session-4): TypeScript's DOM lib declares legacy browser globals
      // (window.status, window.name, window.origin, window.event, …), so a
      // bare reference to them in server code COMPILES CLEAN and explodes at
      // runtime (`ReferenceError: status is not defined`) — exactly how the
      // adminUpdateOrderAction `status` regression shipped through every
      // gate. No bare DOM globals anywhere in this codebase; import or
      // destructure explicitly.
      "no-restricted-globals": [
        "error",
        { name: "status", message: "Use a local variable — bare `status` resolves to window.status's DOM global and throws in Node (G-1, session 4)." },
        { name: "name", message: "Use a local variable — bare `name` resolves to window.name's DOM global." },
        { name: "origin", message: "Use a local variable — bare `origin` resolves to window.origin's DOM global." },
        { name: "event", message: "Use a parameter — bare `event` resolves to window.event's DOM global." },
        { name: "close", message: "Bind explicitly — bare `close` resolves to window.close's DOM global." },
      ],
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
