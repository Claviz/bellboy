import { Destination } from '../src';

async function timeout(ms: number) {
    return new Promise(res => setTimeout(res, ms));
};

export class CustomDestination extends Destination {

    data: any[] = [];

    async loadBatch(rows: any[]) {
        this.data = [...this.data, ...rows];
    }

    getData() {
        return this.data;
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
