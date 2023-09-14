import { IDatabaseDestinationConfig } from '../../types';
import { Destination } from './destination';

export abstract class DatabaseDestination extends Destination {

    protected table: string;

    constructor(config: IDatabaseDestinationConfig) {
        super(config);
        this.table = config.table;
    }

    async loadBatch(data: any[]) {
        await super.loadBatch(data);
    }
}
