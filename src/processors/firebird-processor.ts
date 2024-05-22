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
        const Firebird: any = this.connection.useClavizNodeFirebird ? require('claviz-node-firebird') : require('node-firebird');
        const db: any = await new Promise((resolve, reject) => {
            Firebird.attach(this.connection, (err: any, db: any) => {
                if (err) reject(err);
                else resolve(db);
            });
        });
        const stream = new Readable({
            objectMode: true,
            read() { }
        });
        db.sequentially(this.query, [], (row: any) => {
            if (!stream.push(row)) { }
        }, (err: any) => {
            if (err) {
                stream.emit('error', err);
            }
            stream.push(null);
            db.detach();
        });
        await processStream(stream);
    }
}
