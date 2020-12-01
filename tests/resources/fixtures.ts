import {AssumeRoleResponse} from "aws-sdk/clients/sts";

export const assumeRoleFakeCredentials: AssumeRoleResponse = {
    Credentials: {
        AccessKeyId: 'xxx',
        SessionToken: 'yyy',
        SecretAccessKey: 'zzz',
        Expiration: new Date()
    }
}

export function getSlackEventFilePath(name) {
    return `./tests/resources/slackEvents/${name}.json`
}

export function getGithubSupportEventFilePath(name) {
    return `./tests/resources/githubSupportEvents/${name}.json`
}

export function getGithubEventFilePath(name) {
    return `./tests/resources/githubEvents/${name}.json`
}
