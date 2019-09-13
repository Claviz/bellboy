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
            const results: any[][] = [];
            for (let j = 0; j < this.destinations.length; j++) {
                results[j] = [];
            }
            let processedRowCount = 0;
            const processStreamWrapper = async (readStream: Readable, ...args: any[]) => {
                await this.emit('startProcessingStream', ...args);
                for await (const row of readStream) {
                    await this.emit('startProcessingRow', row);
                    for (let i = 0; i < this.destinations.length; i++) {
                        const recordGeneratorFn = this.destinations[i].recordGenerator;
                        if (!recordGeneratorFn) {
                            results[i].push(row);
                        } else {
                            const wrapper = async function* (recordGenerator: AsyncIterableIterator<{}>, emit: any) {
                                try {
                                    for await (const record of recordGenerator) {
                                        yield record;
                                    }
                                } catch (err) {
                                    await emit('rowGenerationError', i, row, err);
                                }
                            }
                            let recordGenerator = wrapper(recordGeneratorFn(row), (eventName: string, ...args: any) => this.emit(eventName, ...args));
                            for await (const record of recordGenerator) {
                                results[i].push(record);
                                await this.emit('rowGenerated', i, record);
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
                    this.closed = this.processor.rowLimit === processedRowCount
                    if (this.closed) {
                        readStream.destroy();
                        break;
                    }
                }
                for (let i = 0; i < this.destinations.length; i++) {
                    if (results[i].length) {
                        await this.loadBatch(i, this.destinations[i], results[i]);
                    }
                    results[i] = [];
                }
                await this.emit('endProcessingStream', ...args);
            }
            await this.processor.process(processStreamWrapper);
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
