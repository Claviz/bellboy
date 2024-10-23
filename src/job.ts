import { performance } from 'node:perf_hooks';
import { generate } from 'shortid';
import { Readable } from 'stream';

import { event, extendedEvent, IBellboyEvent, IDestination, IJob, IJobConfig, IProcessor, IReporter } from './types';

export class Job implements IJob {

    protected events: { [fn: string]: { event?: event, extendedEvent?: extendedEvent }[] } = {};
    protected reporters: IReporter[];
    protected anyEvent: ({ event?: event, extendedEvent?: extendedEvent })[] = [];
    protected stopped = false;
    protected jobId = generate();
    protected jobName?: string;
    private settingReporterEvents = false;

    constructor(protected processor: IProcessor, protected destinations: IDestination[], config: IJobConfig = {}) {
        this.jobName = config?.jobName;
        this.reporters = config.reporters || [];
    }

    stop(message?: string) { }

    async run() {
        this.settingReporterEvents = true;
        for (let i = 0; i < this.reporters.length; i++) {
            await this.reporters[i].report(this);
        }
        this.settingReporterEvents = false;
        let readStream: Readable | AsyncGenerator;
        let errorMessage: string | undefined;
        this.stop = (message?: string) => {
            if (!this.stopped) {
                this.stopped = true;
                if (readStream && (readStream instanceof Readable)) {
                    readStream.emit('end');
                    readStream.destroy();
                }
                errorMessage = message;
            }
        };
        await this.emit('startProcessing', this.processor, this.destinations);
        if (!this.stopped) {
            try {
                let e;
                await this.processor.process(async (_readStream: Readable | AsyncGenerator, ...args: any[]) => {
                    readStream = _readStream;
                    await this.emit('startProcessingStream', ...args);
                    try {
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
                                    break;
                                }
                            }
                            if (!this.stopped) {
                                await this.flushRows(results);
                            }
                        }
                    } catch (err) {
                        e = err;
                    }
                    await this.emit('endProcessingStream', ...args);
                });
                if (e) {
                    throw e;
                }
            } catch (err) {
                await this.emit('processingError', err);
            }
        }
        await this.emit('endProcessing');
        if (errorMessage) {
            throw new Error(errorMessage);
        }
    }

    on(eventName: 'endProcessing', event?: (() => Promise<any>), extendedEvent?: extendedEvent): any
    on(eventName: 'loadedBatch', event?: ((destinationIndex: number, data: any[], result?: any) => Promise<any>), extendedEvent?: extendedEvent): any
    on(eventName: 'processingError', event?: ((error: any) => Promise<any>), extendedEvent?: extendedEvent): any
    on(eventName: 'loadingBatchError', event?: ((destinationIndex: number, data: any[], error: any) => Promise<any>), extendedEvent?: extendedEvent): any
    on(eventName: 'loadingBatch', event?: ((destinationIndex: number, data: any[]) => Promise<any>), extendedEvent?: extendedEvent): any
    on(eventName: 'endLoadingBatch', event?: ((destinationIndex: number) => Promise<any>), extendedEvent?: extendedEvent): any
    on(eventName: 'transformedBatch', event?: ((destinationIndex: number, transformedRows: any) => Promise<any>), extendedEvent?: extendedEvent): any
    on(eventName: 'transformingBatchError', event?: ((destinationIndex: number, rows: any[], error: any) => Promise<any>), extendedEvent?: extendedEvent): any
    on(eventName: 'transformingBatch', event?: ((destinationIndex: number, rows: any[]) => Promise<any>), extendedEvent?: extendedEvent): any
    on(eventName: 'endTransformingBatch', event?: ((destinationIndex: number) => Promise<any>), extendedEvent?: extendedEvent): any
    on(eventName: 'endProcessingRow', event?: (() => Promise<any>), extendedEvent?: extendedEvent): any
    on(eventName: 'rowGenerationError', event?: ((destinationIndex: number, row: any, error: any) => Promise<any>), extendedEvent?: extendedEvent): any
    on(eventName: 'rowGenerated', event?: ((destinationIndex: number, generatedRow: any) => Promise<any>), extendedEvent?: extendedEvent): any
    on(eventName: 'startProcessingRow', event?: ((row: any) => Promise<any>), extendedEvent?: extendedEvent): any
    on(eventName: 'startProcessing', event?: ((processor: IProcessor, destinations: IDestination[]) => Promise<any>), extendedEvent?: extendedEvent): any
    on(eventName: 'endProcessingStream', event?: ((...args: any) => Promise<any>), extendedEvent?: extendedEvent): any
    on(eventName: 'startProcessingStream', event?: ((...args: any) => Promise<any>), extendedEvent?: extendedEvent): any
    on(eventName: string, event?: event, extendedEvent?: extendedEvent) {
        const eventEntry = { event, extendedEvent };
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.settingReporterEvents
            ? this.events[eventName].unshift(eventEntry)
            : this.events[eventName].push(eventEntry);
    }

    onAny(event?: event, extendedEvent?: extendedEvent) {
        const eventEntry = { event, extendedEvent };

        this.settingReporterEvents
            ? this.anyEvent.unshift(eventEntry)
            : this.anyEvent.push(eventEntry);
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
                        const result = await destination.loadBatch(data);
                        result ? await this.emit('loadedBatch', destinationIndex, data, result) : await this.emit('loadedBatch', destinationIndex, data);
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
            const bellboyEvent: IBellboyEvent = {
                eventName,
                eventArguments: args,
                timestamp: performance.now() + performance.timeOrigin,
                jobStopped: this.stopped,
                eventId: generate(),
                jobId: this.jobId,
                jobName: this.jobName,
            }
            if (fn) {
                for (let i = 0; i < fn.length; i++) {
                    await fn[i].event?.apply(this, args);
                    await fn[i].extendedEvent?.apply(this, [bellboyEvent]);
                }
            }
            for (let i = 0; i < this.anyEvent.length; i++) {
                await this.anyEvent[i].event?.apply(this, [eventName, ...args]);
                await this.anyEvent[i].extendedEvent?.apply(this, [bellboyEvent]);
            }
        } catch (err) {
            console.error(`Warning. Exception was thrown inside ${eventName} event.`, err);
        }
    }
}
