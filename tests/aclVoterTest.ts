import {addFixtureToDynamo, setupDynamo} from './utils'
import {Right} from '../models/Right'
import {canUserCallMe} from '../aclVoter'
import * as consts from '../consts'
import * as uuid from 'uuid'

import {expect} from 'chai'


describe('ACLVoter @integration', () => {
    let functionName
    before( async () => {
        functionName = uuid.v4()
        await setupDynamo()
    })

    it('returns false if asking for a non existing right', async () => {
        const right = 'AllowUsers2' //it's not included in the known rights
        const allowUserFixture = new Right({
            functionName,
            right,
            ids: 'UA333343,UA3465654'
        })

        expect(consts.KNOWN_RIGHTS).not.to.include(right)

        await addFixtureToDynamo(allowUserFixture)
        const expected = await canUserCallMe(['UA333343'], functionName)
        expect(expected).to.be.false
    })

    it('return true if user has allow user right', async () => {
        const allowUserFixture = new Right({
            functionName,
            right: 'AllowUsers',
            ids: 'UA333343,UA3465654'
        })
        await addFixtureToDynamo(allowUserFixture)
        const expected = await canUserCallMe(['UA333343'], functionName)
        expect(expected).to.be.true
    })

    it('return true if user has allow group right', async () => {
        const allowGroupsFixture = new Right({
            functionName,
            right: 'AllowGroups',
            ids: 'SA3453435'
        })
        await addFixtureToDynamo(allowGroupsFixture)
        const expected = await canUserCallMe(['UA1111111', 'SA3453435'], functionName)
        expect(expected).to.be.true
    })

    it('return false if user does not have any right', async () => {
        const expected = await canUserCallMe(['UA99999999'], functionName)
        expect(expected).to.be.false
    })

    it('return false if user is allowed but his Slack group is denied', async () => {
        const allowUserFixture = new Right({
            functionName,
            right: 'AllowUsers',
            ids: 'UA333343'
        })
        await addFixtureToDynamo(allowUserFixture)

        const testDenyRight = new Right({
            functionName,
            right: 'DenyGroups',
            ids: 'SA3453434'
        })
        await addFixtureToDynamo(testDenyRight)

        const expected = await canUserCallMe(['UA333343', 'SA3453434'], functionName)
        expect(expected).to.be.false
    })

    it('return false if group is allowed but user is denied', async () => {
        const denyUserFixture = new Right({
            functionName,
            right: 'DenyUsers',
            ids: 'U0344544'
        })
        await addFixtureToDynamo(denyUserFixture)

        const allowGroupFixture = new Right({
            functionName: 'handleDeployForQA',
            right: 'AllowGroups',
            ids: 'SA454223223'
        })
        await addFixtureToDynamo(allowGroupFixture)

        const expected = await canUserCallMe(['U0344544', 'SA454223223'], functionName)
        expect(expected).to.be.false
    })
})
