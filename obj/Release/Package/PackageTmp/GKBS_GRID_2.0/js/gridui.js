class GKBSDynamicGrid {
    constructor(selector, columns, data, options = {}) {
        this.container = document.querySelector(selector);
        if (!this.container) return;

        // 💡 NEW: Instance Management
        // If there's an existing grid instance on this container, destroy it first
        if (this.container._gkbsGrid && typeof this.container._gkbsGrid.destroy === 'function') {
            console.log("Existing grid detected on container. Cleaning up...");
            this.container._gkbsGrid.destroy();
        }
        // Store this instance on the container for future cleanup
        this.container._gkbsGrid = this;

        this.columns = columns; // Stores config including current width
        this.originalData = data;

        // --- 1. Options with Defaults ---
        this.options = Object.assign({
            enablePagination: false,
            pageSize: 10,
            enableSearch: true,
            stickyToWindow: true,
            height: '200px',
            rowActions: [],
            enableExport: false, // Defaulting new options explicitly
            enableColumnsBtn: false,
            enableAddRow: false,
            enableRemoveRow: false,
            enableSorting: true,
            enablePrint: false,
            enableDarkMode: false,
            customButtons: [], // 💡 NEW: Custom toolbar buttons
            onCellClick: null, // 💡 NEW: Cell click callback
            onCellDoubleClick: null, // 💡 NEW: Cell double-click callback
            onColumnResize: null, // 💡 NEW: Column resize callback
            onEnter: null, // 💡 NEW: Enter key callback
            selectFromFirstRow: false, // 💡 NEW: Auto-select first row on render
            initialFocusField: null,   // 💡 NEW: Field to match for initial focus
            initialFocusValue: null,   // 💡 NEW: Value to match for initial focus
            initialFocusCriteria: null // 💡 NEW: Object for multi-field matching logic
        }, options);

        // --- 2. State Initialization ---
        this.state = {
            currentPage: 1,
            searchTerm: options.searchTerm || '',
            filters: {},
            colFilters: {},
            sortConfig: null,
            currentSort: { field: null, direction: 'asc' },
            processedData: [],
            selectedRows: new Set(),
            activeAutocompletePopup: null,
            filterOrder: [],
            textFilters: {},
            // Initializes visibility based on column config
            columnVisibility: columns.reduce((acc, col) => {
                if (!col) return null;
                acc[col.field] = col.visible !== false; // True by default
                return acc;
            }, {}),
        };
        if (data) {
            // --- 3. Data Preprocessing (Ensure unique IDs) ---
            this.originalData = data.map((row, index) => ({
                ...row,
                _gridId: row._gridId || Symbol(index)
            }));
        }
        // --- 4. Global Event Listener Setup ---
        // Remove the two old, conflicting document.addEventListener calls.
        // Use ONE listener bound to 'this' for proper closure management.

        this.globalClickListener = (e) => {
            // A. Prevent closing if click is inside an active filter/column popup
            if (e.target.closest('.dg-filter-popup') || e.target.closest('.dg-column-popup')) {
                // Stop propagation to prevent the click from hitting the document listener 
                // used inside showOptionsMenu (as suggested in previous steps)
                return;
            }

            // B. Close popups if click is outside the header
            // If the click is not inside the header cell, close the column filter menu.
            if (!e.target.closest('.dg-header-cell')) {
                this.closeAllPopups();
            }

            // C. Close autocomplete if click is outside input or list
            if (!e.target.closest('.dg-input') && !e.target.closest('.dg-autocomplete-list')) {
                // Note: If you have a dedicated closeAutocomplete() method, call it here.
                // Since closeAllPopups handles all popups, including autocomplete (assuming it's tracked),
                // we'll rely on closeAllPopups unless you have dedicated tracking for autocomplete.
                // If activeAutocompletePopup is tracked, you should ensure closeAllPopups handles it.
                // If the filter/column logic above didn't close it, it means the click was inside the grid body.
                this.closeAllPopups();
            }
        };

        document.addEventListener('click', this.globalClickListener);

        // --- 5. Initialization ---
        this.init();
    }

    /**
     * Completely cleans up the grid instance, removing DOM listeners
     * and clearing references to prevent memory leaks and duplicate events.
     */
    destroy() {
        console.log("Destroying grid instance...");

        // 1. Remove keyboard navigation listener
        if (this._keyNavHandler) {
            this.container.removeEventListener('keydown', this._keyNavHandler);
        }

        // 2. Remove global click listener
        if (this.globalClickListener) {
            document.removeEventListener('click', this.globalClickListener);
        }

        // 3. Reset internal state
        this._activeRowIndex = -1;

        // 4. Clear the reference on the DOM container
        if (this.container && this.container._gkbsGrid === this) {
            delete this.container._gkbsGrid;
        }

        // Note: We don't clear the innerHTML here because it might be 
        // immediately replaced by a new grid instance's render call.
    }
    // Inside DynamicGrid class:

    getAllRowData() {
        // Returns the data after filtering and sorting (what is currently displayed/processed).
        // Use this.originalData if you want ALL data, ignoring filters.
        const dataToReturn = this.state.processedData;

        // Optional: Log the data to the console for verification
        //console.log("Retrieved Data:", dataToReturn); 

        return dataToReturn;
    }

    // Alias for getAllRowData - more intuitive naming
    getCurrentData() {
        // Returns filtered/sorted/processed data (visible rows based on current filters)
        return this.state.processedData;
    }

    getOriginalData() {
        // Returns ALL data, ignoring any filters, search, or sorting
        return this.originalData;
    }

    getVisiblePageData() {
        // Returns only the data visible on the current page (if pagination is enabled)
        return this.getPaginatedData();
    }

    getDataCount() {
        // Returns count object with useful statistics
        return {
            total: this.originalData.length,
            filtered: this.state.processedData.length,
            selected: this.state.selectedRows.size
        };
    }
    // Inside DynamicGrid class:

    toggleColumnVisibility(field, isVisible) {
        // 1. Update the state
        this.state.columnVisibility[field] = isVisible;

        // 2. Find the column object in the main columns array and update its property
        const colIndex = this.columns.findIndex(c => c.field === field);
        if (colIndex !== -1) {
            this.columns[colIndex].visible = isVisible;
        }

        // 3. Re-render the entire grid
        // Re-rendering is necessary to regenerate the header and body rows
        // with the correct Flexbox widths/visibility.
        this.render();
    }
    // Inside DynamicGrid class:

    renderToolbox(toolboxSelector) {
        const toolboxContainer = document.querySelector(toolboxSelector);
        if (!toolboxContainer) return;

        toolboxContainer.innerHTML = ''; // Clear previous content

        const ul = document.createElement('ul');
        ul.className = 'dg-column-toolbox-list';

        this.columns.forEach(col => {
            const li = document.createElement('li');
            const isVisible = this.state.columnVisibility[col.field];

            li.innerHTML = `
            <label>
                <input type="checkbox" data-field="${col.field}" ${isVisible ? 'checked' : ''}>
                ${col.title}
            </label>
        `;

            // Attach the event listener to the checkbox
            li.querySelector('input').addEventListener('change', (e) => {
                const field = e.target.getAttribute('data-field');
                const checked = e.target.checked;
                this.toggleColumnVisibility(field, checked);
            });

            ul.appendChild(li);
        });

        toolboxContainer.appendChild(ul);
    }
    // Helper function to update the filter order array
    updateFilterOrder(field, isActive) {
        const index = this.state.filterOrder.indexOf(field);

        if (isActive && index === -1) {
            // Filter applied, add it to the end
            this.state.filterOrder.push(field);
        } else if (!isActive && index !== -1) {
            // Filter cleared, remove it
            this.state.filterOrder.splice(index, 1);
        }
    }
    // --- NEW: Row Double Click Handler ---
    handleRowDoubleClick(rowData) {
        // This is the function that runs when a row is double-clicked.
        console.log("--- Row Double-Clicked ---");
        console.log(rowData);

        // Example action: Display the record data in a readable format
        const recordDetails = JSON.stringify(rowData, null, 2);


        //alert(`Record Retrieved:\n\n${recordDetails}`);
    }
    init() {
        this.container.classList.add('dg-container');
        // Ensure container is focusable for keyboard navigation
        if (this.container.tabIndex === -1) {
            this.container.tabIndex = 0;
        }
        // 💡 NEW: Always reset focus index on initialization/re-bind
        this._activeRowIndex = -1;

        // Initial processing
        this.processData();
        this.render();
    }


    // Helper to strip HTML tags for export and tooltips
    stripHtml(html) {
        if (typeof html !== 'string') return html;
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    }

    // Helper to render icons (supports emojis, raw HTML, FontAwesome, Glyphicons)
    renderIcon(icon) {
        if (!icon) return '';
        // If it's already HTML (e.g., <i class="..."></i>), return as is
        if (icon.trim().startsWith('<')) return icon;

        // If it looks like a class name (fa..., fas..., glyphicon...)
        if (icon.includes('fa-') || icon.includes('glyphicon-') || icon.match(/^(fa|fas|far|fal|fab|glyphicon)\s/)) {
            return `<i class="${icon}"></i>`;
        }

        // Default (emojis or plain text)
        return icon;
    }
    // --- 1. The Data Pipeline ---
    processData() {
        let result = [...this.originalData]; // Start with the original data

        // --- A. Apply Global Search (Should be first) ---
        if (this.state.searchTerm) {
            const term = this.state.searchTerm.toLowerCase();
            result = result.filter(row => {
                return Object.values(row).some(val =>
                    String(val).toLowerCase().includes(term)
                );
            });
        }

        // --- B. Apply Checkbox Column Filters (Using this.state.colFilters) ---
        Object.keys(this.state.colFilters).forEach(field => {
            const filters = this.state.colFilters[field]; // This is an array of selected values

            // 1. Apply filter if a subset is selected
            if (filters && filters.length > 0) {
                result = result.filter(item => {
                    const itemValue = String(item[field]);
                    return filters.includes(itemValue);
                });
            }
            // 2. If the user deselected everything (filters is defined but empty)
            else if (filters && filters.length === 0) {
                result = [];
            }
        });

        // --- C. 💡 APPLY TEXT/OPERATOR FILTERS (Using this.state.textFilters) ---
        // THIS IS WHERE YOU SHOULD ADD THE TEXT FILTER LOGIC
        Object.keys(this.state.textFilters).forEach(field => {
            const filter = this.state.textFilters[field]; // This is the object { operator, value }
            const { operator, value } = filter;
            console.log("operator", operator, " value ", value);
            // if (value) {
            //     result = result.filter(item => {
            //         const itemValue = String(item[field]).toLowerCase().trim();
            //         console.log("itemValue ",itemValue);
            //         switch (operator) {
            //             case 'equal':
            //                 return itemValue === value;
            //             case 'not_equal':
            //                 return itemValue !== value;
            //             case 'starts_with':
            //                 return itemValue.startsWith(value);
            //             case 'ends_with':
            //                 return itemValue.endsWith(value);
            //             case 'not_contains':
            //                 return !itemValue.includes(value);
            //             case 'contains':
            //             default:
            //                 return itemValue.includes(value);
            //         }
            //     });
            // }
            if (value) {
                const col = this.columns.find(c => c.field === field);
                const columnType = col?.type?.toLowerCase();

                result = result.filter(item => {
                    const rawItemValue = item[field];

                    // --- NUMBER FILTERING LOGIC ---
                    if (columnType === 'number') {
                        const numValue = parseFloat(rawItemValue);
                        if (isNaN(numValue)) return false;

                        // Handle Number Operators
                        switch (operator) {
                            case 'greater_than':
                                return numValue > parseFloat(value);
                            case 'less_than':
                                return numValue < parseFloat(value);
                            case 'greater_than_or_equal':
                                return numValue >= parseFloat(value);
                            case 'less_than_or_equal':
                                return numValue <= parseFloat(value);
                            case 'equal':
                                return numValue === parseFloat(value);
                            case 'not_equal':
                                return numValue !== parseFloat(value);
                            case 'between':
                                const parts = value.split('-').map(s => parseFloat(s.trim()));
                                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                                    const [min, max] = parts.sort((a, b) => a - b);
                                    return numValue >= min && numValue <= max;
                                }
                                return false; // Invalid range format
                            default:
                                return true;
                        }
                    }

                    // --- TEXT FILTERING LOGIC ---
                    else {
                        const itemValue = String(rawItemValue).toLowerCase().trim();

                        switch (operator) {
                            case 'equal':
                                return itemValue === value;
                            case 'not_equal':
                                return itemValue !== value;
                            case 'starts_with':
                                return itemValue.startsWith(value);
                            case 'ends_with':
                                return itemValue.endsWith(value);
                            case 'not_contains':
                                return !itemValue.includes(value);
                            case 'contains':
                            default:
                                return itemValue.includes(value);
                        }
                    }
                });
            }
        });

        // --- D. Apply Column Sorting (Should be last) ---
        if (this.state.currentSort && this.state.currentSort.field) {
            const { field, direction } = this.state.currentSort;
            result.sort((a, b) => {
                let valA = a[field];
                let valB = b[field];

                // Handle nulls/undefined to ensure they don't break sorting
                if (valA === null || valA === undefined) valA = '';
                if (valB === null || valB === undefined) valB = '';

                // Check if both are strings for case-insensitive sort
                if (typeof valA === 'string' && typeof valB === 'string') {
                    // Use localeCompare for robust string comparison (handles accents, case, etc.)
                    const comparison = valA.localeCompare(valB, undefined, { sensitivity: 'base' });
                    return direction === 'asc' ? comparison : -comparison;
                }

                // Default comparison for numbers and other types
                if (valA < valB) return direction === 'asc' ? -1 : 1;
                if (valA > valB) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // --- E. Final Update ---
        this.state.processedData = result;

        // Reset page logic
        const maxPage = Math.ceil(this.state.processedData.length / this.options.pageSize) || 1;
        if (this.state.currentPage > maxPage) this.state.currentPage = 1;
    }
    getPaginatedData() {
        if (!this.options.enablePagination) return this.state.processedData;

        const start = (this.state.currentPage - 1) * this.options.pageSize;
        const end = start + this.options.pageSize;
        return this.state.processedData.slice(start, end);
    }
    // Inside DynamicGrid class, add this new method:

    setOption(key, value) {
        if (this.options.hasOwnProperty(key)) {
            this.options[key] = value;

            // Options that affect data (like pageSize or search) need full processing
            if (key === 'pageSize' || key === 'enableSearch') {
                this.processData();
            }

            // Re-render the grid to update the UI (Toolbar, Footer, Body)
            this.render();
        } else {
            console.warn(`Option "${key}" is not a recognized configuration property.`);
        }
    }
    // --- 2. Render Orchestrator ---

    render() {
        // 1. Clear the container
        // 0. 💡 FIX: Save current scroll position before clearing
        let scrollLeft = 0;
        let scrollTop = 0;
        const existingScrollWrapper = this.container.querySelector('.dg-scroll-wrapper');
        if (existingScrollWrapper) {
            scrollLeft = existingScrollWrapper.scrollLeft;
            scrollTop = existingScrollWrapper.scrollTop;
        }

        // 1. Clear the container
        this.container.innerHTML = '';

        // 2. Create the scrolling wrapper
        const scrollWrapper = document.createElement('div');
        scrollWrapper.className = 'dg-scroll-wrapper';
        if (this.options.height) {
            scrollWrapper.style.height = this.options.height;
            scrollWrapper.style.overflowY = 'auto';
        }

        // 3. Render Toolbar (fixed at the top)
        this.renderToolbar();

        // 4. Render Header (Appended to scrollWrapper for horizontal sync)
        // NOTE: renderHeader(true) must return the headerRow DOM element.
        const headerRow = this.renderHeader(true);
        scrollWrapper.appendChild(headerRow);

        // 5. Render Body (The dg-body element is created and appended inside renderBody to the scrollWrapper)
        this.renderBody(scrollWrapper);

        // 6. Append the scroll wrapper (containing Header and Body) to the main container
        this.container.appendChild(scrollWrapper);

        // 7. Render Status Bar (Placed just after the main grid content but before the footer)
        // 💡 COMBINED: Calls renderStatusBar directly, which appends to this.container.
        this.renderStatusBar(scrollWrapper);
        this.container.appendChild(scrollWrapper);

        // 8. Render Footer (fixed at the bottom)
        if (this.options.enablePagination) {
            this.renderFooter();
        }
        // 9.  FIX: Restore scroll position
        if (existingScrollWrapper) {
            const newScrollWrapper = this.container.querySelector('.dg-scroll-wrapper');
            if (newScrollWrapper) {
                newScrollWrapper.scrollLeft = scrollLeft;
                newScrollWrapper.scrollTop = scrollTop;
            }
        }

        // 10. Setup keyboard navigation (Arrow Up / Arrow Down)
        this.setupKeyboardNavigation();
    }
    // --- NEW: Status Bar Logic ---
    renderStatusBar(parentContainer) {
        // If no data, don't show stats (or show empty)
        const dataToCalculate = this.state.processedData;

        const statusBar = document.createElement('div');
        statusBar.className = 'dg-status-bar';
        // NEW: Checkbox Alignment Cell
        const checkboxHeader = document.createElement('div');
        checkboxHeader.className = 'dg-cell';//'dg-header-cell';
        checkboxHeader.style.flex = '0 0 30px';
        //statusBar.appendChild(checkboxHeader);
        this.columns.forEach(col => {
            if (col.visible === false) {
                return; // Skip this column header
            }
            const cell = document.createElement('div');
            cell.className = 'dg-status-cell';
            cell.style.flex = `0 0 ${col.width || 150}px`; // Match column width exactly
            // 💡 NEW: Add data-field attribute for resize optimization
            if (col.field) {
                cell.setAttribute('data-field', col.field);
            }

            // Only calculate for 'number' types
            if (col.type === 'number' || col.Total === true || col.EnableCount || col.EnableUnique) {
                const values = dataToCalculate
                    .map(row => parseFloat(row[col.field]))
                    .filter(val => !isNaN(val)); // Filter out bad data

                if (values.length > 0) {
                    // 1. Calculate Sum
                    const sum = values.reduce((a, b) => a + b, 0);
                    // 2. Calculate Average
                    const avg = sum / values.length;
                    // 3. Unique Records
                    var UniqueCounts = 0;
                    if (col.EnableUnique) {
                        UniqueCounts = new Set(dataToCalculate.map(item => item[col.field])).size;
                        console.log("have no : " + col.field, Object.values(values));
                    }
                    // Format numbers (e.g., 12,300.50)
                    const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

                    cell.innerHTML = `                    
                    `+ (col.EnableCount ? ` <div><span class="dg-stat-label">Count:</span>${dataToCalculate.length}</div> ` : ``) + ` 
                    `+ (col.EnableUnique ? ` <div><span class="dg-stat-label">Unique:</span>${UniqueCounts}</div> ` : ``) + ` 
                        `+ (col.EnableSum ? ` <div><span class="dg-stat-label">Sum:</span>${fmt(sum)}</div> ` : ``) + `
                        `+ (col.EnableAvg ? ` <div><span class="dg-stat-label">Avg:</span>${fmt(avg)}</div> ` : ``) + `
                    `;
                }
                else {
                    // 
                    const uniqueCount = new Set(dataToCalculate.map(item => item[col.field])).size;
                    console.log(col.field, dataToCalculate.map(item => item[col.field]));
                    cell.innerHTML = `                    
                    `+ (col.EnableCount ? ` <div><span class="dg-stat-label">Count:</span>${dataToCalculate.length}</div> ` : ``) + ` 
                    `+ (col.EnableUnique ? ` <div><span class="dg-stat-label">Unique:</span>${uniqueCount}</div> ` : ``) + ``;
                }
            } else {
                // Optional: Show Count for text columns
                // cell.innerHTML = `<div><span class="dg-stat-label">Cnt:</span>${dataToCalculate.length}</div>`;
            }

            statusBar.appendChild(cell);
        });

        // Add spacer if not sticky to window (to align with scrollbar)
        if (!this.options.stickyToWindow) {
            const spacer = document.createElement('div');
            spacer.style.width = this.getScrollbarWidth() + 'px';
            spacer.style.flexShrink = 0;
            spacer.style.background = '#f1f3f5';
            statusBar.appendChild(spacer);
        }

        //this.container.appendChild(statusBar);
        if (parentContainer)
            parentContainer.appendChild(statusBar);
    }
    // Inside DynamicGrid class:


    updateStatusAndFooter() {
        // 1. Locate the scroll wrapper to ensure the status bar is appended correctly.
        const scrollWrapper = this.container.querySelector('.dg-scroll-wrapper');

        if (!scrollWrapper) {
            console.error("Cannot find the scroll wrapper (.dg-scroll-wrapper). Status bar update failed.");
            return; // Exit if the structure isn't ready
        }

        // 2. Remove existing status bar
        // Note: We search for the status bar inside the scrollWrapper now.
        const existingStatus = scrollWrapper.querySelector('.dg-status-bar');
        if (existingStatus) existingStatus.remove();

        // 3. Remove existing footer (The footer is outside the scroll wrapper, appended to this.container)
        const footer = this.container.querySelector('.dg-footer');
        if (footer) footer.remove();

        // 4. Render and Append Status Bar (inside the scrollWrapper)
        // 💡 CRITICAL FIX: Pass the scrollWrapper to renderStatusBar()
        this.renderStatusBar(scrollWrapper);

        // 5. Render and Re-Append Footer (outside the scrollWrapper, to this.container)
        if (this.options.enablePagination) {
            this.renderFooter();
        }
    }
    // --- 3. Global Search Toolbar ---
    renderToolbar() {
        // Check if any feature that requires the toolbar is enabled.
        if (!this.options.enableSearch && !this.options.enableExport &&
            !this.options.enableAddRow && !this.options.enableRemoveRow &&
            !this.options.enableColumnsBtn && !this.options.enableDarkMode) {
            return;
        }

        const toolbar = document.createElement('div');
        toolbar.className = 'dg-toolbar';
        toolbar.style.display = 'flex';
        toolbar.style.justifyContent = 'space-between';
        toolbar.style.alignItems = 'center';
        toolbar.style.padding = '3px 0';


        // --- 1. Left Section: Action Buttons (Export, Columns, Add/Remove) ---
        const leftSection = document.createElement('div'); // Now holds the action buttons
        leftSection.className = 'dg-toolbar-left';
        leftSection.style.display = 'flex';
        leftSection.style.alignItems = 'center';
        leftSection.style.gap = '3px'; // Increased gap to accommodate report name

        // 💡 NEW: Report Name Display
        if (this.options.ReportName) {
            const reportNameDisplay = document.createElement('div');
            reportNameDisplay.className = 'dg-toolbar-report-name';
            reportNameDisplay.innerText = this.options.ReportName;
            reportNameDisplay.style.fontWeight = 'bold';
            reportNameDisplay.style.fontSize = '1.1rem';
            reportNameDisplay.style.marginRight = '5px';
            reportNameDisplay.style.color = 'var(--text-primary)';
            leftSection.appendChild(reportNameDisplay);
        }


        // A. Export Button (Excel)
        if (this.options.enableExport) {
            const exportBtn = document.createElement('button');
            exportBtn.className = 'dg-btn';
            exportBtn.innerText = 'Export';
            exportBtn.onclick = () => this.exportToExcel();
            leftSection.appendChild(exportBtn);
        }
        // 💡 NEW: Print Button
        if (this.options.enablePrint) {
            const printBtn = document.createElement('button');
            printBtn.className = 'dg-btn';
            printBtn.innerText = '🖨️ Print';
            printBtn.onclick = () => this.printGrid(); // Call the new print function
            leftSection.appendChild(printBtn); // Place it after export
        }
        // B. Columns Visibility Button 
        if (this.options.enableColumnsBtn) {
            const columnsBtn = document.createElement('button');
            columnsBtn.className = 'dg-btn dg-columns-btn';
            columnsBtn.innerText = '⚙️ Columns';

            columnsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showColumnSelectionPopup(e.target);
            });
            leftSection.appendChild(columnsBtn);
        }

        // C. Add/Remove Buttons Group
        if (this.options.enableAddRow || this.options.enableRemoveRow) {
            const actionGroup = document.createElement('div');
            actionGroup.className = 'dg-action-group';
            actionGroup.style.display = 'flex';
            actionGroup.style.gap = '5px';

            if (this.options.enableAddRow) {
                const addRowBtn = document.createElement('button');
                addRowBtn.className = 'dg-action-btn dg-btn';
                addRowBtn.innerText = '➕ Add Row';
                addRowBtn.onclick = () => this.addRow();
                actionGroup.appendChild(addRowBtn);
            }

            if (this.options.enableRemoveRow) {
                const removeRowBtn = document.createElement('button');
                removeRowBtn.className = 'dg-action-btn dg-btn';
                removeRowBtn.innerText = '➖ Remove Selected';
                removeRowBtn.onclick = () => this.removeSelectedRows();
                actionGroup.appendChild(removeRowBtn);
            }

            if (actionGroup.children.length > 0) {
                leftSection.appendChild(actionGroup);
            }
        }

        // D. 💡 NEW: Custom Buttons
        if (this.options.customButtons && this.options.customButtons.length > 0) {
            this.options.customButtons.forEach(btnConfig => {
                const customBtn = document.createElement('button');
                customBtn.className = btnConfig.className || 'dg-btn';

                // Set button text with optional icon
                if (btnConfig.icon && btnConfig.text) {
                    customBtn.innerText = `${btnConfig.icon} ${btnConfig.text}`;
                } else if (btnConfig.icon) {
                    customBtn.innerText = btnConfig.icon;
                } else {
                    customBtn.innerText = btnConfig.text || 'Button';
                }

                // Set button title (tooltip)
                if (btnConfig.title) {
                    customBtn.title = btnConfig.title;
                }

                // Attach click handler
                if (btnConfig.onClick && typeof btnConfig.onClick === 'function') {
                    customBtn.onclick = (e) => {
                        btnConfig.onClick(this, e); // Pass grid instance and event
                    };
                }
                if (btnConfig.visible !== false) {
                    leftSection.appendChild(customBtn);
                }
            });
        }

        // Append the actions section first (on the left)
        toolbar.appendChild(leftSection);


        // --- 2. Right Section: Global Search Input ---
        const rightSection = document.createElement('div'); // Now holds the search input
        rightSection.className = 'dg-toolbar-right';

        // Search is controlled by enableSearch option
        if (this.options.enableSearch) {
            const input = document.createElement('input');
            input.className = 'dg-search-input';
            input.placeholder = 'Search grid...';
            input.value = this.state.searchTerm;

            input.addEventListener('input', (e) => {
                const selectionStart = e.target.selectionStart;
                const selectionEnd = e.target.selectionEnd;

                this.state.searchTerm = e.target.value;
                this.state.currentPage = 1;
                this.processData();

                // 1. Get a reference to the element that currently has focus
                const currentlyFocused = document.activeElement;

                // 2. Perform the full re-render
                this.render();

                // 3. Find the newly created search input
                const newSearchInput = this.container.querySelector('.dg-search-input');

                // 4. Restore focus and selection to the new element
                if (currentlyFocused && newSearchInput) {
                    newSearchInput.focus();
                    newSearchInput.setSelectionRange(selectionStart, selectionEnd);
                }
            });
            rightSection.appendChild(input);
        }

        // Append the search section last (on the right)
        toolbar.appendChild(rightSection);

        this.container.appendChild(toolbar);
    }
    // Inside DynamicGrid class, add this new method:

    removeSelectedRows() {
        if (this.state.selectedRows.size === 0) {
            alert("Please select one or more rows to remove using the checkbox.");
            return;
        }

        const confirmRemoval = confirm(`Are you sure you want to remove ${this.state.selectedRows.size} row(s)?`);
        if (!confirmRemoval) return;

        // Filter the original data, keeping only rows whose ID is NOT in the selectedRows set
        this.originalData = this.originalData.filter(row =>
            !this.state.selectedRows.has(row._gridId)
        );

        // Clear selection and re-process/re-render
        this.state.selectedRows.clear();
        this.processData();
        this.render();
    }
    addRow() {
        // Create a blank record based on column fields
        const newRow = {};
        this.columns.forEach(col => {
            // Set reasonable defaults
            newRow[col.field] = col.type === 'number' ? 0 : '';
        });

        // Add unique ID
        newRow._gridId = Symbol(this.originalData.length);

        this.originalData.push(newRow);

        // Clear filters/search and jump to the last page (where the new row is)
        this.state.globalSearch = '';
        this.state.colFilters = {};
        this.processData();

        const totalPages = Math.ceil(this.state.processedData.length / this.options.pageSize);
        this.state.currentPage = totalPages > 0 ? totalPages : 1;

        this.render();
    }
    exportToExcel() {
        if (typeof XLSX === 'undefined') {
            console.error('SheetJS (xlsx.js) library is not loaded. Falling back to CSV.');
            this.exportToCSV();
            return;
        }

        const dataToExport = this.state.processedData;

        // Helper for styled cells
        const createStyledCell = (val, bgColor = "FFFFFF", fgColor = "000000", isBold = false) => {
            return {
                v: val,
                t: (typeof val === 'number') ? 'n' : 's',
                s: {
                    fill: { fgColor: { rgb: bgColor } },
                    font: { color: { rgb: fgColor }, bold: isBold },
                    alignment: { vertical: "center" }
                }
            };
        };

        const METADATA_BG = "E0F2F1"; // Light Teal
        const HEADER_BG = "1A237E";   // Navy
        const HEADER_FG = "FFFFFF";   // White

        // 1. Prepare Metadata Rows
        const aoa = [];
        //aoa.push([]); // Row 1: Empty

        // Row 2: Company Name
        if (this.options.CompanyName) {
            aoa.push([
                createStyledCell("Company Name", METADATA_BG, "000000", true),
                createStyledCell(this.options.CompanyName, METADATA_BG)
            ]);
        } else {
            aoa.push([]);
        }

        // Row 3: Report Name
        if (this.options.ReportName) {
            aoa.push([
                createStyledCell("Report Name", METADATA_BG, "000000", true),
                createStyledCell(this.options.ReportName, METADATA_BG)
            ]);
        } else {
            aoa.push([]);
        }

        // Filters Data
        if (this.options.fitersdata && Array.isArray(this.options.fitersdata)) {
            this.options.fitersdata.forEach(filter => {
                aoa.push([
                    createStyledCell(filter.FilterName, METADATA_BG, "000000", true),
                    createStyledCell(filter.Value, METADATA_BG)
                ]);
            });
        }
        aoa.push([]); // Empty Row

        // 2. Prepare Grid Data
        const visibleCols = this.columns.filter(col => col.visible !== false && !['action', 'action3dots', 'checkbox'].includes(col.type));

        // Grid Header Row
        const gridHeaders = visibleCols.map(col => createStyledCell(col.header, HEADER_BG, HEADER_FG, true));
        const gridHeaderRowIndex = aoa.length;
        aoa.push(gridHeaders);

        // Grid Content Rows
        dataToExport.forEach(row => {
            const rowData = visibleCols.map(col => {
                const val = row[col.field];
                return (typeof val === 'string') ? this.stripHtml(val) : val;
            });
            aoa.push(rowData);
        });

        // 3. Create Workbook and Worksheet
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Grid Data");

        // 4. Set Auto-Filters for Grid Headers
        if (dataToExport.length >= 0) {
            const range = XLSX.utils.decode_range(ws['!ref']);
            const startCell = XLSX.utils.encode_cell({ r: gridHeaderRowIndex, c: 0 });
            const endCell = XLSX.utils.encode_cell({ r: range.e.r, c: range.e.c });
            ws['!autofilter'] = { ref: `${startCell}:${endCell}` };
        }

        // 5. Generate filename
        const now = new Date();
        const timestamp =
            now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0') +
            String(now.getMilliseconds()).padStart(3, '0');

        const filename = `${this.options.ReportName || 'GridExport'}_${timestamp}.xlsx`;

        // 6. Write and download
        XLSX.writeFile(wb, filename);

        console.log(`Successfully exported ${dataToExport.length} rows to ${filename} with styled custom header and filters.`);
    }

    exportToCSV() {
        const dataToExport = this.state.processedData;

        if (dataToExport.length === 0) {
            alert("No data available to export.");
            return;
        }

        // 1. Get the Header Row
        // Use the current column order (which respects column reordering)
        const headers = this.columns.map(col => `"${col.header.replace(/"/g, '""')}"`);
        let csvContent = headers.join(',') + '\n';

        // 2. Get the Data Rows
        dataToExport.forEach(row => {
            const rowValues = this.columns.map(col => {
                let value = row[col.field];

                // Handle null/undefined
                if (value === null || value === undefined) {
                    value = '';
                } else {
                    value = String(value);
                }

                // Escape double quotes within the data and wrap in quotes
                return `"${value.replace(/"/g, '""')}"`;
            });
            csvContent += rowValues.join(',') + '\n';
        });

        // 3. Create a Blob and Initiate Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");

        // Generate filename based on current date/time
        const filename = `grid_export_${new Date().toISOString().slice(0, 10)}.csv`;

        if (link.download !== undefined) {
            // HTML5 download attribute supported
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // Fallback for older browsers (not strictly necessary for modern apps)
            alert("Download failed. Please check browser support.");
        }

        console.log(`Successfully exported ${dataToExport.length} rows to ${filename}.`);
    }
    // Inside DynamicGrid class, update the function that builds body rows:

    buildRow(rowData) {
        const row = document.createElement('div');
        row.className = 'dg-row';

        this.columns.forEach((col) => {
            // 💡 Check visibility first
            if (col.visible === false) {
                return; // Skip this cell
            }

            const cell = document.createElement('div');
            cell.className = 'dg-cell';
            // Ensure you apply the same flex/width styling as the header
            cell.style.flex = `0 0 ${col.width || 150}px`;
            cell.style.textAlign = col.align || 'left';

            // Set the data content
            cell.innerText = rowData[col.field];

            row.appendChild(cell);
        });
        return row;
    }
    // Inside DynamicGrid class

    renderColumnsButton() {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'dg-columns-button-container';

        const columnsBtn = document.createElement('button');
        columnsBtn.className = 'dg-columns-btn';
        columnsBtn.innerText = '⚙️ Columns'; // Settings icon is standard for configuration

        // Position the button and attach the click handler
        columnsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showColumnSelectionPopup(e.target);
        });

        buttonContainer.appendChild(columnsBtn);
        return buttonContainer;
    }
    // Inside DynamicGrid class

    showColumnSelectionPopup(buttonElement) {
        // 1. Close any existing popups (essential cleanup)
        this.closeAllPopups();

        // 2. Create the popup container
        const popup = document.createElement('div');
        popup.className = 'dg-filter-popup dg-column-popup'; // Use your existing popup class + new modifier

        // 3. Position the popup near the button
        const rect = buttonElement.getBoundingClientRect();
        popup.style.top = `${rect.bottom + window.scrollY + 5}px`;
        popup.style.left = `${rect.left + window.scrollX}px`;
        popup.style.minWidth = '180px';
        popup.style.padding = '10px';

        // 4. Populate the list content
        const ul = document.createElement('ul');
        ul.className = 'dg-column-toolbox-list';
        ul.style.listStyle = 'none';
        ul.style.margin = '0';
        ul.style.padding = '0';

        this.columns.forEach(col => {
            const li = document.createElement('li');
            const isVisible = this.state.columnVisibility[col.field];

            li.innerHTML = `
            <label style="display: block; cursor: pointer; padding: 3px 0;">
                <input type="checkbox" data-field="${col.field}" ${isVisible ? 'checked' : ''} style="margin-right: 5px;">
                ${col.header}
            </label>
        `;

            // Attach the listener directly when creating the element
            li.querySelector('input').addEventListener('change', (e) => {
                const field = e.target.getAttribute('data-field');
                const checked = e.target.checked;
                this.toggleColumnVisibility(field, checked);
            });
            if (col.ShowinColumnOption)
                ul.appendChild(li);
        });

        popup.appendChild(ul);
        document.body.appendChild(popup);

        // 5. Save reference to the column popup to ensure it closes properly
        this.state.activeColumnPopup = popup;
    }
    // Inside DynamicGrid class, possibly in your init() or renderControls() method:

    renderControls() {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'dg-controls';
        controlsContainer.style.display = 'flex';
        controlsContainer.style.justifyContent = 'space-between';
        controlsContainer.style.alignItems = 'center';

        // 1. Add Search Box (assuming you have a renderSearchBox method)
        const searchBox = this.renderSearchBox();
        controlsContainer.appendChild(searchBox);

        // 2. 💡 Add the new Columns Button
        const columnsButton = this.renderColumnsButton();
        controlsContainer.appendChild(columnsButton);

        this.container.prepend(controlsContainer); // or append, depending on your layout
    }
    // --- 4. Header (Draggable & Resizable) ---
    renderHeader(returnElement = false) {
        const headerRow = document.createElement('div');
        headerRow.className = 'dg-header-row';
        if (this.options.stickyToWindow) {
            headerRow.style.position = 'sticky';
            headerRow.style.top = '0';
            headerRow.style.zIndex = '100';
            headerRow.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
        }

        // NEW: Checkbox Alignment Cell
        const checkboxHeader = document.createElement('div');
        checkboxHeader.className = 'dg-cell';//'dg-header-cell';
        checkboxHeader.style.flex = '0 0 30px';
        //headerRow.appendChild(checkboxHeader);
        this.columns.forEach((col, index) => {
            if (col.visible === false) {
                return; // Skip this column header
            }
            const cell = document.createElement('div');
            cell.className = 'dg-header-cell';
            cell.title = col.header;
            cell.style.flex = `0 0 ${col.width || 150}px`;
            cell.style.minWidth = `${col.width || 150}px`;
            cell.style.maxWidth = `${col.width || 150}px`;
            // 💡 NEW: Add data-field attribute for resize optimization
            if (col.field) {
                cell.setAttribute('data-field', col.field);
            }
            // 💡 NEW: Apply alignment style to the header cell
            cell.style.textAlign = col.align || 'right';
            cell.draggable = true; // Enable Column Reorder
            // 💡 NEW LOGIC: Check if the current column field is in the active filters state
            const isFiltered = this.state.colFilters.hasOwnProperty(col.field);
            // Find the index in the filter order
            const filterIndex = this.state.filterOrder.indexOf(col.field); // -1 if not found
            const filterOrderNumber = filterIndex + 1; // 1-based order number
            if (isFiltered) {
                // Apply the differentiating CSS class
                cell.classList.add('filtered');
                // 💡 APPLY CONSISTENT COLOR & ORDER NUMBER
                cell.style.borderBottom = `3px solid #1890ff`; // Consistent color (Blue)
                cell.style.position = 'relative'; // Needed for absolute positioning of the number

                // 1. Create the Order Indicator Element
                const orderIndicator = document.createElement('span');
                orderIndicator.className = 'dg-filter-order-indicator';
                orderIndicator.innerText = filterOrderNumber;
                orderIndicator.style.position = 'absolute';
                orderIndicator.style.top = '0px';
                orderIndicator.style.right = '0px';
                orderIndicator.style.backgroundColor = '#1890ff'; // Same as border color
                orderIndicator.style.color = 'white';
                orderIndicator.style.borderRadius = '50%';
                orderIndicator.style.padding = '2px 6px';
                orderIndicator.style.fontSize = '10px';
                orderIndicator.style.lineHeight = '1';
                orderIndicator.style.zIndex = '10';

                cell.appendChild(orderIndicator);
            }
            // Header Content
            const text = document.createElement('span');
            text.innerHTML = col.header;
            // 💡 NEW: Click to Sort Logic
            if (this.options.enableSorting) {
                cell.style.cursor = 'pointer';
                cell.onclick = (e) => {
                    // Prevent sort if clicking resize handle or other interactive elements
                    if (e.target.classList.contains('dg-col-resize-handle') ||
                        e.target.classList.contains('dg-options-btn')) {
                        return;
                    }
                    this.handleSort(col.field);
                };

                // 💡 NEW: Sort Indicator
                if (this.state.currentSort && this.state.currentSort.field === col.field) {
                    const arrow = document.createElement('span');
                    arrow.style.marginLeft = '5px';
                    arrow.style.fontSize = '0.8em';
                    // Display arrow based on direction
                    arrow.innerText = this.state.currentSort.direction === 'asc' ? '▲' : '▼';
                    // Optional: Add color to highlight active sort
                    // arrow.style.color = '#1890ff';
                    text.appendChild(arrow);
                }
            }
            // --- NEW: Options Button (Three Dots) ---
            const optionsBtn = document.createElement('button');
            optionsBtn.innerText = '⋮'; // Vertical ellipsis
            optionsBtn.className = 'dg-options-btn';
            optionsBtn.style.fontSize = '18px';
            optionsBtn.style.border = 'none';
            optionsBtn.style.background = 'transparent';
            optionsBtn.style.cursor = 'pointer';
            optionsBtn.style.marginLeft = '5px';
            optionsBtn.onclick = (e) => {
                e.stopPropagation(); // Prevent the sort from triggering
                this.showOptionsMenu(e.target.parentElement, col);
            };
            //cell.appendChild(optionsBtn);

            if (!col.EnableColumnMenu) {//this.options.enableSorting === false
                cell.append(text);
            } else {
                cell.append(text, optionsBtn);
            }
            // Drag Events for Reorder
            this.attachColDragEvents(cell, index);

            // Resize Handle
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'dg-col-resize-handle';
            this.attachColResizeEvents(resizeHandle, col);
            cell.appendChild(resizeHandle);

            headerRow.appendChild(cell);
        });
        if (!this.options.stickyToWindow) {
            const spacer = document.createElement('div');
            spacer.className = 'dg-scrollbar-spacer';
            spacer.style.width = this.getScrollbarWidth() + 'px';
            headerRow.appendChild(spacer);
        }
        //this.container.appendChild(headerRow);
        if (returnElement) {
            return headerRow; // Return the row element instead of appending
        } else {
            // If called outside of render(), revert to old behavior
            this.container.appendChild(headerRow);
        }
    }
    // Inside DynamicGrid class
    showOptionsMenu(headerCell, col) {
        this.closeAllPopups(); // Ensure nothing else is open
        // 💡 NEW: Retrieve the saved text filter state
        const savedTextFilter = this.state.textFilters[col.field] || {};
        const savedOperator = savedTextFilter.operator || 'contains'; // Default to 'contains'
        const savedValue = savedTextFilter.value || '';

        // --- Define Option Sets ---
        const TEXT_OPERATORS = [
            { value: 'contains', label: 'Contains' },
            { value: 'not_contains', label: 'Not Contains' },
            { value: 'equal', label: 'Equals' },
            { value: 'not_equal', label: 'Not Equals' },
            { value: 'starts_with', label: 'Starts With' },
            { value: 'ends_with', label: 'Ends With' }
        ];

        const NUMBER_OPERATORS = [
            { value: 'equal', label: 'Equals' },
            { value: 'not_equal', label: 'Not Equals' },
            { value: 'greater_than', label: 'Greater Than' },
            { value: 'greater_than_or_equal', label: 'Greater Than or Equal' },
            { value: 'less_than', label: 'Less Than' },
            { value: 'less_than_or_equal', label: 'Less Than or Equal' },
            { value: 'between', label: 'Between' }
        ];
        // Determine the operator set based on column type (default to text if type is missing)
        const columnType = col.type && col.type.toLowerCase();
        let operators = TEXT_OPERATORS;
        if (columnType === 'number') {
            operators = NUMBER_OPERATORS;
        } else if (columnType === 'label') {
            operators = TEXT_OPERATORS; // Use text operators for labels
        }

        // Helper to generate <option> HTML
        const operatorOptionsHtml = operators.map(op => `
        <option value="${op.value}" ${op.value === savedOperator ? 'selected' : ''}>
            ${op.label}
        </option>
    `).join('');

        // 1. Create the popup container
        const popup = document.createElement('div');
        popup.className = 'dg-filter-popup';
        popup.setAttribute('data-field', col.field);
        // 💡 CRITICAL FIX: Stop event propagation when clicking inside the popup
        popup.addEventListener('click', (e) => {
            // This prevents the click from reaching the global document listener 
            // that automatically calls closeAllPopups()
            e.stopPropagation();
        });
        // 2. Position the popup (same logic as before, relative to the headerCell)
        const rect = headerCell.getBoundingClientRect();
        popup.style.top = `${rect.bottom + window.scrollY}px`;
        popup.style.left = `${rect.left + window.scrollX}px`;
        popup.style.minWidth = '200px';

        // 3. Build the content inside the popup
        const isSelected = (optionValue) => optionValue === savedOperator ? 'selected' : '';
        // --- Sorting Options ---
        popup.innerHTML += `
    <div class="dg-filter-group">
    <div class="dg-filter-group">
            <div class="dg-filter-option" data-action="sort-asc" data-field="${col.field}" hidden>Sort A to Z</div>
            <div class="dg-filter-option" data-action="sort-desc" data-field="${col.field}" hidden>Sort Z to A</div>
            <hr hidden/>
            <div class="dg-filter-option" data-action="autofit-col" data-field="${col.field}">📏 Auto Fit This Column</div>
            <div class="dg-filter-option" data-action="autofit-all" data-field="${col.field}">📏 Auto Fit All Columns</div>
        </div>
        <hr/>
           <div class="dg-filter-group">
            <div class="dg-filter-text-input" style="display: flex; gap: 5px;">
                <select class="dg-text-filter-operator">
                    ${operatorOptionsHtml}
                </select>
                <input type="text" placeholder="${columnType === 'number' ? 'Value or Range (e.g., 10-20)' : 'Value...'}" 
                       class="dg-text-filter-input" style="flex-grow: 1;" value="${savedValue}">
            </div>
        </div>
        <hr/>
        
        <div class="dg-filter-group">
            <div class="dg-filter-text-input">
                <input type="text" placeholder="Search..." class="dg-text-filter-input">
            </div>
        </div>
        <hr/>
        <div class="dg-filter-checkbox-list">
            </div>
        <div class="dg-filter-actions">
            <button class="dg-btn dg-filter-apply">Apply</button>
            <button class="dg-btn dg-filter-clear" data-field="${col.field}">Clear Filter</button>
        </div>
    `;

        // 4. Populate Checkbox List (Row Values)
        const partiallyFilteredData = this.getFilteredData(col.field);
        const uniqueValues = this.getUniqueValues(col.field, partiallyFilteredData);
        const checkboxList = popup.querySelector('.dg-filter-checkbox-list');
        const currentFilters = this.state.colFilters[col.field] || [];
        // Determine initial state of "Select All" (It's checked if filters are empty OR if all unique values are present in currentFilters)
        const isAllSelected = currentFilters.length === 0 ||
            (currentFilters.length === uniqueValues.length &&
                uniqueValues.every(v => currentFilters.includes(String(v))));
        const allCheckedAttr = isAllSelected ? 'checked' : '';


        // --- INSERT SELECT ALL CHECKBOX ---
        checkboxList.innerHTML += `
        <label class="dg-select-all-label">
            <input type="checkbox" class="dg-select-all-checkbox" ${allCheckedAttr}> (Select All)
        </label>
        <hr/>
    `;
        uniqueValues.forEach(rawValue => {
            const value = String(rawValue);

            // 💡 DEFAULT CHECKED LOGIC: If currentFilters is empty (initial state) OR if the value is explicitly in the filters, check it.
            const isChecked = currentFilters.length === 0 || currentFilters.includes(value);
            const checkedAttr = isChecked ? 'checked' : '';

            checkboxList.innerHTML += `
            <label>
                <input type="checkbox" value="${value}" ${checkedAttr}> ${value}
            </label>
        `;
        });

        // 5. Attach Global Event Listener to popup
        this.attachPopupListeners(popup, col);

        document.body.appendChild(popup);
    }
    // --- Helper to calculate Browser Scrollbar Width ---
    getScrollbarWidth() {
        const outer = document.createElement('div');
        outer.style.visibility = 'hidden';
        outer.style.overflow = 'scroll';
        outer.style.msOverflowStyle = 'scrollbar';
        document.body.appendChild(outer);
        const inner = document.createElement('div');
        outer.appendChild(inner);
        const scrollbarWidth = (outer.offsetWidth - inner.offsetWidth);
        outer.parentNode.removeChild(outer);
        return scrollbarWidth;
    }
    // --- 5. Body ---
    renderBody(parentContainer) {
        const body = document.createElement('div');
        body.className = 'dg-body';

        const pageData = this.getPaginatedData();

        if (pageData.length === 0) {
            body.innerHTML = '<div style="padding:20px; text-align:center; color:#999">No records found</div>';
            this.container.appendChild(body);
            return;
        }
        let totalMinWidth = 0; // 💡 FIX: Changed from 30 (no checkbox column)

        this.columns.forEach(col => {
            if (col.visible !== false) {
                totalMinWidth += (col.width || 150);
            }
        });
        pageData.forEach((row, rIndex) => {
            const rowEl = document.createElement('div');
            rowEl.className = 'dg-row';
            rowEl.style.minWidth = totalMinWidth + 'px';
            rowEl.setAttribute('data-grid-id', row._gridId.toString());

            // 💡 NEW: Apply custom row styling if rowStyler callback is provided
            if (this.options.rowStyler && typeof this.options.rowStyler === 'function') {
                const styleResult = this.options.rowStyler(row);
                if (styleResult) {
                    // If styleResult is a string, assume it's a class name
                    if (typeof styleResult === 'string') {
                        rowEl.classList.add(styleResult);
                    }
                    // If styleResult is an object, apply styles directly
                    else if (typeof styleResult === 'object') {
                        Object.assign(rowEl.style, styleResult);
                    }
                }
            }
            // --- NEW: Selection Checkbox Cell ---
            const selectCell = document.createElement('div');
            selectCell.className = 'dg-cell';
            selectCell.style.flex = '0 0 30px'; // Fixed width for checkbox

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = this.state.selectedRows.has(row._gridId);

            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.state.selectedRows.add(row._gridId);
                } else {
                    this.state.selectedRows.delete(row._gridId);
                }
                // Optional: Re-render the toolbar/status bar if needed to reflect selection count
            });
            //selectCell.appendChild(checkbox);
            //rowEl.appendChild(selectCell);
            // --- NEW: Attach Double-Click Listener ---
            rowEl.addEventListener('dblclick', () => {
                this.handleRowDoubleClick(row);
            });

            // --- Keyboard Nav: Set active row on mouse click ---
            rowEl.addEventListener('mousedown', (e) => {
                // Don't intercept clicks on input/select/button elements
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') return;

                const body = this.container.querySelector('.dg-body');
                if (!body) return;

                // Remove highlight from all rows
                Array.from(body.querySelectorAll('.dg-row')).forEach(r => r.classList.remove('dg-row-keyboard-active'));

                // Set and highlight this row
                this._activeRowIndex = rIndex;
                rowEl.classList.add('dg-row-keyboard-active');

                // Focus the container so arrow keys work immediately
                this.container.focus();
            });
            this.columns.forEach(col => {
                if (col.visible === false) {
                    return; // Stop execution for this column and move to the next iteration
                }
                const cell = document.createElement('div');
                cell.className = 'dg-cell';
                cell.style.flex = `0 0 ${col.width || 150}px`;
                cell.style.minWidth = `${col.width || 150}px`;
                cell.style.maxWidth = `${col.width || 150}px`;
                // 💡 SECONDARY FIX: Align cell content horizontally based on column definition
                const cellAlignment = col.align || 'left';
                if (cellAlignment === 'right') {
                    cell.style.justifyContent = 'flex-end';
                } else if (cellAlignment === 'center') {
                    cell.style.justifyContent = 'center';
                } else {
                    cell.style.justifyContent = 'flex-start';
                }
                // 💡 Add field identifier to the cell container
                if (col.field) {
                    cell.setAttribute('data-field', col.field);
                }
                // 💡 DYNAMIC ACTION COLUMN RENDERING
                // 1. RENDER SINGLE ICON ACTION (View)
                if (col.type === 'action') {
                    cell.style.textAlign = 'center';

                    let actions = this.options.singleIconAction;
                    if (actions && !Array.isArray(actions)) {
                        actions = [actions];
                    }

                    if (actions && actions.length > 0) {
                        actions.forEach(action => {
                            // Check visibility
                            let isVisible = true;
                            if (action.visible !== undefined) {
                                if (typeof action.visible === 'function') {
                                    isVisible = action.visible(row);
                                } else {
                                    isVisible = action.visible;
                                }
                            }

                            if (isVisible) {
                                const actionBtn = document.createElement('button');
                                actionBtn.innerHTML = this.renderIcon(action.icon);
                                actionBtn.title = action.title;
                                actionBtn.className = `dg-action-icon ${action.className || ''}`;

                                actionBtn.onclick = (e) => {
                                    e.stopPropagation();
                                    action.handler(row, this);
                                };

                                cell.appendChild(actionBtn);
                            }
                        });
                    }

                    // 2. RENDER 3-DOT ACTION MENU BUTTON
                } else if (col.type === 'action3dots') {
                    cell.style.textAlign = 'center';

                    const optionsBtn = document.createElement('button');
                    optionsBtn.innerHTML = '⋮'; // Vertical ellipsis
                    optionsBtn.className = 'dg-row-options-btn dg-action-icon';
                    optionsBtn.title = 'More Actions';

                    optionsBtn.onclick = (e) => {
                        e.stopPropagation();
                        // Call the new method to display the popup menu
                        // Note: The menu creation uses this.options.rowActionsMenu (see step 3)
                        this.showRowActionsMenu(e.target, row);
                    };

                    cell.appendChild(optionsBtn);

                } else {
                    // Render normal cells
                    const input = this.createInput(col, row);
                    cell.appendChild(input);
                }

                // 💡 NEW: Add cell click handler with delay to prevent conflict with double-click
                if (this.options.onCellClick && typeof this.options.onCellClick === 'function' && col.type !== 'action' && col.type !== 'action3dots') {
                    cell.style.cursor = 'pointer';
                    let clickTimer = null;
                    const clickDelay = 250; // Wait 250ms before triggering single-click

                    cell.onclick = (e) => {
                        // Don't trigger if clicking on input elements (to allow editing)
                        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') {
                            return;
                        }

                        // Clear any existing timer
                        if (clickTimer) {
                            clearTimeout(clickTimer);
                        }

                        // Set a timer to trigger single-click after delay
                        clickTimer = setTimeout(() => {
                            const cellValue = row[col.field];
                            this.options.onCellClick(row, col.field, cellValue, col);
                            clickTimer = null;
                        }, clickDelay);
                    };

                    // Store timer reference on cell for double-click to access
                    cell._clickTimer = () => clickTimer;
                    cell._clearClickTimer = () => {
                        if (clickTimer) {
                            clearTimeout(clickTimer);
                            clickTimer = null;
                        }
                    };
                }

                // 💡 NEW: Add cell double-click handler
                if (this.options.onCellDoubleClick && typeof this.options.onCellDoubleClick === 'function' && col.type !== 'action' && col.type !== 'action3dots') {
                    cell.style.cursor = 'pointer';
                    cell.ondblclick = (e) => {
                        // Don't trigger if clicking on input elements (to allow editing)
                        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') {
                            return;
                        }

                        // 💡 CRITICAL: Cancel the single-click timer to prevent single-click from firing
                        if (cell._clearClickTimer) {
                            cell._clearClickTimer();
                        }

                        const cellValue = row[col.field];
                        this.options.onCellDoubleClick(row, col.field, cellValue, col);
                    };

                    // --- 💡 Tablet-Friendly Double Tap (using touchstart) ---
                    let lastTap = 0;
                    cell.addEventListener('touchstart', (e) => {
                        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') {
                            return;
                        }

                        const now = Date.now();
                        const TIMESPAN = 300; // 300ms window for double tap

                        if (now - lastTap < TIMESPAN) {
                            // Double tap detected!
                            if (cell._clearClickTimer) {
                                cell._clearClickTimer();
                            }
                            const cellValue = row[col.field];
                            this.options.onCellDoubleClick(row, col.field, cellValue, col);

                            // Prevent zooming on some browsers
                            // e.preventDefault(); 
                        }
                        lastTap = now;
                    }, { passive: true });
                }

                // const input = this.createInput(col, row);
                // cell.appendChild(input);
                rowEl.appendChild(cell);
            });
            body.appendChild(rowEl);
        });

        //this.container.appendChild(body);
        // 💡 CHANGE: Append the body to the provided parent container (scrollWrapper)
        parentContainer.appendChild(body);
    }

    // --- Select All Rows ---
    /**
     * Selects every row in the current processed (filtered/sorted) data.
     * Updates the selectedRows Set and syncs all visible row checkboxes in the DOM.
     */
    selectAllRows() {
        // Add every processed row's _gridId to the selected set
        this.state.processedData.forEach(row => {
            this.state.selectedRows.add(row._gridId);
            row.Select = true;
            row.Select_label = "Checked";
        });

        // Sync DOM checkboxes so the UI reflects the new state immediately
        const body = this.container.querySelector('.dg-body');
        if (body) {
            body.querySelectorAll('.dg-row').forEach(rowEl => {
                const cb = rowEl.querySelector('input[type="checkbox"]');
                if (cb) cb.checked = true;
                rowEl.classList.add('dg-row-selected');
            });
        }

        console.log(`[GKBSGrid] selectAllRows: ${this.state.selectedRows.size} row(s) selected.`);
    }

    // --- Deselect All Rows ---
    /**
     * Clears all row selections.
     * Empties the selectedRows Set and unchecks every visible row checkbox in the DOM.
     */
    deselectAllRows() {
        this.state.processedData.forEach(row => {
            row.Select = false;
            row.Select_label = "NotChecked";
        });

        // Clear the entire selection set
        this.state.selectedRows.clear();

        // Sync DOM checkboxes so the UI reflects the new state immediately
        const body = this.container.querySelector('.dg-body');
        if (body) {
            body.querySelectorAll('.dg-row').forEach(rowEl => {
                const cb = rowEl.querySelector('input[type="checkbox"]');
                if (cb) cb.checked = false;
                rowEl.classList.remove('dg-row-selected');
            });
        }

        console.log('[GKBSGrid] deselectAllRows: All selections cleared.');
    }

    // --- Get Selected Rows ---
    /**
     * Returns an array of row data objects where Select === true.
     * Uses the selectedRows Set as the source of truth so it works
     * correctly even when individual checkboxes are ticked manually
     * (without calling selectAllRows).
     *
     * @returns {Array} Array of row data objects that are currently selected.
     *
     * @example
     * const rows = grid.getSelectedRows();
     * console.log(rows); // [{ id: 1, name: 'Alice', Select: true, ... }, ...]
     */
    getSelectedRows() {
        // Filter originalData by membership in the selectedRows Set.
        // Also ensure Select flag stays in sync on each matched row.
        const selected = this.originalData.filter(row => row.Select == true);

        console.log(`[GKBSGrid] getSelectedRows: ${selected.length} row(s) selected.`);
        return selected;
    }

    // Inside DynamicGrid class:
    showRowActionsMenu(buttonElement, rowData) {
        // 1. Close any currently open filter/action popups
        this.closeAllPopups();

        // 2. Create the popup container
        const popup = document.createElement('div');
        popup.className = 'dg-action-menu-popup dg-filter-popup';
        popup.style.minWidth = '120px';
        popup.style.padding = '5px 0';
        popup.style.position = 'absolute';
        popup.style.visibility = 'hidden';

        // 3. Populate the menu items
        const ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.padding = '0';
        ul.style.margin = '0';

        // 💡 CRITICAL FIX: Change from this.options.rowActions to this.options.rowActionsMenu
        const actionsToRender = this.options.rowActionsMenu || [];

        // 💡 NEW: Filter actions based on visibility
        const visibleActions = actionsToRender.filter(action => {
            // If visible property doesn't exist, default to true (show the action)
            if (action.visible === undefined) {
                return true;
            }

            // If visible is a function, call it with rowData
            if (typeof action.visible === 'function') {
                return action.visible(rowData);
            }

            // If visible is a boolean, use it directly
            return action.visible;
        });

        visibleActions.forEach(action => {
            const li = document.createElement('li');
            li.className = 'dg-action-menu-item';
            // 💡 NEW: Inline styles for padding and hover effect
            li.style.padding = '5px 15px 5px 10px';
            li.style.cursor = 'pointer';
            li.style.whiteSpace = 'nowrap';
            li.style.transition = 'background-color 0.1s';
            li.innerHTML = `${this.renderIcon(action.icon)} ${action.title}`;

            // 💡 NEW: Hover effect (using mouseenter/mouseleave)
            li.onmouseenter = () => {
                li.style.backgroundColor = '#f0f0f0'; // Light grey hover background
            };
            li.onmouseleave = () => {
                li.style.backgroundColor = 'transparent';
            };

            li.onclick = (e) => {
                e.stopPropagation();
                action.handler(rowData, this);
                this.closeAllPopups();
            };

            ul.appendChild(li);
        });

        popup.appendChild(ul);

        // 4. Position the popup near the button (FIXED LOGIC)

        // A. Temporarily append to DOM to calculate its width
        document.body.appendChild(popup);

        const rect = buttonElement.getBoundingClientRect();

        // B. Calculate the correct position: Aligns the left edge of the popup with the left edge of the button
        let leftPosition = rect.left + window.scrollX + 20;

        // C. Boundary Check (Optional but recommended): If the popup would go off the right edge of the screen,
        // align its right edge with the button's right edge instead.
        const viewportWidth = window.innerWidth;
        const popupWidth = popup.offsetWidth;
        const buttonRight = rect.right + window.scrollX;

        if (leftPosition + popupWidth > viewportWidth) {
            // If it overflows the right edge, align it to the right of the button
            leftPosition = (buttonRight - popupWidth) - 20;
        }

        // D. Apply the calculated position and make it visible
        popup.style.top = `${rect.bottom + window.scrollY + -12}px`;
        popup.style.left = `${leftPosition}px`;
        popup.style.visibility = 'visible';

        // 5. Store reference for closing
        this.state.activeRowActionPopup = popup;
    }
    // --- 6. Pagination Footer ---
    // Inside DynamicGrid class, replace the existing renderFooter method:

    renderFooter() {
        if (!this.options.enablePagination) return;

        const totalItems = this.state.processedData.length;

        // Calculate total pages based on current size setting
        let currentSize = this.options.pageSize;
        let totalPages = Math.ceil(totalItems / currentSize);

        // Handle the case where the current size is set to 'All' 
        if (currentSize >= totalItems) {
            currentSize = 'All';
            totalPages = 1;
        }

        const footer = document.createElement('div');
        footer.className = 'dg-footer';

        // 1. --- NEW: Page Size Dropdown Selector ---
        const pageSizes = [10, 20, 50, 100, 'All'];
        const pageSizeSelect = document.createElement('select');

        pageSizes.forEach(size => {
            const option = document.createElement('option');
            option.value = size;
            option.innerText = size;

            // Determine the currently selected option
            const isAllSelected = (size === 'All' && this.options.pageSize >= totalItems);
            const isSizeSelected = (Number(size) === this.options.pageSize);

            if (isAllSelected || isSizeSelected) {
                option.selected = true;
            }
            pageSizeSelect.appendChild(option);
        });

        pageSizeSelect.addEventListener('change', (e) => {
            const newSize = e.target.value;

            if (newSize === 'All') {
                // Set size to the full length of original data, effectively showing all rows
                this.options.pageSize = this.originalData.length;
            } else {
                this.options.pageSize = Number(newSize);
            }

            this.state.currentPage = 1; // Always reset to page 1
            this.processData();
            this.render(); // Re-render the entire grid
        });

        const label = document.createElement('span');
        label.innerText = 'Rows per page: ';

        // Add selector and label to the left of the footer
        footer.append(label, pageSizeSelect);

        // 2. --- Existing Pagination Controls ---

        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '10px';
        controls.style.alignItems = 'center';

        const info = document.createElement('span');
        info.innerText = `Page ${this.state.currentPage} of ${totalPages} (${totalItems} items)`;
        info.style.marginLeft = '20px'; // Add some separation

        const prevBtn = document.createElement('button');
        prevBtn.className = 'dg-btn';
        prevBtn.innerText = 'Prev';
        prevBtn.disabled = this.state.currentPage === 1;
        prevBtn.onclick = () => { this.state.currentPage--; this.render(); };

        const nextBtn = document.createElement('button');
        nextBtn.className = 'dg-btn';
        nextBtn.innerText = 'Next';
        nextBtn.disabled = this.state.currentPage >= totalPages || totalPages === 0;
        nextBtn.onclick = () => { this.state.currentPage++; this.render(); };

        controls.append(info, prevBtn, nextBtn);
        // 3. --- NEW: Go To Page Option ---
        const goToDiv = document.createElement('div');
        goToDiv.style.display = 'flex';
        goToDiv.style.alignItems = 'center';
        goToDiv.style.marginLeft = '20px';
        goToDiv.style.gap = '5px';

        const goToInput = document.createElement('input');
        goToInput.type = 'number';
        goToInput.min = 1;
        goToInput.max = totalPages;
        goToInput.placeholder = 'Page #';
        goToInput.style.width = '60px';
        goToInput.style.padding = '4px';

        const goToBtn = document.createElement('button');
        goToBtn.className = 'dg-btn';
        goToBtn.innerText = 'Go';

        // Go button click handler
        goToBtn.onclick = () => {
            const pageNum = parseInt(goToInput.value);
            if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
                alert(`Please enter a valid page number between 1 and ${totalPages}.`);
                return;
            }
            this.state.currentPage = pageNum;
            this.render();
        };

        goToDiv.append(document.createTextNode('Go to:'), goToInput, goToBtn);
        controls.appendChild(goToDiv); // Add the new controls alongside Prev/Next
        footer.appendChild(controls);

        this.container.appendChild(footer);
    }

    // --- Helper: Input Creation ---   
    createInput(col, rowData) {
        let el;

        // Helper function for formatting numbers to a specific decimal place
        const formatToDecimals = (value, decimals) => {
            if (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) {
                const num = parseFloat(value);
                return isNaN(num) ? '' : num.toFixed(decimals);
            }
            return '';
        };
        // 💡 NEW HELPER FUNCTION: Truncate/Round down to specified precision
        const truncateToPrecision = (value, precision) => {
            if (isNaN(value)) return 0;
            const multiplier = Math.pow(10, precision);
            // Truncate by multiplying, flooring, and dividing back
            return Math.round(value * multiplier) / multiplier;
        };
        // --- Handle 'label' Type for Non-Editable Display (e.g., netsalary) ---
        if (col.type === 'label') {
            el = document.createElement('div');
            el.className = 'dg-label';
            // Display label fields as HTML
            el.innerHTML = rowData[col.field] || '';
            el.title = this.stripHtml(rowData[col.field] || '');
            el.style.width = '100%';
            el.style.padding = '8px 2px';
            el.style.boxSizing = 'border-box';
            el.style.textAlign = col.align || 'left';
        }
        // --- Handle 'dropdown' Type ---
        else if (col.type === 'dropdown') {
            el = document.createElement('select');
            el.className = 'dg-select';
            el.style.textAlign = col.align || 'left';

            // Ensure options array exists
            const opts = col.options || [];

            // 💡 CRITICAL CHANGE: Iterate over options and handle both object and string formats
            opts.forEach(opt => {
                const option = document.createElement('option');

                let optionValue;
                let optionText;

                if (typeof opt === 'object' && opt !== null && 'value' in opt) {
                    // Case 1: Option is {value: '1', label: 'Male'}
                    optionValue = opt.value;
                    optionText = opt.label || opt.value; // Use label if present, otherwise value
                } else {
                    // Case 2: Option is a simple string, e.g., 'NY' (for backward compatibility)
                    optionValue = String(opt);
                    optionText = String(opt);
                }

                option.value = optionValue;
                option.innerText = optionText;

                // Check against the stored rowData value (which should match the optionValue)
                option.selected = String(rowData[col.field]) === optionValue;

                el.appendChild(option);
            });

            el.title = rowData[col.field] || '';
            // 💡 INITIALIZATION: Set the label field on rowData immediately
            const currentValue = rowData[col.field];
            const initialLabel = this.getLabelFromOptions(col.options, currentValue);
            rowData[col.field + '_label'] = initialLabel; // Set it once here
            // Attach change listener here for dropdown
            el.addEventListener('change', (e) => {
                const selectedOption = e.target.options[e.target.selectedIndex];
                const newLabel = selectedOption.innerText;
                const newValue = e.target.value;

                // Update Data Source
                rowData[col.field] = newValue;
                rowData[col.field + '_label'] = newLabel;
                // Execute Custom Cell Change Callback 
                if (this.options.onCellChange && typeof this.options.onCellChange === 'function') {
                    this.options.onCellChange(col.field, newValue, rowData);
                }

                this.updateCalculatedFields(rowData);
                this.renderStatusBarAfterChange();
            });
        }
        // --- 💡 NEW: Handle Checkbox (Boolean) and Radio Button Types ---
        else if (col.type === 'checkbox' || col.type === 'radio') {
            const currentValue = rowData[col.field];
            // 💡 INITIALIZATION: Set the label field on rowData immediately
            const initialLabel = this.getLabelFromOptions(col.options, currentValue);
            rowData[col.field + '_label'] = initialLabel; // Set it once here
            el = document.createElement('div');
            el.className = 'dg-control-group';
            el.style.textAlign = col.align || 'left';

            // Use the field value (true/false or one of the radio options)
            //const currentValue = rowData[col.field]; 

            if (col.type === 'checkbox') {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = col.checked || false;// !!currentValue; // Convert value to boolean
                checkbox.className = 'dg-control-input';
                checkbox.value = 'true'; // Set a standard value
                rowData[col.field] = col.checked || false;// !!currentValue;
                checkbox.addEventListener('change', (e) => {
                    const newValue = e.target.checked;
                    rowData[col.field] = newValue; // Store boolean
                    rowData[col.field + '_label'] = newValue ? "Checked" : "NotChecked";
                    // Execute Custom Cell Change Callback 
                    if (this.options.onCellChange && typeof this.options.onCellChange === 'function') {
                        this.options.onCellChange(col.field, newValue, rowData);
                    }

                    this.updateCalculatedFields(rowData);
                    this.renderStatusBarAfterChange();
                });
                el.appendChild(checkbox);

            } else if (col.type === 'radio') {
                // Renders multiple radio buttons for the field
                col.options.forEach(option => {
                    const radio = document.createElement('input');
                    radio.type = 'radio';
                    radio.name = col.field + rowData._gridId.toString(); // Group by row ID for unique row selection
                    radio.value = option.value || option; // Use value property or option itself
                    radio.checked = currentValue === radio.value;
                    radio.className = 'dg-control-input';
                    const optionLabel = option.label || option.value || option;
                    radio.addEventListener('change', (e) => {
                        const newValue = e.target.value;

                        rowData[col.field] = newValue; // Store string value
                        rowData[col.field + '_label'] = optionLabel;
                        this.handleControlChange(col.field, newValue, rowData);
                    });

                    const label = document.createElement('label');
                    // 1. 💡 CRITICAL CHANGE: Append the radio button first
                    label.appendChild(radio);

                    // 2. 💡 Append the text *after* the radio button
                    // Create a text node for the label text to cleanly append it.
                    const labelText = document.createTextNode(option.label || option.value || option);
                    label.appendChild(labelText);

                    // 3. Append the complete <label> element to the cell container (el)
                    el.appendChild(label);
                });
            }
        }
        // --- Handle 'number' and 'text' Types ---
        else {
            el = document.createElement('input');
            el.className = 'dg-input';
            el.type = 'text'; // Use 'text' type to fully control display formatting
            el.style.textAlign = col.align || 'left';

            // --- 💡 NEW: Handle Decimal Precision for Number Fields ---
            if (col.type === 'number') {// && typeof col.maxprecision === 'number'
                let maxprecision = 4;
                const rawValue = rowData[col.field];

                // Initial Value: Show 2 decimals
                el.value = formatToDecimals(rawValue, col.precision !== undefined ? col.precision : 2);

                // Store the true, full precision value (e.g., 4 decimals)
                el.dataset.fullValue = formatToDecimals(rawValue, maxprecision);//col.maxprecision
                el.title = rawValue;
                // 1. onfocus: Show full precision value (4 decimals)
                el.onfocus = () => {
                    el.value = el.dataset.fullValue;
                    el.select(); // Select all text for easy editing
                };

                // 2. onblur: Revert to 2 decimal display and update data
                el.onblur = (e) => {
                    // Get the entered value and parse it
                    let enteredValue = parseFloat(e.target.value);

                    // If invalid input, use the last valid stored value
                    if (isNaN(enteredValue)) {
                        enteredValue = parseFloat(el.dataset.fullValue || 0);
                    }

                    // 💡 CRITICAL STEP: Truncate the value to the column's full precision (4 decimals)
                    const finalValue = truncateToPrecision(enteredValue, maxprecision);//col.maxprecision

                    // 1. Update the stored data object with the authoritative, truncated float value
                    rowData[col.field] = finalValue;

                    // 2. Update the data attribute with the new full precision value (as a formatted string)
                    el.dataset.fullValue = formatToDecimals(finalValue, maxprecision); //col.maxprecision// Use finalValue here

                    // 3. Update the displayed value to 2 decimals
                    e.target.value = formatToDecimals(finalValue, col.precision !== undefined ? col.precision : 2); // Use finalValue here

                    // 4. Trigger Recalculation and Change Handlers 

                    // Note: Pass the finalValue to onCellChange for consistency
                    if (this.options.onCellChange && typeof this.options.onCellChange === 'function') {
                        this.options.onCellChange(col.field, finalValue, rowData);
                    }

                    // 2. Trigger Recalculation (e.g., netsalary)
                    this.updateCalculatedFields(rowData);

                    // 3. Trigger Status Bar update
                    this.renderStatusBarAfterChange(); // Assuming you create this wrapper method
                };

                // IMPORTANT: Recalc/update handled in 'onblur'
            }
            // --- 💡 Autocomplete/Value-Label Handling ---
            else if (col.type === 'text' && col.autocomplete) {
                const rawValue = rowData[col.field]; // e.g., 'DEV'

                // 1. Look up the label using the stored value
                const initialLabel = this.getLabelFromOptions(col.options, rawValue);

                // 2. Set the input value to the label for display (e.g., 'Developer')
                el.value = initialLabel || rawValue || '';

                // 3. Ensure the rowData has the _label property set for future retrieval
                if (!rowData[col.field + '_label']) {
                    rowData[col.field + '_label'] = initialLabel;
                }

                // ... (rest of autocomplete setup and event listeners) ...

            } else {
                // Standard text input
                el.value = rowData[col.field] || '';
            }

            //el.value = rowData[col.field];
            // 💡 NEW: Keydown Listener for Navigation
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent default Enter action (like form submission)
                    //this.focusNextEditableCell(el);
                }
            });
            // --- Custom Autocomplete Logic ---
            if (col.autocomplete) {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showAutocompleteList(el, col);
                });
                el.addEventListener('input', (e) => {
                    this.updateAutocompleteList(el, col, e.target.value);
                });
            }
        }

        // --- Generic 'change' Event Listener (For Text, Dropdown, non-precision Number) ---
        // This is skipped for precision-managed number fields as their logic is in onblur.
        el.addEventListener('change', (e) => {
            let val = e.target.value;
            if (col.type === 'number') val = parseFloat(val);
            if (col.type === 'checkbox') { val = e.target.checked }
            else {
                // Update Data Source
                if (!col.autocomplete)
                    rowData[col.field] = val;
                // 💡 Update title on change
                e.target.title = val;
            }
            // 1. Execute Custom Cell Change Callback 
            if (this.options.onCellChange && typeof this.options.onCellChange === 'function') {
                this.options.onCellChange(col.field, val, rowData);
            }

            // 2. Trigger Recalculation (if needed for non-number fields)
            this.updateCalculatedFields(rowData);

            // 3. Trigger Recalculation of Status Bar (replaces your old status bar update logic)
            this.renderStatusBarAfterChange();
        });

        // --- NEW HOOK ---
        if (this.options.customCellRenderer) {
            this.options.customCellRenderer(el, col, rowData);
        }

        return el;
    }
    // Inside DynamicGrid class

    // Helper function to find the label for a given value
    getLabelFromOptions(options, value) {
        if (!options || !value) return '';

        // Find the option object that matches the value
        const selectedOption = options.find(opt => {
            const optValue = (typeof opt === 'object' && 'value' in opt) ? opt.value : String(opt);
            return String(optValue) === String(value);
        });

        if (selectedOption) {
            if (typeof selectedOption === 'object' && 'label' in selectedOption) {
                return selectedOption.label;
            }
            // If it's a simple string option or the value property is used as label
            return String(selectedOption.label || selectedOption.value || selectedOption);
        }
        return ''; // Return empty string if not found
    }
    // Inside the DynamicGrid class
    // 💡 You also need a dedicated handler method for checkboxes/radios (optional, but cleaner)
    handleControlChange(field, newValue, rowData) {
        if (this.options.onCellChange && typeof this.options.onCellChange === 'function') {
            this.options.onCellChange(field, newValue, rowData);
        }
        this.updateCalculatedFields(rowData);
        this.renderStatusBarAfterChange();
    }
    // Inside the DynamicGrid class

    focusNextEditableCell(currentElement) {
        // 1. Find the current cell and row
        const currentCell = currentElement.closest('.dg-cell');
        const currentRow = currentElement.closest('.dg-row');

        if (!currentRow || !currentCell) return;

        // 2. Get all cells in the current row
        const allCells = Array.from(currentRow.querySelectorAll('.dg-cell'));

        // 3. Find the index of the current cell
        const currentIndex = allCells.findIndex(cell => cell === currentCell);

        // 4. Search horizontally for the next editable element
        for (let i = currentIndex + 1; i < allCells.length; i++) {
            const nextCell = allCells[i];

            // Query for both input and select elements
            const nextEditable = nextCell.querySelector('.dg-input, .dg-select');

            if (nextEditable) {
                nextEditable.focus();
                // Optional: nextEditable.select();
                return; // Stop if a cell in the current row is found
            }
        }

        // --- 5. LOGIC TO JUMP TO NEXT ROW ---

        // Find the parent body container to get all rows
        const bodyContainer = currentRow.closest('.dg-body');
        if (!bodyContainer) return;

        // Get all visible rows in the grid body
        const allRows = Array.from(bodyContainer.querySelectorAll('.dg-row'));

        // Find the index of the current row
        const currentRowIndex = allRows.findIndex(row => row === currentRow);

        // Check if there is a next row
        if (currentRowIndex < allRows.length - 1) {
            const nextRow = allRows[currentRowIndex + 1];

            // Find the first editable element in the next row
            const firstEditableInNextRow = nextRow.querySelector('.dg-input, .dg-select');

            if (firstEditableInNextRow) {
                firstEditableInNextRow.focus();
                // Optional: firstEditableInNextRow.select();
                return;
            }
        }

        // Optional: Add logic here to automatically add a new row 
        // if the user hits Enter on the last cell of the last row.

        // If we reach the end of the last row, ensure no other default action occurs
        currentElement.blur();
    }
    // Inside DynamicGrid class:
    updateCalculatedFields(updatedRow) {
        // 3. Update the footer/status bar which calculates totals (optional)
        this.renderStatusBarAfterChange();
    }
    updateCalculatedFields_try(updatedRow) {
        // 1. Recalculate netsalary based on the updated numerical fields
        const salary = updatedRow.salary || 0;
        const hra = updatedRow.hra || 0;
        const da = updatedRow.da || 0;

        // Use parseFloat to ensure calculation happens on numbers
        const netSalary = parseFloat(salary) + parseFloat(hra) + parseFloat(da);

        // Update the row data object with the new net salary
        updatedRow.netsalary = netSalary;

        // 2. Find the element for netsalary in the DOM and update its display

        // To find the correct row, we use the unique ID we assigned earlier (_gridId)
        // You MUST ensure your renderBody function sets this attribute on the row element:
        // e.g., <div class="dg-row" data-row-id="${updatedRow._gridId}">
        const rowEl = this.container.querySelector(`.dg-row[data-row-id="${updatedRow._gridId}"]`);

        if (rowEl) {
            // Find the netsalary cell's display element (span/div)
            // You MUST ensure your renderBody function sets this attribute on the cell element:
            // e.g., <div class="dg-cell" data-field="netsalary">
            const netSalaryCellContainer = rowEl.querySelector(`.dg-cell[data-field="netsalary"]`);

            if (netSalaryCellContainer) {
                // Assuming the actual display element inside the cell is the first child (the label div/span)
                const netSalaryDisplayElement = netSalaryCellContainer.firstChild;

                if (netSalaryDisplayElement) {
                    // Display the updated net salary rounded to 2 decimals
                    netSalaryDisplayElement.innerText = netSalary.toFixed(2);
                }
            }
        }

        // 3. Update the footer/status bar which calculates totals (optional)
        this.renderStatusBarAfterChange();
    }
    // NOTE: Add this wrapper method to clean up and simplify status bar updates.
    // Inside DynamicGrid class:
    renderStatusBarAfterChange() {
        // Remove existing status bar
        const existingStatus = this.container.querySelector('.dg-status-bar');
        if (existingStatus) existingStatus.remove();

        // Remove footer momentarily
        const footer = this.container.querySelector('.dg-footer');
        if (footer) footer.remove();

        // Render status bar and re-insert footer
        this.renderStatusBar(existingStatus);
        if (this.options.enablePagination) this.renderFooter();
    }
    // Inside DynamicGrid class
    attachPopupListeners(popup, col) {
        const field = col.field;
        const checkboxList = popup.querySelector('.dg-filter-checkbox-list');
        const selectAllCheckbox = popup.querySelector('.dg-select-all-checkbox');
        // Find all individual checkboxes
        const individualCheckboxes = checkboxList.querySelectorAll('input[type="checkbox"]:not(.dg-select-all-checkbox)');


        // 💡 NEW LISTENER: Handle Select All/Deselect All (Existing Logic)
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', () => {
                const isChecked = selectAllCheckbox.checked;

                individualCheckboxes.forEach(cb => {
                    cb.checked = isChecked;
                });
                // Note: Filter is applied only on 'Apply' click.
            });
        }

        // 💡 NEW LISTENERS: Handle change on individual items
        individualCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                if (selectAllCheckbox) {

                    // 1. Check if the changed item was unchecked
                    if (!cb.checked) {
                        // If even one item is unchecked, force Select All to be unchecked
                        selectAllCheckbox.checked = false;
                    } else {
                        // 2. If the changed item was checked, check if all others are now checked
                        const allChecked = Array.from(individualCheckboxes).every(item => item.checked);

                        if (allChecked) {
                            // If every single individual item is checked, then check Select All
                            selectAllCheckbox.checked = true;
                        }
                    }
                }
            });
        });
        // Listen for Sort Clicks
        popup.querySelector('.dg-filter-apply').addEventListener('click', () => {
            const uniqueValuesCount = this.getUniqueValues(field).length;

            // Get all checked values (excluding the "Select All" checkbox)
            const selectedValues = Array.from(checkboxList.querySelectorAll('input[type="checkbox"]:not(.dg-select-all-checkbox):checked'))
                .map(input => String(input.value)); // Ensure values are strings
            const isFilterActive = selectedValues.length > 0 && selectedValues.length !== uniqueValuesCount;
            // If all items are selected, delete the filter to avoid unnecessary filtering
            if (selectedValues.length === uniqueValuesCount) {
                delete this.state.colFilters[field];
            } else if (selectedValues.length > 0) {
                // 💡 CRITICAL: Save the state
                this.state.colFilters[field] = selectedValues;
            } else {
                // If nothing is checked, set an empty array to filter everything out
                this.state.colFilters[field] = [];
            }
            // --- 2. Handle Text Filters (NEW) ---
            const textInput = popup.querySelector('.dg-text-filter-input').value.trim();
            const operator = popup.querySelector('.dg-text-filter-operator').value;

            if (textInput) {
                // Save the complex text filter state
                this.state.textFilters[field] = {
                    operator: operator,
                    value: textInput.toLowerCase() // Always filter using lowercase
                };
            } else {
                // If text input is empty, remove the text filter for this column
                delete this.state.textFilters[field];
            }
            // 3. Update Filter Order
            const isTextFilterActive = !!textInput;
            // The filter is active if EITHER the checkbox filter is active OR the text filter is active
            this.updateFilterOrder(field, isFilterActive || isTextFilterActive);
            // 💡 Update Filter Order
            //this.updateFilterOrder(field, isFilterActive);
            this.processData();
            this.render();
            this.closeAllPopups();
        });
        popup.querySelectorAll('.dg-filter-option').forEach(el => {
            el.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');

                if (action.startsWith('sort-')) {
                    const direction = action.split('-')[1]; // Extracts 'asc' or 'desc'

                    // 💡 CALL LOCATION 2: Calls handleSort with both field and explicit direction.
                    this.handleSort(field, direction);
                    this.closeAllPopups();
                } else if (action === 'autofit-col') {
                    this.autoFitColumn(field);
                    this.closeAllPopups();
                } else if (action === 'autofit-all') {
                    this.autoFitAllColumns();
                    this.closeAllPopups();
                }
            });
        });
        // Listen for Checkbox List Changes (Apply Filter Logic)
        popup.querySelector('.dg-filter-apply').addEventListener('click', () => {
            const selectedValues = Array.from(popup.querySelectorAll('.dg-filter-checkbox-list input:checked'))
                .map(input => input.value);

            this.state.colFilters[field] = selectedValues;
            this.processData();
            this.render();
            this.closeAllPopups();
        });

        // Listen for Clear Filter
        popup.querySelector('.dg-filter-clear').addEventListener('click', () => {
            delete this.state.colFilters[field];
            // 💡 Update Filter Order
            this.updateFilterOrder(field, false); // false = filter is now inactive
            this.processData();
            this.render();
            this.closeAllPopups();
        });

        // Listen for Text Filter Input (Optional: Live filtering the checkboxes)
        popup.querySelector('.dg-text-filter-input').addEventListener('input', (e) => {
            // This input is usually used to live filter the list of checkboxes shown below it.
            const filterText = e.target.value.toLowerCase();
            popup.querySelectorAll('.dg-filter-checkbox-list label').forEach(label => {
                const value = label.querySelector('input').value.toLowerCase();
                label.style.display = value.includes(filterText) ? 'block' : 'none';
            });
        });
    }

    // Update handl23eSort to accept an explicit direction
    handleSort(field, direction = null) {
        // If direction is provided (from the menu), use it directly
        if (direction) {
            this.state.currentSort.field = field;
            this.state.currentSort.direction = direction;
        }
        // Otherwise, toggle the current direction (from direct header click)
        else if (this.state.currentSort.field === field) {
            this.state.currentSort.direction = this.state.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.state.currentSort.field = field;
            this.state.currentSort.direction = 'asc';
        }
        this.processData();
        this.render();
    }
    // --- Logic: Pagination ---
    changePage(dir) {
        this.state.currentPage += dir;
        this.render(); // Only need to re-render, processing didn't change
    }

    // --- Logic: Column Resize ---
    attachColResizeEvents(handle, colConfig) {
        let startX, startWidth;

        const onMouseMove = (e) => {
            const newWidth = startWidth + (e.clientX - startX);
            if (newWidth > 50) { // Min width
                colConfig.width = newWidth; // Update config state
                this.render(); // Re-render to apply width to header and body
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';

            // 💡 NEW: Dispatch event on resize end
            const colIndex = this.columns.findIndex(c => c.field === colConfig.field);
            if (this.options.onColumnResize && typeof this.options.onColumnResize === 'function') {
                this.options.onColumnResize(colIndex, colConfig.field, colConfig.header || colConfig.field, colConfig.width);
            }
        };

        const onTouchMove = (e) => {
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                const newWidth = startWidth + (touch.clientX - startX);
                if (newWidth > 50) {
                    colConfig.width = newWidth;
                    this.render();
                }
            }
        };

        const onTouchEnd = () => {
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            document.body.style.cursor = 'default';
        };

        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent drag start
            startX = e.clientX;
            startWidth = parseInt(colConfig.width) || 150; // 💡 FIX: Parse as number!
            document.body.style.cursor = 'col-resize';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        handle.addEventListener('touchstart', (e) => {
            // e.preventDefault(); // Don't prevent default to allow scrolling if needed, but stop propagation
            e.stopPropagation();
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                startX = touch.clientX;
                startWidth = parseInt(colConfig.width) || 150;
                document.addEventListener('touchmove', onTouchMove, { passive: false });
                document.addEventListener('touchend', onTouchEnd);
            }
        });
    }

    // --- Logic: Column Reorder (Drag & Drop) ---
    attachColDragEvents(cell, index) {
        // --- Mouse Reorder (Drag & Drop) ---
        cell.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('colIndex', index);
            cell.classList.add('dragging');
        });

        cell.addEventListener('dragend', () => {
            cell.classList.remove('dragging');
        });

        cell.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allow drop
        });

        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData('colIndex'));
            const toIndex = index;

            if (fromIndex !== toIndex) {
                const movedCol = this.columns.splice(fromIndex, 1)[0];
                this.columns.splice(toIndex, 0, movedCol);
                this.render();
            }
        });

        // --- Touch Reorder (Manual implementation) ---
        let touchStartX, touchStartY;
        let ghostEl = null;
        let targetIndex = -1;

        cell.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) return;
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;

            // Optional: Add a delay or long-press requirement here if it conflicts with scrolling
        }, { passive: true });

        cell.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) return;
            const touch = e.touches[0];

            const dx = touch.clientX - touchStartX;
            const dy = touch.clientY - touchStartY;

            // Start dragging if move threshold is met
            if (!ghostEl && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
                cell.classList.add('dragging');
                ghostEl = cell.cloneNode(true);
                ghostEl.style.position = 'fixed';
                ghostEl.style.opacity = '0.7';
                ghostEl.style.zIndex = '10000';
                ghostEl.style.pointerEvents = 'none';
                document.body.appendChild(ghostEl);
            }

            if (ghostEl) {
                e.preventDefault(); // Prevent scrolling while dragging
                ghostEl.style.left = `${touch.clientX - (cell.offsetWidth / 2)}px`;
                ghostEl.style.top = `${touch.clientY - (cell.offsetHeight / 2)}px`;

                // Find potential drop target
                const hoveredEl = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetHeaderCell = hoveredEl?.closest('.dg-header-cell');
                if (targetHeaderCell) {
                    const allHeaders = Array.from(targetHeaderCell.parentElement.querySelectorAll('.dg-header-cell'));
                    targetIndex = allHeaders.indexOf(targetHeaderCell);
                }
            }
        }, { passive: false });

        cell.addEventListener('touchend', (e) => {
            if (ghostEl) {
                ghostEl.remove();
                ghostEl = null;
                cell.classList.remove('dragging');

                if (targetIndex !== -1 && targetIndex !== index) {
                    const movedCol = this.columns.splice(index, 1)[0];
                    this.columns.splice(targetIndex, 0, movedCol);
                    this.render();
                }
            }
            targetIndex = -1;
        });
    }
    // Inside DynamicGrid class:

    // Inside DynamicGrid class, update getUniqueValues
    getUniqueValues(field, dataToExamine) { // <--- Added dataToExamine parameter

        // Fallback if data is empty (though usually handled by caller)
        if (!dataToExamine || dataToExamine.length === 0) {
            return [];
        }

        // Ensure all values are converted to strings before putting them in the Set
        return [...new Set(dataToExamine.map(item => String(item[field])))].sort();
    }
    // Inside DynamicGrid class:

    getFilteredData(excludeField = null) {
        let data = this.originalData;

        // 1. Apply Global Search
        // (If you have global search, apply it here first)

        // 2. Apply Column Filters (excluding the current one)
        Object.keys(this.state.colFilters).forEach(field => {
            // Skip the field we want to exclude
            if (field === excludeField) {
                return;
            }

            const filters = this.state.colFilters[field];

            if (filters && filters.length > 0) {
                data = data.filter(item => filters.includes(String(item[field])));
            } else if (filters && filters.length === 0) {
                data = [];
            }
        });

        return data;
    }
    // --- UPDATED Utility Method for Closing Popups ---
    closeAllPopups() {
        // 1. Close Column Filters
        document.querySelectorAll('.dg-filter-popup').forEach(el => el.remove());

        // 2. Close Autocomplete List (NEW)
        if (this.activeAutocompletePopup) {
            this.activeAutocompletePopup.remove();
            this.activeAutocompletePopup = null;
        }
        // 💡 NEW LOGIC: Close the column selection popup
        if (this.state.activeColumnPopup) {
            this.state.activeColumnPopup.remove();
            this.state.activeColumnPopup = null;
        }
        // 💡 NEW LOGIC: Close the Row Action Popup if it exists
        if (this.state.activeRowActionPopup) {
            this.state.activeRowActionPopup.remove();
            this.state.activeRowActionPopup = null;
        }
    }
    // Inside DynamicGrid class:

    // Inside DynamicGrid class, update the showAutocompleteList method:

    // Inside DynamicGrid class, update the showAutocompleteList method:

    showAutocompleteList(inputEl, col) {
        // If the list is already open, do nothing (let the input listener handle filtering)
        if (this.activeAutocompletePopup) {
            return;
        }
        this.closeAllPopups(); // Close others

        // 1. Create container (ul)
        const list = document.createElement('ul');
        list.className = 'dg-autocomplete-list';

        // 2. Position container
        const rect = inputEl.getBoundingClientRect();
        list.style.top = `${rect.bottom + window.scrollY}px`;
        list.style.left = `${rect.left + window.scrollX}px`;
        list.style.width = `${rect.width}px`;

        document.body.appendChild(list);
        this.activeAutocompletePopup = list;

        // 3. Populate content based on current input value (initial filtering)
        this.updateAutocompleteList(inputEl, col, inputEl.value);
    }
    // Inside DynamicGrid class, add this new method:
    updateAutocompleteList(inputEl, col, filterText = '') {
        if (!this.activeAutocompletePopup) {
            // Assuming showAutocompleteList calls this function after setting up the popup
            this.showAutocompleteList(inputEl, col);
            return;
        }

        const list = this.activeAutocompletePopup;
        const filterTextLower = filterText.toLowerCase();

        // Get the rowData object linked to this input element
        // Assuming the input's parent cell or row has data about the current row.
        const currentRow = inputEl.closest('.dg-row');
        const rowData = currentRow ? this.originalData.find(row =>
            String(row._gridId) === currentRow.dataset.gridId
        ) : null;

        // 1. Determine source options
        let sourceOptions = col.options || this.getUniqueValues(col.field);

        // 2. 💡 CRITICAL: Filter options by checking the LABEL (or value if it's a string)
        const filteredOptions = sourceOptions.filter(opt => {
            let textToSearch;

            if (typeof opt === 'object' && opt !== null) {
                // Use the label for filtering, falling back to value
                textToSearch = String(opt.label || opt.value || '');
            } else {
                // Use the string itself for filtering
                textToSearch = String(opt);
            }

            return textToSearch.toLowerCase().includes(filterTextLower);
        });

        list.innerHTML = ''; // Clear existing list items

        // 3. 💡 CRITICAL: Regenerate and append filtered items with value/label
        if (filteredOptions.length > 0) {
            filteredOptions.forEach(opt => {
                const item = document.createElement('li');
                item.className = 'dg-autocomplete-item';

                let displayLabel;
                let actualValue;

                if (typeof opt === 'object' && opt !== null) {
                    // Structured Object: Use label for display, value for data storage
                    displayLabel = opt.label || opt.value;
                    actualValue = opt.value;
                } else {
                    // Simple String: Use the string for both display and data storage
                    displayLabel = String(opt);
                    actualValue = String(opt);
                }

                // Store both pieces of data on the list item
                item.innerText = displayLabel;
                item.dataset.value = actualValue;
                item.dataset.label = displayLabel;

                // Re-attach click listener for item selection
                item.addEventListener('click', () => {
                    // 1. Get the final value and label from the clicked item
                    const selectedValue = item.dataset.value;
                    const selectedLabel = item.dataset.label;
                    console.log("Selected Value:", selectedValue);
                    console.log("Selected Label:", selectedLabel);
                    // 2. Update the UI input field with the LABEL (what the user sees)
                    inputEl.value = selectedLabel;

                    // 3. Update the underlying rowData with the VALUE (what is stored)
                    rowData[col.field] = selectedValue;
                    // 💡 Store the label alongside the value for retrieval outside the grid
                    if (rowData) {
                        rowData[col.field + '_label'] = selectedLabel;
                    }

                    // 4. Trigger change event and close popup
                    // NOTE: Dispatch the 'change' event to trigger onCellChange/recalcs
                    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                    this.closeAllPopups();
                });

                list.appendChild(item);
            });
        } else {
            list.innerHTML = '<li class="no-match">No matches found</li>';
        }
    }
    // Inside DynamicGrid class:

    viewRowData(rowData) {
        // 1. Format the data for the alert
        let display = 'Row Data:\n';
        for (const key in rowData) {
            // Exclude internal grid ID from display
            if (key !== '_gridId') {
                display += `${key}: ${rowData[key]}\n`;
            }
        }

        // 2. Show the alert
        //alert(display);
    }

    deleteRow(rowId) {
        // 1. Remove the row from the original data source
        this.originalData = this.originalData.filter(row => row._gridId !== rowId);

        // 2. Remove the row from the processed data (currently displayed data)
        this.state.processedData = this.state.processedData.filter(row => row._gridId !== rowId);

        // 3. Update the total rows count for pagination/summary
        this.state.totalRows = this.originalData.length;

        // 4. Re-render the grid to reflect the deletion
        this.render();
    }
    printGrid() {
        // 💡 NEW: Filter columns based on Print property
        // Get indices of columns that should be printed (Print === "Yes")
        const printableColumns = this.columns
            .map((col, index) => ({
                col: col,
                index: index,
                shouldPrint: col.visible !== false && col.Print === "Yes"
            }))
            .filter(item => item.shouldPrint);

        const printableIndices = printableColumns.map(item => item.index);

        if (printableIndices.length === 0) {
            alert('No columns are marked for printing. Please configure column Print properties.');
            return;
        }

        // 1. Isolate the grid container (dg-scroll-wrapper)
        const scrollWrapper = this.container.querySelector('.dg-scroll-wrapper');
        if (!scrollWrapper) {
            console.error("Print failed: Could not find the grid scrolling wrapper.");
            return;
        }

        // 2. Clone the content to prepare it for printing cleanup
        const printableClone = scrollWrapper.cloneNode(true);
        printableClone.className = 'dg-printable-view';

        // 💡 NEW: Update header cells with printHeader and remove non-printable columns
        const headerRow = printableClone.querySelector('.dg-header-row');
        if (headerRow) {
            const headerCells = Array.from(headerRow.querySelectorAll('.dg-header-cell'));

            // Remove non-printable columns from header (iterate backwards to avoid index issues)
            for (let i = headerCells.length - 1; i >= 0; i--) {
                if (!printableIndices.includes(i)) {
                    headerCells[i].remove();
                } else {
                    // Update header text with printHeader if available
                    const columnConfig = this.columns[i];
                    if (columnConfig.printHeader) {
                        const headerSpan = headerCells[i].querySelector('span');
                        if (headerSpan) {
                            headerSpan.textContent = columnConfig.printHeader;
                        }
                    }
                }
            }
        }

        // 💡 NEW: Remove non-printable cells from data rows
        const dataRows = printableClone.querySelectorAll('.dg-row');
        dataRows.forEach(rowEl => {
            const cells = Array.from(rowEl.querySelectorAll('.dg-cell'));

            // Remove cells for non-printable columns (iterate backwards)
            for (let i = cells.length - 1; i >= 0; i--) {
                if (!printableIndices.includes(i)) {
                    cells[i].remove();
                }
            }
        });

        // 💡 NEW: Remove non-printable cells from status bar
        const statusBar = printableClone.querySelector('.dg-status-bar');
        if (statusBar) {
            const statusCells = Array.from(statusBar.querySelectorAll('.dg-status-cell'));

            // Remove status cells for non-printable columns (iterate backwards)
            for (let i = statusCells.length - 1; i >= 0; i--) {
                if (!printableIndices.includes(i)) {
                    statusCells[i].remove();
                }
            }
        }


        // 3. Remove non-printable elements from the clone (optional, but clean)
        // Remove resize handles
        printableClone.querySelectorAll('.dg-col-resize-handle').forEach(el => el.remove());
        // Remove action buttons (options menu, row actions)
        printableClone.querySelectorAll('.dg-options-btn, .dg-row-options-btn, .dg-action-icon').forEach(el => el.remove());

        // 4. Clean up input/checkboxes and ensure plain text display
        printableClone.querySelectorAll('.dg-row').forEach(rowEl => {
            // Remove selection checkbox column entirely from print
            const checkboxCell = rowEl.querySelector('.dg-cell input[type="checkbox"]');
            if (checkboxCell && checkboxCell.parentElement) {
                checkboxCell.parentElement.remove();
            }

            // Convert inputs/selects to static text
            rowEl.querySelectorAll('.dg-input, .dg-select').forEach(inputEl => {
                const cell = inputEl.parentElement;
                const textValue = inputEl.value;
                // Replace the input/select element with a clean text div
                const textDiv = document.createElement('div');
                textDiv.className = 'dg-print-text';
                textDiv.innerText = textValue;
                cell.innerHTML = '';
                cell.appendChild(textDiv);
            });
        });

        // 5. Inject styles and prepare the print window
        const printWindow = window.open('', '_blank');

        let printStyles = `
        <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { margin: 0; padding: 0; font-family: sans-serif; }
            
            /* Apply common print rules to the entire view */
            .dg-printable-view { 
                display: block; 
                width: max-content; /* Ensure the wrapper expands to the full column width */
                overflow: visible !important; /* Allow all content to be printed */
            }

            /* Ensure header and rows use print-friendly display */
            .dg-header-row, .dg-row, .dg-status-bar { 
                display: flex !important; /* Keep flex to maintain column structure */
                width: 100%; 
                border-bottom: 1px solid #ccc;
                page-break-inside: avoid; /* Prevents rows from splitting across pages */
            }
            .dg-row:nth-child(even) { background-color: #f7f7f7; }

            /* Ensure cells respect their width explicitly for printing */
            .dg-header-cell, .dg-cell, .dg-status-cell {
                padding: 8px 5px;
                border-right: 1px solid #eee;
                box-sizing: border-box;
                /* Inherit flex-basis/min-width from inline styles in JS, but ensure no shrinking/growing */
                flex-shrink: 0 !important; 
                flex-grow: 0 !important;
                white-space: nowrap; /* Prevent wrapping in cells */
                overflow: hidden;
                text-overflow: ellipsis; 
            }
            .dg-header-cell { font-weight: bold; background: #e0e0e0; }
            .dg-status-bar { background: #f0f8ff; border-top: 2px solid #aaa; font-size: 0.9em; }

            /* Text inside cells must look clean */
            .dg-print-text, .dg-label {
                padding: 0 !important;
                border: none !important;
                background: none !important;
                width: 100% !important;
                text-align: inherit;
            }
        </style>
    `;

        // 6. Write content to the print window
        printWindow.document.write(`<html><head><title>Data Grid Print</title>${printStyles}</head><body>`);
        printWindow.document.body.appendChild(printableClone);
        printWindow.document.write('</body></html>');

        // 7. Print and close
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }

    /**
     * Helper to measure text width
     */
    measureTextWidth(text, font = '14px Inter, sans-serif') {
        if (!this._canvas) {
            this._canvas = document.createElement('canvas');
        }
        const context = this._canvas.getContext('2d');
        context.font = font;
        const metrics = context.measureText(text);
        return metrics.width;
    }

    /**
     * Auto fit a specific column based on its content and header
     */
    autoFitColumn(field) {
        const col = this.columns.find(c => c.field === field);
        if (!col) return;

        // 1. Measure Header Width
        const headerFont = 'bold 14px Inter, sans-serif';
        const headerText = col.header || field;
        let maxWidth = this.measureTextWidth(headerText, headerFont) + 40; // +40 for icons (filter/menu) and padding

        // 2. Measure Cell Contents
        const cellFont = '14px Inter, sans-serif';
        const sampleData = this.originalData; // Measure against all data

        sampleData.forEach(row => {
            const val = row[field];
            if (val !== undefined && val !== null) {
                let textToMeasure = String(val);

                // Special handling for labels/formatting if needed
                if (col.type === 'label') {
                    // Maybe it's formatted in the UI? 
                    // For now, measure original value.
                }

                const width = this.measureTextWidth(textToMeasure, cellFont) + 20; // +20 for padding
                if (width > maxWidth) {
                    maxWidth = width;
                }
            }
        });

        // 3. Apply the new width
        col.width = Math.ceil(maxWidth);

        // Ensure some minimum/maximum?
        if (col.width < 50) col.width = 50;
        if (col.width > 600) col.width = 600;

        // 4. Re-render
        this.render();
    }

    /**
     * Auto fit all columns in the grid
     */
    autoFitAllColumns() {
        this.columns.forEach(col => {
            if (col.visible !== false && col.field) {
                // 1. Measure Header Width
                const headerFont = 'bold 14px Inter, sans-serif';
                const headerText = col.header || col.field;
                let maxWidth = this.measureTextWidth(headerText, headerFont) + 40;

                // 2. Measure Cell Contents
                const cellFont = '14px Inter, sans-serif';
                this.originalData.forEach(row => {
                    const val = row[col.field];
                    if (val !== undefined && val !== null) {
                        const width = this.measureTextWidth(String(val), cellFont) + 20;
                        if (width > maxWidth) {
                            maxWidth = width;
                        }
                    }
                });

                col.width = Math.ceil(maxWidth);
                if (col.width < 50) col.width = 50;
                if (col.width > 600) col.width = 600;
            }
        });

        // Re-render once
        this.render();
    }
    /**
     * Refresh all column properties (visible, type, align, width, etc.) based on the current columns object.
     * Triggers a full re-render to ensure structural changes are correctly applied.
     */
    refreshColumns() {
        this.render();
    }

    // --- Keyboard Navigation (Arrow Up / Arrow Down) ---
    setupKeyboardNavigation() {
        // Make the container focusable so it can receive keyboard events
        if (!this.container.hasAttribute('tabindex')) {
            this.container.setAttribute('tabindex', '0');
        }

        // Remove any previously attached keyboard listener to avoid duplicates
        if (this._keyNavHandler) {
            this.container.removeEventListener('keydown', this._keyNavHandler);
        }

        // Track the currently highlighted row index (-1 = none)
        if (this._activeRowIndex === undefined) {
            this._activeRowIndex = -1;
        }

        const body = this.container.querySelector('.dg-body');
        if (!body) return;
        const rows = Array.from(body.querySelectorAll('.dg-row'));
        if (rows.length === 0) return;

        // --- NEW: Initial Dynamic Focus Logic ---
        if (this._activeRowIndex === -1) {
            if (this.options.selectFromFirstRow) {
                this._activeRowIndex = 0;
            } else if (this.options.initialFocusCriteria && typeof this.options.initialFocusCriteria === 'object') {
                const pageData = this.getPaginatedData();
                const matchIndex = pageData.findIndex(row => {
                    return Object.entries(this.options.initialFocusCriteria).every(([field, value]) => {
                        return String(row[field]) === String(value);
                    });
                });
                if (matchIndex !== -1) {
                    this._activeRowIndex = matchIndex;
                }
            } else if (this.options.initialFocusField && this.options.initialFocusValue !== null) {
                const pageData = this.getPaginatedData();
                const matchIndex = pageData.findIndex(row =>
                    String(row[this.options.initialFocusField]) === String(this.options.initialFocusValue)
                );
                if (matchIndex !== -1) {
                    this._activeRowIndex = matchIndex;
                }
            }
        }

        const applyHighlight = (index) => {
            // Remove highlight from all rows
            rows.forEach(r => r.classList.remove('dg-row-keyboard-active'));

            // Add highlight to the active row
            const activeRow = rows[index];
            if (activeRow) {
                activeRow.classList.add('dg-row-keyboard-active');

                // --- Scroll row into view INSIDE the grid's scroll wrapper ---
                const scrollWrapper = this.container.querySelector('.dg-scroll-wrapper');
                if (scrollWrapper) {
                    if (index === 0) {
                        scrollWrapper.scrollTop = 0;
                    } else {
                        const wrapperRect = scrollWrapper.getBoundingClientRect();
                        const rowRect = activeRow.getBoundingClientRect();
                        const rowTopRel = rowRect.top - wrapperRect.top;
                        const rowBottomRel = rowRect.bottom - wrapperRect.top;

                        const header = scrollWrapper.querySelector('.dg-header-row');
                        const headerHeight = header ? header.offsetHeight : 0;

                        if (rowTopRel < headerHeight) {
                            scrollWrapper.scrollTop += (rowTopRel - headerHeight);
                        } else if (rowBottomRel > scrollWrapper.clientHeight) {
                            scrollWrapper.scrollTop += (rowBottomRel - scrollWrapper.clientHeight) + 20;
                        }
                    }
                }
            }
        };

        this._keyNavHandler = (e) => {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return;

            // Prevent default behavior (scroll for arrows, form submit etc for enter)
            e.preventDefault();

            const body = this.container.querySelector('.dg-body');
            if (!body) return;
            const rows = Array.from(body.querySelectorAll('.dg-row'));
            if (rows.length === 0) return;

            // --- Handle Enter Key ---
            if (e.key === 'Enter') {
                if (this._activeRowIndex >= 0 && this._activeRowIndex < rows.length) {
                    const pageData = this.getPaginatedData();
                    const rowData = pageData[this._activeRowIndex];
                    if (rowData) {
                        // 1. If onEnter callback is defined, trigger it
                        if (this.options.onEnter && typeof this.options.onEnter === 'function') {
                            this.options.onEnter(rowData, this);
                        } else {
                            // 2. Fallback: Show original alert if no callback provided
                            // Create a clean copy without internal _gridId for display
                            const displayData = { ...rowData };
                            delete displayData._gridId;

                            //alert(`Row Data:\n\n${JSON.stringify(displayData, null, 2)}`);
                        }
                    }
                }
                return;
            }

            // --- Handle Arrow Keys ---
            // Determine next index
            if (e.key === 'ArrowDown') {
                this._activeRowIndex = Math.min(this._activeRowIndex + 1, rows.length - 1);
            } else if (e.key === 'ArrowUp') {
                this._activeRowIndex = Math.max(this._activeRowIndex - 1, 0);
            }

            applyHighlight(this._activeRowIndex);
        };

        this.container.addEventListener('keydown', this._keyNavHandler);

        // Apply initial highlight if an active row was determined
        if (this._activeRowIndex !== -1) {
            applyHighlight(this._activeRowIndex);
            // 💡 NEW: Automatically focus the container so keyboard navigation works immediately
            this.container.focus({ preventScroll: true });
        }
    }
}