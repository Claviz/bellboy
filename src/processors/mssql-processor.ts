import { Readable } from 'stream';

import { IMssqlProcessorConfig, IMssqlDbConnection, processStream } from '../types';
import { DatabaseProcessor } from './base/database-processor';

export class MssqlProcessor extends DatabaseProcessor {

    protected connection: IMssqlDbConnection;

    constructor(config: IMssqlProcessorConfig) {
        super(config);
        this.connection = config.connection;
    }

    async process(processStream: processStream) {
        let done = false;
        const readStream = new Readable({
            objectMode: true,
            async read() {
                if (data.length === 0) {
                    if (!done) {
                        try {
                            await processRows();
                        } catch (err) {
                            this.emit('error', err);
                        }
                    } else {
                        return this.push(null);
                    }
                }
                const rowData = data.shift() || null;
                this.push(rowData);
            },
        });
        const data: any[] = [];
        // Each run owns its pool: a pool shared between jobs would be closed by the first one to finish.
        const sql = this.connection.driver ?? await import('mssql');
        const pool = new sql.ConnectionPool({ ...this.connection } as any);
        const db = await pool.connect();
        const dbRequest = db.request();
        dbRequest.on('error', (err: any) => {
            if (err.code !== 'ECANCEL') {
                readStream.emit('error', err);
            }
        });
        readStream.on('close', () => {
            dbRequest.cancel();
        });
        dbRequest.stream = true;
        dbRequest.query(this.query);
        const processRows = async () => {
            return new Promise<void>(async (resolve, reject) => {
                function removeListeners() {
                    dbRequest.removeListener('row', onRow);
                    dbRequest.removeListener('done', onDone);
                    dbRequest.removeListener('error', onError);
                };
                async function onRow(row: any) {
                    data.push(row);
                    if (data.length >= 1000) {
                        dbRequest.pause();
                        removeListeners();
                        resolve();
                    }
                };
                async function onDone() {
                    done = true;
                    removeListeners();
                    resolve();
                };
                async function onError(err: any) {
                    removeListeners();
                    reject(err);
                };
                dbRequest.on('row', onRow);
                dbRequest.on('done', onDone);
                dbRequest.on('error', onError);
                dbRequest.resume();
            });
        };
        dbRequest.pause();
        try {
            await processStream(readStream);
        } finally {
            await pool.close();
        }
    }
}
