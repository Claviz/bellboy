import axios, { AxiosRequestConfig } from 'axios';
import { parse } from 'csv-parse';
import { pick } from 'stream-json/filters/Pick';
import { parser } from 'stream-json/Parser';
import { streamValues } from 'stream-json/streamers/StreamValues';

import { AuthorizationRequest, IDelimitedHttpProcessorConfig, IJsonHttpProcessorConfig, processStream } from '../types';
import { applyHttpAuthorization, getDelimitedGenerator, getValueFromJSONChunk } from '../utils';
import { Processor } from './base/processor';

const split2 = require('split2');

export class HttpProcessor extends Processor {

    protected connection: AxiosRequestConfig;
    protected nextRequest: (() => Promise<any>) | undefined;
    protected jsonPath: RegExp | undefined;
    protected rowSeparator: string | undefined;
    protected dataFormat: 'json' | 'delimited';
    protected hasHeader: boolean = false;
    protected delimiter?: string;
    protected qualifier?: string;
    protected authorizationRequest?: AuthorizationRequest;

    constructor(config: IJsonHttpProcessorConfig | IDelimitedHttpProcessorConfig) {
        super(config);
        if (!config.connection) {
            throw new Error(`No connection specified.`);
        }
        this.connection = config.connection;
        this.dataFormat = config.dataFormat;
        if (config.dataFormat === 'delimited') {
            if (!config.rowSeparator) {
                throw new Error('No rowSeparator specified.');
            }
            this.rowSeparator = config.rowSeparator;
            this.hasHeader = !!config.hasHeader;
            this.delimiter = config.delimiter;
            this.qualifier = config.qualifier;
        } else if (config.dataFormat === 'json' && config.jsonPath) {
            if (config.jsonPath instanceof RegExp) {
                this.jsonPath = config.jsonPath;
            } else {
                this.jsonPath = new RegExp(config.jsonPath);
            }
        }
        this.nextRequest = config.nextRequest;
        this.authorizationRequest = config.authorizationRequest;
    }

    protected async processHttpData(processStream: processStream, options: AxiosRequestConfig) {
        if (this.dataFormat === 'delimited') {
            const requestStream = await axios({ ...options, responseType: 'stream' });
            const parser = parse({
                quote: this.qualifier,
                delimiter: this.delimiter,
                record_delimiter: this.rowSeparator,
                raw: true,
                relax_quotes: true,
            });
            const delimitedStream = requestStream.data.pipe(parser);
            const generator = getDelimitedGenerator({
                readStream: delimitedStream,
                hasHeader: this.hasHeader,
            });
            await processStream(generator());
        } else if (this.dataFormat === 'json') {
            const requestStream = await axios({ ...options, responseType: 'stream' });
            const jsonStream = requestStream.data
                .pipe(parser())
                .pipe(pick({ filter: this.jsonPath || '' }))
                .pipe(streamValues())
                .pipe(getValueFromJSONChunk());
            await processStream(jsonStream);
        }
        if (this.nextRequest) {
            const nextOptions = await this.nextRequest();
            if (nextOptions) {
                await this.processHttpData(processStream, nextOptions);
            }
        }
    }

    async process(processStream: processStream) {
        await applyHttpAuthorization(this.connection, this.authorizationRequest);
        await this.processHttpData(processStream, this.connection);
    }
}
