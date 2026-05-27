// Rugby position slots 1-15. Slot number is the unique identifier; name is for display.
export const POSITION_SLOTS = [
    { slot: 1,  name: "Loosehead Prop" },
    { slot: 2,  name: "Hooker" },
    { slot: 3,  name: "Tighthead Prop" },
    { slot: 4,  name: "Lock" },
    { slot: 5,  name: "Lock" },
    { slot: 6,  name: "Blindside Flanker" },
    { slot: 7,  name: "Openside Flanker" },
    { slot: 8,  name: "Number 8" },
    { slot: 9,  name: "Scrum Half" },
    { slot: 10, name: "Fly-half" },
    { slot: 11, name: "Left Wing" },
    { slot: 12, name: "Inside Centre" },
    { slot: 13, name: "Outside Centre" },
    { slot: 14, name: "Right Wing" },
    { slot: 15, name: "Full-back" },
];

export function slotName(slot) {
    return POSITION_SLOTS.find(p => p.slot === Number(slot))?.name || "";
}
