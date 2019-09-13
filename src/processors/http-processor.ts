import request = require('request');

import { IDelimitedHttpProcessorConfig, IJsonHttpProcessorConfig, processStream } from '../types';
import { Processor } from './base/processor';
import { getReadableJsonStream } from '../utils';

const split2 = require('split2');

const JSONStream = require('JSONStream');

export class HttpProcessor extends Processor {

    protected connection: request.CoreOptions & request.UrlOptions;
    protected nextRequest: ((header: any) => Promise<any>) | undefined;
    protected jsonPath: string | undefined;
    protected delimiter: string | undefined;
    protected header: string | undefined;

    constructor(config: IJsonHttpProcessorConfig | IDelimitedHttpProcessorConfig) {
        super(config);
        if (!config.connection) {
            throw new Error(`No connection specified.`);
        }
        this.connection = config.connection;
        if (config.dataFormat === 'delimited') {
            if (!config.delimiter) {
                throw new Error('No delimiter specified.');
            }
            this.delimiter = config.delimiter;
        } else if (config.dataFormat === 'json') {
            if (!config.jsonPath) {
                throw new Error('No JSON path specified.');
            }
            this.jsonPath = config.jsonPath;
        }
        this.nextRequest = config.nextRequest;
    }

    protected async processHttpData(processStream: processStream, options: request.CoreOptions & request.UrlOptions) {
        this.header = undefined;
        if (this.delimiter) {
            const requestStream = request(options);
            const delimitedStream = requestStream.pipe(split2(this.delimiter));
            await processStream(delimitedStream);
            requestStream.destroy();
        } else if (this.jsonPath) {
            const requestStream = request(options);
            const jsonStream = requestStream.pipe(JSONStream.parse(this.jsonPath));
            jsonStream.on('header', (header: string) => {
                this.header = header;
            });
            await processStream(getReadableJsonStream(jsonStream));
            requestStream.destroy();
        }
        if (this.nextRequest) {
            const nextOptions = await this.nextRequest(this.header);
            if (nextOptions) {
                await this.processHttpData(processStream, nextOptions);
            }
        }
    }

    async process(processStream: processStream) {
        await this.processHttpData(processStream, this.connection);
    }
}
