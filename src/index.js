const core = require('@actions/core');
const github = require('@actions/github');

const { ReleaseService } = require('./ReleaseService');

async function run(releaseService) {
    try {
        const releases = await releaseService.listAllReleases();
        const releasesToKeep = await releaseService.find(releases);
        releaseService.logReleasesToDelete(releaseService.getToDelete(releases, releasesToKeep));
        releaseService.logReleasesToKeep(releasesToKeep);
    } catch (err) {
        releaseService.core.setFailed(`❌ ${err.message}`);
    }
}

async function main() {
    const token = core.getInput('token');
    const octokit = github.getOctokit(token);
    const context = github.context;

    const releaseService = new ReleaseService(octokit, context, core);

    await run(releaseService);
}

main();
