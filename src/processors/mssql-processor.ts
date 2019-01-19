import { IDatabaseConfig } from '../interfaces/destination';
import { getDb } from '../utils';
import { DatabaseProcessor } from './database-processor';

export class MssqlProcessor extends DatabaseProcessor {
    /** @internal */
    protected config: IDatabaseConfig;

    constructor(config: IDatabaseConfig) {
        super(config);
        this.config = config;
    }

    async process() {
        await super.process();
        await super.emit('processingMssqlQuery');
        const db = await getDb(this.config.connection, 'mssql');
        const readStream = db.request();
        readStream.stream = true;
        readStream.query(this.config.query);
        readStream.pause();
        await super.processStream(readStream);
        await super.emit('processedMssqlQuery');
    }
}
