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
      // destructure explicitly. H-14 (session-5): the guard is extended with
      // the other realistic accidental identifiers (title, length, top,
      // self, parent, closed) — all also DOM-lib declarations Node lacks.
      "no-restricted-globals": [
        "error",
        { name: "status", message: "Use a local variable — bare `status` resolves to window.status's DOM global and throws in Node (G-1, session 4)." },
        { name: "name", message: "Use a local variable — bare `name` resolves to window.name's DOM global." },
        { name: "origin", message: "Use a local variable — bare `origin` resolves to window.origin's DOM global." },
        { name: "event", message: "Use a parameter — bare `event` resolves to window.event's DOM global." },
        { name: "close", message: "Bind explicitly — bare `close` resolves to window.close's DOM global." },
        { name: "title", message: "Use a local variable — bare `title` resolves to window.title's DOM global." },
        { name: "length", message: "Use a local variable or .length on a value — bare `length` resolves to window.length's DOM global." },
        { name: "top", message: "Use a local variable — bare `top` resolves to window.top's DOM global." },
        { name: "self", message: "Use a local variable — bare `self` resolves to window.self's DOM global." },
        { name: "parent", message: "Use a local variable — bare `parent` resolves to window.parent's DOM global." },
        { name: "closed", message: "Use a local variable — bare `closed` resolves to window.closed's DOM global." },
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
      // Sandbox tooling (CONNECT forward proxy for headless-Chromium external
      // DNS — sessions 6–8); CommonJS by design, never committed.
      "scripts/forward-proxy.js",
      // H-70 (session-12): committed CommonJS tooling (the parity sweep
      // driver boots the standalone as a child process and requires at
      // top level AND inline). `no-require-imports` guards app source,
      // where ESM is the contract; .cjs scripts are CommonJS BY EXTENSION
      // — scope the ignore to the extension, not the whole scripts/ dir,
      // so any future ESM tooling stays linted.
      "scripts/**/*.cjs",
    ],
  },
];

export default eslintConfig;
