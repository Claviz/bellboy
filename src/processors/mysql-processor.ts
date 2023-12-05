import { Readable } from 'stream';
import { IMySqlDbConnection, IMySqlProcessorConfig, processStream } from '../types';
import { DatabaseProcessor } from './base/database-processor';
import mysql from 'mysql2/promise';

export class MySqlProcessor extends DatabaseProcessor {

    protected connection: IMySqlDbConnection;

    constructor(config: IMySqlProcessorConfig) {
        super(config);
        this.connection = config.connection;
    }

    async process(processStream: processStream) {
        const dbConnection = mysql.createPool(this.connection);
        const query = dbConnection.pool.query(this.query);
        const stream = new Readable({ objectMode: true });
        stream._read = () => {
            //dbConnection && dbConnection.resume();
        };
        query.on('result', row => {
            if (!stream.push(row)) {
                dbConnection.pause();
            }
            stream.emit('result', row);
        });
        query.on('error', err => {
            stream.emit('error', err);
        });
        query.on('end', () => {
            stream.push(null);
            setImmediate(() => {
                stream.emit('close');
            })
        });
        query.on('fields', fields => {
            stream.emit('fields', fields);
        });
        await processStream(stream);
        await dbConnection.end();
    }
}
