import { IPostgresProcessorConfig, processStream } from '../types';
import { getDb } from '../utils';
import { DatabaseProcessor } from './base/database-processor';

const QueryStream = require('pg-query-stream');

export class PostgresProcessor extends DatabaseProcessor {

    constructor(config: IPostgresProcessorConfig) {
        super(config);
    }

    async process(processStream: processStream) {
        const query = new QueryStream(this.query);
        const db = await getDb(this.connection, 'postgres');
        const dbConnection = await db.connect();
        const stream = dbConnection.client.query(query);
        await processStream(stream);
        dbConnection.done();
    }
}
