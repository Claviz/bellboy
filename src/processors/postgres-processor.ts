import { IDatabaseConfig } from '../types';
import { getDb } from '../utils';
import { DatabaseProcessor } from './internal/database-processor';

const QueryStream = require('pg-query-stream');

export class PostgresProcessor extends DatabaseProcessor {
    /** @internal */
    protected config: IDatabaseConfig;

    constructor(config: IDatabaseConfig) {
        super(config);
        this.config = config;
    }

    async process() {
        await super.process();
        await super.emit('startProcessing');
        const query = new QueryStream(this.config.query);
        const db = await getDb(this.config.connection, 'postgres');
        const connection = await db.connect();
        const stream = connection.client.query(query)
        await super.processStream(stream);
        connection.done();
        await super.emit('endProcessing');
    }
}
