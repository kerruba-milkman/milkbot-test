import * as chai from 'chai'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import * as buildCommand from '../../eventHandlers/github/commands/buildCommand'
import {QueueMessage} from "../../interfaces/MessageInterfaces";
import {createQueueMessageFromJSON} from "../utils";
import {issueCommentedHandler} from "../../eventHandlers/github/issueCommentedHandler";

const expect = chai.expect
chai.use(sinonChai);
// sinon.config = {
//     useFakeTimers: false
// };

describe('Issue commented handler', () => {
    let buildCommandStub

    beforeEach(() => {
        buildCommandStub = sinon.stub(buildCommand, 'buildCommand')
    })

    afterEach(() => {
        sinon.restore()
    })

    it('handles correctly the build command', async () => {
        const client = sinon.stub()

        const message: QueueMessage = await createQueueMessageFromJSON('./tests/resources/githubEvents/issue_comment_create_valid_build_command.json')
        await issueCommentedHandler(message, client)
        expect(buildCommandStub.called).to.be.true
    })

    it('handles correctly unsupported command', async () => {
        const client = sinon.stub()

        const message: QueueMessage = await createQueueMessageFromJSON('./tests/resources/githubEvents/issue_comment_create_invalid_command.json')
        await issueCommentedHandler(message, client)
        expect(buildCommandStub.called).to.be.false
    })

    it('handles correctly created event without a body message', async () => {
        const client = sinon.stub()

        const message: QueueMessage = await createQueueMessageFromJSON('./tests/resources/githubEvents/issue_comment_create_without_body.json')
        await issueCommentedHandler(message, client)
        expect(buildCommandStub.called).to.be.false
    })
})
