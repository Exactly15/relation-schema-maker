// router.js
// Handles the routing of arrows

const Router = {
    // A simple counter to offset overlapping lines on the spine
    lineIndex: 0,
    
    // Calculates the path string for an SVG path routing via the right spine
    // start and end are {x, y} coordinates
    getRightSpinePath(start, end, index) {
        // Drop amounts below the cells
        const dropAmount1 = 20 + (index % 5) * 5; 
        const dropAmount2 = 30 + (index % 5) * 5;

        // Find the rightmost table/element edge to place the spine to the right of everything
        const tables = document.querySelectorAll('.schema-table');
        let maxRight = Math.max(start.x, end.x);
        tables.forEach(table => {
            const left = parseInt(table.style.left) || 0;
            const width = table.offsetWidth || 200;
            if (left + width > maxRight) {
                maxRight = left + width;
            }
        });

        // Base spine X to the right of the rightmost table
        // Adding a slight offset so multiple lines don't completely overlap
        const spineX = maxRight + 40 + (index * 8);

        // Path points
        const p0 = { x: start.x, y: start.y };
        const p1 = { x: start.x, y: start.y + dropAmount1 }; // drop down
        const p2 = { x: spineX, y: start.y + dropAmount1 }; // go right to spine
        const p3 = { x: spineX, y: end.y + dropAmount2 }; // travel along spine
        const p4 = { x: end.x, y: end.y + dropAmount2 }; // go left to target's drop level
        const p5 = { x: end.x, y: end.y }; // go up to target

        // SVG Path String
        // M: Move to
        // L: Line to
        return `M ${p0.x} ${p0.y} 
                L ${p1.x} ${p1.y} 
                L ${p2.x} ${p2.y} 
                L ${p3.x} ${p3.y} 
                L ${p4.x} ${p4.y} 
                L ${p5.x} ${p5.y}`;
    }
};

window.Router = Router;
