import { Readable } from 'stream';

import { emit, event, IDestination, IJob, IJobConfig, IProcessor, IReporter } from './types';

export class Job implements IJob {

    protected events: { [fn: string]: emit[] } = {};
    protected reporters: IReporter[];
    protected anyEvent: emit[] = [];
    protected stopped = false;

    constructor(protected processor: IProcessor, protected destinations: IDestination[], config: IJobConfig = {}) {
        this.reporters = config.reporters || [];
        for (let i = 0; i < this.reporters.length; i++) {
            this.reporters[i].report(this);
        }
    }

    stop(message?: string) { }

    async run() {
        let readStream: Readable;
        let errorMessage: string | undefined;
        this.stop = (message?: string) => {
            this.stopped = true;
            if (readStream) {
                readStream.destroy();
            }
            errorMessage = message;
        };
        await this.emit('startProcessing', this.processor, this.destinations);
        if (!this.stopped) {
            try {
                await this.processor.process(async (_readStream: Readable, ...args: any[]) => {
                    readStream = _readStream;
                    await this.emit('startProcessingStream', ...args);
                    if (!this.stopped) {
                        const results: any[][] = [];
                        for (let j = 0; j < this.destinations.length; j++) {
                            results[j] = [];
                        }
                        let processedRowCount = 0;
                        for await (const row of readStream) {
                            await this.emit('startProcessingRow', row);
                            if (!this.stopped) {
                                for (let i = 0; i < this.destinations.length; i++) {
                                    const recordGeneratorFn = this.destinations[i].recordGenerator;
                                    if (!recordGeneratorFn) {
                                        results[i].push(row);
                                    } else {
                                        try {
                                            for await (const record of recordGeneratorFn(row)) {
                                                results[i].push(record);
                                                await this.emit('rowGenerated', i, record);
                                            }
                                        } catch (err) {
                                            await this.emit('rowGenerationError', i, row, err);
                                        }
                                    }
                                }
                            }
                            await this.emit('endProcessingRow');
                            for (let i = 0; i < this.destinations.length; i++) {
                                while (this.destinations[i].batchSize && results[i].length >= this.destinations[i].batchSize) {
                                    const destination = this.destinations[i];
                                    const toSend = results[i].splice(0, destination.batchSize);
                                    await this.loadBatch(i, destination, toSend);
                                }
                            }
                            processedRowCount++;
                            if (this.processor.rowLimit === processedRowCount) {
                                await this.flushRows(results);
                                this.stop();
                            }
                        }
                        if (!this.stopped) {
                            await this.flushRows(results);
                        }
                    }
                    await this.emit('endProcessingStream', ...args);
                });
            } catch (err) {
                await this.emit('processingError', err);
            }
        }
        await this.emit('endProcessing');
        if (errorMessage) {
            throw new Error(errorMessage);
        }
    }

    on(eventName: 'endProcessing', fn: (() => Promise<any>)): any
    on(eventName: 'loadedBatch', fn: ((destinationIndex: number, data: any[]) => Promise<any>)): any
    on(eventName: 'processingError', fn: ((error: any) => Promise<any>)): any
    on(eventName: 'loadingBatchError', fn: ((destinationIndex: number, data: any[], error: any) => Promise<any>)): any
    on(eventName: 'loadingBatch', fn: ((destinationIndex: number, data: any[]) => Promise<any>)): any
    on(eventName: 'endLoadingBatch', fn: ((destinationIndex: number) => Promise<any>)): any
    on(eventName: 'transformedBatch', fn: ((destinationIndex: number, transformedRows: any) => Promise<any>)): any
    on(eventName: 'transformingBatchError', fn: ((destinationIndex: number, rows: any[], error: any) => Promise<any>)): any
    on(eventName: 'transformingBatch', fn: ((destinationIndex: number, rows: any[]) => Promise<any>)): any
    on(eventName: 'endTransformingBatch', fn: ((destinationIndex: number) => Promise<any>)): any
    on(eventName: 'endProcessingRow', fn: (() => Promise<any>)): any
    on(eventName: 'rowGenerationError', fn: ((destinationIndex: number, row: any, error: any) => Promise<any>)): any
    on(eventName: 'rowGenerated', fn: ((destinationIndex: number, generatedRow: any) => Promise<any>)): any
    on(eventName: 'startProcessingRow', fn: ((row: any) => Promise<any>)): any
    on(eventName: 'startProcessing', fn: ((processor: IProcessor, destinations: IDestination[]) => Promise<any>)): any
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

    onAny(fn: event) {
        this.anyEvent.push(fn);
    }

    protected async flushRows(rows: any[][]) {
        for (let i = 0; i < this.destinations.length; i++) {
            if (rows[i].length) {
                await this.loadBatch(i, this.destinations[i], rows[i]);
            }
        }
    }

    protected async loadBatch(destinationIndex: number, destination: IDestination, data: any[]) {
        if (data.length) {
            if (destination.batchTransformer) {
                await this.emit('transformingBatch', destinationIndex, data);
                if (!this.stopped) {
                    try {
                        data = await destination.batchTransformer(data);
                        await this.emit('transformedBatch', destinationIndex, data);
                    } catch (err) {
                        await this.emit('transformingBatchError', destinationIndex, data, err);
                    }
                }
                await this.emit('endTransformingBatch', destinationIndex);
            }
            if (!destination.disableLoad && !this.stopped) {
                await this.emit('loadingBatch', destinationIndex, data);
                if (!this.stopped) {
                    try {
                        await destination.loadBatch(data);
                        await this.emit('loadedBatch', destinationIndex, data);
                    } catch (err) {
                        await this.emit('loadingBatchError', destinationIndex, data, err);
                    }
                }
                await this.emit('endLoadingBatch', destinationIndex);
            }
        }
    }

    protected async emit(eventName: string, ...args: any) {
        try {
            const fn = this.events[eventName];
            if (fn) {
                for (let i = 0; i < fn.length; i++) {
                    await fn[i].apply(this, args);
                }
            }
            for (let i = 0; i < this.anyEvent.length; i++) {
                await this.anyEvent[i].apply(this, [eventName, ...args]);
            }
        } catch (err) {
            console.error(`Warning. Exception was thrown inside ${eventName} event.`, err);
        }
    }
}
