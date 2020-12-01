import * as chai from 'chai'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import * as handlerManager from "../eventHandlers/slack/index"
import * as milkbot from "../index"
import * as slackUtils from '../utils/slackUtils'
import * as sqsUtils from '../utils/sqsUtils'
import {EventHandler, EventHandlerFactory, EventOutcome} from "../eventHandlers/EventHandler";
import {QueueMessage} from "../interfaces/MessageInterfaces";
import {Config} from "../config";

const expect = chai.expect
chai.use(sinonChai);

describe('Milkbot', function () {
    afterEach(() => {
        sinon.restore()
    })

    it('notification messages are managed by notification slackHandlers', async () => {
        let handleNotificationSpy = sinon.spy(handlerManager, 'handleNotification')
        sinon.stub(slackUtils, 'sendMessageToSlackChannel').resolves({ok: true})
        sinon.stub(sqsUtils, 'removeMessageFromQueue').resolves(undefined)
        await milkbot.manageMessage(validNotificationMessage)
        expect(handleNotificationSpy).to.have.been.called
    })

    it('should send message to dlq if body is not JSON', async () => {
        let message = "This is my fantastic message"
        let removeMessageFromQueue = sinon.stub(sqsUtils, 'removeMessageFromQueue').resolves(undefined)
        let sendMessageToDeadLettersQueue = sinon.stub(sqsUtils, 'sendMessageToDeadLettersQueue').resolves(undefined)

        await milkbot.manageMessage(message)
        expect(removeMessageFromQueue).to.have.been.calledOnce
        expect(sendMessageToDeadLettersQueue).to.have.been.calledOnce
    })

    it('should not delete message if event outcome has preserveMessage set to true', async () => {
        let removeMessageFromQueue = sinon.stub(sqsUtils, 'removeMessageFromQueue').resolves(undefined)

        let testEventHandler: EventHandler = {
            handleMessage(message: QueueMessage): Promise<EventOutcome> {
                return new Promise(resolve => {
                    resolve({message: "Hello", preserveMessage: true})
                })
            }
        }
        sinon.stub(EventHandlerFactory, 'createEventHandler').returns(testEventHandler)

        await milkbot.manageMessage(validNotificationMessage)
        expect(removeMessageFromQueue).not.to.have.been.called

    })

    it('should delete message if event outcome has preserveMessage set to false', async () => {
        let removeMessageFromQueue = sinon.stub(sqsUtils, 'removeMessageFromQueue').resolves(undefined)

        let testEventHandler: EventHandler = {
            handleMessage(message: QueueMessage): Promise<EventOutcome> {
                return new Promise(resolve => {
                    resolve({message: "Hello", preserveMessage: false})
                })
            }
        }
        sinon.stub(EventHandlerFactory, 'createEventHandler').returns(testEventHandler)

        await milkbot.manageMessage(validNotificationMessage)
        expect(removeMessageFromQueue).to.have.been.calledOnce

    })

    it('should leave the message be if the event handler throws an exception', async () => {
        let removeMessageFromQueue = sinon.stub(sqsUtils, 'removeMessageFromQueue').resolves(undefined)
        let warnLog = sinon.spy(Config.logger, "warn")

        let testEventHandler: EventHandler = {
            handleMessage(): Promise<EventOutcome> {
                return new Promise((resolve, reject) => {
                    reject("Something terrible happened")
                })
            }
        }
        sinon.stub(EventHandlerFactory, 'createEventHandler').returns(testEventHandler)

        await milkbot.manageMessage(validNotificationMessage)
        expect(removeMessageFromQueue).not.to.have.been.called
        expect(warnLog).to.have.been.calledOnce
        let warnArgs = warnLog.getCall(0).args;
        expect(warnArgs[1]).to.be.equal("Error on sending to the remote side")

    })

})

