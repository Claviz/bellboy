import { IDestinationConfig, IDestination } from '../../types';

export abstract class Destination implements IDestination {

    batchSize: number;
    recordGenerator: ((row: any) => AsyncIterableIterator<{}>) | undefined;
    batchTransformer: ((rows: any[]) => Promise<any[]>) | undefined;
    disableLoad: boolean;

    constructor(config?: IDestinationConfig) {
        this.batchSize = 0;
        this.disableLoad = false;
        if (config) {
            this.batchSize = config.batchSize || 0;
            this.recordGenerator = config.recordGenerator;
            this.batchTransformer = config.batchTransformer;
            this.disableLoad = !!config.disableLoad;
        }
    }

    async loadBatch(data: any[]) {
        throw new Error('Method not implemented.');
    }
}
