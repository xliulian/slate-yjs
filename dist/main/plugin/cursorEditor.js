"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withCursor = exports.CursorEditor = void 0;
const utils_1 = require("../cursor/utils");
exports.CursorEditor = {
    updateCursor: (e) => {
        const anchor = e.selection &&
            utils_1.absolutePositionToRelativePosition(e.sharedType, e.selection.anchor);
        const focus = e.selection &&
            utils_1.absolutePositionToRelativePosition(e.sharedType, e.selection.focus);
        const state = e.awareness.getLocalState();
        if (state !== null) {
            e.awareness.setLocalState(Object.assign(Object.assign({}, state), { anchor,
                focus }));
        }
    },
};
function withCursor(editor, awareness) {
    const e = editor;
    e.awareness = awareness;
    const { onChange } = editor;
    e.onChange = () => {
        setTimeout(() => exports.CursorEditor.updateCursor(e), 0);
        if (onChange) {
            onChange();
        }
    };
    return e;
}
exports.withCursor = withCursor;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yRWRpdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3BsdWdpbi9jdXJzb3JFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsMkNBQXFFO0FBT3hELFFBQUEsWUFBWSxHQUFHO0lBQzFCLFlBQVksRUFBRSxDQUFDLENBQWUsRUFBUSxFQUFFO1FBQ3RDLE1BQU0sTUFBTSxHQUNWLENBQUMsQ0FBQyxTQUFTO1lBQ1gsMENBQWtDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXZFLE1BQU0sS0FBSyxHQUNULENBQUMsQ0FBQyxTQUFTO1lBQ1gsMENBQWtDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXRFLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDekMsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFO1lBQ2xCLENBQUMsQ0FBQyxTQUFTLENBQUMsYUFBYSxpQ0FDcEIsS0FBSyxLQUNSLE1BQU07Z0JBQ04sS0FBSyxJQUNMLENBQUE7U0FDSDtJQUNILENBQUM7Q0FDRixDQUFDO0FBRUYsU0FBZ0IsVUFBVSxDQUN4QixNQUFTLEVBQ1QsU0FBb0I7SUFFcEIsTUFBTSxDQUFDLEdBQUcsTUFBMEIsQ0FBQztJQUVyQyxDQUFDLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztJQUV4QixNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsTUFBTSxDQUFDO0lBRTVCLENBQUMsQ0FBQyxRQUFRLEdBQUcsR0FBRyxFQUFFO1FBQ2hCLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxvQkFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVsRCxJQUFJLFFBQVEsRUFBRTtZQUNaLFFBQVEsRUFBRSxDQUFDO1NBQ1o7SUFDSCxDQUFDLENBQUM7SUFFRixPQUFPLENBQUMsQ0FBQztBQUNYLENBQUM7QUFuQkQsZ0NBbUJDIn0=