import { IStdoutDestinationConfig } from '../types';
import { Destination } from './base/destination';

export class StdoutDestination extends Destination {

    protected asTable: boolean;

    constructor(config: IStdoutDestinationConfig) {
        super(config);
        this.asTable = config.asTable ? true : false;
    }

    async loadBatch(data: any[]) {
        this.asTable ? console.table(data) : console.log(data);
    }
}
