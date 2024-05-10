import Firebird from 'node-firebird';
import { Readable } from 'stream';

import { IFirebirdDbConnection, IFirebirdProcessorConfig, processStream } from '../types';
import { DatabaseProcessor } from './base/database-processor';

export class FirebirdProcessor extends DatabaseProcessor {
    protected connection: IFirebirdDbConnection;

    constructor(config: IFirebirdProcessorConfig) {
        super(config);
        this.connection = config.connection;
    }

    async process(processStream: processStream) {
        const db = await new Promise<Firebird.Database>((resolve, reject) => {
            Firebird.attach(this.connection, (err, db) => {
                if (err) reject(err);
                else resolve(db);
            });
        });
        const stream = new Readable({
            objectMode: true,
            read() { }
        });
        db.sequentially(this.query, [], (row) => {
            if (!stream.push(row)) { }
        }, (err) => {
            if (err) {
                stream.emit('error', err);
            }
            stream.push(null);
            db.detach();
        });
        await processStream(stream);
    }
}
