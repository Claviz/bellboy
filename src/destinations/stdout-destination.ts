import { IStdoutDestinationConfig } from '../types';
import { Destination } from './base/destination';

export class StdoutDestination extends Destination {

    protected asTable: boolean;

    constructor(config?: IStdoutDestinationConfig) {
        super(config);
        this.asTable = false;
        if (config) {
            this.asTable = config.asTable || false;
        }
    }

    async loadBatch(data: any[]) {
        this.asTable ? console.table(data) : console.log(data);
    }
}
