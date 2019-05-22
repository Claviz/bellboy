import { IDestinationConfig, IDestination } from '../../types';

export abstract class Destination implements IDestination {

    batchSize: number;
    recordGenerator: ((row: any) => AsyncIterableIterator<{}>) | undefined;
    batchTransformer: ((rows: any[]) => Promise<any[]>) | undefined;
    enabledInPreviewMode: boolean;

    constructor(config: IDestinationConfig | undefined) {
        if (config) {
            this.batchSize = config.batchSize || 0;
            this.recordGenerator = config.recordGenerator;
            this.batchTransformer = config.batchTransformer;
            this.enabledInPreviewMode = !!config.enabledInPreviewMode;
        } else {
            this.batchSize = 0;
            this.enabledInPreviewMode = false;
        }
    }

    async loadBatch(data: any[]) {
        throw new Error('Method not implemented.');
    }
}
