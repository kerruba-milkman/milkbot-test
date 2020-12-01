import {expect} from 'chai'
import {handleDeployForQA} from "../../eventHandlers/slack/deployForQAHandler"
import {BotMessage} from "../../interfaces/MessageInterfaces";
import {getExpectedPostMessageWithError} from "../utils";

describe('DeployForQAHandler', function () {

    it('commit hash is not a valid UUID value and message is well formatted', async () => {
        let botMessage: BotMessage = {
            "inputMessageFromUser": 'deploy-for-qa --tag qa fdfd fdfdf',
            "expectedResponseType": "chat"
        }
        const expected = await handleDeployForQA(botMessage)
        const notValidUUIDExpectedMessage = getExpectedPostMessageWithError(botMessage, 'Deploy for QA', 'commit hash must be an UUID value')
        expect(JSON.stringify(expected.chatPostMessageArguments)).to.be.equal(JSON.stringify(notValidUUIDExpectedMessage))
    })

    it('tag argument is missing and message is well formatted', async () => {
        let botMessage: BotMessage = {
            "inputMessageFromUser": 'deploy-for-qa bab91153db6bd6583157e751f2367ad63736aba1',
            "expectedResponseType": "chat"
        }
        const expected = await handleDeployForQA(botMessage)
        const tagArgumentIsMissingExpectedMessage = getExpectedPostMessageWithError(botMessage, 'Deploy for QA', 'tag argument must be present')
        expect(JSON.stringify(expected.chatPostMessageArguments)).to.be.equal(JSON.stringify(tagArgumentIsMissingExpectedMessage))
    })

    it('accepts random arguments, but fails if missing mandatory ones', async () => {
        let botMessage: BotMessage = {
            "inputMessageFromUser": 'deploy-for-qa bab91153db6bd6583157e751f2367ad63736aba1 --test qa',
            "expectedResponseType": "chat"
        }
        const expected = await handleDeployForQA(botMessage)
        const notExistentArgumentExpectedMessage = getExpectedPostMessageWithError(botMessage, 'Deploy for QA', 'There are not parsable args')
        expect(JSON.stringify(expected.chatPostMessageArguments)).to.be.equal(JSON.stringify(notExistentArgumentExpectedMessage))
    })

    it('fails when passing unexpected arguments ', async () => {
        let botMessage: BotMessage = {
            "inputMessageFromUser": 'deploy-for-qa bab91153db6bd6583157e751f2367ad63736aba1 --unexpected abc --tag qa',
            "expectedResponseType": "chat"
        }
        const expected = await handleDeployForQA(botMessage)
        const notExistentArgumentExpectedMessage = getExpectedPostMessageWithError(botMessage, 'Deploy for QA', 'There are not parsable args')
        expect(JSON.stringify(expected.chatPostMessageArguments)).to.be.equal(JSON.stringify(notExistentArgumentExpectedMessage))
    })

    it('valid request and message is well formatted', async () => {
        let botMessage: BotMessage = {
            "inputMessageFromUser": 'deploy-for-qa bab91153db6bd6583157e751f2367ad63736aba1 --tag qa',
            "expectedResponseType": "chat"
        }
        const expected = await handleDeployForQA(botMessage)
        const expectedPostMessageBlock = expected.chatPostMessageArguments.blocks[1]

        expect(expectedPostMessageBlock.block_id).to.be.equal('bab91153db6bd6583157e751f2367ad63736aba1&&&EcrTag=qa')
        expect(expectedPostMessageBlock['accessory']['action_id']).to.be.equal('deploy_for_qa')
    })

})

