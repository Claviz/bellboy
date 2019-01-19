import { Processor } from './processor';
import { Stream } from 'stream';
import { IDynamicConfig } from '../interfaces/destination';

export class DynamicProcessor extends Processor {
    /** @internal */
    protected config: IDynamicConfig;

    constructor(config: IDynamicConfig) {
        super(config);
        this.config = config;
    }

    async process() {
        await super.process();
        if (!this.config.generator) {
            throw Error(`No generator function specified.`);
        }
        await super.emit('processingDynamicSource');
        const iterator = this.config.generator();
        const readStream = new Stream.Readable({
            objectMode: true,
            async read() {
                const result = await iterator.next();
                if (result.done) {
                    return this.push(null);
                }
                this.push(result.value);
            },
        }).pause();
        await super.processStream(readStream);
        await super.emit('processedDynamicSource');
    }
}
