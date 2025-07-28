class ReleaseService {
    constructor(octokit, context, logger) {
        this.octokit = octokit;
        this.owner = context.repo.owner;
        this.repo = context.repo.repo;
        this.logger = logger;
    }

    async listAllReleases() {
        const { data } = await this.octokit.rest.repos.listReleases({
            owner: this.owner,
            repo: this.repo,
        });

        return data;
    }

    logReleases(releases) {
        this.logger.info(`Found ${releases.length} release(s):`);
        for (const release of releases) {
            this.logger.info(`- ${release.tag_name} (${release.name || 'no name'})`);
        }
    }
}

module.exports = { ReleaseService };
