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
    coverageDirectory: "../../coverage/web",
    collectCoverageFrom: ["src/**/*.{ts,tsx,js,jsx}", "!src/**/*.d.ts", "!src/**/index.ts"],
    coverageReporters: ["text", "lcov", "html"],
    testEnvironment: "jsdom",
};

module.exports = createJestConfig(config);
