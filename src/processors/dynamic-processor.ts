import { Readable } from 'stream';

import { IDynamicProcessorConfig, processStream } from '../types';
import { Processor } from './base/processor';

export class DynamicProcessor extends Processor {

    protected generator: () => AsyncIterableIterator<any>;

    constructor(config: IDynamicProcessorConfig) {
        super(config);
        if (!config.generator) {
            throw Error(`No generator function specified.`);
        }
        this.generator = config.generator;
    }

    async process(processStream: processStream) {
        await processStream(Readable.from(this.generator()));
    }
}
