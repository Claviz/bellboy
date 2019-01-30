import { Processor } from './internal/processor';
import { Stream } from 'stream';
import { IMqttConfig } from '../types';
let mqtt = require('async-mqtt');

export class MqttProcessor extends Processor {
    /** @internal */
    protected config: IMqttConfig;

    constructor(config: IMqttConfig) {
        super(config);
        this.config = config;
    }

    async process() {
        await super.process();
        await super.emit('processingMqttSource');
        const readStream = new Stream.Readable({
            objectMode: true,
            read() { },
        }).pause();
        const client = mqtt.connect(this.config.connection.url);
        await client.subscribe(this.config.connection.topics);
        client.on('message', (topic: string, message: any) => {
            readStream.push({ topic, message: message.toString() });
        });
        await super.processStream(readStream);
        await client.unsubscribe(this.config.connection.topics);
        await client.end(true);
        await super.emit('processedMqttSource');
    }
}
