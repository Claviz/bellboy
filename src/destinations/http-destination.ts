import axios, { AxiosRequestConfig } from 'axios';

import { IHttpDestinationConfig } from '../types';
import { Destination } from './base/destination';

export class HttpDestination extends Destination {

    protected request: AxiosRequestConfig;

    constructor(config: IHttpDestinationConfig) {
        super(config);
        this.request = config.request;
    }

    async loadBatch(data: any[]) {
        for (let i = 0; i < data.length; i++) {
            await axios({
                ...this.request,
                data: data[i],
            });
        }
    }
}
