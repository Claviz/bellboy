import { IDatabaseConfig } from '../interfaces/destination';
import { Processor } from './processor';

export abstract class DatabaseProcessor extends Processor {
    /** @internal */
    protected config: IDatabaseConfig;

    constructor(config: IDatabaseConfig) {
        super(config);
        this.config = config;
    }

    async process() {
        await super.process();
        if (!this.config.query) {
            throw new Error(`No query specified.`);
        }
        if (!this.config.connection) {
            throw new Error(`No connection specified.`);
        }
    }
}