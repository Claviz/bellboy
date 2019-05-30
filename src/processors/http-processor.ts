import request = require('request');

import { IDelimitedHttpProcessorConfig, IJsonHttpProcessorConfig, processStream } from '../types';
import { Processor } from './base/processor';

const split2 = require('split2');

const JSONStream = require('JSONStream');

export class HttpProcessor extends Processor {

    protected connection: request.CoreOptions & request.UrlOptions;
    protected nextRequest: ((header: any) => Promise<any>) | undefined;
    protected jsonPath: string | undefined;
    protected delimiter: string | undefined;

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

    protected async getReadStream(options: request.CoreOptions & request.UrlOptions) {
        if (this.delimiter) {
            const requestStream = request(options);
            const delimitedStream = requestStream.pipe(split2(this.delimiter)).pause();
            delimitedStream.on('close', function () {
                requestStream.destroy()
            });
            return delimitedStream;
        } else if (this.jsonPath) {
            const requestStream = request(options);
            const jsonStream = requestStream.pipe(JSONStream.parse(this.jsonPath)).pause();
            jsonStream.on('close', function () {
                requestStream.destroy()
            });
            return jsonStream;
        }
    }

    protected async processHttpData(processStream: processStream, options: request.CoreOptions & request.UrlOptions) {
        const readStream = await this.getReadStream(options);
        const header = await processStream(readStream);
        if (this.nextRequest) {
            const nextOptions = await this.nextRequest(header);
            if (nextOptions) {
                await this.processHttpData(processStream, nextOptions);
            }
        }
    }

    async process(processStream: processStream) {
        await this.processHttpData(processStream, this.connection);
    }
}
