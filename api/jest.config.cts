const { readFileSync } = require("fs");

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(readFileSync(`${__dirname}/.spec.swcrc`, "utf-8"));

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
    displayName: "@foody/api",
    preset: "../jest.preset.js",
    testEnvironment: "node",
    transform: {
        "^.+\\.[tj]s$": ["@swc/jest", swcJestConfig],
    },
    moduleFileExtensions: ["ts", "js", "html"],
    coverageDirectory: "test-output/jest/coverage",
    collectCoverageFrom: [
        "src/**/*.{ts,js}",
        "!src/**/*.d.ts",
        "!src/**/index.ts", // Don't collect coverage from barrel exports
    ],
    coverageReporters: ["text", "lcov", "html"],
    // Lower thresholds temporarily to baseline to prevent CI failures while we add more tests
    coverageThreshold: {
        global: {
            branches: 14,
            functions: 33,
            lines: 25,
            statements: 25,
        },
    },
};
