import { ReadStream } from 'fs';
import { Readable } from 'stream';

import { emit, event, IJob, IDestination, IProcessor, IJobConfig } from './types';

export class Job implements IJob {

    protected closed: boolean = false;
    protected verbose: boolean;
    protected events: { [fn: string]: emit[] } = {};

    constructor(protected processor: IProcessor, protected destinations: IDestination[], options: IJobConfig = {}) {
        this.verbose = !!options.verbose;
    }

    async run() {
        await this.emit('startProcessing');
        await this.processor.process(
            async (readStream) => (await this.processStream(readStream)),
            async (eventName, ...args) => (await this.emit(eventName, ...args)),
        );
        await this.emit('endProcessing');
    }

    on(eventName: string, fn: event) {
        const event = this.events[eventName];
        if (!event) {
            this.events[eventName] = [fn];
        } else {
            this.events[eventName].push(fn);
        }
    }

    protected async loadBatch(destination: IDestination, data: any[]) {
        if (data.length) {
            if (destination.batchTransformer) {
                await this.emit('transformingBatch');
                data = await destination.batchTransformer(data);
                await this.emit('transformedBatch');
            }
            await this.emit('loadingBatch');
            try {
                await destination.loadBatch(data);
            } catch (err) {
                await this.emit('loadingBatchError', err);
            }
            await this.emit('loadedBatch');
        }
    }

    protected async getNextRecord(readStream: ReadStream | Readable) {
        return new Promise<{ data: any[][]; header: any; }>((resolve, reject) => {
            const destinations = this.destinations;
            let data: any[][] = [];
            if (destinations) {
                for (let i = 0; i < destinations.length; i++) {
                    data[i] = [];
                }
            }
            let header: any = null;

            const niceEnding = () => {
                removeListeners();
                this.closed = true;
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
                        const recordGeneratorFn = destinations[i].recordGenerator;
                        if (!recordGeneratorFn) {
                            data[i].push(obj);
                        } else {
                            const recordGenerator = recordGeneratorFn(obj);
                            try {
                                for await (const record of recordGenerator) {
                                    data[i].push(record);
                                }
                            } catch (err) {
                                reject(err);
                            }
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
                readStream.removeListener('done', niceEnding);
                readStream.removeListener('error', errorEnding);
                readStream.removeListener('data', handleData);
                readStream.removeListener('row', handleData);
                readStream.removeListener('line', handleData);
                readStream.removeListener('header', handleHeader);
            }

            (readStream as any).on('close', niceEnding);
            (readStream as any).on('end', niceEnding);
            (readStream as any).on('done', niceEnding);
            (readStream as any).on('error', errorEnding);
            (readStream as any).on('data', handleData);
            (readStream as any).on('row', handleData);
            (readStream as any).on('line', handleData);
            (readStream as any).on('header', handleHeader);
            readStream.resume();
        });
    }

    protected async processStream(readStream: ReadStream | Readable) {
        this.closed = false;
        const results: any[][] = [];
        const destinations = this.destinations;
        for (let j = 0; j < destinations.length; j++) {
            results[j] = [];
        }
        let header;

        while (!this.closed && (readStream.readable || (readStream as any).stream)) {
            const result = await this.getNextRecord(readStream);
            if (result) {
                if (result.header) {
                    header = result.header;
                }
                for (let j = 0; j < destinations.length; j++) {
                    results[j].push(...result.data[j]);
                    while (destinations[j].batchSize && results[j].length >= destinations[j].batchSize) {
                        const destination = destinations[j];
                        const toSend = results[j].splice(0, destination.batchSize);
                        await this.loadBatch(destination, toSend);
                    }
                }
            }
        }
        for (let j = 0; j < destinations.length; j++) {
            if (results[j].length) {
                await this.loadBatch(destinations[j], results[j]);
            }
        }
        return header;
    }

    protected async emit(eventName: string, ...args: any) {
        const fn = this.events[eventName];
        if (this.verbose) {
            console.log({ eventName, args });
        }
        if (fn) {
            for (let i = 0; i < fn.length; i++) {
                const result = await fn[i].apply(this, args);
                if (result) {
                    this.closed = true;
                }
            }
        }
    }
}
