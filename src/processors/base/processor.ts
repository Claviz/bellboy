import { IProcessor, IProcessorConfig, processStream, emit } from '../../types';

export abstract class Processor implements IProcessor {

    constructor(config: IProcessorConfig) {
    }

    async process(processStream: processStream, emit: emit) {
        throw new Error('Method not implemented.');
    }
}
