import fs from 'fs';
import path from 'path';

import { IJsonConfig, IHttpJsonConfig } from '../interfaces/destination';
import { DirectoryProcessor } from './directory-processor';
import request = require('request');
import { Processor } from './processor';

const JSONStream = require('JSONStream');

export class HttpJsonProcessor extends Processor {
    /** @internal */
    protected config: IHttpJsonConfig;
    /** @internal */
    private header: any;

    constructor(config: IHttpJsonConfig) {
        super(config);
        this.config = config;
    }

    /** @internal */
    async getJson(options: request.CoreOptions & request.UrlOptions) {
        await super.emit('processingJson', options);
        const readStream = request(options).pipe(JSONStream.parse(this.config.jsonPath));
        readStream.pause();
        this.header = await super.processStream(readStream);
        await super.emit('processedJson');
        if (this.config.nextRequest) {
            const nextOptions = await this.config.nextRequest(this.header);
            if (nextOptions) {
                this.header = null;
                await this.getJson(nextOptions);
            }
        }
    }

    async process() {
        await super.process();

        if (!this.config.jsonPath) {
            throw new Error('No JSON path specified.');
        }
        if (!this.config.connection) {
            throw new Error(`No connection specified.`);
        }

        await this.getJson(this.config.connection);
    }
}
