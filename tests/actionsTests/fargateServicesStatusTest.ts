import {expect} from 'chai';
import {retrieveStatus} from '../../actions/fargateServiceStatusRetriever'
import * as AWSMock from "aws-sdk-mock";
import * as AWS from "aws-sdk";
import {DescribeServicesRequest, ListServicesRequest} from 'aws-sdk/clients/ecs';

describe('FargateServiceStatus', function () {
    it('all the information well formatted', async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock('ECS', 'listServices', (params: ListServicesRequest) => {
            return Promise.resolve({
                serviceArns: ['prova', 'prova2']
            }).catch((err) => {
                Promise.reject(err)
            })
        })

        AWSMock.mock('ECS', 'describeServices', (params: DescribeServicesRequest) => {
            return Promise.resolve(describeServicesResponse).catch((err) => {
                Promise.reject(err)
            })
        })

        const expected = await retrieveStatus('prova', null)

        AWSMock.restore('ECS', 'listServices')
        AWSMock.restore('ECS', 'describeServices')

        expect(JSON.stringify(expected)).to.equal(JSON.stringify(expectedRetrieveStatus))
        return
    })

    it('it throws an error and message is well formatted', async () => {
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock('ECS', 'listServices', (params: ListServicesRequest) => {
            return Promise.resolve({
                serviceArns: ['prova', 'prova2']
            }).catch((err) => {
                Promise.reject(err)
            })
        })

        AWSMock.mock('ECS', 'describeServices', (params: DescribeServicesRequest) => {
            return Promise.reject("fake error")
                .then(function (m) {
                    throw new Error('was not supposed to succeed');
                })
                .catch(function (m) {
                    expect(m).to.equal('fake error');
                })

        })

        const expected = await retrieveStatus('prova', null)

        AWSMock.restore('ECS', 'listServices')
        AWSMock.restore('ECS', 'describeServices')

        expect(JSON.stringify(expected)).to.equal(JSON.stringify(expectedError))
        return
    })

})

const expectedError = [{
    "type": "section",
    "text": {"type": "plain_text", "text": "It was not possible to retrieve status data.", "emoji": true}
}, {"type": "divider"}]

const expectedRetrieveStatus = [{
    "type": "section",
    "text": {
        "type": "mrkdwn",
        "text": ":green_circle: *routing-dev-fargate-service*\n\tDesired: \t1\tPending: \t0\tRunning: \t1"
    }
}, {
    "type": "section",
    "text": {
        "type": "mrkdwn",
        "text": ":green_circle: *api-dev-fargate-service*\n\tDesired: \t1\tPending: \t0\tRunning: \t1"
    }
}, {
    "type": "section",
    "text": {
        "type": "mrkdwn",
        "text": ":green_circle: *analyticator-dev-fargate-service*\n\tDesired: \t1\tPending: \t0\tRunning: \t1"
    }
}, {
    "type": "section",
    "text": {
        "type": "mrkdwn",
        "text": ":green_circle: *tracking-dev-fargate-service*\n\tDesired: \t1\tPending: \t0\tRunning: \t1"
    }
}, {
    "type": "section",
    "text": {
        "type": "mrkdwn",
        "text": ":green_circle: *dashboard-dev-fargate-service*\n\tDesired: \t1\tPending: \t0\tRunning: \t1"
    }
}, {
    "type": "section",
    "text": {
        "type": "mrkdwn",
        "text": ":green_circle: *milkman-alerts-dev-fargate-service*\n\tDesired: \t1\tPending: \t0\tRunning: \t1"
    }
}, {
    "type": "section",
    "text": {
        "type": "mrkdwn",
        "text": ":green_circle: *convergence-dev-fargate-service*\n\tDesired: \t1\tPending: \t0\tRunning: \t1"
    }
}, {
    "type": "section",
    "text": {
        "type": "mrkdwn",
        "text": ":green_circle: *milkman-url-shortener-dev-fargate-service*\n\tDesired: \t1\tPending: \t0\tRunning: \t1"
    }
}, {"type": "divider"}]


