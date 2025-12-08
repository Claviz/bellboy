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
        const Firebird: any = this.connection.useClavizNodeFirebird
            ? require('claviz-node-firebird')
            : require('node-firebird');

        const db: any = await new Promise((resolve, reject) => {
            Firebird.attach(this.connection, (err: any, db: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(db);
                }
            });
        });

        let resume: (() => void) | null = null;

        const stream = new Readable({
            objectMode: true,
            read(this: Readable) {
                if (resume) {
                    const r = resume;
                    resume = null;
                    r();
                }
            }
        });

        db.sequentially(
            this.query,
            [],
            (row: any) => {
                const ok = stream.push(row);
                if (ok) {
                    return;
                }
                return new Promise<void>((resolve) => {
                    resume = resolve;
                });
            },
            (err: any) => {
                if (err) {
                    stream.emit('error', err);
                }
                stream.push(null);
                db.detach();
            }
        );

        await processStream(stream);
    }
}