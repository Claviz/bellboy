import { Readable } from 'stream';
import { IMySqlDbConnection, IMySqlProcessorConfig, processStream } from '../types';
import { DatabaseProcessor } from './base/database-processor';
import mysql from 'mysql2-stream-fix/promise';

export class MySqlProcessor extends DatabaseProcessor {

    protected connection: IMySqlDbConnection;

    constructor(config: IMySqlProcessorConfig) {
        super(config);
        this.connection = config.connection;
    }

    async process(processStream: processStream) {
        const dbConnection = mysql.createPool(this.connection);
        const query = dbConnection.pool.query(this.query).stream();
        await processStream(query);
        await dbConnection.end();
    }
}