const describeServicesResponse = {
    "services": [{
        "serviceArn": "arn:aws:ecs:eu-central-1:263652615682:service/milkman-dev/routing-dev-fargate-service",
        "serviceName": "routing-dev-fargate-service",
        "clusterArn": "arn:aws:ecs:eu-central-1:263652615682:cluster/milkman-dev",
        "loadBalancers": [],
        "serviceRegistries": [{"registryArn": "arn:aws:servicediscovery:eu-central-1:263652615682:service/srv-s3ufm2gjhf2jxaaf"}],
        "status": "ACTIVE",
        "desiredCount": 1,
        "runningCount": 1,
        "pendingCount": 0,
        "launchType": "FARGATE",
        "platformVersion": "LATEST",
        "taskDefinition": "arn:aws:ecs:eu-central-1:263652615682:task-definition/routing-dev:15",
        "deploymentConfiguration": {"maximumPercent": 200, "minimumHealthyPercent": 100},
        "deployments": [{
            "id": "ecs-svc/0750445341769871042",
            "status": "PRIMARY",
            "taskDefinition": "arn:aws:ecs:eu-central-1:263652615682:task-definition/routing-dev:15",
            "desiredCount": 1,
            "pendingCount": 0,
            "runningCount": 1,
            "createdAt": "2020-03-31T16:16:26.992Z",
            "updatedAt": "2020-03-31T16:19:00.205Z",
            "launchType": "FARGATE",
            "platformVersion": "1.3.0",
            "networkConfiguration": {
                "awsvpcConfiguration": {
                    "subnets": ["subnet-01b66a5bf09fcc801", "subnet-054157c04f4cb771f", "subnet-066ca8d69172a69d5"],
                    "securityGroups": ["sg-02e179714acf7d1e5"],
                    "assignPublicIp": "DISABLED"
                }
            }
        }],
        "roleArn": "arn:aws:iam::263652615682:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
        "events": [{
            "id": "216ed42c-dc07-4b27-9231-52a7c9d8ce3f",
            "createdAt": "2020-05-03T10:52:08.742Z",
            "message": "(service routing-dev-fargate-service) has reached a steady state."
        }],
        "createdAt": "2020-01-24T10:56:09.317Z",
        "placementConstraints": [],
        "placementStrategy": [],
        "networkConfiguration": {
            "awsvpcConfiguration": {
                "subnets": ["subnet-01b66a5bf09fcc801", "subnet-054157c04f4cb771f", "subnet-066ca8d69172a69d5"],
                "securityGroups": ["sg-02e179714acf7d1e5"],
                "assignPublicIp": "DISABLED"
            }
        },
        "schedulingStrategy": "REPLICA",
        "enableECSManagedTags": true,
        "propagateTags": "NONE"
    }, {
        "serviceArn": "arn:aws:ecs:eu-central-1:263652615682:service/milkman-dev/api-dev-fargate-service",
        "serviceName": "api-dev-fargate-service",
        "clusterArn": "arn:aws:ecs:eu-central-1:263652615682:cluster/milkman-dev",
        "loadBalancers": [{
            "targetGroupArn": "arn:aws:elasticloadbalancing:eu-central-1:263652615682:targetgroup/DevAPIs/c750fdf4e3d4ccef",
            "containerName": "reverse",
            "containerPort": 80
        }],
        "serviceRegistries": [{"registryArn": "arn:aws:servicediscovery:eu-central-1:263652615682:service/srv-ktof4gpyzilow665"}],
        "status": "ACTIVE",
        "desiredCount": 1,
        "runningCount": 1,
        "pendingCount": 0,
        "launchType": "FARGATE",
        "platformVersion": "LATEST",
        "taskDefinition": "arn:aws:ecs:eu-central-1:263652615682:task-definition/api-dev:6",
        "deploymentConfiguration": {"maximumPercent": 200, "minimumHealthyPercent": 100},
        "deployments": [{
            "id": "ecs-svc/5505079479710568835",
            "status": "PRIMARY",
            "taskDefinition": "arn:aws:ecs:eu-central-1:263652615682:task-definition/api-dev:6",
            "desiredCount": 1,
            "pendingCount": 0,
            "runningCount": 1,
            "createdAt": "2020-05-27T15:27:32.902Z",
            "updatedAt": "2020-05-27T15:31:14.568Z",
            "launchType": "FARGATE",
            "platformVersion": "1.3.0",
            "networkConfiguration": {
                "awsvpcConfiguration": {
                    "subnets": ["subnet-01b66a5bf09fcc801", "subnet-054157c04f4cb771f", "subnet-066ca8d69172a69d5"],
                    "securityGroups": ["sg-02e179714acf7d1e5"],
                    "assignPublicIp": "DISABLED"
                }
            }
        }],
        "roleArn": "arn:aws:iam::263652615682:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
        "events": [{
            "id": "6b6772ed-6d4f-4383-baf3-324f378721c4",
            "createdAt": "2020-05-28T03:37:32.553Z",
            "message": "(service api-dev-fargate-service) has reached a steady state."
        }],
        "createdAt": "2020-01-24T10:52:02.590Z",
        "placementConstraints": [],
        "placementStrategy": [],
        "networkConfiguration": {
            "awsvpcConfiguration": {
                "subnets": ["subnet-01b66a5bf09fcc801", "subnet-054157c04f4cb771f", "subnet-066ca8d69172a69d5"],
                "securityGroups": ["sg-02e179714acf7d1e5"],
                "assignPublicIp": "DISABLED"
            }
        },
        "healthCheckGracePeriodSeconds": 300,
        "schedulingStrategy": "REPLICA",
        "enableECSManagedTags": true,
        "propagateTags": "NONE"
    }, {
        "serviceArn": "arn:aws:ecs:eu-central-1:263652615682:service/milkman-dev/analyticator-dev-fargate-service",
        "serviceName": "analyticator-dev-fargate-service",
        "clusterArn": "arn:aws:ecs:eu-central-1:263652615682:cluster/milkman-dev",
        "loadBalancers": [{
            "targetGroupArn": "arn:aws:elasticloadbalancing:eu-central-1:263652615682:targetgroup/DevAnalyticator/74d83f32c3f5c03c",
            "containerName": "analyticator",
            "containerPort": 8080
        }],
        "serviceRegistries": [],
        "status": "ACTIVE",
        "desiredCount": 1,
        "runningCount": 1,
        "pendingCount": 0,
        "launchType": "FARGATE",
        "platformVersion": "LATEST",
        "taskDefinition": "arn:aws:ecs:eu-central-1:263652615682:task-definition/analyticator-dev:4",
        "deploymentConfiguration": {"maximumPercent": 200, "minimumHealthyPercent": 100},
        "deployments": [{
            "id": "ecs-svc/2281079473750358587",
            "status": "PRIMARY",
            "taskDefinition": "arn:aws:ecs:eu-central-1:263652615682:task-definition/analyticator-dev:4",
            "desiredCount": 1,
            "pendingCount": 0,
            "runningCount": 1,
            "createdAt": "2020-02-03T14:33:24.971Z",
            "updatedAt": "2020-02-03T14:40:11.922Z",
            "launchType": "FARGATE",
            "platformVersion": "1.3.0",
            "networkConfiguration": {
                "awsvpcConfiguration": {
                    "subnets": ["subnet-01b66a5bf09fcc801", "subnet-054157c04f4cb771f", "subnet-066ca8d69172a69d5"],
                    "securityGroups": ["sg-02e179714acf7d1e5"],
                    "assignPublicIp": "DISABLED"
                }
            }
        }],
        "roleArn": "arn:aws:iam::263652615682:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
        "events": [{
            "id": "b56eac1d-5233-4b38-8dc3-4fc2f03e16c8",
            "createdAt": "2020-05-28T06:03:10.442Z",
            "message": "(service analyticator-dev-fargate-service) has reached a steady state."
        }],
        "createdAt": "2020-01-24T10:53:24.993Z",
        "placementConstraints": [],
        "placementStrategy": [],
        "networkConfiguration": {
            "awsvpcConfiguration": {
                "subnets": ["subnet-01b66a5bf09fcc801", "subnet-054157c04f4cb771f", "subnet-066ca8d69172a69d5"],
                "securityGroups": ["sg-02e179714acf7d1e5"],
                "assignPublicIp": "DISABLED"
            }
        },
        "healthCheckGracePeriodSeconds": 300,
        "schedulingStrategy": "REPLICA",
        "enableECSManagedTags": true,
        "propagateTags": "NONE"
    }, {
        "serviceArn": "arn:aws:ecs:eu-central-1:263652615682:service/milkman-dev/tracking-dev-fargate-service",
        "serviceName": "tracking-dev-fargate-service",
        "clusterArn": "arn:aws:ecs:eu-central-1:263652615682:cluster/milkman-dev",
        "loadBalancers": [{
            "targetGroupArn": "arn:aws:elasticloadbalancing:eu-central-1:263652615682:targetgroup/DevTracking/6dc79e4b28cd8255",
            "containerName": "tracking",
            "containerPort": 80
        }],
        "serviceRegistries": [{"registryArn": "arn:aws:servicediscovery:eu-central-1:263652615682:service/srv-24pss2g5xwdml55a"}],
        "status": "ACTIVE",
        "desiredCount": 1,
        "runningCount": 1,
        "pendingCount": 0,
        "launchType": "FARGATE",
        "platformVersion": "LATEST",
        "taskDefinition": "arn:aws:ecs:eu-central-1:263652615682:task-definition/tracking-dev:2",
        "deploymentConfiguration": {"maximumPercent": 200, "minimumHealthyPercent": 100},
        "deployments": [{
            "id": "ecs-svc/1619712311681067749",
            "status": "PRIMARY",
            "taskDefinition": "arn:aws:ecs:eu-central-1:263652615682:task-definition/tracking-dev:2",
            "desiredCount": 1,
            "pendingCount": 0,
            "runningCount": 1,
            "createdAt": "2020-05-20T16:41:00.890Z",
            "updatedAt": "2020-05-20T16:42:29.596Z",
            "launchType": "FARGATE",
            "platformVersion": "1.3.0",
            "networkConfiguration": {
                "awsvpcConfiguration": {
                    "subnets": ["subnet-01b66a5bf09fcc801", "subnet-054157c04f4cb771f", "subnet-066ca8d69172a69d5"],
                    "securityGroups": ["sg-02e179714acf7d1e5"],
                    "assignPublicIp": "DISABLED"
                }
            }
        }],
        "roleArn": "arn:aws:iam::263652615682:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
        "events": [{
            "id": "9700c42b-e7c2-45d7-a0c8-b36eee71fee9",
            "createdAt": "2020-05-28T04:59:16.048Z",
            "message": "(service tracking-dev-fargate-service) has reached a steady state."
        }],
        "createdAt": "2020-03-27T16:36:47.584Z",
        "placementConstraints": [],
        "placementStrategy": [],
        "networkConfiguration": {
            "awsvpcConfiguration": {
                "subnets": ["subnet-01b66a5bf09fcc801", "subnet-054157c04f4cb771f", "subnet-066ca8d69172a69d5"],
                "securityGroups": ["sg-02e179714acf7d1e5"],
                "assignPublicIp": "DISABLED"
            }
        },
        "healthCheckGracePeriodSeconds": 300,
        "schedulingStrategy": "REPLICA",
        "enableECSManagedTags": true,
        "propagateTags": "NONE"
    }, {
        "serviceArn": "arn:aws:ecs:eu-central-1:263652615682:service/milkman-dev/dashboard-dev-fargate-service",
        "serviceName": "dashboard-dev-fargate-service",
        "clusterArn": "arn:aws:ecs:eu-central-1:263652615682:cluster/milkman-dev",
        "loadBalancers": [{
            "targetGroupArn": "arn:aws:elasticloadbalancing:eu-central-1:263652615682:targetgroup/DevDashboard/c1e8f8bc4cbaf533",
            "containerName": "dashboard",
            "containerPort": 80
        }],
        "serviceRegistries": [{"registryArn": "arn:aws:servicediscovery:eu-central-1:263652615682:service/srv-ih6ybfjtja45m6ad"}],
        "status": "ACTIVE",
        "desiredCount": 1,
        "runningCount": 1,
        "pendingCount": 0,
        "launchType": "FARGATE",
        "platformVersion": "LATEST",
        "taskDefinition": "arn:aws:ecs:eu-central-1:263652615682:task-definition/dashboard-dev:1",
        "deploymentConfiguration": {"maximumPercent": 200, "minimumHealthyPercent": 100},
        "deployments": [{
            "id": "ecs-svc/2307627673983153323",
            "status": "PRIMARY",
            "taskDefinition": "arn:aws:ecs:eu-central-1:263652615682:task-definition/dashboard-dev:1",
            "desiredCount": 1,
            "pendingCount": 0,
            "runningCount": 1,
            "createdAt": "2020-05-25T14:28:04.855Z",
            "updatedAt": "2020-05-25T14:29:56.812Z",
            "launchType": "FARGATE",
            "platformVersion": "1.3.0",
            "networkConfiguration": {
                "awsvpcConfiguration": {
                    "subnets": ["subnet-01b66a5bf09fcc801", "subnet-054157c04f4cb771f", "subnet-066ca8d69172a69d5"],
                    "securityGroups": ["sg-02e179714acf7d1e5"],
                    "assignPublicIp": "DISABLED"
                }
            }
        }],
        "roleArn": "arn:aws:iam::263652615682:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
        "events": [{
            "id": "10fda73f-c354-4e88-917f-6bdab96dac09",
            "createdAt": "2020-05-12T14:22:18.002Z",
            "message": "(service dashboard-dev-fargate-service) registered 1 targets in (target-group arn:aws:elasticloadbalancing:eu-central-1:263652615682:targetgroup/DevDashboard/c1e8f8bc4cbaf533)"
        }],
        "createdAt": "2020-04-07T10:11:09.292Z",
        "placementConstraints": [],
        "placementStrategy": [],
        "networkConfiguration": {
            "awsvpcConfiguration": {
                "subnets": ["subnet-01b66a5bf09fcc801", "subnet-054157c04f4cb771f", "subnet-066ca8d69172a69d5"],
                "securityGroups": ["sg-02e179714acf7d1e5"],
                "assignPublicIp": "DISABLED"
            }
        },
        "healthCheckGracePeriodSeconds": 300,
        "schedulingStrategy": "REPLICA",
        "enableECSManagedTags": true,
        "propagateTags": "NONE"
    }, {
        "serviceArn": "arn:aws:ecs:eu-central-1:263652615682:service/milkman-dev/milkman-alerts-dev-fargate-service",
        "serviceName": "milkman-alerts-dev-fargate-service",
        "clusterArn": "arn:aws:ecs:eu-central-1:263652615682:cluster/milkman-dev",
        "loadBalancers": [{
            "targetGroupArn": "arn:aws:elasticloadbalancing:eu-central-1:263652615682:targetgroup/DevAlerts/56e4076958000a0f",
            "containerName": "alerts",
            "containerPort": 8080
        }],
        "serviceRegistries": [],
        "status": "ACTIVE",
        "desiredCount": 1,
        "runningCount": 1,
        "pendingCount": 0,
        "launchType": "FARGATE",
        "platformVersion": "LATEST",
        "taskDefinition": "arn:aws:ecs:eu-central-1:263652615682:task-definition/milkman-alerts-dev:2",
        "deploymentConfiguration": {"maximumPercent": 200, "minimumHealthyPercent": 100},
        "deployments": [{
            "id": "ecs-svc/7417086845933073252",
            "status": "PRIMARY",
            "taskDefinition": "arn:aws:ecs:eu-central-1:263652615682:task-definition/milkman-alerts-dev:2",
            "desiredCount": 1,
            "pendingCount": 0,
            "runningCount": 1,
            "createdAt": "2020-01-24T10:54:39.420Z",
            "updatedAt": "2020-01-24T10:58:04.286Z",
            "launchType": "FARGATE",
            "platformVersion": "1.3.0",
            "networkConfiguration": {
                "awsvpcConfiguration": {
                    "subnets": ["subnet-01b66a5bf09fcc801", "subnet-054157c04f4cb771f", "subnet-066ca8d69172a69d5"],
                    "securityGroups": ["sg-02e179714acf7d1e5"],
                    "assignPublicIp": "DISABLED"
                }
            }
        }],
        "roleArn": "arn:aws:iam::263652615682:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
        "events": [{
            "id": "42ec7b39-8710-4140-84fa-3cc3a0129147",
            "createdAt": "2020-05-03T11:19:43.304Z",
            "message": "(service milkman-alerts-dev-fargate-service) has reached a steady state."
        }],
        "createdAt": "2020-01-24T10:54:39.420Z",
        "placementConstraints": [],
        "placementStrategy": [],
        "networkConfiguration": {
            "awsvpcConfiguration": {
                "subnets": ["subnet-01b66a5bf09fcc801", "subnet-054157c04f4cb771f", "subnet-066ca8d69172a69d5"],
                "securityGroups": ["sg-02e179714acf7d1e5"],
                "assignPublicIp": "DISABLED"
            }
        },
        "healthCheckGracePeriodSeconds": 300,
        "schedulingStrategy": "REPLICA",
        "enableECSManagedTags": true,
        "propagateTags": "NONE"
    }, {
        "serviceArn": "arn:aws:ecs:eu-central-1:263652615682:service/milkman-dev/convergence-dev-fargate-service",
        "serviceName": "convergence-dev-fargate-service",
        "clusterArn": "arn:aws:ecs:eu-central-1:263652615682:cluster/milkman-dev",
        "loadBalancers": [],
        "serviceRegistries": [{"registryArn": "arn:aws:servicediscovery:eu-central-1:263652615682:service/srv-iwx6wgvj4sfwywdm"}],
        "status": "ACTIVE",
        "desiredCount": 1,
        "runningCount": 1,
        "pendingCount": 0,
        "launchType": "FARGATE",
        "platformVersion": "LATEST",
        "taskDefinition": "arn:aws:ecs:eu-central-1:263652615682:task-definition/convergence-dev:6",
        "deploymentConfiguration": {"maximumPercent": 200, "minimumHealthyPercent": 100},
        "deployments": [{
            "id": "ecs-svc/0624856108777549682",
            "status": "PRIMARY",
            "taskDefinition": "arn:aws:ecs:eu-central-1:263652615682:task-definition/convergence-dev:6",
            "desiredCount": 1,
            "pendingCount": 0,
            "runningCount": 1,
            "createdAt": "2020-04-17T16:00:06.843Z",
            "updatedAt": "2020-05-14T18:33:56.548Z",
            "launchType": "FARGATE",
            "platformVersion": "1.3.0",
            "networkConfiguration": {
                "awsvpcConfiguration": {
                    "subnets": ["subnet-01b66a5bf09fcc801", "subnet-054157c04f4cb771f", "subnet-066ca8d69172a69d5"],
                    "securityGroups": ["sg-02e179714acf7d1e5"],
                    "assignPublicIp": "DISABLED"
                }
            }
        }],
        "roleArn": "arn:aws:iam::263652615682:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
        "events": [{
            "id": "83ee75a5-2c21-4e8c-aa03-6661fee95a97",
            "createdAt": "2020-05-03T22:19:20.582Z",
            "message": "(service convergence-dev-fargate-service) has reached a steady state."
        }],
        "createdAt": "2020-01-24T10:54:14.926Z",
        "placementConstraints": [],
        "placementStrategy": [],
        "networkConfiguration": {
            "awsvpcConfiguration": {
                "subnets": ["subnet-01b66a5bf09fcc801", "subnet-054157c04f4cb771f", "subnet-066ca8d69172a69d5"],
                "securityGroups": ["sg-02e179714acf7d1e5"],
                "assignPublicIp": "DISABLED"
            }
        },
        "schedulingStrategy": "REPLICA",
        "enableECSManagedTags": true,
        "propagateTags": "NONE"
    }, {
        "serviceArn": "arn:aws:ecs:eu-central-1:263652615682:service/milkman-dev/milkman-url-shortener-dev-fargate-service",
        "serviceName": "milkman-url-shortener-dev-fargate-service",
        "clusterArn": "arn:aws:ecs:eu-central-1:263652615682:cluster/milkman-dev",
        "loadBalancers": [{
            "targetGroupArn": "arn:aws:elasticloadbalancing:eu-central-1:263652615682:targetgroup/DevUrlShortener/34a86def115642c4",
            "containerName": "shortener",
            "containerPort": 8080
        }],
        "serviceRegistries": [],
        "status": "ACTIVE",
        "desiredCount": 1,
        "runningCount": 1,
        "pendingCount": 0,
        "launchType": "FARGATE",
        "platformVersion": "LATEST",
        "taskDefinition": "arn:aws:ecs:eu-central-1:263652615682:task-definition/milkman-url-shortener-dev:2",
        "deploymentConfiguration": {"maximumPercent": 200, "minimumHealthyPercent": 100},
        "deployments": [{
            "id": "ecs-svc/7222621350003074984",
            "status": "PRIMARY",
            "taskDefinition": "arn:aws:ecs:eu-central-1:263652615682:task-definition/milkman-url-shortener-dev:2",
            "desiredCount": 1,
            "pendingCount": 0,
            "runningCount": 1,
            "createdAt": "2020-03-17T11:47:19.376Z",
            "updatedAt": "2020-03-17T11:48:49.877Z",
            "launchType": "FARGATE",
            "platformVersion": "1.3.0",
            "networkConfiguration": {
                "awsvpcConfiguration": {
                    "subnets": ["subnet-01b66a5bf09fcc801", "subnet-054157c04f4cb771f", "subnet-066ca8d69172a69d5"],
                    "securityGroups": ["sg-02e179714acf7d1e5"],
                    "assignPublicIp": "DISABLED"
                }
            }
        }],
        "roleArn": "arn:aws:iam::263652615682:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
        "events": [{
            "id": "4d03fd7e-8a7e-4373-b377-637d3d08c85f",
            "createdAt": "2020-05-03T11:34:41.420Z",
            "message": "(service milkman-url-shortener-dev-fargate-service) has reached a steady state."
        }],
        "createdAt": "2020-03-17T11:26:15.323Z",
        "placementConstraints": [],
        "placementStrategy": [],
        "networkConfiguration": {
            "awsvpcConfiguration": {
                "subnets": ["subnet-01b66a5bf09fcc801", "subnet-054157c04f4cb771f", "subnet-066ca8d69172a69d5"],
                "securityGroups": ["sg-02e179714acf7d1e5"],
                "assignPublicIp": "DISABLED"
            }
        },
        "healthCheckGracePeriodSeconds": 300,
        "schedulingStrategy": "REPLICA",
        "enableECSManagedTags": true,
        "propagateTags": "NONE"
    }], "failures": []
}
