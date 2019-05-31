import { ReadStream } from 'fs';
import { Readable } from 'stream';

import { emit, event, IDestination, IJob, IJobConfig, IProcessor, IReporter } from './types';

export class Job implements IJob {

    protected closed: boolean = false;
    protected events: { [fn: string]: emit[] } = {};
    protected reporters: IReporter[];

    constructor(protected processor: IProcessor, protected destinations: IDestination[], config: IJobConfig = {}) {
        this.reporters = config.reporters || [];
        for (let i = 0; i < this.reporters.length; i++) {
            this.reporters[i].report(this);
        }
    }

    async run() {
        await this.emit('startProcessing', this.processor, this.destinations);
        try {
            await this.processor.process(
                async (readStream, ...args: any) => (await this.processStream(readStream, ...args)),
            );
            await this.emit('endProcessing');
        } catch (err) {
            await this.emit('processingError', err);
        }
    }

    on(eventName: 'endProcessing', fn: (() => Promise<any>)): any
    on(eventName: 'loadedBatch', fn: ((destinationIndex: number, data: any[]) => Promise<any>)): any
    on(eventName: 'processingError', fn: ((error: any) => Promise<any>)): any
    on(eventName: 'loadingBatchError', fn: ((destinationIndex: number, data: any[], error: any) => Promise<any>)): any
    on(eventName: 'loadingBatch', fn: ((destinationIndex: number, data: any[]) => Promise<any>)): any
    on(eventName: 'transformedBatch', fn: ((destinationIndex: number, data: any) => Promise<any>)): any
    on(eventName: 'transformingBatchError', fn: ((destinationIndex: number, data: any[], error: any) => Promise<any>)): any
    on(eventName: 'transformingBatch', fn: ((destinationIndex: number, data: any[]) => Promise<any>)): any
    on(eventName: 'endProcessingRow', fn: (() => Promise<any>)): any
    on(eventName: 'rowGenerationError', fn: ((destinationIndex: number, data: any, error: any) => Promise<any>)): any
    on(eventName: 'rowGenerated', fn: ((destinationIndex: number, row: any) => Promise<any>)): any
    on(eventName: 'startProcessingRow', fn: ((row: any) => Promise<any>)): any
    on(eventName: 'startProcessing', fn: (() => Promise<any>)): any
    on(eventName: 'endProcessingStream', fn: ((...args: any) => Promise<any>)): any
    on(eventName: 'startProcessingStream', fn: ((...args: any) => Promise<any>)): any
    on(eventName: string, fn: event) {
        const event = this.events[eventName];
        if (!event) {
            this.events[eventName] = [fn];
        } else {
            this.events[eventName].push(fn);
        }
    }

    protected async loadBatch(destinationIndex: number, destination: IDestination, data: any[]) {
        if (data.length) {
            if (destination.batchTransformer) {
                await this.emit('transformingBatch', destinationIndex, data);
                try {
                    data = await destination.batchTransformer(data);
                    await this.emit('transformedBatch', destinationIndex, data);
                } catch (err) {
                    await this.emit('transformingBatchError', destinationIndex, data, err);
                }
            }
            if (!destination.disableLoad) {
                await this.emit('loadingBatch', destinationIndex, data);
                try {
                    await destination.loadBatch(data);
                    await this.emit('loadedBatch', destinationIndex, data);
                } catch (err) {
                    await this.emit('loadingBatchError', destinationIndex, data, err);
                }
            }
        }
    }

    protected async getNextRecord(readStream: ReadStream | Readable) {
        return new Promise<{ data: any[][]; header: any; }>((resolve, reject) => {
            const destinations = this.destinations;
            const emit = (eventName: string, ...args: any) => this.emit(eventName, ...args);
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
                resolve();
            }

            function errorEnding(error: any) {
                removeListeners();
                reject(error);
            }

            async function handleData(obj: any) {
                readStream.pause();
                removeListeners();
                await emit('startProcessingRow', obj);
                for (let i = 0; i < destinations.length; i++) {
                    const recordGeneratorFn = destinations[i].recordGenerator;
                    if (!recordGeneratorFn) {
                        data[i].push(obj);
                        // await emit('rowGenerated', i, obj);
                    } else {
                        const wrapper = async function* (recordGenerator: AsyncIterableIterator<{}>) {
                            try {
                                for await (const record of recordGenerator) {
                                    yield record;
                                }
                            } catch (err) {
                                await emit('rowGenerationError', i, obj, err);
                            }
                        }
                        let recordGenerator = wrapper(recordGeneratorFn(obj));
                        for await (const record of recordGenerator) {
                            data[i].push(record);
                            await emit('rowGenerated', i, record);
                        }
                    }
                }
                await emit('endProcessingRow');
                resolve({ data, header });
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

    protected async processStream(readStream: ReadStream | Readable, ...args: any) {
        this.emit('startProcessingStream', ...args);
        this.closed = false;
        const results: any[][] = [];
        const destinations = this.destinations;
        for (let j = 0; j < destinations.length; j++) {
            results[j] = [];
        }
        let processedRowCount = 0;
        let header;

        while (!this.closed && (readStream.readable || (readStream as any).stream)) {
            const result = await this.getNextRecord(readStream);
            processedRowCount++;
            if (result) {
                if (result.header) {
                    header = result.header;
                }
                for (let i = 0; i < destinations.length; i++) {
                    results[i].push(...result.data[i]);
                    while (destinations[i].batchSize && results[i].length >= destinations[i].batchSize) {
                        const destination = destinations[i];
                        const toSend = results[i].splice(0, destination.batchSize);
                        await this.loadBatch(i, destination, toSend);
                    }
                }
            }
            const shouldStop = this.processor.rowLimit === processedRowCount;
            if (shouldStop) {
                readStream.destroy();
            }
        }
        for (let i = 0; i < destinations.length; i++) {
            if (results[i].length) {
                await this.loadBatch(i, destinations[i], results[i]);
            }
        }
        this.emit('endProcessingStream', ...args);
        return header;
    }

    protected async emit(eventName: string, ...args: any) {
        const fn = this.events[eventName];
        if (fn) {
            for (let i = 0; i < fn.length; i++) {
                let result;
                try {
                    result = await fn[i].apply(this, args);
                } catch (err) { }
                if (result) {
                    this.closed = true;
                }
            }
        }
    }
}
