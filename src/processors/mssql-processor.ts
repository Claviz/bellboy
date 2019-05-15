import { IMssqlProcessorConfig, processStream, emit } from '../types';
import { getDb } from '../utils';
import { DatabaseProcessor } from './base/database-processor';

export class MssqlProcessor extends DatabaseProcessor {

    constructor(config: IMssqlProcessorConfig) {
        super(config);
    }

    async process(processStream: processStream, emit: emit) {
        const db = await getDb(this.connection, 'mssql');
        const readStream = db.request();
        readStream.stream = true;
        readStream.query(this.query);
        readStream.pause();
        await processStream(readStream);
    }
}
