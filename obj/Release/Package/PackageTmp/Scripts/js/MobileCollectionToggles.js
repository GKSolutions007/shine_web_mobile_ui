function toggleCustomerCard() {
    const body = document.getElementById('customerInfoBody');
    const icon = document.getElementById('icoToggleCustomer');

    if (body.classList.contains('collapsed')) {
        body.classList.remove('collapsed');
        icon.classList.remove('bi-plus-lg');
        icon.classList.add('bi-dash-lg');
    } else {
        body.classList.add('collapsed');
        icon.classList.remove('bi-dash-lg');
        icon.classList.add('bi-plus-lg');
    }
}

function toggleNotesCard() {
    const body = document.getElementById('notesBody');
    const icon = document.getElementById('icoToggleNotes');

    if (body.classList.contains('collapsed')) {
        body.classList.remove('collapsed');
        icon.classList.remove('bi-plus-lg');
        icon.classList.add('bi-dash-lg');
    } else {
        body.classList.add('collapsed');
        icon.classList.remove('bi-dash-lg');
        icon.classList.add('bi-plus-lg');
    }
}
