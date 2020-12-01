import * as chai from 'chai'
import * as spies from 'chai-spies'
import * as sinon from 'sinon'
import {handleNotification} from '../../eventHandlers/slack'
import {BotMessage} from '../../interfaces/MessageInterfaces'
import * as echoHandler from '../../eventHandlers/slack/echoHandler'
import * as alarmHandler from '../../eventHandlers/slack/alarmHandler'

chai.use(spies)
const expect = chai.expect


describe('HandlerManager', function () {
    afterEach(() => {
        sinon.restore()
    })

    it('unsupported notification types are managed by echo slackHandlers', async () => {
        let echoHandlerSpy = sinon.spy(echoHandler, 'echoHandler')
        await handleNotification(unsupportedNotificationMessage)
        expect(echoHandlerSpy).to.have.been.called
    })

    it('alarm notifications are managed by alarm slackHandlers', async () => {
        let alarmHandlerSpy = sinon.spy(alarmHandler, 'alarmHandler')
        await handleNotification(validAlarmNotificationMessage)
        expect(alarmHandlerSpy).to.have.been.called
    })

})

const unsupportedNotificationMessage: BotMessage = {
    inputMessageFromUser: '{"a":"b"}',
    requestChannelId: 'GT4R6E7TN', expectedResponseType: 'chat'
}

const validAlarmNotificationMessage: BotMessage = {
    inputMessageFromUser: '{"AlarmName":"AlarmMilkbotDev","AlarmDescription":"invoices-transactions-dead",' +
        '"AWSAccountId":"263652615682","NewStateValue":"ALARM","NewStateReason":"Threshold Crossed: 1 out of the last 1 ' +
        'datapoints [1.0 (19/08/20 12:47:00)] was greater than the threshold (0.0) (minimum 1 datapoint for OK -> ALARM transition)."' +
        ',"StateChangeTime":"2020-08-19T12:48:13.927+0000","Region":"EU (Frankfurt)","AlarmArn":"arn:aws:cloudwatch:eu-central-1:263652615682:alarm:AlarmMilkbotDev"' +
        ',"OldStateValue":"OK","Trigger":{"MetricName":"ApproximateNumberOfMessagesVisible","Namespace":"AWS/SQS",' +
        '"StatisticType":"Statistic","Statistic":"AVERAGE","Unit":null,"Dimensions":[{"value":"invoices-transactions-dead",' +
        '"name":"QueueName"}],"Period":60,"EvaluationPeriods":1,"ComparisonOperator":"GreaterThanThreshold","Threshold":0.0,' +
        '"TreatMissingData":"- TreatMissingData:                    missing","EvaluateLowSampleCountPercentile":""}}',
    requestChannelId: 'GT4R6E7TN', expectedResponseType: 'chat'
}
