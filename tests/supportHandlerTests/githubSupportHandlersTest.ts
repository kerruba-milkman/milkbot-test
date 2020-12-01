import * as chai from 'chai'
import * as sinonChai from 'sinon-chai'
import {QueueMessage} from "../../interfaces/MessageInterfaces";
import * as sqsUtils from "../../utils/sqsUtils"
import * as githubUtils from "../../utils/githubUtils"
import * as supportHandlers from "../../eventHandlers/support/github/checkBuildStatusHandler"
import {createQueueMessageFromJSON} from "../utils";
import {AwsBuild, BuildError, BuildStatus, BuildStatusTimeoutError} from "../../utils/codeBuildUtils";
import {Config} from "../../config";
import sinon = require('sinon');

const expect = chai.expect
chai.use(sinonChai);

let queueMessage: QueueMessage

describe("Github Support Event Handlers", () => {
    let createCommitStatusSpy, removeMessageSpy, updateVisibilitySpy

    function testSuccessfulHandling() {
        expect(createCommitStatusSpy).to.have.been.calledOnce
        expect(removeMessageSpy).to.have.been.calledOnce
    }

    beforeEach(async () => {
        sinon.stub(AwsBuild.prototype, 'waitForNewStatus').resolves()
        createCommitStatusSpy = sinon.stub(githubUtils, 'createCommitStatusForBuild').resolves()
        removeMessageSpy = sinon.stub(sqsUtils, 'removeMessageFromQueue').resolves()
        updateVisibilitySpy = sinon.stub(sqsUtils, 'updateMessageVisibility')
        queueMessage = await createQueueMessageFromJSON('./tests/resources/githubSupportEvents/check-build-status.json')
    })

    afterEach(() => {
        sinon.restore()
    })

    it("Should not wait for check to be completed", async () => {
        sinon.stub(AwsBuild.prototype, 'getBuildStatus').resolves("IN_PROGRESS")
        updateVisibilitySpy.rejects(new Error("An SQS error"))

        let outcome = await supportHandlers.checkBuildStatusHandler(queueMessage)
        expect(outcome.preserveMessage).to.be.equal(true)
    })

    it("Should not change message visibility if build is already completed", async () => {
        sinon.stub(AwsBuild.prototype, 'isCompleted').resolves(true)

        await supportHandlers.checkContinuousIntegrationBuildStatus(queueMessage)
        expect(updateVisibilitySpy).not.to.have.been.called
        testSuccessfulHandling()
    })

    it("Should update message visibility at least once if build is not completed", async () => {
        sinon.stub(AwsBuild.prototype, 'getBuildLink').returns("my-link")

        let buildStatusStub = sinon.stub(AwsBuild.prototype, 'getBuildStatus')
        buildStatusStub.onFirstCall().resolves("IN_PROGRESS")
        buildStatusStub.onSecondCall().resolves("SUCCEEDED")

        await supportHandlers.checkContinuousIntegrationBuildStatus(queueMessage)

        expect(updateVisibilitySpy).to.have.been.calledOnce
        let args = updateVisibilitySpy.getCall(0).args
        expect(args[1]).to.be.equal(2 * supportHandlers.DEFAULT_MESSAGE_VISIBILITY_INCREMENT_IN_SEC)

        expect(buildStatusStub).to.have.been.calledThrice // isCompleted x2 + waitCompletionAtMost x1
        testSuccessfulHandling()

    })

    it("Message visibility increments should be predefined", async () => {
        sinon.stub(AwsBuild.prototype, 'getBuildLink').returns("my-link")

        let isCompletedSub = sinon.stub(AwsBuild.prototype, 'isCompleted')
        isCompletedSub.resolves(false)

        let waitForCompletionStub = sinon.stub(AwsBuild.prototype, 'waitCompletionAtMost')
        waitForCompletionStub.onCall(0).rejects(new BuildStatusTimeoutError())
        waitForCompletionStub.onCall(1).rejects(new BuildStatusTimeoutError())
        /*
        TODO: Need to improve this as not very good practice
        Need to use callsFake as I need to change the stub behaviour when I get where I want

         */
        waitForCompletionStub.onCall(2).callsFake(() => {
            isCompletedSub.resolves(true)
            return new Promise<BuildStatus>(resolve => {
                resolve({buildLink: "a", status: "SUCCEEDED"})
            })
        })

        await supportHandlers.checkContinuousIntegrationBuildStatus(queueMessage)

        expect(updateVisibilitySpy).to.have.been.callCount(3)
        let calls = updateVisibilitySpy.getCalls()
        expect(calls[0].args[1]).to.be.equal(2 * supportHandlers.DEFAULT_MESSAGE_VISIBILITY_INCREMENT_IN_SEC)
        expect(calls[1].args[1]).to.be.equal(3 * supportHandlers.DEFAULT_MESSAGE_VISIBILITY_INCREMENT_IN_SEC)
        expect(calls[2].args[1]).to.be.equal(4 * supportHandlers.DEFAULT_MESSAGE_VISIBILITY_INCREMENT_IN_SEC)
        testSuccessfulHandling()

    })

    it("Should handle not successful builds", async () => {
        sinon.stub(AwsBuild.prototype, 'getBuildLink').returns("my-link")

        let isCompletedStub = sinon.stub(AwsBuild.prototype, 'isCompleted')
        isCompletedStub.resolves(false)

        let waitForCompletionStub = sinon.stub(AwsBuild.prototype, 'waitCompletionAtMost')
        waitForCompletionStub.onCall(0).rejects(new BuildError("FAILED"))

        await supportHandlers.checkContinuousIntegrationBuildStatus(queueMessage)

        expect(updateVisibilitySpy).to.have.been.callCount(1)
        expect(isCompletedStub).to.have.been.calledOnce
        testSuccessfulHandling()
    })

    it("Should neither update status or remove message if an unexpected error occurs", async () => {
        sinon.stub(AwsBuild.prototype, 'isCompleted').resolves(false)
        sinon.stub(AwsBuild.prototype, 'waitCompletionAtMost').rejects(new Error("unexpected error"))

        let rejected = false
        try {
            await supportHandlers.checkContinuousIntegrationBuildStatus(queueMessage)
        } catch (e) {
            rejected = true
        }

        expect(rejected).to.be.true
        expect(updateVisibilitySpy).to.have.been.callCount(1)
        expect(createCommitStatusSpy).not.to.have.been.called
        expect(removeMessageSpy).not.to.have.been.called
    })
})

