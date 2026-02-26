import nextConfig from "eslint-config-next";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...nextConfig,
  {
    ignores: ["electron/", "dist7/", "out/", "scripts/"],
  },
];

export default eslintConfig;
