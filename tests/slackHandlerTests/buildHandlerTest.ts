import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'

import {buildAction, handleBuild} from "../../eventHandlers/slack/buildHandler";
import {BotMessage} from "../../interfaces/MessageInterfaces";
import * as consts from '../../consts';
import {getExpectedPostMessageWithError, readJSONFromFile} from "../utils";
import * as actions from '../../actions/build'
import {AwsBuild, BuildError} from "../../utils/codeBuildUtils";

const expect = chai.expect

chai.use(sinonChai)
chai.use(chaiAsPromised)


describe('Slack build', () => {
    describe('BuildHandler', function () {
        it('missing argument is rejected', async () => {
            const botMessage: BotMessage = {
                inputMessageFromUser: '', requestChannelId: 'GT4R6E7TN', expectedResponseType: 'chat',
                command: {command: 'build', arguments: [], attributes: {tag: 'qa'}}
            }
            await handleBuild(botMessage)
                .then(() => {
                    throw Error('Not expected')
                })
                .catch((e) => {
                    expect(e.message).to.equal(consts.ERROR_MISSING_DATA_IN_MESSAGE)
                })
        })

        it('returns a well formatted error message if the commit hash is not a valid UUID', async () => {
            const botMessage: BotMessage = {
                inputMessageFromUser: '', requestChannelId: 'GT4R6E7TN', expectedResponseType: 'chat',
                command: {command: 'build', arguments: ['dfdser3r333 3r3ddf dsfdf-dsf'], attributes: {tag: 'qa'}}
            }
            const expected = await handleBuild(botMessage)
            const notValidCommitHashError = getExpectedPostMessageWithError(botMessage, 'Build', 'The required commit ID must be an UUID value')
            expect(expected.chatPostMessageArguments).to.deep.equal(notValidCommitHashError)
        })

        it('returns a well formatted error message if the tag attribute is missing', async () => {
            const botMessage: BotMessage = {
                inputMessageFromUser: '', requestChannelId: 'GT4R6E7TN', expectedResponseType: 'chat',
                command: {command: 'build', arguments: ['dfdser3r3333r3ddfdsfdfdsf'], attributes: {}}
            }
            const expected = await handleBuild(botMessage)
            const notValidCommitHashError = getExpectedPostMessageWithError(botMessage, 'Build', 'Missing required attribute tag')
            expect(expected.chatPostMessageArguments).to.deep.equal(notValidCommitHashError)
        })

        it('returns a well formatted error message if the passed tag is a production tag', async () => {
            const botMessageProd: BotMessage = {
                inputMessageFromUser: '', requestChannelId: 'GT4R6E7TN', expectedResponseType: 'chat',
                command: {command: 'build', arguments: ['dfdser3r3333r3ddfdsfdfdsf'], attributes: {tag: 'prod'}}
            }
            const botMessageFF: BotMessage = {
                inputMessageFromUser: '', requestChannelId: 'GT4R6E7TN', expectedResponseType: 'chat',
                command: {command: 'build', arguments: ['dfdser3r3333r3ddfdsfdfdsf'], attributes: {tag: 'ff'}}
            }

            const unsupportedFFTagError = getExpectedPostMessageWithError(botMessageProd, 'Build', 'The tag ff is not supported for this command')
            const unsupportedProdTagError = getExpectedPostMessageWithError(botMessageProd, 'Build', 'The tag prod is not supported for this command')

            const expectedProd = await handleBuild(botMessageProd)
            const expectedFF = await handleBuild(botMessageFF)

            expect(expectedFF.chatPostMessageArguments).to.deep.equal(unsupportedFFTagError)
            expect(expectedProd.chatPostMessageArguments).to.deep.equal(unsupportedProdTagError)

        })

        it('returns a success message if everything is fine', async () => {
            const botMessage: BotMessage = {
                inputMessageFromUser: '', requestChannelId: 'GT4R6E7TN', expectedResponseType: 'chat',
                command: {command: 'build', arguments: ['dfdser3r3333r3ddfdsfdfdsf'], attributes: {tag: 'qa'}}
            }
            const expected = await handleBuild(botMessage)
            const firstBlockResponse = {
                type: "section" as const,
                block_id: "section567",
                text: {
                    type: "mrkdwn" as const,
                    text: "Hello, please select the application to build."
                }
            }
            expect(expected.chatPostMessageArguments.blocks[0]).to.deep.equal(firstBlockResponse)
            expect(expected.chatPostMessageArguments.blocks[1].block_id).to.be.equal(`dfdser3r3333r3ddfdsfdfdsf${consts.SEARCH_STRING_PARAMS_SEPARATOR}${consts.MILKBOT_ECR_TAG_ARG_NAME}=qa`)
        })

    })

    describe("Build action", () => {
        afterEach(() => {
            sinon.restore()
        })

        it("Should extract build args from bot message", async () => {
            let buildStub = sinon.stub(actions, 'build').resolves()

            const botMessage: BotMessage = await readJSONFromFile('./tests/resources/actions/buildAction.json') as BotMessage
            await buildAction(botMessage)

            expect(buildStub).to.have.been.calledOnce
            let buildArgs = buildStub.getCall(0).args
            expect(buildArgs[0]).to.be.equal('api-tech')
            expect(buildArgs[1]).to.be.equal('b3fc7b856')
            expect(buildArgs[2]).to.be.equal("EcrTag=kerruba-b3fc7b856")
        })

        it("Should start the build with expected tag and wait for sucess", async () => {
            let expectedService = "api-tech"
            let expectedCommitHash = "b3fc7b856"
            let expectedBuildSpec = "arn:aws:s3:::milkman-instances/buildspecs/ApiFargateService/buildspec.yml"
            let expectedTag = "kerruba-b3fc7b856"
            let expectedBlocks = [
                {
                    type: 'section',
                    text: {
                        type: 'plain_text',
                        text: ':green_circle: Build successfully completed!',
                    }
                },
                {
                    type: 'divider'
                }
            ]

            const botMessage: BotMessage = await readJSONFromFile('./tests/resources/actions/buildAction.json') as BotMessage
            let startBuildStub = sinon.stub(AwsBuild.prototype, 'startBuild').resolves()
            let waitCompletion = sinon.stub(AwsBuild.prototype, 'waitCompletion').resolves()

            let returnedMessage = await buildAction(botMessage)

            expect(returnedMessage.chatPostMessageArguments.blocks).to.be.deep.equal(expectedBlocks)

            expect(startBuildStub).to.have.been.calledOnce
            expect(waitCompletion).to.have.been.calledOnce

            let startBuildArgs = startBuildStub.getCall(0).args[0]
            expect(startBuildArgs.projectName).to.be.equal(expectedService)
            expect(startBuildArgs.sourceVersion).to.be.equal(expectedCommitHash)
            expect(startBuildArgs.buildspecOverride).to.be.equal(expectedBuildSpec)
            expect(startBuildArgs.environmentVariablesOverride).to.be.deep.equal([{
                name: "ENV_TAG",
                value: expectedTag
            }])

        })

        it("Should start build and return failure message", async () => {
            let errorMessage = "Build error"
            let expectedBlocks = [
                {
                    type: 'section',
                    text: {
                        type: 'plain_text',
                        text: `:red_circle: Error during build: ${errorMessage}`,
                    }
                },
                {
                    type: 'divider'
                }
            ]

            const botMessage: BotMessage = await readJSONFromFile('./tests/resources/actions/buildAction.json') as BotMessage
            sinon.stub(AwsBuild.prototype, 'startBuild').resolves()
            sinon.stub(AwsBuild.prototype, 'waitCompletion').rejects(new BuildError(errorMessage))

            let returnedMessage = await buildAction(botMessage)

            expect(returnedMessage.chatPostMessageArguments.blocks).to.be.deep.equal(expectedBlocks)


        })
    })
})

