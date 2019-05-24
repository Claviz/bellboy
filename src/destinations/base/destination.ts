import { IDestinationConfig, IDestination } from '../../types';

export abstract class Destination implements IDestination {

    batchSize: number;
    recordGenerator: ((row: any) => AsyncIterableIterator<{}>) | undefined;
    batchTransformer: ((rows: any[]) => Promise<any[]>) | undefined;
    rowLimit: number;
    loadInPreviewMode: boolean;

    constructor(config: IDestinationConfig | undefined) {
        this.batchSize = 0;
        this.rowLimit = 0;
        this.loadInPreviewMode = false;
        if (config) {
            this.rowLimit = config.rowLimit || 0;
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
