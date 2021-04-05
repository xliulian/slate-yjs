import { Editor, Operation } from 'slate';
import * as Y from 'yjs';
import { SharedType } from '../model';
export interface YjsEditor extends Editor {
    isRemote: boolean;
    isLocal: boolean;
    remoteUpdated: boolean;
    sharedType: SharedType;
    localYDoc: Y.Doc;
    remoteYDoc: Y.Doc;
    localYjsStateVector: Uint8Array;
    receiveOperation: (update: Uint8Array) => void;
}
export declare const YjsEditor: {
    /**
     * Set the editor value to the content of the to the editor bound shared type.
     */
    synchronizeValue: (e: YjsEditor) => void;
    /**
     * Apply slate ops to Yjs
     */
    applySlateOps: (e: YjsEditor, operations: Operation[]) => void;
    /**
     * Apply Yjs events to slate
     */
    applyYjsEvents: (e: YjsEditor, events: Y.YEvent[]) => void;
};
export declare function withYjs<T extends Editor>(editor: T, sharedType: SharedType): T & YjsEditor;
