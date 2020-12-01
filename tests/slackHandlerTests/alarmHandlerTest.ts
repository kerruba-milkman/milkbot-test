import {expect} from 'chai'
import {alarmHandler} from "../../eventHandlers/slack/alarmHandler";
import {BotMessage} from "../../interfaces/MessageInterfaces";
import {ChatPostMessageArguments} from "@slack/web-api";

describe('AlarmHandler', function () {

    it('it returns a well formatted message', () => {
        const expected = alarmHandler(alarmBotMessage)
        expect(expected.chatPostMessageArguments).to.deep.equal(expectedResponseMessage)
    })

})

const alarmBotMessage: BotMessage = {
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

const expectedResponseMessage: ChatPostMessageArguments = {
    channel: 'GT4R6E7TN', text: ':rotating_light:  ALARM',
    blocks: [{
        type: 'section',
        block_id: 'section1',
        text: {type: 'mrkdwn', text: ':rotating_light:  *AlarmMilkbotDev* has been triggered'}
    },
        {
            type: 'section',
            block_id: 'section2',
            text: {type: 'mrkdwn', text: 'There is a message in the DLQ invoices-transactions-dead'}
        }]
}
