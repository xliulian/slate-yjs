import { NodeEntry, Range } from 'slate';
import { Cursor } from '../model';
import { CursorEditor } from './cursorEditor';
export declare const useCursors: (editor: CursorEditor) => {
    decorate: (entry: NodeEntry<import("slate").Node>) => Range[];
    cursors: Cursor[];
};
export default useCursors;
