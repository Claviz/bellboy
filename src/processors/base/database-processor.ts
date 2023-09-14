import { Processor } from './processor';
import { IDatabaseProcessorConfig } from '../../types';

export abstract class DatabaseProcessor extends Processor {

    protected query: string;

    constructor(config: IDatabaseProcessorConfig) {
        super(config);
        if (!config.query) {
            throw new Error(`No query specified.`);
        }
        this.query = config.query;
    }
}
