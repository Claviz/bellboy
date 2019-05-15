import fs from 'fs';

import { IDirectoryProcessorConfig } from '../../types';
import { Processor } from './processor';

export abstract class DirectoryProcessor extends Processor {

    protected path: string;
    protected files: string[] = [];

    constructor(config: IDirectoryProcessorConfig) {
        super(config);
        if (!config.path) {
            throw new Error(`No path specified.`);
        } else {
            this.path = config.path;
        }
        let filePattern = `(.*?)`;
        if (config.filePattern) {
            filePattern = config.filePattern;
        }
        if (!config.files || config.files.length === 0) {
            const dir = fs.readdirSync(this.path);
            const regex = new RegExp(filePattern, 'g');
            this.files = dir.sort().filter((x) => x.match(regex));
        } else {
            this.files = config.files;
        }
    }
}