const validNotificationMessage = {
    "MessageId": "71ee3b10-733a-4c20-85e9-3673585e4fb3",
    "ReceiptHandle": "AQEBIzFcpqWZUZ9kVO0ybCagWNduqNDMHkJjaCRgUIVhh02ZEz5oeni7HHISpY/fJB9SYY9+nMKFT7+cckAIAy+QNMlMu9GOpJAdmZrFnq271vxgJjaVr3KrHHpRKcUudNAE/2eHSyM9QANSM5C0xnCMmjtZ5mxlc9KJrDmiIaskr0L0DhDQ66CknuAr51JCj/IeGm9S3F8WY/VCbl9lR7FJq2wtpaj6zBNJuX+GuTA0k1gN5PXHXg2eKGRfr0WbiNfZwC7KA8RorTWeIwNWegziBO/xCKI1sXKcMTolbYlQHliqj0nh/8S0LHN2xGzwyaY3LaiZYXusF0CoPX7BJ+ngBU/BHxR+p6TnJW5op193rzGA/UzFq0vNfh9gIARz1mDnGhJc2e9Soj7LrP9sl2Pk0g==",
    "MD5OfBody": "2feb949e83bea315c98485b8af888cee",
    "Body": "{\n  \"Type\" : \"Notification\",\n  \"MessageId\" : \"938f152f-f8e1-50c5-a9a9-4296674e7485\",\n  \"TopicArn\" : \"arn:aws:sns:eu-central-1:263652615682:MilkbotDevNotificationSystem\",\n  \"Subject\" : \"ALARM: \\\"AlarmMilkbotDev\\\" in EU (Frankfurt)\",\n  \"Message\" : \"{\\\"AlarmName\\\":\\\"AlarmMilkbotDev\\\",\\\"AlarmDescription\\\":\\\"invoices-transactions-dead\\\",\\\"AWSAccountId\\\":\\\"263652615682\\\",\\\"NewStateValue\\\":\\\"ALARM\\\",\\\"NewStateReason\\\":\\\"Threshold Crossed: 1 out of the last 1 datapoints [1.0 (21/08/20 10:08:00)] was greater than the threshold (0.0) (minimum 1 datapoint for OK -> ALARM transition).\\\",\\\"StateChangeTime\\\":\\\"2020-08-21T10:09:51.489+0000\\\",\\\"Region\\\":\\\"EU (Frankfurt)\\\",\\\"AlarmArn\\\":\\\"arn:aws:cloudwatch:eu-central-1:263652615682:alarm:AlarmMilkbotDev\\\",\\\"OldStateValue\\\":\\\"OK\\\",\\\"Trigger\\\":{\\\"MetricName\\\":\\\"ApproximateNumberOfMessagesVisible\\\",\\\"Namespace\\\":\\\"AWS/SQS\\\",\\\"StatisticType\\\":\\\"Statistic\\\",\\\"Statistic\\\":\\\"SUM\\\",\\\"Unit\\\":null,\\\"Dimensions\\\":[{\\\"value\\\":\\\"invoices-transactions-dead\\\",\\\"name\\\":\\\"QueueName\\\"}],\\\"Period\\\":60,\\\"EvaluationPeriods\\\":1,\\\"ComparisonOperator\\\":\\\"GreaterThanThreshold\\\",\\\"Threshold\\\":0.0,\\\"TreatMissingData\\\":\\\"- TreatMissingData:                    ignore\\\",\\\"EvaluateLowSampleCountPercentile\\\":\\\"\\\"}}\",\n  \"Timestamp\" : \"2020-08-21T10:09:51.549Z\",\n  \"SignatureVersion\" : \"1\",\n  \"Signature\" : \"TekkYfPul2shDiNxtRHz3W3aGHAW5bBPn8uJHjWjoE2EdYZiHncnC8t48eFE3QzaY7NnVM96oNvyuYMcUjlQ9shdcVFhML11rgCx3YDg55DbE4r8J+Qp19W3E4YRza402RWbQYz+yQ1QzKbkFXPh2t4Q9/0rmdGQkBlVZfkauYWQ9MBPgAZjs/muHtvVPCzEkdxWvNvzUgBwfcTSENGh4xb0NLGL5xXHWa0Pa8GslyRz5iL0Yx+CA1F7DsY/zGRQ2C+Zeeb5mK0bJsYiZO4dnRWhRBdQDqEgAGJia7kj5wgLy35adbELZ8xgz5HX1brK/wqnShRXY2QFp1Kd3Wne1g==\",\n  \"SigningCertURL\" : \"https://sns.eu-central-1.amazonaws.com/SimpleNotificationService-a86cb10b4e1f29c941702d737128f7b6.pem\",\n  \"UnsubscribeURL\" : \"https://sns.eu-central-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:eu-central-1:263652615682:MilkbotDevNotificationSystem:06cee2ab-03bb-4180-8d1d-d95d553a1849\"\n}",
    "Attributes": {
        "ApproximateReceiveCount": "1"
    }
}
