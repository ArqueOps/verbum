import { createRequire } from "module";

const require = createRequire(import.meta.url);
const nextConfig = require("eslint-config-next");
const coreWebVitalsConfig = require("eslint-config-next/core-web-vitals");
const typescriptConfig = require("eslint-config-next/typescript");

const eslintConfig = [
  ...nextConfig,
  ...coreWebVitalsConfig,
  ...typescriptConfig,
];

export default eslintConfig;
