import axios, { AxiosRequestConfig } from 'axios';
import { parse } from 'csv-parse';
import { pick } from 'stream-json/filters/Pick';
import { parser } from 'stream-json/Parser';
import { streamValues } from 'stream-json/streamers/StreamValues';
import iconv from 'iconv-lite';

import { AuthorizationRequest, IDelimitedHttpProcessorConfig, IJsonHttpProcessorConfig, IXmlHttpProcessorConfig, processStream } from '../types';
import { applyHttpAuthorization, getDelimitedGenerator, getValueFromJSONChunk, removeCircularReferencesFromChunk } from '../utils';
import { Processor } from './base/processor';

const saxStream = require('sax-stream');

export class HttpProcessor extends Processor {

    protected connection: AxiosRequestConfig;
    protected nextRequest: (() => Promise<any>) | undefined;
    protected jsonPath: RegExp | undefined;
    protected rowSeparator: string | undefined;
    protected dataFormat: 'json' | 'delimited' | 'xml';
    protected hasHeader: boolean = false;
    protected delimiter?: string;
    protected qualifier?: string;
    protected authorizationRequest?: AuthorizationRequest;
    protected saxOptions?: any;
    protected encoding?: string;

    constructor(config: IJsonHttpProcessorConfig | IDelimitedHttpProcessorConfig | IXmlHttpProcessorConfig) {
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
            this.encoding = config.encoding;
        } else if (config.dataFormat === 'json' && config.jsonPath) {
            if (config.jsonPath instanceof RegExp) {
                this.jsonPath = config.jsonPath;
            } else {
                this.jsonPath = new RegExp(config.jsonPath);
            }
        } else if (config.dataFormat === 'xml' && config.saxOptions) {
            this.saxOptions = config.saxOptions;
        }
        this.nextRequest = config.nextRequest;
        this.authorizationRequest = config.authorizationRequest;
    }

    protected async processHttpData(processStream: processStream, options: AxiosRequestConfig) {
        const errorHandler = async (err: any) => {
            const stream = err.response?.data;
            if (stream) {
                let streamString = '';
                await new Promise((resolve, reject) => {
                    stream.setEncoding('utf8');
                    stream.on('data', (utf8Chunk: any) => {
                        streamString += utf8Chunk;
                    });
                    stream.on('end', () => {
                        err.message = `${err.message}. Response: ${streamString}`;
                        reject(err);
                    });
                    stream.on('error', () => {
                        reject(err);
                    });
                });
            }
            throw err;
        };

        if (this.dataFormat === 'delimited') {
            const requestStream = await axios({ ...options, responseType: 'stream' }).catch(errorHandler);
            const decodedStream = this.encoding ? requestStream.data.pipe(iconv.decodeStream(this.encoding)) : requestStream.data;
            const parser = parse({
                quote: this.qualifier,
                delimiter: this.delimiter,
                record_delimiter: this.rowSeparator,
                raw: true,
                relax_quotes: true,
                relax_column_count: true,
            });
            const delimitedStream = decodedStream.pipe(parser);
            const generator = getDelimitedGenerator({
                readStream: delimitedStream,
                hasHeader: this.hasHeader,
            });
            await new Promise((resolve, reject) => {
                requestStream.data.on('error', reject);
                processStream(generator()).then(resolve).catch(reject);
            });
        } else if (this.dataFormat === 'json') {
            const requestStream = await axios({ ...options, responseType: 'stream', }).catch(errorHandler);
            const jsonStream = requestStream.data
                .pipe(parser())
                .pipe(pick({ filter: this.jsonPath || '' }))
                .pipe(streamValues())
                .pipe(getValueFromJSONChunk());
            await new Promise((resolve, reject) => {
                requestStream.data.on('error', reject);
                processStream(jsonStream).then(resolve).catch(reject);
            });
        } else if (this.dataFormat === 'xml') {
            const requestStream = await axios({ ...options, responseType: 'stream' }).catch(errorHandler);
            const xmlStream = requestStream.data
                .pipe(saxStream(this.saxOptions))
                .pipe(removeCircularReferencesFromChunk());
            await new Promise((resolve, reject) => {
                requestStream.data.on('error', reject);
                processStream(xmlStream).then(resolve).catch(reject);
            });
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
