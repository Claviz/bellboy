import { Readable } from 'stream';

import { IMssqlProcessorConfig, processStream } from '../types';
import { getDb } from '../utils';
import { DatabaseProcessor } from './base/database-processor';

export class MssqlProcessor extends DatabaseProcessor {

    constructor(config: IMssqlProcessorConfig) {
        super(config);
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
                const rowData = data.shift();
                this.push(rowData);
            },
        });
        const data: any[] = [];
        const db = await getDb(this.connection, 'mssql');
        const dbRequest = db.request();
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
                    if (data.length >= 10000) {
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
        }
        dbRequest.pause();
        await processStream(readStream);
    }
}
