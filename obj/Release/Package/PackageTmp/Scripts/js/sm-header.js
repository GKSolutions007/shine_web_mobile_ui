/*
 * sm-header.js
 * Gives every form under the "Master" menu the same page header as Bank Account:
 *
 *     ┃ [icon]  Master
 *     ┃         <Form name>
 *
 * Which menu a page belongs to comes from the real menu data: _LayoutBT5 looks the current
 * controller up in Session["dtPermission"] (LocationName) and its parent in Session["dtParent"]
 * and exposes it as window.smPage = { controller, menuGroup }.
 *
 * The page's own #MainHeading / #FormHead element is MOVED into the card (never recreated), so
 * scripts that read its text (modal titles etc.) keep working. Styles live in app-theme.css
 * (.sm-inline-bar / .sm-header-card / .sm-header-icon / .sm-header-sub).
 *
 * Opt out on a page by adding data-sm-header="off" to the heading or any ancestor.
 */
(function ($) {
    'use strict';
    if (!$) return;

    var SUBTITLE = 'Master';
    var DEFAULT_ICON = 'fa-layer-group';

    // Per-controller icons (Font Awesome 6 solid). Unlisted controllers keep their current
    // page-specific icon, or get DEFAULT_ICON when they had none / the generic "fa-tag".
    var CONTROLLER_ICONS = {
        bankaccount: 'fa-bank',
        branchoffice: 'fa-warehouse',
        customermaster: 'fa-users',
        vendormaster: 'fa-user-circle',
        productmaster: 'fa-boxes-stacked',
        salesmanmaster: 'fa-user-tie',
        servicemaster: 'fa-screwdriver-wrench',
        vehiclemaster: 'fa-truck',
        taxmaster: 'fa-percent',
        taxmasternew: 'fa-percent',
        taxcompgift: 'fa-percent',
        financialaccount: 'fa-book',
        financialaccountgroup: 'fa-folder-tree',
        faopening: 'fa-scale-balanced',
        chequebook: 'fa-money-check',
        users: 'fa-user-gear',
        maprole: 'fa-user-shield',
        updateproductlocation: 'fa-location-dot',
        updatelocationinproduct: 'fa-location-dot',
        documentseries: 'fa-list-ol',
        discountscheme: 'fa-gift',
        discountschemenew: 'fa-gift',
        branchmapping: 'fa-sitemap',
        manufacturermapping: 'fa-industry',
        printprofileconfig: 'fa-print',
        barcodrprofileconfig: 'fa-barcode',
        OtherPayColl: 'fa-money-bill-transfer'
    };

    // SingleMaster serves many simple masters from one controller: pick by form name.
    var NAME_ICONS = [
        [/brand/i, 'fa-copyright'],
        [/categor/i, 'fa-sitemap'],
        [/\buom\b|unit/i, 'fa-ruler'],
        [/bank/i, 'fa-bank'],
        [/mail/i, 'fa-envelope'],
        [/period/i, 'fa-calendar'],
        [/reason/i, 'fa-edit'],
        [/return t/i, 'fa-reply-all'],
        [/role/i, 'fa-user-circle'],
        [/secondary/i, 'fa-tags'],
        [/discount/i, 'fa-gift'],
        [/route|beat|area|zone|territor/i, 'fa-route'],
        [/state|city|countr|district|location/i, 'fa-location-dot'],
        [/colou?r/i, 'fa-palette'],
        [/size/i, 'fa-up-right-and-down-left-from-center'],
        [/hsn|tax|gst/i, 'fa-percent'],
        [/group/i, 'fa-object-group'],
        [/manufactur|company/i, 'fa-industry'],
        [/rack|godown|warehouse|store/i, 'fa-warehouse'],
        [/expense/i, 'fa-wallet'],
        [/other/i, 'fa-money-bill-transfer']
    ];

    function isMasterGroup(name) { return /^\s*masters?\b/i.test(name || ''); }

    function pickIcon(controller, formName) {
        var key = (controller || '').toLowerCase();
        if (key === 'singlemaster') {
            for (var i = 0; i < NAME_ICONS.length; i++) {
                if (NAME_ICONS[i][0].test(formName)) return NAME_ICONS[i][1];
            }
            return DEFAULT_ICON;
        }
        return CONTROLLER_ICONS[key] || null;
    }

    /** The page heading: first #MainHeading / #FormHead that is not inside a modal. */
    function findHeading() {
        var list = $('[id="MainHeading"], [id="FormHead"]').filter(function () {
            return !$(this).closest('.modal, [data-sm-header="off"]').length;
        });
        return list.length ? list[0] : null;
    }

    /** Text of `el` ignoring the heading itself, icons, breadcrumbs, rules, scripts. */
    function extraText(el, heading) {
        var $c = $(el).clone();
        $c.find('[id="' + heading.id + '"], i, .app-toolbar-crumb, .sm-header-sub, hr, script, style, label[hidden]').remove();
        return $.trim($c.text());
    }

    /**
     * Largest ancestor of the heading that holds nothing else of value (no controls, no
     * other text). That whole block is replaced by the card. Stops at containers with an id,
     * at <body> and at the layout's RenderBody wrapper.
     */
    function headerUnit(h) {
        var n = h;
        while (n.parentElement) {
            var p = n.parentElement;
            if (p === document.body || p.id || p.tagName === 'FORM' || p.tagName === 'TD' || p.tagName === 'TR') break;
            if ($(p).find('input:not([type=hidden]),select,textarea,button,a.btn,table,.modal').length) break;
            if (extraText(p, h) !== '') break;
            n = p;
        }
        return n;
    }

    function setIcon($card, icon) {
        var $box = $card.find('.sm-header-icon');
        if (!$box.length) {
            $box = $('<div class="sm-header-icon" aria-hidden="true"></div>');
            $card.prepend($box);
        }
        var $i = $box.find('i');
        var generic = !$i.length || /\bfa-tag\b/.test($i.attr('class') || '');
        if (icon) {
            // A mapped icon wins so all Master pages are consistent.
            $box.empty().append($('<i class="fas"></i>').addClass(icon));
        } else if (generic) {
            $box.empty().append($('<i class="fas"></i>').addClass(DEFAULT_ICON));
        }
        $box.attr('aria-hidden', 'true');
    }

    function ensureInline($card) {
        $card.addClass('sm-header-inline');
        if (!$card.parent().hasClass('sm-inline-bar')) {
            $card.wrap('<div class="sm-inline-bar"></div>');
        }
    }

    /** Heading already inside an sm-header-card: normalise it to the Bank Account look. */
    function normaliseCard($card, h, icon) {
        var $text = $card.find('.sm-header-text');
        if (!$text.length) {
            $text = $('<div class="sm-header-text"></div>');
            $(h).after($text);
            $text.append(h);
        }
        var $sub = $text.find('.sm-header-sub');
        if (!$sub.length) $sub = $('<div class="sm-header-sub"></div>');
        $sub.text(SUBTITLE);
        $text.prepend($sub);          // subtitle ABOVE the form name
        $text.append(h);
        setIcon($card, icon);
        ensureInline($card);
    }

    /** Page without a card: replace its old heading block with a new card. */
    function buildCard(h, icon) {
        var unit = headerUnit(h);
        var $card = $(
            '<div class="sm-header-card sm-header-inline">' +
            '  <div class="sm-header-icon" aria-hidden="true"></div>' +
            '  <div class="sm-header-text"><div class="sm-header-sub"></div></div>' +
            '</div>');
        $card.find('.sm-header-sub').text(SUBTITLE);
        $card.find('.sm-header-icon').append($('<i class="fas"></i>').addClass(icon || DEFAULT_ICON));

        var $bar = $('<div class="sm-inline-bar"></div>').append($card);
        $(unit).before($bar);

        // An <hr> right after the old heading block was its underline; the card replaces it.
        var next = unit.nextElementSibling;
        if (unit === h && next && next.tagName === 'HR') $(next).remove();

        // Move (not clone) the heading; strip the old inline sizing so the card style applies.
        h.style.fontSize = ''; h.style.paddingTop = ''; h.style.marginBottom = '';
        $(h).removeClass('mb-0');
        $card.find('.sm-header-text').append(h);

        if (unit !== h) {
            var after = unit.nextElementSibling;
            $(unit).remove();
            if (after && after.tagName === 'HR') $(after).remove();
        }
    }

    $(function () {
        try {
            var page = window.smPage || {};
            var h = findHeading();
            if (!h) return;

            var master;
            if (page.menuGroup) {
                master = isMasterGroup(page.menuGroup);
            } else {
                // Menu lookup unavailable (e.g. page opened outside the menu): fall back to the
                // page's own "Masters ›" breadcrumb or "Master" subtitle.
                master = /masters?\s*\u203a/i.test($('.app-toolbar-crumb').text()) ||
                    isMasterGroup($(h).closest('.sm-header-card').find('.sm-header-sub').text());
            }
            if (!master) return;

            var icon = pickIcon(page.controller, $.trim($(h).text()));
            var $card = $(h).closest('.sm-header-card');
            if ($card.length) normaliseCard($card, h, icon);
            else buildCard(h, icon);
        } catch (e) {
            if (window.console) console.error('sm-header:', e);
        }
    });
})(window.jQuery);
