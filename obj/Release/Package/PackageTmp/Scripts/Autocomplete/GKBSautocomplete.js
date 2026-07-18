function PaginatedAutocomplete(options) {

    var inputId = options.inputId;
    var fullData = options.data || [];
    var pageSize = 20;// options.pageSize || 50;
    var onSelect = options.onSelect || function () { };

    var dropId = "pac_drop_" + inputId;
    var listId = "pac_list_" + inputId;
    var statId = "pac_stat_" + inputId;
    var spinId = "pac_spin_" + inputId;

    var $input = $("#" + inputId);
    $("#" + dropId).remove();

    var $GKBSdropdown = $([
        '<div class="gkbsautocomplete" id="' + dropId + '" style="',
        'display:none;position:fixed;z-index:99999;',   /* ← fixed, not absolute */
        'background-color:white;border:1px solid #ccc;',
        'border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.2);',
        'min-width:300px;width:350px;',                                  /* set a sensible fixed width */
        'max-height:340px;overflow:hidden;">',
        '<ul id="' + listId + '" style="',
        'list-style:none;margin:0;padding:0;',
        'max-height:280px;overflow-y:auto;color:var(--acitemname)"></ul>',
        '<div style="',
        'padding:6px 12px;font-size:12px;color:#888;',
        'border-top:1px solid #eee;background:#fafafa;',
        'display:flex;justify-content:space-between;">',
        '<span id="' + statId + '">Showing 0 items</span>',
        '<span id="' + spinId + '" style="display:none;color:#378ADD;">Loading…</span>',
        '</div>',
        '</div>'
    ].join(''));

    // ── Append to BODY, not after input ────────────────────────────────────
    $("body").append($GKBSdropdown);

    // ── Position dropdown using getBoundingClientRect (works inside tables) ─

    function positionDropdown() {
        var rect = $input[0].getBoundingClientRect();

        // Check if dropdown goes below viewport, if so show it ABOVE the input
        var dropHeight = 340;
        var spaceBelow = window.innerHeight - rect.bottom;
        var showAbove = spaceBelow < dropHeight && rect.top > dropHeight;

        $GKBSdropdown.css({
            position: "fixed",                          // ← fixed to viewport, ignore all scroll
            top: showAbove
                ? (rect.top - dropHeight) + "px"   // flip above input
                : rect.bottom + "px",               // normal below input
            left: rect.left + "px",                // no scrollX needed with fixed
            width: rect.width + "px",
            zIndex: 99999
        });
    }
    // ── Reposition on ANY scroll or resize ─────────────────────────────────
    function bindRepositionEvents() {
        var ns = ".pac_" + inputId;

        // Unbind old listeners first
        $(window).off("scroll" + ns + " resize" + ns);
        $(document).off("scroll" + ns);

        // Window scroll + resize
        $(window).on("scroll" + ns + " resize" + ns, function () {
            if ($GKBSdropdown.is(":visible")) positionDropdown();
            else closeDropdown();
        });

        // Every scrollable ancestor of the input (covers form scroll, 
        // datatable scroll body, modal scroll, etc.)
        $input.parents().each(function () {
            var el = this;
            var overflow = $(el).css("overflow") + $(el).css("overflow-y");
            if (/auto|scroll|hidden/.test(overflow)) {
                $(el).off("scroll" + ns).on("scroll" + ns, function () {
                    if ($GKBSdropdown.is(":visible")) positionDropdown();
                });
            }
        });
    }
    var state = {
        page: 0,
        query: '',
        filtered: [],
        loaded: 0,
        loading: false,
        hasMore: true,
        activeIdx: -1,
        mouseBlock: false
    };

    function $list() { return $("#" + listId); }
    function $items() { return $("#" + listId).find("li"); }

    function highlight(text, q) {
        if (!q) return text;
        var esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp('(' + esc + ')', 'gi'),
            '<mark style="background:#ddeeff;color:#185FA5;padding:0 2px;border-radius:2px;font-weight:normal;">$1</mark>');
    }

    function scrollIntoView(el) {
        if (!el) return;
        var listDom = document.getElementById(listId);
        var listRect = listDom.getBoundingClientRect();
        var elRect = el.getBoundingClientRect();
        if (elRect.bottom > listRect.bottom) {
            listDom.scrollTop += elRect.bottom - listRect.bottom;
        } else if (elRect.top < listRect.top) {
            listDom.scrollTop -= listRect.top - elRect.top;
        }
    }

    function setActive(idx) {
        var $els = $items();
        if (!$els.length) return;
        idx = Math.max(-1, Math.min(idx, $els.length - 1));
        $els.each(function (i) {
            $(this).css("background", i === idx ? "#E6F1FB" : "");
        });
        state.activeIdx = idx;
        if (idx >= 0) {
            scrollIntoView($els.get(idx));
        }
    }

    function updateStatus() {
        $("#" + statId).text(
            state.hasMore
                ? "Showing " + state.loaded + " of " + state.filtered.length
                : "All " + state.filtered.length + " results shown"
        );
    }

    function loadNext(afterLoad) {
        if (state.loading || !state.hasMore) {
            if (typeof afterLoad === "function" && !state.hasMore) afterLoad();
            return;
        }
        state.loading = true;
        $("#" + spinId).show();

        setTimeout(function () {
            var slice = state.filtered.slice(
                state.page * pageSize,
                (state.page + 1) * pageSize
            );

            slice.forEach(function (item) {
                var $li = $("<li>").css({
                    padding: "2px 5px",
                    cursor: "pointer",
                    borderBottom: "1px solid #666565",
                    fontSize: "11px"
                }).html(
                    '<div style="font-weight:500;">' + highlight(item.label, state.query) + '</div>' +
                    '<div style="font-size:12px;color:var(--acitemdesc);margin-top:2px;">' + (item.line2 || '') + '</div>'
                );

                $li.on("mousemove", function () {
                    if (state.mouseBlock) return;
                    var pos = $items().index(this);
                    $items().css("background", "");
                    $(this).css("background", "#E6F1FB");
                    state.activeIdx = pos;
                });

                $li.on("mousedown", function (e) {
                    e.preventDefault();
                    selectItem(item);
                });

                $list().append($li);
            });

            state.page++;
            state.loaded += slice.length;
            state.hasMore = (state.page * pageSize) < state.filtered.length;
            state.loading = false;
            $("#" + spinId).hide();
            updateStatus();

            if (typeof afterLoad === "function") afterLoad();
        }, 0);
    }

    function reset(query) {
        state.query = query;
        state.page = 0;
        state.loaded = 0;
        state.activeIdx = -1;
        state.hasMore = true;
        state.loading = false;
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
            $list().append(
                $("<li>").css({ padding: "10px 12px", color: "#aaa" }).text("No results found")
            );
            $("#" + statId).text("0 results");
            return;
        }
        //loadNext();
        // ← pass callback: after first page renders, highlight item 0
        loadNext(function () {
            setActive(0);
        });
    }

    function selectItem(item) {
        $input.val(item.code || item.label);
        $GKBSdropdown.hide();
        state.activeIdx = -1;
        onSelect(item);
    }

    function openDropdown() {
        positionDropdown();       // ← recalculate position every time it opens
        $GKBSdropdown.show();
    }

    function closeDropdown() {
        $GKBSdropdown.hide();
        state.activeIdx = -1;
    }

    //// ── Reposition if window scrolls or resizes ─────────────────────────────
    //$(window).off("scroll.pac_" + inputId + " resize.pac_" + inputId)
    //    .on("scroll.pac_" + inputId + " resize.pac_" + inputId, function () {
    //        if ($GKBSdropdown.is(":visible")) positionDropdown();
    //    });

    //// ── Also reposition when DataTable scrolls ──────────────────────────────
    //$(".dataTables_scrollBody, .dataTables_wrapper")
    //    .off("scroll.pac_" + inputId)
    //    .on("scroll.pac_" + inputId, function () {
    //        if ($GKBSdropdown.is(":visible")) positionDropdown();
    //    });
    // ── Replace with single call ────────────────────────────────────────────
    bindRepositionEvents();
    // ── Scroll list → load more ─────────────────────────────────────────────
    $("#" + listId).on("scroll", function () {
        if (this.scrollTop + this.clientHeight >= this.scrollHeight - 40) {
            loadNext();
        }
    });

    // ── Keyboard ────────────────────────────────────────────────────────────
    $input.off("keydown.pac").on("keydown.pac", function (e) {
        var isOpen = $GKBSdropdown.is(":visible");

        if (e.key === "ArrowDown") {
            e.preventDefault();
            state.mouseBlock = true;
            if (!isOpen) { reset(""); openDropdown(); return; }
            var total = $items().length;
            var next = state.activeIdx + 1;
            if (next < total) {
                setActive(next);
            } else if (state.hasMore && !state.loading) {
                loadNext(function () { setActive(next); });
            }
            return;
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            state.mouseBlock = true;
            if (!isOpen) return;
            if (state.activeIdx <= 0) {
                $items().css("background", "");
                state.activeIdx = -1;
            } else {
                setActive(state.activeIdx - 1);
            }
            return;
        }

        if (e.key === "Enter") {
            e.preventDefault();
            if (isOpen && state.activeIdx >= 0) {
                var el = $items().get(state.activeIdx);
                if (el) $(el).trigger("mousedown");
            }
            return;
        }

        if (e.key === "Escape") {
            closeDropdown();
        }
    });

    $(document).off("mousemove.pac_" + inputId)
        .on("mousemove.pac_" + inputId, function () {
            state.mouseBlock = false;
        });

    var debounce;
    $input.off("input.pac focus.pac blur.pac");

    $input.on("input.pac", function () {
        clearTimeout(debounce);
        debounce = setTimeout(function () {
            reset($input.val().trim());
            openDropdown();
        }, 200);
    });

    $input.on("focus.pac", function () {
        if (!$input.val()) reset("");
        //openDropdown();
    });

    $input.on("blur.pac", function () {
        setTimeout(function () { closeDropdown(); }, 180);
    });

    $(document).off("click.pac_" + inputId)
        .on("click.pac_" + inputId, function (e) {
            if (!$(e.target).closest("#" + dropId + ", #" + inputId).length) {
                closeDropdown();
            }
        });

    return {
        updateData: function (newData) {
            fullData = newData;
            reset($input.val().trim());
        },
        destroy: function () {
            var ns = ".pac_" + inputId;
            $input.off(".pac");
            $GKBSdropdown.remove();
            $(document).off("click" + ns);
            $(document).off("mousemove" + ns);
            $(window).off("scroll" + ns);
            $(window).off("resize" + ns);
            // clean ancestor scroll listeners
            $input.parents().each(function () {
                $(this).off("scroll" + ns);
            });
        }
    };
}