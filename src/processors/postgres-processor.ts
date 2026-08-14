import { IPostgresProcessorConfig, IPostgresDbConnection, processStream } from '../types';
import { getDb } from '../utils';
import { DatabaseProcessor } from './base/database-processor';

const QueryStream = require('pg-query-stream');

export class PostgresProcessor extends DatabaseProcessor {

    protected connection: IPostgresDbConnection;

    constructor(config: IPostgresProcessorConfig) {
        super(config);
        this.connection = config.connection;
    }

    async process(processStream: processStream) {
        const query = new QueryStream(this.query);
        const db = await getDb(this.connection, 'postgres');
        let dbConnection: any;
        let stream: any;

        try {
            dbConnection = await db.connect();
            stream = dbConnection.client.query(query);
            await processStream(stream);
        } catch (err) {
            try {
                stream?.destroy();
            } catch (_) { }
            throw err;
        } finally {
            dbConnection?.done();
        }
    }
}
