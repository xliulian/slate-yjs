import { Awareness } from 'y-protocols/awareness';
import { absolutePositionToRelativePosition } from '../cursor/utils';
import { YjsEditor } from './yjsEditor';

export interface CursorEditor extends YjsEditor {
  awareness: Awareness;
}

export const CursorEditor = {
  updateCursor: (e: CursorEditor): void => {
    const anchor =
      e.selection &&
      absolutePositionToRelativePosition(e.sharedType, e.selection.anchor);

    const focus =
      e.selection &&
      absolutePositionToRelativePosition(e.sharedType, e.selection.focus);
    
    const state = e.awareness.getLocalState()
    if (state !== null) {
      e.awareness.setLocalState({
        ...state,
        anchor,
        focus,
      })
    }
  },
};

export function withCursor<T extends YjsEditor>(
  editor: T,
  awareness: Awareness
): T & CursorEditor {
  const e = editor as T & CursorEditor;

  e.awareness = awareness;

  const { onChange } = editor;

  e.onChange = () => {
    setTimeout(() => {
      try {
        CursorEditor.updateCursor(e)
      } catch (err) {
        console.warn('CursorEditor.updateCursor failed:', err)
      }
    }, 0);

    if (onChange) {
      onChange();
    }
  };

  return e;
}
