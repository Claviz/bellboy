import { IDatabaseDestinationConfig, IDbConnection } from '../../types';
import { Destination } from './destination';

export abstract class DatabaseDestination extends Destination {

    protected table: string;
    protected connection: IDbConnection;

    constructor(config: IDatabaseDestinationConfig) {
        super(config);
        this.table = config.table;
        this.connection = config.connection;
    }

    async loadBatch(data: any[]) {
        await super.loadBatch(data);
    }
}
