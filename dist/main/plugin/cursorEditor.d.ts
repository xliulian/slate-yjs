import { Awareness } from 'y-protocols/awareness';
import { YjsEditor } from './yjsEditor';
export interface CursorEditor extends YjsEditor {
    awareness: Awareness;
}
export declare const CursorEditor: {
    updateCursor: (e: CursorEditor) => void;
};
export declare function withCursor<T extends YjsEditor>(editor: T, awareness: Awareness): T & CursorEditor;
