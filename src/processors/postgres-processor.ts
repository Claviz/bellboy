import { IDatabaseConfig } from '../interfaces/destination';
import { getDb } from '../utils';
import { DatabaseProcessor } from './database-processor';

const es = require('event-stream');

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
        await db.stream(new QueryStream(this.config.query), async (s: any) => {
            const readStream = s.pipe(es.mapSync((x: any) => x));
            readStream.pause();
            await super.processStream(readStream);
            await super.emit('processedPostgresQuery');
        });
    }
}
