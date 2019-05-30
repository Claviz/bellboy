import { IReporter } from '../../types';
import { Job } from '../../job';

export abstract class Reporter implements IReporter {

    constructor() { }

    report(job: Job) {
        throw new Error('Method not implemented.');
    }
}
