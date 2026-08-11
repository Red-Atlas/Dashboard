// Next 16 removed `next lint`; linting now runs through the ESLint CLI.
// eslint-config-next ships native flat config, so it's imported directly
// rather than through the FlatCompat shim.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      // Unmodified shadcn/ui primitives — generated code, not ours to lint.
      "components/ui/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // The dashboard reads loosely-typed upstream JSON in places; warn rather
      // than fail the lint run.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      /*
       * New in Next 16's React Compiler-aware rules. Every screen here uses the
       * long-standing "setLoading(true) then fetch" pattern inside an effect,
       * which trips this rule without being a real defect. Kept as a warning so
       * the signal stays visible for new code instead of being switched off.
       */
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];
