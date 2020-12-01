import * as chai from 'chai'
import * as spies from 'chai-spies'
import * as chaiAsPromised from 'chai-as-promised'
import * as sinon from 'sinon'
import {deployForQA} from "../../actions/deployForQA"
import * as codeBuildUtils from '../../utils/codeBuildUtils'
import * as stsUtils from '../../utils/stsUtils'
import * as fargateUtils from '../../utils/fargateUtils'
import {assumeRoleFakeCredentials} from "../resources/fixtures";
import * as consts from '../../consts'

const expect = chai.expect
chai.use(spies)
chai.use(chaiAsPromised)

const AWSTestError = 'error with AWS SDK'


describe('DeployForQA', function () {
    afterEach(() => {
        sinon.restore()
    })

    it('not supported tag is rejected', async () => {
        await deployForQA('api-tech', 'bab91153db6bd6583157e751f2367ad63736aba1', 'EcrTag=faketag')
            .then(() => {
                throw Error('Not expected')
            })
            .catch((e) => {
                expect(e.message).to.equal('Tag faketag is not managed by this bot')
            })
    })

    it('no ecr tag is rejected', async () => {
        await deployForQA('api-tech', 'bab91153db6bd6583157e751f2367ad63736aba1', 'Test=faketag')
            .then(() => {
                throw Error('Not expected')
            })
            .catch((e) => {
                expect(e.message).to.equal('Tag parameter is missing')
            })
    })

    it('not supported service is rejected', async () => {
        await deployForQA('fake-service', 'bab91153db6bd6583157e751f2367ad63736aba1', 'EcrTag=qa')
            .then(() => {
                throw Error('Not expected')
            })
            .catch((e) => {
                expect(e.message).to.equal('Service fake-service is not managed by this bot')
            })
    })

    it('it returns a well formatted message in case service name is supported, but AWS doesn\'t know about it', async () => {
        let serviceName = 'api-tech'
        sinon.stub(codeBuildUtils.AwsBuild.prototype, 'startBuild').resolves()
        sinon.stub(codeBuildUtils.AwsBuild.prototype, 'waitCompletion').resolves()
        sinon.stub(stsUtils, 'assumeRole').resolves(assumeRoleFakeCredentials)
        const serviceList = {
            'serviceArns': [
                "arn:aws:ecs:us-east-1:854866917001:service/mt-qa-qual/ApiFargateDynamoStack-FooFargateService"
            ]
        }
        sinon.stub(fargateUtils, 'listServices').resolves(serviceList)
        let expected: any = await deployForQA(serviceName, 'bab91153db6bd6583157e751f2367ad63736aba1', 'EcrTag=qa')
        expect(expected[0].text.text).to.be.equal(`Error during the deploying process: No service name found to restart that match the string ${consts.CODEBUILD_TO_FARGATE_SERVICE[serviceName].serviceToRestart}`)
    })

    it('it returns a well formatted message in case the assumeRole throws an exception', async () => {
        sinon.stub(codeBuildUtils.AwsBuild.prototype, 'startBuild').resolves()
        sinon.stub(codeBuildUtils.AwsBuild.prototype, 'waitCompletion').resolves()
        sinon.stub(stsUtils, 'assumeRole').throws(AWSTestError)
        let expected: any = await deployForQA('api-tech', 'bab91153db6bd6583157e751f2367ad63736aba1', 'EcrTag=qa')
        expect(expected[0].text.text).to.be.equal(`Error during the deploying process: ${AWSTestError}`)
    })

    it('it returns a well formatted message in case the updateService is rejected', async () => {
        sinon.stub(codeBuildUtils.AwsBuild.prototype, 'startBuild').resolves()
        sinon.stub(codeBuildUtils.AwsBuild.prototype, 'waitCompletion').resolves()
        sinon.stub(stsUtils, 'assumeRole').resolves(assumeRoleFakeCredentials)
        sinon.stub(fargateUtils, 'listServices').resolves(listServiceResponse)
        sinon.stub(fargateUtils, 'updateService').rejects(AWSTestError)
        let expected: any = await deployForQA('api-tech', 'bab91153db6bd6583157e751f2367ad63736aba1', 'EcrTag=qa')
        expect(expected[0].text.text).to.be.equal(`Error during the deploying process: ${AWSTestError}`)
    })

    it('it returns a well formatted message in case all operations are completed', async () => {
        let tag = 'qa'
        let service = 'api-tech'
        sinon.stub(codeBuildUtils.AwsBuild.prototype, 'startBuild').resolves()
        sinon.stub(codeBuildUtils.AwsBuild.prototype, 'waitCompletion').resolves()
        sinon.stub(stsUtils, 'assumeRole').resolves(assumeRoleFakeCredentials)
        sinon.stub(fargateUtils, 'listServices').resolves(listServiceResponse)
        sinon.stub(fargateUtils, 'updateService').resolves()
        let expected: any = await deployForQA(service, 'bab91153db6bd6583157e751f2367ad63736aba1', `EcrTag=${tag}`)
        expect(expected[0].text.text).to.be.equal(`Build done with tag "${tag}" and service "${service}" has been restarted, please check logs`)
    })

    it('it returns a well formatted message in case no services has been listed', async () => {
        sinon.stub(codeBuildUtils.AwsBuild.prototype, 'startBuild').resolves()
        sinon.stub(codeBuildUtils.AwsBuild.prototype, 'waitCompletion').resolves()
        sinon.stub(stsUtils, 'assumeRole').resolves(assumeRoleFakeCredentials)
        sinon.stub(fargateUtils, 'listServices').resolves()
        let expected: any = await deployForQA('api-tech', 'bab91153db6bd6583157e751f2367ad63736aba1', 'EcrTag=qa')
        expect(expected[0].text.text).to.be.equal('Error during the deploying process: can\'t find services')
    })

    it('it returns a well formatted message in case the startBuild is rejected', async () => {
        sinon.stub(codeBuildUtils.AwsBuild.prototype, 'startBuild').resolves()
        sinon.stub(codeBuildUtils.AwsBuild.prototype, 'waitCompletion').throws('Build failed')
        let expected: any = await deployForQA('api-tech', 'bab91153db6bd6583157e751f2367ad63736aba1', 'EcrTag=qa')
        expect(expected[0].text.text).to.be.equal('Error during the deploying process: Build failed')
    })

    it('does not restart any service in case startBuild is rejected', async () => {
        sinon.stub(codeBuildUtils.AwsBuild.prototype, 'startBuild').resolves()
        sinon.stub(codeBuildUtils.AwsBuild.prototype, 'waitCompletion').throws('Build failed')
        const updateServiceStub = sinon.stub(fargateUtils, 'updateService').rejects()
        await deployForQA('api-tech', 'bab91153db6bd6583157e751f2367ad63736aba1', 'EcrTag=qa')
        expect(updateServiceStub.notCalled).to.be.true
    })

    it('it returns a well formatted message in case the updateService is rejected', async () => {
        sinon.stub(codeBuildUtils.AwsBuild.prototype, 'startBuild').resolves()
        sinon.stub(codeBuildUtils.AwsBuild.prototype, 'waitCompletion').resolves()
        sinon.stub(stsUtils, 'assumeRole').resolves(assumeRoleFakeCredentials)
        sinon.stub(fargateUtils, 'listServices').resolves(listServiceResponse)
        sinon.stub(fargateUtils, 'updateService').rejects('Update failed')
        let expected: any = await deployForQA('api-tech', 'bab91153db6bd6583157e751f2367ad63736aba1', 'EcrTag=qa')
        expect(expected[0].text.text).to.be.equal('Error during the deploying process: Update failed')
    })
})

