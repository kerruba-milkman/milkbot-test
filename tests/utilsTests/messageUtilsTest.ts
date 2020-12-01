import {expect} from 'chai'
import {parseCommand} from "../../utils/messageUtils";

describe('MessageUtils', function () {
    it('handle only command', () => {
        const expected = parseCommand('<@UT9DDPLVB> build')
        const parsedMessage = {command: 'build', arguments: [], attributes: {}}
        expect(expected).to.deep.equal(parsedMessage)
    })

    it('handle command with single attribute', () => {
        const expected = parseCommand('<@UT9DDPLVB> build --tag qa')
        const parsedMessage = {command: 'build', arguments: [], attributes: {tag: 'qa'}}
        expect(expected).to.deep.equal(parsedMessage)
    })

    it('handle command with single spaced attribute', () => {
        const expected = parseCommand('<@UT9DDPLVB> search-log --filter "ciao mondo"')
        const parsedMessage = {command: 'search-log', arguments: [], attributes: {filter: 'ciao mondo'}}
        expect(expected).to.deep.equal(parsedMessage)
    })

    it('handle command with single spaced attribute and a normal attribute', () => {
        const expected = parseCommand('<@UT9DDPLVB> search-log --tag prod --filter "ciao mondo"')

        const parsedMessage = {command: 'search-log', arguments: [], attributes: {filter: 'ciao mondo', tag: 'prod'}}
        expect(expected).to.deep.equal(parsedMessage)
    })

    it('handle command with multiple attributes', () => {
        const expected = parseCommand('<@UT9DDPLVB> build --tag qa --env prod')
        const parsedMessage = {command: 'build', arguments: [], attributes: {tag: 'qa', env: 'prod'}}
        expect(expected).to.deep.equal(parsedMessage)
    })

    it('handle command with single argument', () => {
        const expected = parseCommand('<@UT9DDPLVB> build 382bd9b11c907f8e897ee05b24720e47a1a05bfb')
        const parsedMessage = {
            command: 'build',
            arguments: ['382bd9b11c907f8e897ee05b24720e47a1a05bfb'],
            attributes: {}
        }
        expect(expected).to.deep.equal(parsedMessage)
    })

    it('handle command with single argument and single attribute', () => {
        const expected = parseCommand('<@UT9DDPLVB> build 382bd9b11c907f8e897ee05b24720e47a1a05bfb --tag qa')
        const parsedMessage = {
            command: 'build',
            arguments: ['382bd9b11c907f8e897ee05b24720e47a1a05bfb'],
            attributes: {tag: 'qa'}
        }
        expect(expected).to.deep.equal(parsedMessage)
    })

    it('handle command with multiple arguments', () => {
        const expected = parseCommand('<@UT9DDPLVB> build 382bd9b11c907f8e897ee05b24720e47a1a05bfb qa2')
        const parsedMessage = {
            command: 'build',
            arguments: ['382bd9b11c907f8e897ee05b24720e47a1a05bfb', 'qa2'],
            attributes: {}
        }
        expect(expected).to.deep.equal(parsedMessage)
    })

    it('handle command with multiple arguments and multiple attributes', () => {
        const expected = parseCommand('<@UT9DDPLVB> build 382bd9b11c907f8e897ee05b24720e47a1a05bfb --tag prod api --env prod')
        const parsedMessage = {
            command: 'build',
            arguments: ['382bd9b11c907f8e897ee05b24720e47a1a05bfb', 'api'],
            attributes: {tag: 'prod', env: 'prod'}
        }
        expect(expected).to.deep.equal(parsedMessage)
    })

    it('handle command with multiple arguments and multiple attributes spaced', () => {
        const expected = parseCommand('<@UT9DDPLVB> search-log "api start" --author admin today --filter "api dashboard"')
        const parsedMessage = {
            command: 'search-log',
            arguments: ['api start', 'today'],
            attributes: {author: 'admin', filter: 'api dashboard'}
        }
        expect(expected).to.deep.equal(parsedMessage)
    })

    it('it returns undefined when a quote is missing', () => {
        const expected = parseCommand('<@UT9DDPLVB> search-log "api start" --author admin today --filter api dashboard"')
        expect(expected).to.deep.equal(undefined)
    })

    it('handle multiple space correctly', () => {
        const expected = parseCommand('<@UT9DDPLVB> search-log   "api start"   --author   admin   today --filter "api dashboard"')
        const parsedMessage = {
            command: 'search-log',
            arguments: ['api start', 'today'],
            attributes: {author: 'admin', filter: 'api dashboard'}
        }
        expect(expected).to.deep.equal(parsedMessage)
    })

    it('throws an exception when in the command there are two or more equal attributes', () => {
        expect(() => parseCommand('<@UT9DDPLVB> deploy-for-qa --tag qa --tag qa2')).to.throw
    })

    it('handle attributes with special character', () => {
        const expected = parseCommand('<@UT9DDPLVB> command --tag qa --prod-env milkman')
        const parsedMessage = {command: 'command', arguments: [], attributes: {tag: 'qa', 'prod-env': 'milkman'}}
        expect(expected).to.deep.equal(parsedMessage)
    })

    it('command is parsed as case-insensitive', () => {
        const expectedUpperCase = parseCommand('<@UT9DDPLVB> COMMAND')
        const expectedLowerCase = parseCommand('<@UT9DDPLVB> command')
        expect(expectedLowerCase).to.deep.equal(expectedUpperCase)
    })

    it('handle multiple space correctly before command', () => {
        const expected = parseCommand('<@UT9DDPLVB>  build bab91153db6bd6583157e751f2367ad63736aba1 --tag qa')
        const parsedMessage = {
            command: 'build',
            arguments: ['bab91153db6bd6583157e751f2367ad63736aba1'],
            attributes: {tag: 'qa'}
        }
        expect(expected).to.deep.equal(parsedMessage)
    })

    it('handle commands without mention', () => {
        const expected = parseCommand('command --tag test')
        const parsedMessage = {command: 'command', arguments: [], attributes: {tag: 'test'}}
        expect(expected).to.deep.equal(parsedMessage)
    })

    it('handle only bot mention', () => {
        const expected = parseCommand('<@UT9DDPLVB>')
        expect(expected.command).to.be.equal('')
    })
})
