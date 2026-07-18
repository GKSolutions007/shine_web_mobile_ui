let countDown = document.getElementById("loader");
let load = 0;
let loading = setInterval(function () {
    load = load + Math.floor(Math.random() * 5);
    if (load < 100) {
        countDown.textContent = load + "%";
    } else {
        load = 100;
        countDown.textContent = 100 + "%";
    }
}, 100);

function reload() {
    load = 0;
}
