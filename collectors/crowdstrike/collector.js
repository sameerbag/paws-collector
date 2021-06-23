/* -----------------------------------------------------------------------------
 * @copyright (C) 2021, Alert Logic, Inc
 * @doc
 *
 * crowdstrike class.
 *
 * @end
 * -----------------------------------------------------------------------------
 */
'use strict';

const moment = require('moment');
const PawsCollector = require('@alertlogic/paws-collector').PawsCollector;
const parse = require('@alertlogic/al-collector-js').Parse;
const packageJson = require('./package.json');


const typeIdPaths = [
    // enter your type paths in the form { path: ['myKey'] }
];

const tsPaths = [
    // enter your timestamp paths in the form { path: ['myKey'] }
];


class CrowdstrikeCollector extends PawsCollector {
    constructor(context, creds) {
        super(context, creds, packageJson.version);
    }
    
    pawsInitCollectionState(event, callback) {
        const startTs = process.env.paws_collection_start_ts ? 
                process.env.paws_collection_start_ts :
                    moment().toISOString();
        const endTs = moment(startTs).add(this.pollInterval, 'seconds').toISOString();
        const initialState = {
            // TODO: define initial collection state specific to your collector.
            // You will get this state back with each invocation
            since: startTs,
            until: endTs,
            poll_interval_sec: 1
        };
        return callback(null, initialState, 1);
    }
    
    pawsGetLogs(state, callback) {
        let collector = this;
        console.info(`CROW000001 Collecting data from ${state.since} till ${state.until}`);
        const newState = collector._getNextCollectionState(state);
        console.info(`CROW000002 Next collection in ${newState.poll_interval_sec} seconds`);
        return callback(null, [], newState, newState.poll_interval_sec);
    }
    
    _getNextCollectionState(curState) {
        const nowMoment = moment();
        const curUntilMoment = moment(curState.until);
        
        // Check if current 'until' is in the future.
        const nextSinceTs = curUntilMoment.isAfter(nowMoment) ?
                nowMoment.toISOString() :
                curState.until;

        const nextUntilMoment = moment(nextSinceTs).add(this.pollInterval, 'seconds');
        // Check if we're behind collection schedule and need to catch up.
        const nextPollInterval = nowMoment.diff(nextUntilMoment, 'seconds') > this.pollInterval ?
                1 : this.pollInterval;
        
        return  {
            // TODO: define the next collection state.
            // This needs to be in the smae format as the intial colletion state above
             since: nextSinceTs,
             until: nextUntilMoment.toISOString(),
             poll_interval_sec: nextPollInterval
        };
    }
    
    pawsFormatLog(msg) {
        // TODO: double check that this message parsing fits your use case
        let collector = this;

        const ts = parse.getMsgTs(msg, tsPaths);
        const typeId = parse.getMsgTypeId(msg, typeIdPaths);
        
        let formattedMsg = {
            messageTs: ts.sec,
            priority: 11,
            progName: 'CrowdstrikeCollector',
            message: JSON.stringify(msg),
            messageType: 'json/crowdstrike',
            application_id: collector.application_id
        };
        
        if (typeId !== null && typeId !== undefined) {
            formattedMsg.messageTypeId = `${typeId}`;
        }
        if (ts.usec) {
            formattedMsg.messageTsUs = ts.usec;
        }
        return formattedMsg;
    }
}

module.exports = {
    CrowdstrikeCollector: CrowdstrikeCollector
}
