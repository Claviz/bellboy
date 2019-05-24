import { IDestinationConfig, IDestination } from '../../types';

export abstract class Destination implements IDestination {

    batchSize: number;
    recordGenerator: ((row: any) => AsyncIterableIterator<{}>) | undefined;
    batchTransformer: ((rows: any[]) => Promise<any[]>) | undefined;
    rowLimit: number;
    previewModeLoadEnabled: boolean;

    constructor(config: IDestinationConfig | undefined) {
        this.batchSize = 0;
        this.rowLimit = 0;
        this.previewModeLoadEnabled = false;
        if (config) {
            this.rowLimit = config.rowLimit || 0;
            this.batchSize = config.batchSize || 0;
            this.recordGenerator = config.recordGenerator;
            this.batchTransformer = config.batchTransformer;
            if (config.previewMode) {
                this.previewModeLoadEnabled = !!config.previewMode.loadEnabled;
                this.rowLimit = config.previewMode.rowLimit || this.rowLimit;
                this.batchSize = config.previewMode.batchSize || this.batchSize;
                this.recordGenerator = config.previewMode.recordGenerator || this.recordGenerator;
                this.batchTransformer = config.previewMode.batchTransformer || this.batchTransformer;
            }
        }
    }

    async loadBatch(data: any[]) {
        throw new Error('Method not implemented.');
    }
}
