const Strategy = {
    ALL: 'all',
    LATEST_IN_MINOR: 'latestInMinor',
};

class ReleaseService {
    constructor(octokit, context, core) {
        this.octokit = octokit;
        this.owner = context.repo.owner;
        this.repo = context.repo.repo;
        this.core = core;
    }

    async listAllReleases() {
        const { data } = await this.octokit.rest.repos.listReleases({
            owner: this.owner,
            repo: this.repo,
        });

        return data;
    }

    async find(releases) {
        const strategy = this.core.getInput('strategy');
        if (strategy === Strategy.ALL) {
            return releases;
        }

        if (strategy === Strategy.LATEST_IN_MINOR) {
            const latestReleases = {};

            for (const release of releases) {
                const match = release.tag_name.match(/^v(\d+)\.(\d+)\.(\d+)$/);
                if (!match) continue;

                const [ , major, minor, patch ] = match;
                const key = `v${major}.${minor}`;
                const currentPatch = parseInt(patch, 10);

                if (
                    !latestReleases[key] ||
                    currentPatch > parseInt(latestReleases[key].tag_name.split('.')[2], 10)
                ) {
                    latestReleases[key] = release;
                }
            }

            return Object.values(latestReleases).sort((a, b) =>
                b.tag_name.localeCompare(a.tag_name, undefined, { numeric: true })
            );
        }

        throw new Error(`Unknown strategy: ${strategy}`);
    }

    logReleases(releases) {
        this.core.info('Releases');
        this.core.info(`Found ${releases.length} release(s):`);
        for (const release of releases) {
            this.core.info(`- ${release.tag_name} (${release.name || 'no name'})`);
        }
    }
}

module.exports = { ReleaseService };
