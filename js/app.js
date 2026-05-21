// app.js
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const svgOverlay = document.getElementById('lines-svg');
    const addTableBtn = document.getElementById('add-table-btn');
    const exportBtn = document.getElementById('export-btn');
    const saveJsonBtn = document.getElementById('save-json-btn');
    const loadJsonBtn = document.getElementById('load-json-btn');
    const clearBtn = document.getElementById('clear-btn');
    const importFileInput = document.getElementById('import-file-input');
    
    let tableIdCounter = 0;
    let cellIdCounter = 0;
    let connections = []; // Array of { id, fromCellId, toCellId }
    let connectionIdCounter = 0;
    
    // Dragging state for tables
    let activeTable = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    
    // Connection drawing state
    let isDrawingConnection = false;
    let startCellNode = null; // DOM element of the starting connection node
    let tempPath = null;
    
    // Generate unique IDs
    const getTableId = () => `table_${tableIdCounter++}`;
    const getCellId = () => `cell_${cellIdCounter++}`;
    const getConnectionId = () => `conn_${connectionIdCounter++}`;
    
    function deleteTable(tableEl) {
        const cells = tableEl.querySelectorAll('.table-cell');
        const cellIds = Array.from(cells).map(cell => cell.id);
        
        // Remove all connections associated with any of the table's cells
        connections = connections.filter(conn => 
            !cellIds.includes(conn.fromCellId) && !cellIds.includes(conn.toCellId)
        );
        
        tableEl.remove();
        renderConnections();
        saveState();
    }
    
    function createTable(x = 200, y = 200) {
        const tableId = getTableId();
        const tableEl = document.createElement('div');
        tableEl.className = 'schema-table';
        tableEl.id = tableId;
        tableEl.style.left = `${x}px`;
        tableEl.style.top = `${y}px`;
        
        // Header
        const headerEl = document.createElement('div');
        headerEl.className = 'table-header';
        
        const titleEl = document.createElement('div');
        titleEl.className = 'table-title';
        titleEl.contentEditable = 'true';
        titleEl.innerText = `Table ${tableIdCounter}`;
        titleEl.addEventListener('mousedown', (e) => e.stopPropagation()); // Don't drag when clicking text
        titleEl.addEventListener('input', () => saveState());
        
        const actionsEl = document.createElement('div');
        actionsEl.className = 'table-actions';
        
        const addColBtn = document.createElement('button');
        addColBtn.className = 'action-btn';
        addColBtn.innerText = '+Col';
        addColBtn.onclick = (e) => {
            e.stopPropagation();
            addColumn(tableEl);
            saveState();
        };
        
        const deleteTableBtn = document.createElement('button');
        deleteTableBtn.className = 'action-btn delete-table-btn';
        deleteTableBtn.innerText = 'Delete';
        deleteTableBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm("Are you sure you want to delete this table and all its connections?")) {
                deleteTable(tableEl);
            }
        };
        
        actionsEl.appendChild(addColBtn);
        actionsEl.appendChild(deleteTableBtn);
        headerEl.appendChild(titleEl);
        headerEl.appendChild(actionsEl);
        
        // Drag logic
        headerEl.addEventListener('mousedown', (e) => {
            if (e.target.contentEditable === "true") return;
            activeTable = tableEl;
            tableEl.classList.add('dragging');
            const rect = tableEl.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            // Offset from the mouse to the top-left of the table
            dragOffsetX = e.clientX - rect.left + canvasRect.left;
            dragOffsetY = e.clientY - rect.top + canvasRect.top;
        });
        
        // Row
        const rowEl = document.createElement('div');
        rowEl.className = 'table-row';
        
        tableEl.appendChild(headerEl);
        tableEl.appendChild(rowEl);
        
        canvas.appendChild(tableEl);
        
        // Add some default columns
        addColumn(tableEl, "id");
        addColumn(tableEl, "name");
        
        saveState();
        return tableEl;
    }
    
    function addColumn(tableEl, defaultText = "column") {
        const rowEl = tableEl.querySelector('.table-row');
        const cellId = getCellId();
        
        const cellEl = document.createElement('div');
        cellEl.className = 'table-cell';
        cellEl.id = cellId;
        
        const contentEl = document.createElement('div');
        contentEl.className = 'cell-content';
        contentEl.contentEditable = 'true';
        contentEl.innerText = defaultText;
        contentEl.addEventListener('input', () => saveState());
        
        const nodeEl = document.createElement('div');
        nodeEl.className = 'conn-node';
        nodeEl.dataset.cellId = cellId;
        
        // Connection drawing logic
        nodeEl.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isDrawingConnection = true;
            startCellNode = nodeEl;
            
            tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            tempPath.setAttribute('class', 'connection-path');
            tempPath.setAttribute('marker-end', 'url(#arrowhead)');
            svgOverlay.appendChild(tempPath);
        });
        
        // Connect when mouse up on another node
        nodeEl.addEventListener('mouseup', (e) => {
            if (isDrawingConnection && startCellNode && startCellNode !== nodeEl) {
                const fromId = startCellNode.dataset.cellId;
                const toId = nodeEl.dataset.cellId;
                
                connections.push({
                    id: getConnectionId(),
                    fromCellId: fromId,
                    toCellId: toId,
                    index: connections.length
                });
                renderConnections();
                saveState();
            }
        });
        
        cellEl.appendChild(contentEl);
        cellEl.appendChild(nodeEl);
        rowEl.appendChild(cellEl);
        
        // Wait for DOM layout then render connections
        setTimeout(() => {
            renderConnections();
            saveState();
        }, 10);
    }
    
    function drawSnapLines(guides) {
        // Clear existing snap lines
        const existing = svgOverlay.querySelectorAll('.snap-line');
        existing.forEach(el => el.remove());
        
        guides.forEach(g => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('class', 'snap-line');
            if (g.type === 'v') {
                line.setAttribute('x1', g.coord);
                line.setAttribute('y1', '0');
                line.setAttribute('x2', g.coord);
                line.setAttribute('y2', '4000');
            } else {
                line.setAttribute('x1', '0');
                line.setAttribute('y1', g.coord);
                line.setAttribute('x2', '4000');
                line.setAttribute('y2', g.coord);
            }
            svgOverlay.appendChild(line);
        });
    }
    
    // Canvas Mouse events
    document.addEventListener('mousemove', (e) => {
        if (activeTable) {
            const canvasRect = canvas.getBoundingClientRect();
            // Calculate new position relative to canvas
            let newX = e.clientX - canvasRect.left - dragOffsetX;
            let newY = e.clientY - canvasRect.top - dragOffsetY;
            
            // Snap alignment logic
            const otherTables = Array.from(document.querySelectorAll('.schema-table')).filter(t => t !== activeTable);
            const width = activeTable.offsetWidth;
            const height = activeTable.offsetHeight;
            const SNAP_THRESHOLD = 8;
            let guides = [];
            
            let snappedX = false;
            let snappedY = false;
            
            for (let t of otherTables) {
                const rect = {
                    left: parseInt(t.style.left) || 0,
                    top: parseInt(t.style.top) || 0,
                    width: t.offsetWidth,
                    height: t.offsetHeight
                };
                
                const tLeft = rect.left;
                const tCenter = rect.left + rect.width / 2;
                const tRight = rect.left + rect.width;
                
                const aLeft = newX;
                const aCenter = newX + width / 2;
                const aRight = newX + width;
                
                if (Math.abs(aLeft - tLeft) < SNAP_THRESHOLD) {
                    newX = tLeft;
                    guides.push({ type: 'v', coord: tLeft });
                    snappedX = true;
                } else if (Math.abs(aCenter - tCenter) < SNAP_THRESHOLD) {
                    newX = tCenter - width / 2;
                    guides.push({ type: 'v', coord: tCenter });
                    snappedX = true;
                } else if (Math.abs(aRight - tRight) < SNAP_THRESHOLD) {
                    newX = tRight - width;
                    guides.push({ type: 'v', coord: tRight });
                    snappedX = true;
                } else if (Math.abs(aLeft - tRight) < SNAP_THRESHOLD) {
                    newX = tRight;
                    guides.push({ type: 'v', coord: tRight });
                    snappedX = true;
                } else if (Math.abs(aRight - tLeft) < SNAP_THRESHOLD) {
                    newX = tLeft - width;
                    guides.push({ type: 'v', coord: tLeft });
                    snappedX = true;
                }
                
                if (snappedX) break;
            }
            
            for (let t of otherTables) {
                const rect = {
                    left: parseInt(t.style.left) || 0,
                    top: parseInt(t.style.top) || 0,
                    width: t.offsetWidth,
                    height: t.offsetHeight
                };
                
                const tTop = rect.top;
                const tMiddle = rect.top + rect.height / 2;
                const tBottom = rect.top + rect.height;
                
                const aTop = newY;
                const aMiddle = newY + height / 2;
                const aBottom = newY + height;
                
                if (Math.abs(aTop - tTop) < SNAP_THRESHOLD) {
                    newY = tTop;
                    guides.push({ type: 'h', coord: tTop });
                    snappedY = true;
                } else if (Math.abs(aMiddle - tMiddle) < SNAP_THRESHOLD) {
                    newY = tMiddle - height / 2;
                    guides.push({ type: 'h', coord: tMiddle });
                    snappedY = true;
                } else if (Math.abs(aBottom - tBottom) < SNAP_THRESHOLD) {
                    newY = tBottom - height;
                    guides.push({ type: 'h', coord: tBottom });
                    snappedY = true;
                } else if (Math.abs(aTop - tBottom) < SNAP_THRESHOLD) {
                    newY = tBottom;
                    guides.push({ type: 'h', coord: tBottom });
                    snappedY = true;
                } else if (Math.abs(aBottom - tTop) < SNAP_THRESHOLD) {
                    newY = tTop - height;
                    guides.push({ type: 'h', coord: tTop });
                    snappedY = true;
                }
                
                if (snappedY) break;
            }
            
            drawSnapLines(guides);
            
            activeTable.style.left = `${newX}px`;
            activeTable.style.top = `${newY}px`;
            
            renderConnections(); // Update lines continuously
        }
        
        if (isDrawingConnection && startCellNode) {
            const startPos = getNodeCenter(startCellNode);
            const canvasRect = canvas.getBoundingClientRect();
            
            // Mouse pos relative to canvas coordinate system
            const mouseX = e.clientX - canvasRect.left;
            const mouseY = e.clientY - canvasRect.top;
            
            const pathStr = window.Router.getRightSpinePath(startPos, {x: mouseX, y: mouseY}, connections.length);
            tempPath.setAttribute('d', pathStr);
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (activeTable) {
            activeTable.classList.remove('dragging');
            activeTable = null;
            drawSnapLines([]); // Clear guides
            saveState();
        }
        
        if (isDrawingConnection) {
            isDrawingConnection = false;
            startCellNode = null;
            if (tempPath && tempPath.parentNode) {
                tempPath.parentNode.removeChild(tempPath);
            }
            tempPath = null;
        }
    });
    
    function getNodeCenter(nodeEl) {
        const rect = nodeEl.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2 - canvasRect.left,
            y: rect.top + rect.height / 2 - canvasRect.top
        };
    }
    
    function renderConnections() {
        // Clear existing static paths (not the temp one)
        const paths = svgOverlay.querySelectorAll('.static-connection');
        paths.forEach(p => p.remove());
        
        // Reset connected class on all nodes
        const allNodes = document.querySelectorAll('.conn-node');
        allNodes.forEach(node => node.classList.remove('connected'));
        
        connections.forEach((conn) => {
            const fromCell = document.getElementById(conn.fromCellId);
            const toCell = document.getElementById(conn.toCellId);
            
            if (fromCell && toCell) {
                const fromNode = fromCell.querySelector('.conn-node');
                const toNode = toCell.querySelector('.conn-node');
                
                if (fromNode) fromNode.classList.add('connected');
                if (toNode) toNode.classList.add('connected');
                
                const startPos = getNodeCenter(fromNode);
                const endPos = getNodeCenter(toNode);
                
                const pathStr = window.Router.getRightSpinePath(startPos, endPos, conn.index);
                
                const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                pathEl.setAttribute('d', pathStr);
                pathEl.setAttribute('class', 'connection-path static-connection');
                pathEl.setAttribute('marker-end', 'url(#arrowhead)');
                
                // Allow double click to delete connection
                pathEl.addEventListener('dblclick', () => {
                    connections = connections.filter(c => c.id !== conn.id);
                    renderConnections();
                    saveState();
                });
                
                // Hover effect
                pathEl.addEventListener('mouseenter', () => pathEl.classList.add('connection-path-hover'));
                pathEl.addEventListener('mouseleave', () => pathEl.classList.remove('connection-path-hover'));
                
                svgOverlay.appendChild(pathEl);
            }
        });
    }
    
    // ----------------------------------------------------
    // Save / Load Progress Logic (Autosave & JSON Export/Import)
    // ----------------------------------------------------
    
    function saveState() {
        const tablesData = [];
        document.querySelectorAll('.schema-table').forEach(tableEl => {
            const id = tableEl.id;
            const x = parseInt(tableEl.style.left) || 0;
            const y = parseInt(tableEl.style.top) || 0;
            const title = tableEl.querySelector('.table-title').innerText;
            
            const columns = [];
            tableEl.querySelectorAll('.table-cell').forEach(cellEl => {
                columns.push({
                    id: cellEl.id,
                    text: cellEl.querySelector('.cell-content').innerText
                });
            });
            
            tablesData.push({ id, x, y, title, columns });
        });
        
        const state = {
            tables: tablesData,
            connections: connections,
            counters: {
                table: tableIdCounter,
                cell: cellIdCounter,
                conn: connectionIdCounter
            }
        };
        
        localStorage.setItem('relation_schema_state', JSON.stringify(state));
        return state;
    }
    window.saveState = saveState; // Expose for testing
    
    function loadState(state) {
        if (!state) return;
        
        // Clear canvas
        canvas.querySelectorAll('.schema-table').forEach(t => t.remove());
        connections = [];
        renderConnections();
        
        // Restore counters
        tableIdCounter = state.counters ? state.counters.table : 0;
        cellIdCounter = state.counters ? state.counters.cell : 0;
        connectionIdCounter = state.counters ? state.counters.conn : 0;
        
        // Re-create tables
        state.tables.forEach(tData => {
            const tableEl = document.createElement('div');
            tableEl.className = 'schema-table';
            tableEl.id = tData.id;
            tableEl.style.left = `${tData.x}px`;
            tableEl.style.top = `${tData.y}px`;
            
            // Header
            const headerEl = document.createElement('div');
            headerEl.className = 'table-header';
            
            const titleEl = document.createElement('div');
            titleEl.className = 'table-title';
            titleEl.contentEditable = 'true';
            titleEl.innerText = tData.title;
            titleEl.addEventListener('mousedown', (e) => e.stopPropagation());
            titleEl.addEventListener('input', () => saveState());
            
            const actionsEl = document.createElement('div');
            actionsEl.className = 'table-actions';
            
            const addColBtn = document.createElement('button');
            addColBtn.className = 'action-btn';
            addColBtn.innerText = '+Col';
            addColBtn.onclick = (e) => {
                e.stopPropagation();
                addColumn(tableEl);
                saveState();
            };
            
            const deleteTableBtn = document.createElement('button');
            deleteTableBtn.className = 'action-btn delete-table-btn';
            deleteTableBtn.innerText = 'Delete';
            deleteTableBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm("Are you sure you want to delete this table and all its connections?")) {
                    deleteTable(tableEl);
                }
            };
            
            actionsEl.appendChild(addColBtn);
            actionsEl.appendChild(deleteTableBtn);
            headerEl.appendChild(titleEl);
            headerEl.appendChild(actionsEl);
            
            // Drag logic
            headerEl.addEventListener('mousedown', (e) => {
                if (e.target.contentEditable === "true") return;
                tableEl.classList.add('dragging');
                activeTable = tableEl;
                const rect = tableEl.getBoundingClientRect();
                const canvasRect = canvas.getBoundingClientRect();
                dragOffsetX = e.clientX - rect.left + canvasRect.left;
                dragOffsetY = e.clientY - rect.top + canvasRect.top;
            });
            
            // Row container
            const rowEl = document.createElement('div');
            rowEl.className = 'table-row';
            
            tableEl.appendChild(headerEl);
            tableEl.appendChild(rowEl);
            canvas.appendChild(tableEl);
            
            // Re-create columns
            tData.columns.forEach(col => {
                const cellEl = document.createElement('div');
                cellEl.className = 'table-cell';
                cellEl.id = col.id;
                
                const contentEl = document.createElement('div');
                contentEl.className = 'cell-content';
                contentEl.contentEditable = 'true';
                contentEl.innerText = col.text;
                contentEl.addEventListener('input', () => saveState());
                
                const nodeEl = document.createElement('div');
                nodeEl.className = 'conn-node';
                nodeEl.dataset.cellId = col.id;
                
                // Connection drawing logic
                nodeEl.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    isDrawingConnection = true;
                    startCellNode = nodeEl;
                    
                    tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    tempPath.setAttribute('class', 'connection-path');
                    tempPath.setAttribute('marker-end', 'url(#arrowhead)');
                    svgOverlay.appendChild(tempPath);
                });
                
                nodeEl.addEventListener('mouseup', (e) => {
                    if (isDrawingConnection && startCellNode && startCellNode !== nodeEl) {
                        const fromId = startCellNode.dataset.cellId;
                        const toId = nodeEl.dataset.cellId;
                        
                        connections.push({
                            id: getConnectionId(),
                            fromCellId: fromId,
                            toCellId: toId,
                            index: connections.length
                        });
                        renderConnections();
                        saveState();
                    }
                });
                
                cellEl.appendChild(contentEl);
                cellEl.appendChild(nodeEl);
                rowEl.appendChild(cellEl);
            });
        });
        
        // Restore connections
        connections = state.connections || [];
        renderConnections();
    }
    window.loadState = loadState; // Expose for testing
    
    // UI Actions
    addTableBtn.addEventListener('click', () => {
        // Find a free spot
        const x = 300 + Math.random() * 200;
        const y = 200 + Math.random() * 200;
        createTable(x, y);
    });
    
    exportBtn.addEventListener('click', () => {
        const tables = document.querySelectorAll('.schema-table');
        if (tables.length === 0) {
            return;
        }

        // 1. Calculate bounding box of all tables
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        tables.forEach(table => {
            const left = parseInt(table.style.left) || 0;
            const top = parseInt(table.style.top) || 0;
            const width = table.offsetWidth || 200;
            const height = table.offsetHeight || 100;

            if (left < minX) minX = left;
            if (left + width > maxX) maxX = left + width;
            if (top < minY) minY = top;
            if (top + height > maxY) maxY = top + height;
        });

        // 2. Adjust bounding box for arrow spines and drops
        if (connections.length > 0) {
            // The rightmost spine will be at maxRight + 40 + (index * 8)
            // where maxRight is the maximum right edge of all tables (which is maxX)
            const maxSpineX = maxX + 40 + ((connections.length - 1) * 8);
            if (maxSpineX > maxX) {
                maxX = maxSpineX + 15; // 15px extra for arrowhead/spacing
            }
            // Lines drop below the tables by up to 55px. Let's add 65px to maxY.
            maxY += 65;
        }

        // 3. Apply padding around the elements
        const padding = 40;
        const exportX = Math.max(0, minX - padding);
        const exportY = Math.max(0, minY - padding);
        const exportWidth = (maxX + padding) - exportX;
        const exportHeight = (maxY + padding) - exportY;

        const originalBg = canvas.style.backgroundColor;
        canvas.style.backgroundColor = 'white'; // Ensure background is strictly white
        canvas.classList.add('exporting'); // Temporarily hide unconnected nodes
        
        html2canvas(canvas, {
            backgroundColor: '#ffffff',
            scale: 2 // High res export
        }).then(canvasEl => {
            const scale = 2;
            
            // Create offscreen canvas for cropping to bounding box
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = exportWidth * scale;
            croppedCanvas.height = exportHeight * scale;
            
            const ctx = croppedCanvas.getContext('2d');
            ctx.drawImage(
                canvasEl,
                exportX * scale,
                exportY * scale,
                exportWidth * scale,
                exportHeight * scale,
                0,
                0,
                exportWidth * scale,
                exportHeight * scale
            );

            const link = document.createElement('a');
            link.download = 'relation_schema.png';
            link.href = croppedCanvas.toDataURL('image/png');
            link.click();
            
            canvas.style.backgroundColor = originalBg;
            canvas.classList.remove('exporting');
        }).catch(err => {
            console.error("Export failed:", err);
            canvas.style.backgroundColor = originalBg;
            canvas.classList.remove('exporting');
        });
    });

    // Save JSON Action
    saveJsonBtn.addEventListener('click', () => {
        const state = saveState();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 4));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "relation_schema.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    // Import JSON Action
    loadJsonBtn.addEventListener('click', () => {
        importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const state = JSON.parse(event.target.result);
                loadState(state);
                saveState(); // Update localStorage with the imported state
                alert("Schema imported successfully!");
            } catch (err) {
                alert("Failed to parse JSON file. Please make sure it is a valid relation schema backup.");
            }
        };
        reader.readAsText(file);
        
        // Reset file input value
        importFileInput.value = '';
    });

    // Start Afresh / Clear Action
    clearBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to start afresh? This will delete all tables and connections, clearing your progress.")) {
            localStorage.removeItem('relation_schema_state');
            
            // Clear DOM
            canvas.querySelectorAll('.schema-table').forEach(t => t.remove());
            connections = [];
            renderConnections();
            
            // Reset counters
            tableIdCounter = 0;
            cellIdCounter = 0;
            connectionIdCounter = 0;
            
            // Re-initialize with standard defaults
            createTable(200, 100);
            createTable(500, 300);
            
            saveState();
        }
    });
    
    // Initialize: load from localStorage if exists, otherwise load defaults
    const savedStateStr = localStorage.getItem('relation_schema_state');
    if (savedStateStr) {
        try {
            const state = JSON.parse(savedStateStr);
            loadState(state);
        } catch (err) {
            console.error("Failed to load saved state:", err);
            createTable(200, 100);
            createTable(500, 300);
        }
    } else {
        createTable(200, 100);
        createTable(500, 300);
    }
});
