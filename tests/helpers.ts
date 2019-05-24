import { Destination } from '../src';

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
