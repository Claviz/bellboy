import rp, { RequestPromiseOptions } from 'request-promise';

import { IHttpDestinationConfig } from '../types';
import { Destination } from './base/destination';
import { UriOptions, UrlOptions } from 'request';

export class HttpDestination extends Destination {

    protected request: (UriOptions & RequestPromiseOptions) | (UrlOptions & RequestPromiseOptions);

    constructor(config: IHttpDestinationConfig) {
        super(config);
        this.request = config.request;
    }

    async loadBatch(data: any[]) {
        for (let i = 0; i < data.length; i++) {
            await rp({
                json: true,
                ...this.request,
                body: data[i],
            });
        }
    }
}