const listServiceResponse = {
    "serviceArns": [
        "arn:aws:ecs:us-east-1:854866917001:service/mt-qa-qual/ApiFargateDynamoStack-MQDashboardFargateService619A25EC-1668VXM7J41EC",
        "arn:aws:ecs:us-east-1:854866917001:service/mt-qa-qual/ApiFargateDynamoStack-MQConvergenceFargateService118BAB1A-DLHW0HSJMBQP",
        "arn:aws:ecs:us-east-1:854866917001:service/mt-qa-qual/ApiFargateDynamoStack-MQAlertFargateServiceA55EC06E-159S4SQ09RY7F",
        "arn:aws:ecs:us-east-1:854866917001:service/mt-qa-qual/ApiFargateDynamoStack-MQPeerServerFargateService38103501-QN3Y209PN13X",
        "arn:aws:ecs:us-east-1:854866917001:service/mt-qa-qual/ApiFargateDynamoStack-MQApiFargateService9BBC79C9-NEZLOIDCZ1B3",
        "arn:aws:ecs:us-east-1:854866917001:service/mt-qa-qual/ApiFargateDynamoStack-MQWsPosteFargateServiceC47D641A-1SVGUVX3RGW0J",
        "arn:aws:ecs:us-east-1:854866917001:service/mt-qa-qual/ApiFargateDynamoStack-MQTrackingFargateServiceB6316F07-MIT2DMVARP0G",
        "arn:aws:ecs:us-east-1:854866917001:service/mt-qa-qual/ApiFargateDynamoStack-MQGlobalSearchFargateService17C4F82A-MVTDB1AHV429",
        "arn:aws:ecs:us-east-1:854866917001:service/mt-qa-qual/ApiFargateDynamoStack-MQInvoicingFargateService3529D33D-BZCHO7K24S3D",
        "arn:aws:ecs:us-east-1:854866917001:service/mt-qa-qual/ApiFargateDynamoStack-MQRoutingFargateService23838C3D-1VA9JWXDBFJB1"
    ]
}
