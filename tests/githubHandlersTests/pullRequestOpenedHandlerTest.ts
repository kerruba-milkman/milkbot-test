import * as chai from 'chai'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import {pullRequestOpenedHandler} from "../../eventHandlers/github/pullRequestOpenedHandler";
import {QueueMessage} from "../../interfaces/MessageInterfaces";
import {createQueueMessageFromJSON} from "../utils";

const expect = chai.expect
chai.use(sinonChai);
// sinon.config = {
//     useFakeTimers: false
// };

describe('Pull Request opened handler', () => {
    afterEach(() => {
        sinon.restore()
    })

    it('send the correct infos to GitHub API', async () => {
        const client = sinon.stub()
        const createComment = sinon.stub()

        client["issues"] = {
            createComment
        }

        const message: QueueMessage = await createQueueMessageFromJSON('./tests/resources/githubEvents/pull_request_opened.json')
        await pullRequestOpenedHandler(message, client)
        const args = createComment.getCall(0).args[0]

        let {
            number: issueNumber,
            repository: {
                name: repoName,
                owner: {
                    login: repoOwner
                }
            }
        } = message.parsedIncomingMessage;

        expect(args.owner).to.be.equal(repoOwner)
        expect(args.repo).to.be.equal(repoName)
        expect(args.issue_number).to.be.equal(issueNumber)
    })
})
