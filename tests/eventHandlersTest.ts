import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import GithubHandler from '../eventHandlers/github'
import GithubSupportHandler from '../eventHandlers/support/github'
import {EventHandlerFactory} from "../eventHandlers/EventHandler";
import {GithubEventHandler} from "../eventHandlers/GithubEventHandler";
import {SlackEventHandler} from "../eventHandlers/SlackEventHandler";
import {createQueueMessageFromJSON, readJSONFromFile} from "./utils";
import {QueueMessage} from "../interfaces/MessageInterfaces";
import {GithubSupportEventHandler} from "../eventHandlers/GithubSupportEventHandler";
import {getSlackEventFilePath} from "./resources/fixtures";
import * as slackEventHandler from "../eventHandlers/slack";
import * as slackutils from "../utils/slackUtils"

const expect = chai.expect

chai.use(sinonChai)
chai.use(chaiAsPromised)

describe('EventHandlersTest', () => {
    describe('EventHandlerFactoryTest', () => {
        it('returns a GithubEventHandler in case of GitHub events', async () => {
            const ghEvent = await readJSONFromFile('./tests/resources/githubEvents/pull_request_opened.json')
            const eventHandler = EventHandlerFactory.createEventHandler(ghEvent.headers)
            expect(eventHandler).to.be.instanceOf(GithubEventHandler)
        })

        it('returns a SlackEventHandler in case of Slack events', async () => {
            const slackEvent = await readJSONFromFile('./tests/resources/slackEvents/slack_command_help.json')
            const eventHandler = EventHandlerFactory.createEventHandler(slackEvent.headers)
            expect(eventHandler).to.be.instanceOf(SlackEventHandler)
        })

        it('returns a GithubSupportEventHandler in case of Github Support events', async () => {
            const ghSupportEvent = await readJSONFromFile('./tests/resources/githubSupportEvents/check-build-status.json')
            const eventHandler = EventHandlerFactory.createEventHandler(ghSupportEvent.headers)
            expect(eventHandler).to.be.instanceOf(GithubSupportEventHandler)
        })

    })

    describe('GithubEventHandler', () => {
        let pullRequestOpenedStub, issueCommentCreatedStub, issueCommentModifiedStub

        beforeEach(() => {
            pullRequestOpenedStub = sinon.stub(GithubHandler, 'pull_request.opened').resolves()
            issueCommentCreatedStub = sinon.stub(GithubHandler, 'issue_comment.created').resolves()
            issueCommentModifiedStub = sinon.stub(GithubHandler, 'issue_comment.edited').resolves()
        })

        afterEach(() => {
            sinon.restore()
        })


        it('handles correctly the pull_request.opened event', async () => {
            const queueMessage: QueueMessage = await createQueueMessageFromJSON('./tests/resources/githubEvents/pull_request_opened.json')

            const githubEventHandler = new GithubEventHandler()
            await githubEventHandler.handleMessage(queueMessage)

            expect(pullRequestOpenedStub).to.have.been.called
            expect(issueCommentCreatedStub).not.to.have.been.called
            expect(issueCommentModifiedStub).not.to.have.been.called
        })

        it('handles correctly the issue_comment.opened event', async () => {
            const queueMessage: QueueMessage = await createQueueMessageFromJSON('./tests/resources/githubEvents/issue_comment_create_valid_build_command.json')

            const githubEventHandler = new GithubEventHandler()
            await githubEventHandler.handleMessage(queueMessage)

            expect(pullRequestOpenedStub).not.to.have.been.called
            expect(issueCommentCreatedStub).to.have.been.called
            expect(issueCommentModifiedStub).not.to.have.been.called
        })

        it('handles correctly not supported event', async () => {
            const queueMessage: QueueMessage = await createQueueMessageFromJSON('./tests/resources/githubEvents/unsupported_event.json')

            const githubEventHandler = new GithubEventHandler()
            await githubEventHandler.handleMessage(queueMessage)

            expect(pullRequestOpenedStub).not.to.have.been.called
            expect(issueCommentCreatedStub).not.to.have.been.called
            expect(issueCommentModifiedStub).not.to.have.been.called
        })
    })

    describe("GithubSupport Event Handler", () => {
        let checkBuildStatusStub, queueMessage

        beforeEach(async () => {
            checkBuildStatusStub = sinon.stub(GithubSupportHandler, 'check-build-status').resolves({preserveMessage: true})
            queueMessage = await createQueueMessageFromJSON('./tests/resources/githubSupportEvents/check-build-status.json')
        })

        afterEach(() => {
            sinon.restore()
        })

        it("should not handle unrecognized action and should return outcome to delete message", async () => {
            queueMessage.parsedIncomingMessage.action = "unknown"
            const supportEventHandler = new GithubSupportEventHandler()
            let outcome = await supportEventHandler.handleMessage(queueMessage)

            expect(checkBuildStatusStub).not.to.have.been.called
            expect(outcome.preserveMessage).to.be.false
        })

        it("should handle check build status and should return outcome to not delete message", async () => {
            const supportEventHandler = new GithubSupportEventHandler()
            let outcome = await supportEventHandler.handleMessage(queueMessage)

            expect(checkBuildStatusStub).to.have.been.calledOnce
            expect(outcome.preserveMessage).to.be.true
        })

    })

    describe("Slack Event Handler", () => {
        let queueMessage, handleAppMentionSpy, handleActionSpy, handleNotificationSpy, sendMessageSpy,
            supportEventHandler, outcome

        beforeEach(async () => {
            handleAppMentionSpy = sinon.stub(slackEventHandler, 'handleAppMention').resolves()
            handleActionSpy = sinon.stub(slackEventHandler, 'handleAction').resolves()
            handleNotificationSpy = sinon.stub(slackEventHandler, 'handleNotification').resolves()
            sendMessageSpy = sinon.stub(slackutils, "sendMessageToSlackChannel").resolves()
            supportEventHandler = new SlackEventHandler()
        })

        afterEach(() => {
            sinon.restore()
        })

        it("should ignore a bot generated message", async () => {

            queueMessage = await createQueueMessageFromJSON(getSlackEventFilePath('slack_command_help'))
            queueMessage.parsedIncomingMessage.event.bot_id = "some-bot-id"

            outcome = await supportEventHandler.handleMessage(queueMessage)
            expect(outcome.preserveMessage).to.be.false
            expect(outcome.message).to.be.equal("Message is a Bot generated. We don't allow bots to talk to each other (or to themselves), so it's not managed")
            expect(handleActionSpy).not.to.be.called
            expect(handleAppMentionSpy).not.to.be.called
            expect(handleNotificationSpy).not.to.be.called
            expect(sendMessageSpy).not.to.be.called
        })

        it("should call app mention handler for message of type app_mention", async () => {

            queueMessage = await createQueueMessageFromJSON(getSlackEventFilePath('slack_command_help'))
            outcome = await supportEventHandler.handleMessage(queueMessage)

            expect(outcome.preserveMessage).to.be.false
            expect(outcome.message).to.be.equal("Message correctly sent to Slack channel.")
            expect(handleAppMentionSpy).to.be.calledOnce
            expect(handleActionSpy).not.to.be.called
            expect(handleNotificationSpy).not.to.be.called
            expect(sendMessageSpy).to.be.calledOnce

        })

        it("should call action handler for message of type block_action", async () => {

            queueMessage = await createQueueMessageFromJSON(getSlackEventFilePath('slack_block_actions_decoded'))
            outcome = await supportEventHandler.handleMessage(queueMessage)

            expect(outcome.preserveMessage).to.be.false
            expect(outcome.message).to.be.equal("Message correctly sent to Slack channel.")
            expect(handleActionSpy).to.be.calledOnce
            expect(handleAppMentionSpy).not.to.be.called
            expect(handleNotificationSpy).not.to.be.called
            expect(sendMessageSpy).to.be.calledOnce

        })

        it("should call notification handler for message of type Notification", async () => {

            queueMessage = await createQueueMessageFromJSON(getSlackEventFilePath('slack_notification_alarm_dlq'))
            outcome = await supportEventHandler.handleMessage(queueMessage)

            expect(outcome.preserveMessage).to.be.false
            expect(outcome.message).to.be.equal("Message correctly sent to Slack channel.")
            expect(handleActionSpy).not.to.be.called
            expect(handleAppMentionSpy).not.to.be.called
            expect(handleNotificationSpy).to.be.calledOnce
            expect(sendMessageSpy).to.be.calledOnce

        })
    })
})
