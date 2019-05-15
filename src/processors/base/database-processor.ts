import { Processor } from './processor';
import { IDatabaseProcessorConfig } from '../../types';

export abstract class DatabaseProcessor extends Processor {

    protected query: string;
    protected connection: any;

    constructor(config: IDatabaseProcessorConfig) {
        super(config);
        if (!config.query) {
            throw new Error(`No query specified.`);
        }
        this.query = config.query;
        if (!config.connection) {
            throw new Error(`No connection specified.`);
        }
        this.connection = config.connection;
    }
}