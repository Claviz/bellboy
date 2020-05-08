import { Destination, Job, Processor, Reporter } from '../src';
import { processStream, IBellboyEvent } from '../src/types';

async function timeout(ms: number) {
    return new Promise(res => setTimeout(res, ms));
};

export class CustomDestination extends Destination {

    data: any[] = [];
    batchCount: number = 0;

    async loadBatch(rows: any[]) {
        this.batchCount++;
        this.data = [...this.data, ...rows];
    }

    getData() {
        return this.data;
    }

    getBatchCount() {
        return this.batchCount;
    }
}

/**
 * Destination that fails after first successfull batch load.
 */
export class CustomErrorDestination extends CustomDestination {

    async loadBatch(rows: any[]) {
        throw new Error('Data load error.');
    }

}

export class CustomErrorProcessor extends Processor {

    async process(processStream: processStream) {
        throw new Error('Processor error.');
    }
}

export class CustomReporter extends Reporter {
    events: string[] = [];
    extendedEvents: IBellboyEvent[] = [];

    report(job: Job) {
        job.onAny(async (eventName: string) => {
            this.events.push(eventName);
        }, async (event) => {
            this.extendedEvents.push(event);
        });
    }

    getEvents(): string[] {
        return this.events;
    }

    getExtendedEvents(): IBellboyEvent[] {
        return this.extendedEvents;
    }
}

export class CustomTimeoutDestination extends CustomDestination {

    timeout: number;

    constructor(config: any) {
        super(config);
        this.timeout = config.timeout;
    }

    async loadBatch(rows: any[]) {
        await timeout(this.timeout);
        await super.loadBatch(rows);
    }
}
