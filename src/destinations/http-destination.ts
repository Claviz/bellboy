import axios, { AxiosRequestConfig } from 'axios';

import { AuthorizationRequest, IHttpDestinationConfig } from '../types';
import { applyHttpAuthorization } from '../utils';
import { Destination } from './base/destination';

export class HttpDestination extends Destination {

    protected request: AxiosRequestConfig;
    protected authorizationRequest?: AuthorizationRequest;

    constructor(config: IHttpDestinationConfig) {
        super(config);
        this.request = config.request;
        this.authorizationRequest = config.authorizationRequest;
    }

    async loadBatch(data: any[]) {
        await applyHttpAuthorization(this.request, this.authorizationRequest);
        for (let i = 0; i < data.length; i++) {
            await axios({
                ...this.request,
                data: data[i],
            });
        }
    }
}
