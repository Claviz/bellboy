import fs from 'fs';
import { promisify } from 'util';

import { IFileConfig } from '../interfaces/destination';
import { Processor } from './processor';

const readdir = promisify(fs.readdir);

export abstract class DirectoryProcessor extends Processor {
    /** @internal */
    protected config: IFileConfig;

    constructor(config: IFileConfig) {
        super(config);
        this.config = config;
    }

    async process() {
        await super.process();
        if (!this.config.path) {
            throw new Error(`No path specified.`);
        }
        if (!this.config.filePattern) {
            this.config.filePattern = `(.*?)`;
        }
        if (!this.config.files || this.config.files.length === 0) {
            const dir = await readdir(this.config.path);
            const regex = new RegExp(this.config.filePattern, 'g');
            this.config.files = dir.filter((x) => x.match(regex));
        }
    }
}