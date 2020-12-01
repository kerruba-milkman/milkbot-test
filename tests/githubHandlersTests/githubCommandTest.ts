import * as chai from 'chai'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import {buildCommand} from "../../eventHandlers/github/commands/buildCommand";
import {QueueMessage} from "../../interfaces/MessageInterfaces";
import * as buildUtils from "../../utils/codeBuildUtils";
import {BuildError} from "../../utils/codeBuildUtils";
import * as sqsUtils from "../../utils/sqsUtils"
import * as githubUtils from "../../utils/githubUtils"
import * as messageUtils from "../../utils/messageUtils"
import {Config} from "../../config";
import {createQueueMessageFromJSON} from "../utils";

const expect = chai.expect

chai.use(sinonChai);
let queueMessage: QueueMessage;

describe('Github Commands', () => {
    beforeEach(async () => {
        queueMessage = await createQueueMessageFromJSON('./tests/resources/githubEvents/issue_comment_create_valid_build_command.json')
    })

    afterEach(() => {
        sinon.restore()
    })

    it(`Build command should warn and write a comment if repo is not part of CI projects`, async () => {

        let spy = sinon.spy(buildUtils.AwsBuild.prototype, "startBuild")
        let warnLog = sinon.spy(Config.logger, "warn")
        const createComment = sinon.stub()
        const client = sinon.stub()
        client["issues"] = {
            createComment
        }
        queueMessage.parsedIncomingMessage = {
            issue: {
                number: 5
            },
            repository: {
                name: "repo-not-in-ci",
                owner: {
                    login: "something"
                }
            }
        }

        await buildCommand(queueMessage, client)
        expect(spy).to.not.have.been.called
        expect(warnLog).to.have.been.calledOnceWith("Command issued on not supported project")

        let args = client["issues"].createComment.getCall(0).args[0];
        expect(args.issue_number).to.be.equal(5)
        expect(args.body).to.be.equal(":warning: This project is not yet covered by Continuous Integration. Please contact DevOps team for details :warning:")
    })

    it(`should throw if pr doesn't exist`, async () => {

        let spy = sinon.spy(buildUtils.AwsBuild.prototype, "startBuild")
        let client = sinon.stub()
        client["pulls"] = {
            get: () => {
                throw Error("Invalid pr")
            }
        }

        await buildCommand(queueMessage, client)
        expect(spy).to.not.have.been.called
    })

    it('Should create a failure commit status due to failed build', async () => {
        const spy = sinon.stub(buildUtils.AwsBuild.prototype, "startBuild").throws(new BuildError("Something went wrong"))
        sinon.stub(sqsUtils, 'addMessageToQueue').resolves()
        let pendingStatusSpy = sinon.stub(githubUtils, 'createPendingCommitStatus').resolves()
        let failureStatusSpy = sinon.stub(githubUtils, 'createFailedCommitStatus').resolves()

        const get = sinon.stub()
        get.returns({
            data: {
                head: {
                    sha: 'my-sha'
                }

            }
        })
        const createComment = sinon.stub()
        const client = sinon.stub()
        client["pulls"] = {
            get
        }
        client["issues"] = {
            createComment
        }

        await buildCommand(queueMessage, client)
        expect(spy).to.throw
        expect(pendingStatusSpy).not.to.have.been.called
        expect(failureStatusSpy).to.have.been.calledOnce

        let args = failureStatusSpy.getCall(0).args;
        expect(args[0].commitHash).to.be.equal('my-sha')
        expect(args[1]).to.be.undefined
    })

    it('Should create a pending commit status when build start and add a check-build-status message to the queue', async () => {
        sinon.stub(buildUtils.AwsBuild.prototype, "startBuild").resolves({
            buildLink: "my-codebuild-link",
            status: "my-status"
        })
        sinon.stub(buildUtils.AwsBuild.prototype, "getBuildId").returns("my-build-id")
        let createValidMessageSpy = sinon.spy(messageUtils, 'createValidQueueMessage')
        let addMessageSpy = sinon.stub(sqsUtils, 'addMessageToQueue').resolves()
        let pendingStatusSpy = sinon.stub(githubUtils, 'createPendingCommitStatus').resolves()
        let failedStatusSpy = sinon.stub(githubUtils, 'createFailedCommitStatus').resolves()

        const get = sinon.stub()
        get.returns({
            data: {
                head: {
                    sha: 'my-sha'
                }

            }
        })
        const createCommitStatus = sinon.spy()
        const createComment = sinon.stub()
        const client = sinon.stub()
        client["pulls"] = {
            get
        }
        client["repos"] = {
            createCommitStatus
        }
        client["issues"] = {
            createComment
        }

        await buildCommand(queueMessage, client)
        expect(pendingStatusSpy).to.have.been.calledOnce
        expect(addMessageSpy).to.have.been.calledOnce
        expect(failedStatusSpy).not.to.have.been.called

        let pendingStatusArgs = pendingStatusSpy.getCall(0).args
        expect(pendingStatusArgs[0].commitHash).to.be.equal('my-sha')
        expect(pendingStatusArgs[1]).to.be.equal('my-codebuild-link')

        let createMessageArgs = createValidMessageSpy.getCall(0).args
        expect(createMessageArgs[0]).to.be.deep.equal({
            action: 'check-build-status',
            github: {
                repoOwner: 'milkman-deliveries',
                repoName: 'playground',
                commitHash: 'my-sha'
            },
            build: {
                buildId: 'my-build-id',
                projectName: 'playground'
            }
        })
    })
})
