import * as AWS from 'aws-sdk'
import {Config} from '../config'

import {Right} from '../models/Right'
import * as pino from 'pino'
import * as DynamoDB from 'aws-sdk/clients/dynamodb'
import {BotMessage, QueueMessage} from "../interfaces/MessageInterfaces";
import {ChatPostMessageArguments} from "@slack/web-api";
import {promises as fs} from "fs";

const addFixtureToDynamo = (right: Right): Promise<any> => {
    return new Promise((resolve, reject) => {
        const docClient = new AWS.DynamoDB.DocumentClient(Config.getDynamoOptions());

        const params = {
            TableName: Config.getDynamoTableName(),
            Item: right
        }

        docClient.put(params, function (err, data) {
            if (err) {
                reject(err)
            } else {
                resolve(data)
            }
        })
    })
}

const setupDynamo = async () : Promise<void> => {

    logger.debug('setting up the dynamodb table for testing')
    logger.debug('Setting env vars')
    process.env.DYNAMODB_TABLENAME = 'TEST'
    process.env.DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:4566'

    const dynamodb = new AWS.DynamoDB(Config.getDynamoOptions())
    const docClient = new AWS.DynamoDB.DocumentClient(Config.getDynamoOptions())

    const params: DynamoDB.Types.CreateTableInput = {
        TableName: Config.getDynamoTableName(),
        KeySchema: [
            {AttributeName: "functionName", KeyType: "HASH"},
            {AttributeName: "right", KeyType: "RANGE"}
        ],
        AttributeDefinitions: [
            {AttributeName: "functionName", AttributeType: "S"},
            {AttributeName: "right", AttributeType: "S"}
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    }


    await dynamodb.createTable(params).promise()
        .then(data => {
                  logger.info("Created table. Table description JSON:", JSON.stringify(data, null, 2))
                  const params = {
                  RequestItems: {
                  [Config.getDynamoTableName()]: [
                  {
                  PutRequest: {
                  Item: {
                  functionName: 'InitTable',
                  right: 'Init'
                  }
                  }
                  }
                  ],
                  }
                  }
                  return docClient.batchWrite(params).promise()

                  })
        .then(data => { logger.info(data) })
        .catch(error => {
            logger.error("An error occurred while setting up DynamoDb:",
                JSON.stringify(error, null, 2)) })
}

function getExpectedPostMessageWithError(botMessage: BotMessage, title: string, error: string): ChatPostMessageArguments {
    return {
        channel: botMessage.requestChannelId,
        text: title,
        blocks: [
            {
                type: "section" as const,
                block_id: "section1",
                text: {
                    type: "mrkdwn" as const,
                    text: ":heavy_exclamation_mark:  There is an error: " + error
                }
            }
        ]
    }
}

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
})

async function createQueueMessageFromJSON(path: string): Promise<QueueMessage> {
    const eventMessage = await readJSONFromFile(path)
    let body = eventMessage.body
    return {
        message: eventMessage,
        parsedIncomingMessage: body ? JSON.parse(eventMessage.body) : eventMessage,
        parsedMessageBody: eventMessage
    }
}

async function readJSONFromFile(path) {
    const buffer = await fs.readFile(path)
    const content = buffer.toString()
    return JSON.parse(content)
}

export {
    addFixtureToDynamo,
    logger,
    setupDynamo,
    getExpectedPostMessageWithError,
    readJSONFromFile,
    createQueueMessageFromJSON
}
