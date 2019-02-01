import { ReadStream } from 'fs';

import { Destination, emit, event, IConfig, IProcessor } from '../../types';
import { insertToMsSql, insertToPostgres, sendRequest } from '../../utils';
import { Readable } from 'stream';

export abstract class Processor implements IProcessor {
    /** @internal */
    protected config: IConfig;
    /** @internal */
    protected events: { [fn: string]: emit[] };
    /** @internal */
    closed = false;

    constructor(config: IConfig) {
        this.config = config;
        this.events = {};
    }

    /** @internal */
    protected async sendToDestination(destination: Destination, data: any[]) {
        if (data.length) {
            if (destination.batchTransformer) {
                await this.emit('transformingData', destination);
                data = await destination.batchTransformer(data);
                await this.emit('transformedData', destination);
            }
            await this.emit('loadingData', destination);
            try {
                if (destination.type === 'postgres') {
                    await insertToPostgres(data, destination);
                } else if (destination.type === 'mssql') {
                    await insertToMsSql(data, destination);
                } else if (destination.type === 'http') {
                    await sendRequest(data, destination);
                } else if (destination.type === 'custom') {
                    await destination.load(data);
                } else {
                    console.table(data);
                }
            } catch (err) {
                console.log(err);
            }
            await this.emit('loadedData', destination);
        }
    }

    /** @internal */
    protected async getNextRecord(readStream: ReadStream | Readable) {
        return new Promise<{ data: any[][]; header: any }>((resolve, reject) => {
            const destinations = this.config.destinations;
            let data: any[][] = [];
            if (destinations) {
                for (let i = 0; i < destinations.length; i++) {
                    data[i] = [];
                }
            }
            let header: any = null;

            function niceEnding() {
                removeListeners();
                resolve({ data, header });
            }

            function errorEnding(error: any) {
                removeListeners();
                reject(error);
            }

            async function handleData(obj: any) {
                readStream.pause();
                removeListeners();
                if (destinations) {
                    for (let i = 0; i < destinations.length; i++) {
                        try {
                            const recordGeneratorFn = destinations[i].recordGenerator;
                            if (!recordGeneratorFn) {
                                data[i].push({ ...obj });
                            } else {
                                const recordGenerator = recordGeneratorFn({ ...obj });
                                for await (const record of recordGenerator) {
                                    data[i].push(record);
                                }
                            }
                        } catch (err) {
                            console.log(err);
                        } finally {
                        }
                    }
                    resolve({ data, header });
                } else {
                    resolve({ data: obj, header });
                }
            }

            function handleHeader(x: any) {
                header = x;
            }

            function removeListeners() {
                readStream.removeListener('close', niceEnding);
                readStream.removeListener('end', niceEnding);
                readStream.removeListener('error', errorEnding);
                readStream.removeListener('data', handleData);
                readStream.removeListener('row', handleData);
                readStream.removeListener('header', handleHeader);
            }

            (readStream as any).on('close', niceEnding);
            (readStream as any).on('end', niceEnding);
            (readStream as any).on('error', errorEnding);
            (readStream as any).on('data', handleData);
            (readStream as any).on('row', handleData);
            (readStream as any).on('header', handleHeader);
            readStream.resume();
        });
    }

    /** @internal */
    protected async processStream(readStream: ReadStream | Readable) {
        const results: any[][] = [];
        for (let j = 0; j < this.config.destinations.length; j++) {
            results[j] = [];
        }
        let header;

        while (!this.closed && (readStream.readable || (readStream as any).stream)) {
            let result;
            try {
                result = await this.getNextRecord(
                    readStream,
                );
            } catch (err) { }
            if (result) {
                if (result.header) {
                    header = result.header;
                }
                for (let j = 0; j < this.config.destinations.length; j++) {
                    results[j].push(...result.data[j]);
                    while (results[j].length >= (this.config.destinations[j].batchSize || 10000)) {
                        const destination = this.config.destinations[j];
                        const toSend = results[j].splice(0, destination.batchSize);
                        await this.sendToDestination(destination, toSend);
                    }
                }
            }
        }
        for (let j = 0; j < this.config.destinations.length; j++) {
            if (results[j].length) {
                await this.sendToDestination(this.config.destinations[j], results[j]);
            }
        }
        return header;
    }


    on(eventName: string, fn: event) {
        const event = this.events[eventName];
        if (!event) {
            this.events[eventName] = [fn];
        } else {
            this.events[eventName].push(fn);
        }
    }

    /** @internal */
    protected async emit(eventName: string, ...args: any) {
        const fn = this.events[eventName];
        if (this.config.verbose) {
            console.log({ eventName, args });
        }
        if (fn) {
            for (let i = 0; i < fn.length; i++) {
                try {
                    const result = await fn[i].apply(this, args);
                    if (result) {
                        this.closed = true;
                    }
                } catch (err) {
                    console.log(err);
                }
            }
        }
    }

    async process() {
        if (!this.config.destinations || this.config.destinations.length === 0) {
            throw Error('At least one destination is required.');
        }
        for (let i = 0; i < this.config.destinations.length; i++) {
            if (!this.config.destinations[i].batchSize) {
                throw Error('Batch size must be specified for destination.');
            }
        }
    }
}
