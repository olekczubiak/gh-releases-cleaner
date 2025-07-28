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

    async find(strategy) {
        const releases = await this.listAllReleases();

        this.log(`🔍 Using strategy: ${strategy}`);
        this.log(`📦 Total releases fetched: ${releases.length}`);

        if (strategy === Strategy.ALL) {
            this.log('📋 Returning all releases');
            return releases;
        }

        if (strategy === Strategy.LATEST_IN_MINOR) {
            const latestReleases = {};

            for (const release of releases) {
                this.log(`🔎 Processing: ${release.tag_name}`);
                const match = release.tag_name.match(/^v(\d+)\.(\d+)\.(\d+)$/);
                if (!match) {
                    this.log(`⚠️ Skipping invalid tag format: ${release.tag_name}`);
                    continue;
                }

                const [, major, minor, patch] = match;
                const key = `v${major}.${minor}`;
                const currentPatch = parseInt(patch, 10);
                const existing = latestReleases[key];

                if (!existing || currentPatch > parseInt(existing.tag_name.split('.')[2], 10)) {
                    this.log(`✅ Updating latest for ${key}: ${release.tag_name}`);
                    latestReleases[key] = release;
                } else {
                    this.log(`↩️ Keeping existing ${existing.tag_name} over ${release.tag_name}`);
                }
            }

            const result = Object.values(latestReleases).sort((a, b) =>
                b.tag_name.localeCompare(a.tag_name, undefined, { numeric: true })
            );

            this.log(`🎯 Returning ${result.length} latest releases (by minor group)`);
            return result;
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
