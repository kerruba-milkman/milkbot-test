import * as AWSMock from "aws-sdk-mock";
import * as AWS from 'aws-sdk'
import {CodeBuild} from 'aws-sdk'
import * as uuid from 'uuid'
import {AwsBuild, BuildStatusTimeoutError} from "../../utils/codeBuildUtils";
import * as ghUtils from "../../utils/githubUtils";
import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'

const expect = chai.expect

chai.use(sinonChai)
chai.use(chaiAsPromised)

class FakeAwsBuild extends AwsBuild {

    async waitForNewStatus(): Promise<void> {
        return Promise.resolve()
    }
}

describe('CodeBuildUtils', () => {
    afterEach(() => {
        AWSMock.restore()
        sinon.restore()
    })

    it('rejects in case the build fails', async () => {
        AWSMock.setSDKInstance(AWS)
        AWSMock.mock('CodeBuild', 'startBuild', () => {
            return Promise.resolve({
                build: {
                    id: uuid.v4()
                }
            }).catch((err) => {
                Promise.reject(err)
            })
        })

        AWSMock.mock('CodeBuild', 'batchGetBuilds', () => {
            return Promise.resolve({
                builds: [
                    {
                        buildStatus: 'FAILED' // It must not be IN_PROGRESS or SUCCEEDED
                    }
                ]
            })
        })

        let options: CodeBuild.Types.StartBuildInput = {
            projectName: 'api-tech',
            sourceVersion: 'def'
        }
        let buildCommand = new FakeAwsBuild()
        let test = async () => {
            await buildCommand.startBuild(options)
            await buildCommand.waitCompletion()
        }
        await expect(test).to.throw
    })

    it('resolves in case the build is completed', async () => {
        AWSMock.setSDKInstance(AWS)
        AWSMock.mock('CodeBuild', 'startBuild', () => {
            return Promise.resolve({
                build: {
                    id: uuid.v4()
                }
            }).catch((err) => {
                Promise.reject(err)
            })
        })

        AWSMock.mock('CodeBuild', 'batchGetBuilds', () => {
            return Promise.resolve({
                builds: [
                    {
                        buildStatus: 'SUCCEEDED'
                    }
                ]
            })
        })

        let options: CodeBuild.Types.StartBuildInput = {
            projectName: 'api-tech',
            sourceVersion: 'def'
        }

        let buildCommand = new FakeAwsBuild()
        let test = async () => {
            await buildCommand.startBuild(options)
            await buildCommand.waitCompletion()
        }
        expect(test()).not.to.be.rejected
    })

    describe("BuildCommand object", () => {
        it('should reject if build start fails', async () => {
            AWSMock.setSDKInstance(AWS)
            AWSMock.mock('CodeBuild', 'startBuild', () => {
                return Promise.reject(new Error())
            })
            let options: CodeBuild.Types.StartBuildInput = {
                projectName: 'api-tech',
                sourceVersion: 'def'
            }

            let buildCommand = new FakeAwsBuild()
            expect(buildCommand.startBuild(options)).to.be.rejected

        })

        it('should start build and return build link', async () => {
            AWSMock.setSDKInstance(AWS)
            AWSMock.mock('CodeBuild', 'startBuild', () => {
                return Promise.resolve({
                    build: {
                        id: 'api-tech:12345'
                    }
                })
            })

            let options: CodeBuild.Types.StartBuildInput = {
                projectName: 'api-tech',
                sourceVersion: 'def'
            }

            let buildCommand = new AwsBuild()
            let buildStatus = await buildCommand.startBuild(options)
            expect(buildStatus).to.not.be.undefined
            expect(buildStatus.buildLink).to.be.equal(`https://${process.env.AWS_REGION}.console.aws.amazon.com/codesuite/codebuild/263652615682/projects/api-tech/build/api-tech:12345`)

        })

        it('should throw an Error if build has not started correctly', async () => {
            AWSMock.setSDKInstance(AWS)
            AWSMock.mock('CodeBuild', 'startBuild', () => {
                return Promise.resolve({
                    build: {
                        id: 'api-tech:12345'
                    }
                })
            })


            let buildCommand = new FakeAwsBuild()

            let test = async () => {
                await buildCommand.getBuildStatus()
            }
            await expect(test()).to.be.rejected

        })

        it('waitingForCompletion should return correctly when build status is SUCCEEDED', async () => {
            AWSMock.setSDKInstance(AWS)
            AWSMock.mock('CodeBuild', 'startBuild', () => {
                return Promise.resolve({
                    build: {
                        id: 'api-tech:12345'
                    }
                })
            })

            const statusStub = sinon.stub();
            statusStub.onCall(0).returns({builds: [{buildStatus: 'IN_PROGRESS'}]});
            statusStub.onCall(1).returns({builds: [{buildStatus: 'SUCCEEDED'}]});
            AWSMock.mock('CodeBuild', 'batchGetBuilds', () => {
                return Promise.resolve(statusStub())
            })


            let options: CodeBuild.Types.StartBuildInput = {
                projectName: 'api-tech',
                sourceVersion: 'def'
            }


            let buildCommand = new FakeAwsBuild()

            let spy = sinon.spy(buildCommand, "getBuildStatus")


            await buildCommand.startBuild(options)
            let {buildLink, status} = await buildCommand.waitCompletion()
            expect(buildLink).to.be.equal(`https://${process.env.AWS_REGION}.console.aws.amazon.com/codesuite/codebuild/263652615682/projects/api-tech/build/api-tech:12345`)
            expect(status).to.be.equal("SUCCEEDED")
            expect(spy).to.have.been.calledTwice
            expect(await spy.firstCall.returnValue).to.be.equal("IN_PROGRESS")
            expect(await spy.secondCall.returnValue).to.be.equal("SUCCEEDED")

        })

        it('waitingForCompletion should fail and ignore newer statuses after build failure', async () => {
            AWSMock.setSDKInstance(AWS)
            AWSMock.mock('CodeBuild', 'startBuild', () => {
                return Promise.resolve({
                    build: {
                        id: 'api-tech:12345'
                    }
                })
            })

            const statusStub = sinon.stub();
            statusStub.onCall(0).returns({builds: [{buildStatus: 'IN_PROGRESS'}]});
            statusStub.onCall(1).returns({builds: [{buildStatus: 'FAILURE'}]});
            statusStub.onCall(2).returns({builds: [{buildStatus: 'SUCCEEDED'}]});
            AWSMock.mock('CodeBuild', 'batchGetBuilds', () => {
                return Promise.resolve(statusStub())
            })


            let options: CodeBuild.Types.StartBuildInput = {
                projectName: 'api-tech',
                sourceVersion: 'def'
            }


            let buildCommand = new FakeAwsBuild()

            let spy = sinon.spy(buildCommand, "getBuildStatus")

            await buildCommand.startBuild(options)

            await expect(buildCommand.waitCompletion()).to.be.rejected
            expect(await spy.firstCall.returnValue).to.be.equal("IN_PROGRESS")
            expect(await spy.secondCall.returnValue).to.be.equal("FAILURE")

        })

        it('should throw an Error if buildId is not defined', async () => {
            AWSMock.setSDKInstance(AWS)
            AWSMock.mock('CodeBuild', 'startBuild', () => {
                return Promise.resolve({
                    build: {
                        id: 'api-tech:12345'
                    }
                })
            })

            let buildCommand = new FakeAwsBuild()

            await expect(buildCommand.getBuildStatus()).to.be.rejected

        })

        it('should throw an build waiting timeout if waiting build completion exceeds timeout', async () => {
            AWSMock.setSDKInstance(AWS)

            let buildId = 'my-build-id';
            let projectName = 'my-project';
            let buildCommand = new FakeAwsBuild({buildId, projectName})

            sinon.stub(buildCommand, 'getBuildStatus').resolves("IN_PROGRESS")

            await expect(buildCommand.waitCompletionAtMost(100)).to.be.rejectedWith(BuildStatusTimeoutError)

        })

        it('should not throw timeout error if build completes within timeout', async () => {
            AWSMock.setSDKInstance(AWS)

            let buildId = 'my-build-id';
            let projectName = 'my-project';

            let buildCommand = new FakeAwsBuild({buildId, projectName})
            let expectedBuildLink = `https://${process.env.AWS_REGION}.console.aws.amazon.com/codesuite/codebuild/263652615682/projects/${projectName}/build/${buildId}`

            let buildStatusStub = sinon.stub(buildCommand, 'getBuildStatus')
            buildStatusStub.onFirstCall().returns(
                new Promise(resolve => {
                    setTimeout(() => {
                        resolve("IN_PROGRESS")
                    }, 100)
                })
            );
            buildStatusStub.onSecondCall().resolves("SUCCEEDED")

            let status = await buildCommand.waitCompletionAtMost(1000)

            expect(buildStatusStub).to.have.been.calledTwice
            expect(status.status).to.be.equal("SUCCEEDED")
            expect(status.buildLink).to.equal(expectedBuildLink)

        })

        it('should call the correct commit status based on build status', async () => {
            let pendingCommitStatusSpy,successCommitStatusSpy, failedCommitStatusSpy

            function resetSpyHistories() {
                pendingCommitStatusSpy.resetHistory()
                successCommitStatusSpy.resetHistory()
                failedCommitStatusSpy.resetHistory()
            }
            let build = new AwsBuild({buildId: 'id', projectName: 'project'})
            let commit : ghUtils.GithubCommit = {
                repoOwner: 'milkman-deliveries',
                repoName: 'project',
                commitHash: '123456'
            }

            pendingCommitStatusSpy = sinon.stub(ghUtils, 'createPendingCommitStatus').resolves()
            successCommitStatusSpy = sinon.stub(ghUtils, 'createSuccessCommitStatus').resolves()
            failedCommitStatusSpy = sinon.stub(ghUtils, 'createFailedCommitStatus').resolves()

            let buildStub = sinon.stub(build)
            buildStub.isCompleted.resolves(false)

            await ghUtils.createCommitStatusForBuild(commit, build)
            expect(pendingCommitStatusSpy).to.have.been.calledOnce
            expect(successCommitStatusSpy).not.to.have.been.called
            expect(failedCommitStatusSpy).not.to.have.been.called

            buildStub.isCompleted.resolves(true)
            buildStub.getBuildStatus.resolves("SUCCEEDED")
            resetSpyHistories()

            await ghUtils.createCommitStatusForBuild(commit, build)
            expect(successCommitStatusSpy).to.have.been.calledOnce
            expect(pendingCommitStatusSpy).not.to.have.been.called
            expect(failedCommitStatusSpy).not.to.have.been.called

            buildStub.isCompleted.resolves(true)
            buildStub.getBuildStatus.resolves("STOPPED")
            resetSpyHistories()

            await ghUtils.createCommitStatusForBuild(commit, build)
            expect(failedCommitStatusSpy).to.have.been.calledOnce
            expect(pendingCommitStatusSpy).not.to.have.been.called
            expect(successCommitStatusSpy).not.to.have.been.called
        })


    })
})
