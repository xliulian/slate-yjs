import { absolutePositionToRelativePosition } from '../cursor/utils';
export const CursorEditor = {
    updateCursor: (e) => {
        const anchor = e.selection &&
            absolutePositionToRelativePosition(e.sharedType, e.selection.anchor);
        const focus = e.selection &&
            absolutePositionToRelativePosition(e.sharedType, e.selection.focus);
        const state = e.awareness.getLocalState();
        if (state !== null) {
            e.awareness.setLocalState(Object.assign(Object.assign({}, state), { anchor,
                focus }));
        }
    },
};
export function withCursor(editor, awareness) {
    const e = editor;
    e.awareness = awareness;
    const { onChange } = editor;
    e.onChange = () => {
        setTimeout(() => {
            try {
                CursorEditor.updateCursor(e);
            }
            catch (err) {
                console.warn('CursorEditor.updateCursor failed:', err);
            }
        }, 0);
        if (onChange) {
            onChange();
        }
    };
    return e;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yRWRpdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3BsdWdpbi9jdXJzb3JFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFPckUsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHO0lBQzFCLFlBQVksRUFBRSxDQUFDLENBQWUsRUFBUSxFQUFFO1FBQ3RDLE1BQU0sTUFBTSxHQUNWLENBQUMsQ0FBQyxTQUFTO1lBQ1gsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXZFLE1BQU0sS0FBSyxHQUNULENBQUMsQ0FBQyxTQUFTO1lBQ1gsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXRFLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDekMsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFO1lBQ2xCLENBQUMsQ0FBQyxTQUFTLENBQUMsYUFBYSxpQ0FDcEIsS0FBSyxLQUNSLE1BQU07Z0JBQ04sS0FBSyxJQUNMLENBQUE7U0FDSDtJQUNILENBQUM7Q0FDRixDQUFDO0FBRUYsTUFBTSxVQUFVLFVBQVUsQ0FDeEIsTUFBUyxFQUNULFNBQW9CO0lBRXBCLE1BQU0sQ0FBQyxHQUFHLE1BQTBCLENBQUM7SUFFckMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFFeEIsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLE1BQU0sQ0FBQztJQUU1QixDQUFDLENBQUMsUUFBUSxHQUFHLEdBQUcsRUFBRTtRQUNoQixVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2QsSUFBSTtnQkFDRixZQUFZLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFBO2FBQzdCO1lBQUMsT0FBTyxHQUFHLEVBQUU7Z0JBQ1osT0FBTyxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLENBQUMsQ0FBQTthQUN2RDtRQUNILENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVOLElBQUksUUFBUSxFQUFFO1lBQ1osUUFBUSxFQUFFLENBQUM7U0FDWjtJQUNILENBQUMsQ0FBQztJQUVGLE9BQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQyJ9