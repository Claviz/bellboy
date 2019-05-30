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
        const connection = await db.connect();
        const stream = connection.client.query(query)
        await processStream(stream);
        connection.done();
    }
}
