const Strategy = {
    ALL: 'all',
    LATEST_IN_MINOR: 'latestInMinor',
    LAST_X_IN_MINOR: 'last\\dInMinor',
    RELEASES_WITHOUT_MATCH_SEMVER: 'releasesThatNotMatchSemver',
    RELEASES_WITHOUT_ARTIFACTS: 'releasesThatNotHaveArtifacts',
};

class ReleaseService {
    constructor(octokit, context, core) {
        this.octokit = octokit;
        this.owner = context.repo.owner;
        this.repo = context.repo.repo;
        this.core = core;
    }

    async listAllReleases() {
        const releases = [];
        let page = 1;

        while (true) {
            const { data } = await this.octokit.rest.repos.listReleases({
                owner: this.owner,
                repo: this.repo,
                per_page: 100,
                page,
            });

            if (data.length === 0) break;

            releases.push(...data);
            page++;
        }

        return releases;
    }

    async find(releases) {
        const strategy = this.core.getInput('strategy') || Strategy.ALL;
        this.core.info(`🔍 Finding releases using strategy: ${strategy}`);
        this.core.info(`📦 Total releases fetched: ${releases.length}`);

        if (strategy === Strategy.ALL) {
            this.core.info('📋 Returning all releases');
            return releases;
        }

        if (new RegExp(Strategy.LAST_X_IN_MINOR).test(strategy)) {
            const match = strategy.match(/last(\d+)InMinor/);
            if (!match) {
                throw new Error(`Invalid strategy format: ${strategy}`);
            }
            const count = parseInt(match[1], 10);
            this.core.info(`🔢 Keeping last ${count} releases in each minor version`)
            const latestReleases = {};
            for (const release of releases) {
                this.core.info(`🔎 Processing: ${release.tag_name}`)
                const match = release.tag_name.match(/^v(\d+)\.(\d+)\.(\d+)$/);
                if (!match) {
                    this.core.info(`⚠️ Skipping invalid tag format: ${release.tag_name}`);
                    continue;
                }
                const [, major, minor, patch] = match;
                const key = `v${major}.${minor}`;
                const currentPatch = parseInt(patch, 10);
                if (!latestReleases[key]) {
                    latestReleases[key] = [];
                }
                latestReleases[key].push(release);
                latestReleases[key].sort((a, b) => {
                    const aPatch = parseInt(a.tag_name.split('.')[2], 10);
                    const bPatch = parseInt(b.tag_name.split('.')[2], 10);
                    return bPatch - aPatch; // Sort descending by patch version
                });
                if (latestReleases[key].length > count) {
                    latestReleases[key].pop(); // Keep only the last 'count' releases
                }
            }
            const result = Object.values(latestReleases).flat();
            this.core.info(`🎯 Returning ${result.length} latest releases (by minor group
                return result;)`);
            return result;
        }

        if (strategy === Strategy.LATEST_IN_MINOR) {
            const latestReleases = {};

            for (const release of releases) {
                this.core.info(`🔎 Processing: ${release.tag_name}`);
                const match = release.tag_name.match(/^v(\d+)\.(\d+)\.(\d+)$/);
                if (!match) {
                    this.core.info(`⚠️ Skipping invalid tag format: ${release.tag_name}`);
                    continue;
                }

                const [, major, minor, patch] = match;
                const key = `v${major}.${minor}`;
                const currentPatch = parseInt(patch, 10);
                const existing = latestReleases[key];

                if (!existing || currentPatch > parseInt(existing.tag_name.split('.')[2], 10)) {
                    this.core.info(`✅ Updating latest for ${key}: ${release.tag_name}`);
                    latestReleases[key] = release;
                } else {
                    this.core.info(`↩️ Keeping existing ${existing.tag_name} over ${release.tag_name}`);
                }
            }

            const result = Object.values(latestReleases).sort((a, b) =>
                b.tag_name.localeCompare(a.tag_name, undefined, { numeric: true })
            );

            this.core.info(`🎯 Returning ${result.length} latest releases (by minor group)`);
            return result;
        }

        if (strategy === Strategy.RELEASES_WITHOUT_MATCH_SEMVER) {
            const semverRegex = /^v\d\d?\.\d+\.\d+$/;
            const result = releases.filter(release => !semverRegex.test(release.tag_name));
            this.core.info(`🎯 Returning ${result.length} releases that do not match semver`);
            return result;
        }

        throw new Error(`Unknown strategy: ${strategy}`);
    }

    getToDelete(allReleases, releasesToKeep) {
        this.core.info(`📉 Releases to delete: ${allReleases.length - releasesToKeep.length}`);
        return allReleases.filter(release => !releasesToKeep.includes(release));
    }

    logReleasesToDelete(releases) {
        this.core.info(`Found ${releases.length} release(s) to delete:`);
        for (const release of releases) {
            this.core.info(`- ${release.tag_name} (${release.name || 'no name'})`);
        }
    }

    logReleasesToKeep(releases) {
        this.core.info(`Keeping ${releases.length} release(s):`);
        for (const release of releases) {
            this.core.info(`- ${release.tag_name} (${release.name || 'no name'})`);
        }
    }
}

module.exports = { ReleaseService };
