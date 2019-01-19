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
        await super.emit('processingPostgresQuery');
        const db = await getDb(this.config.connection, 'postgres');
        await db.stream(new QueryStream(this.config.query), async (stream: any) => {
            const readStream = stream.pause();
            await super.processStream(readStream);
            await super.emit('processedPostgresQuery');
        });
    }
}
