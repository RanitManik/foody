/**
 * @type {import('semantic-release').GlobalConfig}
 */
module.exports = {
    branches: ["release"],
    plugins: [
        "@semantic-release/release-notes-generator",
        [
            "@semantic-release/changelog",
            {
                changelogFile: "CHANGELOG.md",
            },
        ],
        [
            "@semantic-release/npm",
            {
                npmPublish: false,
            },
        ],
        [
            "@semantic-release/git",
            {
                assets: ["CHANGELOG.md", "package.json"],
                message: "chore(release): ${nextRelease.version} [skip ci]",
            },
        ],
        [
            "@semantic-release/github",
            {
                assets: [],
            },
        ],
    ],
};
