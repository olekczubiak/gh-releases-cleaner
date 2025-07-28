const core = require('@actions/core');
const github = require('@actions/github');

const { ReleaseService } = require('./ReleaseService');

async function run(releaseService) {
    try {
        const releases = await releaseService.listAllReleases();
        releaseService.logReleases(releaseService.find(releases, "latestInMinor"));
    } catch (err) {
        releaseService.logger.setFailed(`❌ ${err.message}`);
    }
}

async function main() {
    const token = core.getInput('token');
    // const strategy = core.getInput('strategy');
    const octokit = github.getOctokit(token);
    const context = github.context;

    const releaseService = new ReleaseService(octokit, context, core);

    await run(releaseService);
}

main();
