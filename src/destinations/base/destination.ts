import { IDestinationConfig, IDestination } from '../../types';

export abstract class Destination implements IDestination {

    batchSize: number;
    recordGenerator: ((row: any) => AsyncIterableIterator<{}>) | undefined;
    batchTransformer: ((rows: any[]) => Promise<any[]>) | undefined;
    loadInPreviewMode: boolean;

    constructor(config?: IDestinationConfig) {
        this.batchSize = 0;
        this.loadInPreviewMode = false;
        if (config) {
            this.batchSize = config.batchSize || 0;
            this.recordGenerator = config.recordGenerator;
            this.batchTransformer = config.batchTransformer;
            this.loadInPreviewMode = !!config.loadInPreviewMode;
        }
    }

    async loadBatch(data: any[]) {
        throw new Error('Method not implemented.');
    }
}
