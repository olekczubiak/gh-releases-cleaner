import * as core from "@actions/core";
import * as github from "@actions/github";

try {
    core.info(`Hello world!`);

    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2);
    core.info(`The event payload: ${payload}`);
} catch (error) {
    core.setFailed(error.message);
}
