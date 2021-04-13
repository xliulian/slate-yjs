import { Operation } from 'slate';
import { SharedType } from '../model';
export declare type ApplyFunc<O extends Operation = Operation> = (sharedType: SharedType, op: O) => SharedType;
export declare type OpMapper<O extends Operation = Operation> = {
    [K in O['type']]: O extends {
        type: K;
    } ? ApplyFunc<O> : never;
};
