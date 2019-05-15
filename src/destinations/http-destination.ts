import rp from 'request-promise';

import { IHttpDestinationConfig } from '../types';
import { Destination } from './base/destination';

export class HttpDestination extends Destination {

    protected method: 'GET' | 'POST' | 'DELETE' | 'PUT';
    protected uri: string;

    constructor(config: IHttpDestinationConfig) {
        super(config);
        this.method = config.method;
        this.uri = config.uri;
    }

    async loadBatch(data: any[]) {
        const request = {
            method: this.method,
            uri: this.uri,
            json: true,
        };
        for (let i = 0; i < data.length; i++) {
            await rp({
                ...request,
                body: data[i],
            });
        }
    }
}
