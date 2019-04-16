import { IDelimitedHttpConfig, IJsonHttpConfig } from '../types';
import request = require('request');
import { Processor } from './internal/processor';
const split2 = require('split2');

const JSONStream = require('JSONStream');

export class HttpProcessor extends Processor {
    /** @internal */
    protected config: IDelimitedHttpConfig | IJsonHttpConfig;
    /** @internal */
    private header: any;

    constructor(config: IDelimitedHttpConfig | IJsonHttpConfig) {
        super(config);
        this.config = config;
    }

    /** @internal */
    async getReadStream(options: request.CoreOptions & request.UrlOptions) {
        if (this.config.dataFormat === 'delimited') {
            return request(options)
                .pipe(split2(this.config.delimiter))
                .pause();
        } else if (this.config.dataFormat === 'json') {
            return request(options)
                .pipe(JSONStream.parse(this.config.jsonPath))
                .pause();
        }
    }

    /** @internal */
    async processHttpData(options: request.CoreOptions & request.UrlOptions) {
        await super.emit('startProcessing');
        const readStream = await this.getReadStream(options);
        this.header = await super.processStream(readStream);
        await super.emit('endProcessing');
        if (this.config.nextRequest) {
            const nextOptions = await this.config.nextRequest(this.header);
            if (nextOptions) {
                await this.processHttpData(nextOptions);
            }
        }
    }

    async process() {
        await super.process();

        if (!this.config.connection) {
            throw new Error(`No connection specified.`);
        }
        if (this.config.dataFormat === 'delimited') {
            if (!this.config.delimiter) {
                throw new Error('No delimiter specified.');
            }
        } else if (this.config.dataFormat === 'json') {
            if (!this.config.jsonPath) {
                throw new Error('No JSON path specified.');
            }
        }

        await this.processHttpData(this.config.connection);
    }
}
