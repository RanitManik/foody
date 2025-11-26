const nextJest = require("next/jest.js");

const createJestConfig = nextJest({
    dir: "./",
});

const config = {
    displayName: "@foody/web",
    preset: "../jest.preset.js",
    transform: {
        "^(?!.*\\.(js|jsx|ts|tsx|css|json)$)": "@nx/react/plugins/jest",
    },
    moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
    // Use NX convention for per-project coverage artifacts under project root
    coverageDirectory: "test-output/jest/coverage",
    collectCoverageFrom: [
        "src/**/*.{ts,tsx,js,jsx}",
        "specs/**/*.{ts,tsx,js,jsx}",
        "!src/**/*.d.ts",
        "!src/**/index.ts",
        "!specs/**/*.d.ts",
    ],
    coverageReporters: ["text", "lcov", "html"],
    testEnvironment: "jsdom",
    testMatch: [
        "<rootDir>/src/**/__tests__/**/*.(js|jsx|ts|tsx)",
        "<rootDir>/src/**/*.(test|spec).(js|jsx|ts|tsx)",
        "<rootDir>/specs/**/*.(test|spec).(js|jsx|ts|tsx)",
    ],
};

module.exports = createJestConfig(config);
