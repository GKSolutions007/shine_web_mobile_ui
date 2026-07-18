window._PMS_Registry = window._PMS_Registry || {};

function getMultiSelectValues(inputId) {
    var inst = window._PMS_Registry[inputId];
    return inst ? inst.getSelected() : [];
}

function GKBSPaginatedMultiSelect(options) {

    var inputId = options.inputId;
    var fullData = options.data || [];
    var pageSize = 20;
    var onSelect = options.onSelect || function () { };

    // Element id helpers
    var wrapId = 'pms_wrap_' + inputId;   // pill-box wrapper that replaces the raw input visually
    var dropId = 'pms_drop_' + inputId;
    var listId = 'pms_list_' + inputId;
    var statId = 'pms_stat_' + inputId;
    var spinId = 'pms_spin_' + inputId;
    var searchId = 'pms_srch_' + inputId;   // hidden search input inside the dropdown

    var $input = $('#' + inputId);

    // Destroy previous instance if re-init
    if (window._PMS_Registry[inputId]) {
        window._PMS_Registry[inputId].destroy();
    }
    $('#' + dropId).remove();
    $('#' + wrapId).remove();

    // ── Hide original input; wrap it in a pill-box container ───────────────
    //   The wrapper looks like an input and holds the chips + a ghost cursor
    $input.css({ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, padding: 0, border: 0 });

    var $wrap = $('<div id="' + wrapId + '" tabindex="0">').css({
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '4px',
        minHeight: '34px',
        padding: '4px 8px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        background: '#fff',
        cursor: 'text',
        boxSizing: 'border-box',
        fontSize: '12px',
        fontFamily: 'inherit',
        lineHeight: '1.4',
        outline: 'none'
    });

    // Invisible typing cursor span (just a blinking bar so it feels like an input)
    var $cursor = $('<span id="pms_cur_' + inputId + '">').css({
        display: 'none',
        minWidth: '2px',
        height: '14px',
        borderLeft: '2px solid #555',
        marginLeft: '2px',
        verticalAlign: 'middle',
        animation: 'pmsBlink 1s step-end infinite',
        opacity: 0          // hidden until focused
    });

    // Inject keyframe if not already present
    if (!document.getElementById('pms-blink-style')) {
        $('<style id="pms-blink-style">@keyframes pmsBlink{0%,100%{opacity:1}50%{opacity:0}}</style>').appendTo('head');
    }

    $wrap.append($cursor);
    $wrap.insertAfter($input);      // wrapper sits right where the input was

    // ── Pill-box focus / blur visual ───────────────────────────────────────
    function wrapFocus() {
        $wrap.css({ borderColor: '#378ADD', boxShadow: '0 0 0 3px rgba(55,138,221,.15)' });
        $cursor.css('opacity', 1);
    }
    function wrapBlur() {
        $wrap.css({ borderColor: '#ccc', boxShadow: 'none' });
        $cursor.css('opacity', 0);
    }

    // ── Selected items map  { key → item } ────────────────────────────────
    var selectedMap = {};

    // ── Build dropdown ─────────────────────────────────────────────────────
    var $dropdown = $([
        '<div id="' + dropId + '" style="',
        'display:none;position:fixed;z-index:99999;',
        'background:#fff;border:1px solid #ccc;',
        'border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.18);',
        'min-width:280px;overflow:hidden;">',

        // Top bar: search + Select All / Remove All
        '<div style="padding:8px 10px;border-bottom:1px solid #eee;background:#fafafa;">',

        //// Item count row (first row as requested)
        //'<div id="pms_toprow_' + inputId + '" style="',
        //'font-size:11px;color:#555;margin-bottom:6px;font-weight:600;">',
        //'Total: 0 item(s)</div>',

        '<input id="' + searchId + '" type="text" placeholder="Search…" autocomplete="off" style="',
        'width:100%;box-sizing:border-box;padding:5px 8px;',
        'border:1px solid #ccc;border-radius:4px;font-size:12px;outline:none;">',

        '<div style="display:flex;gap:8px;margin-top:6px;">',
        '<button id="' + dropId + '_selall" type="button" style="',
        'flex:1;font-size:11px;padding:4px 6px;cursor:pointer;',
        'border:1px solid #378ADD;border-radius:4px;background:#E6F1FB;color:#185FA5;">Select All</button>',
        '<button id="' + dropId + '_remall" type="button" style="',
        'flex:1;font-size:11px;padding:4px 6px;cursor:pointer;',
        'border:1px solid #e06060;border-radius:4px;background:#fdecea;color:#c0392b;">Remove All</button>',
        '</div></div>',

        '<ul id="' + listId + '" style="list-style:none;margin:0;padding:0;max-height:260px;overflow-y:auto;"></ul>',

        '<div style="padding:5px 12px;font-size:11px;color:#888;border-top:1px solid #eee;',
        'background:#fafafa;display:flex;justify-content:space-between;">',
        '<span id="' + statId + '">Showing 0 items</span>',
        '<span id="' + spinId + '" style="display:none;color:#378ADD;">Loading…</span>',
        '</div></div>'
    ].join(''));

    $('body').append($dropdown);

    // ── Position dropdown under the wrapper ────────────────────────────────
    function positionDropdown() {
        var rect = $wrap[0].getBoundingClientRect();
        var dropH = 380;
        var showAbove = (window.innerHeight - rect.bottom) < dropH && rect.top > dropH;
        $dropdown.css({
            position: 'fixed',
            top: showAbove ? (rect.top - dropH) + 'px' : rect.bottom + 'px',
            left: rect.left + 'px',
            width: Math.max(rect.width, 280) + 'px',
            zIndex: 99999
        });
    }

    function bindReposition() {
        var ns = '.pms_' + inputId;
        $(window).off('scroll' + ns + ' resize' + ns)
            .on('scroll' + ns + ' resize' + ns, function () {
                if ($dropdown.is(':visible')) positionDropdown(); else closeDropdown();
            });
        $input.parents().each(function () {
            var ov = $(this).css('overflow') + $(this).css('overflow-y');
            if (/auto|scroll|hidden/.test(ov)) {
                $(this).off('scroll' + ns).on('scroll' + ns, function () {
                    if ($dropdown.is(':visible')) positionDropdown();
                });
            }
        });
    }
    bindReposition();

    // ── Paging + keyboard navigation state ────────────────────────────────
    var state = {
        page: 0,
        query: '',
        filtered: [],
        loaded: 0,
        loading: false,
        hasMore: true,
        activeIdx: -1,     // keyboard highlighted row index
        mouseBlock: false   // suppress mouse-hover highlight while using keyboard
    };

    function $list() { return $('#' + listId); }
    function $items() { return $('#' + listId).find('li[data-pms-key]'); }

    function highlight(text, q) {
        if (!q) return text;
        var esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp('(' + esc + ')', 'gi'),
            '<mark style="background:#ddeeff;color:#185FA5;padding:0 2px;border-radius:2px;">$1</mark>');
    }

    function updateStatus() {
        $('#' + statId).text(
            state.hasMore
                ? 'Showing ' + state.loaded + ' of ' + state.filtered.length
                : 'All ' + state.filtered.length + ' results shown'
        );
        $('#pms_toprow_' + inputId).text('Total: ' + state.filtered.length + ' item(s)');
    }

    // ── Keyboard: highlight a row by index ─────────────────────────────────
    function setActive(idx) {
        var $els = $items();
        if (!$els.length) return;
        idx = Math.max(-1, Math.min(idx, $els.length - 1));

        $els.each(function (i) {
            var isSelected = !!selectedMap[$(this).data('pms-key')];
            if (i === idx) {
                $(this).css('background', '#c8e0f7'); // keyboard focus = slightly darker blue
            } else {
                $(this).css('background', isSelected ? '#E6F1FB' : '');
            }
        });

        state.activeIdx = idx;

        // Scroll the highlighted row into view inside the list
        if (idx >= 0) {
            var el = $els.get(idx);
            var listDom = document.getElementById(listId);
            var elRect = el.getBoundingClientRect();
            var listRect = listDom.getBoundingClientRect();
            if (elRect.bottom > listRect.bottom) listDom.scrollTop += elRect.bottom - listRect.bottom;
            else if (elRect.top < listRect.top) listDom.scrollTop -= listRect.top - elRect.top;
        }
    }

    // ── Load one page of items ─────────────────────────────────────────────
    function loadNext(afterLoad) {
        if (state.loading || !state.hasMore) {
            if (typeof afterLoad === 'function') afterLoad();
            return;
        }
        state.loading = true;
        $('#' + spinId).show();

        setTimeout(function () {
            var slice = state.filtered.slice(state.page * pageSize, (state.page + 1) * pageSize);

            slice.forEach(function (item) {
                var key = itemKey(item);
                var checked = !!selectedMap[key];
                var $li = $('<li>').attr('data-pms-key', key).css({
                    padding: '7px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f0f0f0',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: checked ? '#E6F1FB' : '',
                    userSelect: 'none'
                });
                var $chk = $('<input type="checkbox">').prop('checked', checked)
                    .css({ cursor: 'pointer', accentColor: '#378ADD', flexShrink: 0 });
                var $lbl = $('<span>').html(
                    '<div style="font-weight:500;">' + highlight(item.label, state.query) + '</div>' +
                    (item.line2 ? '<div style="font-size:11px;color:#888;">' + item.line2 + '</div>' : '')
                );
                $li.append($chk).append($lbl);
                $li.data('pms-item', item);

                // Mouse hover — highlight row (unless keyboard is active)
                $li.on('mousemove', function () {
                    if (state.mouseBlock) return;
                    var pos = $items().index(this);
                    setActive(pos);
                });

                // Click / tap
                $li.on('mousedown', function (e) {
                    e.preventDefault();
                    toggleItem(item, $chk, $li);
                });

                $list().append($li);
            });

            state.page++;
            state.loaded += slice.length;
            state.hasMore = (state.page * pageSize) < state.filtered.length;
            state.loading = false;
            $('#' + spinId).hide();
            updateStatus();

            if (typeof afterLoad === 'function') afterLoad();
        }, 0);
    }

    function itemKey(item) {
        return item.value !== undefined ? String(item.value) : item.label;
    }

    // ── Reset / filter list ────────────────────────────────────────────────
    function reset(query, thenOpen) {
        state.query = query;
        state.page = 0;
        state.loaded = 0;
        state.hasMore = true;
        state.loading = false;
        state.activeIdx = -1;

        state.filtered = query
            ? fullData.filter(function (d) {
                var q = query.toLowerCase();
                return (d.label && d.label.toLowerCase().indexOf(q) > -1) ||
                    (d.code && d.code.toLowerCase().indexOf(q) > -1);
            })
            : fullData.slice();

        state.hasMore = state.filtered.length > 0;
        $list().empty();

        if (!state.filtered.length) {
            $list().append($('<li>').css({ padding: '10px 12px', color: '#aaa' }).text('No results found'));
            $('#' + statId).text('0 results');
            $('#pms_toprow_' + inputId).text('Total: 0 item(s)');
            if (thenOpen) openDropdown();
            return;
        }

        loadNext(function () {
            if (thenOpen) openDropdown();
        });
    }

    // ── Toggle selection on an item ────────────────────────────────────────
    function toggleItem(item, $chk, $li, force) {
        var key = itemKey(item);
        var select = (force !== undefined) ? force : !selectedMap[key];
        if (select) {
            selectedMap[key] = item;
            $chk && $chk.prop('checked', true);
            $li && $li.css('background', '#E6F1FB');
            renderChip(item);
        } else {
            delete selectedMap[key];
            $chk && $chk.prop('checked', false);
            $li && $li.css('background',
                state.activeIdx === $items().index($li && $li[0]) ? '#c8e0f7' : '');
            removeChip(key);
        }
        onSelect(Object.values(selectedMap));
    }

    // ── Sync all visible checkboxes / backgrounds with selectedMap ─────────
    function syncVisibleList() {
        $items().each(function () {
            var key = $(this).attr('data-pms-key');
            var sel = !!selectedMap[key];
            $(this).find('input[type=checkbox]').prop('checked', sel);
            $(this).css('background', sel ? '#E6F1FB' : '');
        });
        state.activeIdx = -1;
    }

    // ── Chips INSIDE the wrapper ───────────────────────────────────────────
    function renderChip(item) {
        var key = itemKey(item);
        if ($wrap.find('[data-pms-key="' + key + '"]').length) return;

        var $chip = $('<span title="' + item.label + '" data-pms-key="' + key + '">').css({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            background: '#E6F1FB',
            border: '1px solid #378ADD',
            borderRadius: '10px',
            padding: '2px 7px',
            fontSize: '11px',
            color: '#185FA5',
            whiteSpace: 'nowrap',
            maxWidth: '160px',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
        });

        var $label = $('<span>').text(item.label).css({ overflow: 'hidden', textOverflow: 'ellipsis' });

        var $x = $('<span>').html('&times;').css({
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            lineHeight: '1',
            color: '#185FA5',
            flexShrink: 0
        }).on('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();
            delete selectedMap[key];
            removeChip(key);
            syncVisibleList();
            onSelect(Object.values(selectedMap));
        });

        $chip.append($label).append($x);
        // Insert before the cursor element
        $cursor.before($chip);
    }

    function removeChip(key) {
        $wrap.find('[data-pms-key="' + key + '"]').remove();
    }

    // ── Open / close ───────────────────────────────────────────────────────
    function openDropdown() {
        positionDropdown();
        $dropdown.show();
        syncVisibleList();
        $('#' + searchId).focus();
    }

    function closeDropdown() {
        $dropdown.hide();
        state.activeIdx = -1;
        wrapBlur();
    }

    // ── Select All / Remove All buttons ───────────────────────────────────
    $('#' + dropId + '_selall').on('mousedown', function (e) {
        e.preventDefault();
        state.filtered.forEach(function (item) {
            var key = itemKey(item);
            if (!selectedMap[key]) { selectedMap[key] = item; renderChip(item); }
        });
        syncVisibleList();
        onSelect(Object.values(selectedMap));
        closeDropdown();
    });

    $('#' + dropId + '_remall').on('mousedown', function (e) {
        e.preventDefault();
        state.filtered.forEach(function (item) {
            var key = itemKey(item);
            delete selectedMap[key];
            removeChip(key);
        });
        syncVisibleList();
        onSelect(Object.values(selectedMap));
        closeDropdown();
    });

    // ── Infinite scroll inside the list ───────────────────────────────────
    $('#' + listId).on('scroll', function () {
        if (this.scrollTop + this.clientHeight >= this.scrollHeight - 40) loadNext();
    });

    // Stop mouse block when mouse actually moves (keyboard was used before)
    $(document).off('mousemove.pms_' + inputId)
        .on('mousemove.pms_' + inputId, function () { state.mouseBlock = false; });

    // ── Keyboard navigation on the SEARCH box ─────────────────────────────
    //   ArrowDown / ArrowUp → move highlight
    //   Enter               → toggle highlighted item
    //   Escape              → close
    $(document).off('keydown.pms_' + inputId)
        .on('keydown.pms_' + inputId, '#' + searchId, function (e) {

            var isOpen = $dropdown.is(':visible');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                state.mouseBlock = true;
                if (!isOpen) return;
                var total = $items().length;
                var next = state.activeIdx + 1;
                if (next < total) {
                    setActive(next);
                } else if (state.hasMore && !state.loading) {
                    loadNext(function () { setActive(next); });
                }
                return;
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                state.mouseBlock = true;
                if (!isOpen) return;
                if (state.activeIdx <= 0) {
                    // Clear highlight and let user edit search
                    $items().each(function () {
                        var sel = !!selectedMap[$(this).attr('data-pms-key')];
                        $(this).css('background', sel ? '#E6F1FB' : '');
                    });
                    state.activeIdx = -1;
                } else {
                    setActive(state.activeIdx - 1);
                }
                return;
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                if (!isOpen || state.activeIdx < 0) return;
                var $el = $items().eq(state.activeIdx);
                if ($el.length) {
                    var item = $el.data('pms-item');
                    var $chk = $el.find('input[type=checkbox]');
                    toggleItem(item, $chk, $el);
                    // Keep highlight on same row after toggle
                    setActive(state.activeIdx);
                }
                return;
            }

            if (e.key === 'Escape') {
                closeDropdown();
                $wrap.focus();
            }
        });

    // ── Also allow ArrowDown to open the list from the wrapper itself ──────
    $wrap.on('keydown.pms', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!$dropdown.is(':visible')) {
                reset($('#' + searchId).val().trim() || '', true);
            }
        }
        if (e.key === 'Escape') closeDropdown();
    });

    // ── Search input typing ────────────────────────────────────────────────
    var debounce;
    $(document).off('input.pms_' + inputId).on('input.pms_' + inputId, '#' + searchId, function () {
        clearTimeout(debounce);
        var q = $(this).val().trim();
        debounce = setTimeout(function () { reset(q, false); }, 200);
    });

    // ── Wrapper click → open dropdown ─────────────────────────────────────
    $wrap.on('click.pms', function (e) {
        // If user clicked the × on a chip, don't re-open
        if ($(e.target).closest('[data-pms-key]').length &&
            $(e.target).is('span') && $(e.target).html() === '×') return;
        wrapFocus();
        if ($dropdown.is(':visible')) return;
        reset($('#' + searchId).val().trim() || '', true);
    });

    $wrap.on('focus.pms', function () { wrapFocus(); });
    $wrap.on('blur.pms', function () {
        setTimeout(function () {
            if (!$(document.activeElement).closest('#' + dropId).length &&
                !$(document.activeElement).is($wrap)) {
                closeDropdown();
            }
        }, 200);
    });

    // Blur search box → close (with delay so clicks inside dropdown register)
    $(document).off('blur.pms_' + inputId).on('blur.pms_' + inputId, '#' + searchId, function () {
        setTimeout(function () {
            if (!$(document.activeElement).closest('#' + dropId).length &&
                !$(document.activeElement).is($wrap)) {
                closeDropdown();
            }
        }, 200);
    });

    // Click outside → close
    $(document).off('click.pms_' + inputId)
        .on('click.pms_' + inputId, function (e) {
            if (!$(e.target).closest('#' + dropId + ', #' + wrapId).length) {
                closeDropdown();
            }
        });

    // ── Public API ─────────────────────────────────────────────────────────
    var api = {
        getSelected: function () { return Object.values(selectedMap); },
        updateData: function (newData) { fullData = newData; reset(state.query, false); },
        destroy: function () {
            var ns = '.pms_' + inputId;
            $wrap.off('.pms');
            $dropdown.remove();
            $wrap.remove();
            $input.css({ position: '', opacity: '', pointerEvents: '', width: '', height: '', padding: '', border: '' });
            $(document).off('click' + ns).off('input' + ns).off('keydown' + ns)
                .off('blur' + ns).off('mousemove' + ns);
            $(window).off('scroll' + ns + ' resize' + ns);
            $input.parents().each(function () { $(this).off('scroll' + ns); });
            delete window._PMS_Registry[inputId];
        }
    };

    window._PMS_Registry[inputId] = api;
    return api;
}
