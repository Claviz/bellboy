import { IMssqlProcessorConfig, processStream } from '../types';
import { getDb } from '../utils';
import { DatabaseProcessor } from './base/database-processor';

export class MssqlProcessor extends DatabaseProcessor {

    constructor(config: IMssqlProcessorConfig) {
        super(config);
    }

    async process(processStream: processStream) {
        const db = await getDb(this.connection, 'mssql');
        const dbRequest = db.request();
        const readStream = dbRequest.toReadableStream();
        dbRequest.query(this.query);
        await processStream(readStream);
        await db.close();
    }
}
