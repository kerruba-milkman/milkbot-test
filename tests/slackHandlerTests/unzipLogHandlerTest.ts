import * as chai from 'chai'
import * as spies from 'chai-spies'
import * as AWSMock from "aws-sdk-mock";
import * as AWS from 'aws-sdk'
import * as consts from '../../consts';
import {cumulateLogs, parseLogOptions, retrieveUnzippedLogEntry} from "../../actions/logUnzipper"
import * as LogUtils from "../../utils/cloudWatchLogsUtils"
import {FilteredLogEvents, FilterLogEventsResponse} from "aws-sdk/clients/cloudwatchlogs";
import {BotMessage} from "../../interfaces/MessageInterfaces";
import {promises as fs} from 'fs'
import {Config} from "../../config";
import moment = require("moment");

const logger = Config.logger

chai.use(spies)
const expect = chai.expect


const plainLogs: FilteredLogEvents = [
    {message: '{"i": "5f89aba7-eef4-4918-ba89-3ac6d9525e28", "s":1, "isLast":true, "totPages":2, "currentPage":2, "z":0, "c":" World!"}'},
    {message: '{"i": "5f89aba7-eef4-4918-ba89-3ac6d9525e28", "s":1, "totPages":2, "currentPage":1, "z":0, "c":"Hello "}'}
]

const zippedLogs = [
    {message: '{"i":"5f89aba7-eef4-4918-ba89-3ac6d9525e28","s":1,"isLast":true,"totPages":2,"currentPage":2,"z":1,"c": "jPL8pJUQQA"}'},
    {message: '{"i":"5f89aba7-eef4-4918-ba89-3ac6d9525e28","s":1,"totPages":2,"currentPage":1,"z":1,"c":"80jNyclXUA"}'}
]

const unsplitLogs: FilteredLogEvents = [
    {message: `{"i": "5f89aba7-eef4-4918-ba89-3ac6d9525e28", "s":0, "c":"Hello  World! I'm not split"}`},
]

const multiIdsLogs: FilteredLogEvents = [
    {message: `{"i": "5f89aba7-eef4-4918-ba89-3ac6d9525e28", "s":0, "c":"Hello  World!"}`},
    {message: `{"i": "5f89aba7-eef4-4918-ba89-3ac6d9525e29", "s":0, "c":"Ciao Mondo!"}`},
]

describe('LogHandlerTests', () => {

    afterEach(() => {
        AWSMock.restore()
    })

    it("should parse command args overriding default value", async () => {
        let timestampInMs = 1605095691669
        let splitArgs = `${consts.MILKBOT_TIMESTAMP_ARG_NAME}=${timestampInMs}`
        let opt = parseLogOptions(splitArgs, {timestamp: moment()})
        expect(opt.timestamp.valueOf()).to.be.equal(timestampInMs)
    })

    it("should ignore missing command arg value and fallback to default", async () => {

        let momentValue = moment(1)
        let splitArgs = ``
        let opt = parseLogOptions(splitArgs, {timestamp: momentValue})
        expect(opt.timestamp).to.be.equal(momentValue)
    })

    it("should zip and unzip log message", async () => {
        let baseString = "Hello  World!"
        let unzippedLogs = LogUtils.unzipLogs(LogUtils.zipLog(baseString))
        expect(unzippedLogs).to.be.equal(baseString);
    })

    it("should cumulate logs correctly", async () => {
        let message = cumulateLogs(plainLogs)
        expect(message).to.be.equal("Hello  World!")
    })

    it("should cumulate and inflate compressed logs", async () => {
        let message = cumulateLogs(zippedLogs)
        expect(message).to.be.equal("Hello  World!")
    })

    it("should return empty string if no events is passed", async () => {
        let message = cumulateLogs([])
        expect(message).to.be.equal("")
    })

    it("should throw an exception if invalid message is return", async () => {
        let throwingFn = () => {
            cumulateLogs(undefined)
        }
        expect(throwingFn).to.throw()
    })

    it("should handle logs not split", async () => {
        let message = cumulateLogs(unsplitLogs)
        expect(message).equal(`Hello  World! I'm not split`)
    })

    it("should throw an exception if logs with different ids are cumulated", async () => {
        let throwingFn = () => {
            cumulateLogs(multiIdsLogs)
        }
        expect(throwingFn).to.throw();
    })

    it('should re-combined multiple logs together', async () => {

        let searchId = "5f8d5132-b2e3-4526-9680-b4c0f7841d92";
        let args = "";
        let logGroupName = "/ecs/api-prod-api";

        AWSMock.setSDKInstance(AWS)
        AWSMock.mock('CloudWatchLogs', 'filterLogEvents', function (params, cb) {
            logger.info("CloudWatchLogs Mock - filterLogEvents", params);
            let resp: FilterLogEventsResponse = {
                events: zippedLogs,
            }
            cb(null, resp)
        });

        AWSMock.mock('S3', 'upload', function (params, cb) {
            logger.info(params)
            expect(params.Body).to.contains('"result":"Hello  World!"')
            cb(null, {Bucket: 'My cool bucket', Key: 'My-S3 file'})
        });

        let botMessage: BotMessage = {"inputMessageFromUser": 'search-logs', "expectedResponseType": "chat"}
        await retrieveUnzippedLogEntry(searchId, args, logGroupName, botMessage)
    })

    it('should re-combined multiple malformed logs', async () => {

        let searchId = "5f8d5132-b2e3-4526-9680-b4c0f7841d92";
        let args = "";
        let logGroupName = "/ecs/api-prod-api";

        AWSMock.setSDKInstance(AWS)
        AWSMock.mock('CloudWatchLogs', 'filterLogEvents', function (params, cb) {
            logger.info("CloudWatchLogs Mock - filterLogEvents", params);
            fs.readFile('./tests/resources/malformed_logs.csv').then(b => b.toString()).then(s => {
                let events = s.split("\n")
                    .filter(msg => msg != "")
                    .map(msg => {
                        return {"message": msg}
                    })
                    .reduce((pre, next) => {
                        pre.push(next)
                        return pre
                    }, [])
                let resp: FilterLogEventsResponse = {
                    events
                }

                cb(null, resp)
            })
        });

        AWSMock.mock('S3', 'upload', function (params, cb) {
            cb(null, {Bucket: 'My cool bucket', Key: 'My-S3 file'})
        });

        let botMessage: BotMessage = {"inputMessageFromUser": 'search-logs', "expectedResponseType": "chat"}
        await retrieveUnzippedLogEntry(searchId, args, logGroupName, botMessage)
    })

    it('should call AWS with default args values', async () => {

        let searchId = "5f8d5132-b2e3-4526-9680-b4c0f7841d92";
        let args = ``
        let logGroupName = "/ecs/api-prod-api";

        AWSMock.setSDKInstance(AWS)
        AWSMock.mock('CloudWatchLogs', 'filterLogEvents', function (params, cb) {
            logger.info("CloudWatchLogs Mock - filterLogEvents", params);
            let {startTime, endTime} = params
            let hoursSpan = (endTime - startTime) / (3600 * 1000)
            expect(hoursSpan).to.be.equal(1)
            let resp: FilterLogEventsResponse = {
                events: zippedLogs,
            }
            cb(null, resp)
        });

        AWSMock.mock('S3', 'upload', function (params, cb) {
            cb(null, {Bucket: 'My cool bucket', Key: 'My-S3 file'})
        });

        let botMessage: BotMessage = {"inputMessageFromUser": 'search-logs', "expectedResponseType": "chat"}
        await retrieveUnzippedLogEntry(searchId, args, logGroupName, botMessage)
    })

});

