import { IProcessor, IProcessorConfig, processStream, emit } from '../../types';

export abstract class Processor implements IProcessor {

    rowLimit: number;

    constructor(config?: IProcessorConfig) {
        this.rowLimit = 0;
        if (config) {
            this.rowLimit = config.rowLimit || 0;
        }
    }

    async process(processStream: processStream, emit: emit) {
        throw new Error('Method not implemented.');
    }
}
