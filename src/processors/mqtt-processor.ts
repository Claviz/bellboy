import { Stream } from 'stream';

import { IMqttProcessorConfig, processStream } from '../types';
import { Processor } from './base/processor';

let mqtt = require('async-mqtt');

export class MqttProcessor extends Processor {

    protected url: string;
    protected topics: string[];

    constructor(config: IMqttProcessorConfig) {
        super(config);
        this.url = config.url;
        this.topics = config.topics;
    }

    async process(processStream: processStream) {
        const readStream = new Stream.Readable({
            objectMode: true,
            read() { },
        }).pause();
        const client = mqtt.connect(this.url);
        await client.subscribe(this.topics);
        client.on('message', (topic: string, message: any) => {
            readStream.push({ topic, message: message.toString() });
        });
        await processStream(readStream);
        await client.unsubscribe(this.topics);
        await client.end(true);
    }
}
