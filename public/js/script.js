var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
});
document.getElementById('ip-search-btn').addEventListener('click', function(){
    var ip = document.getElementById('ip-search').value;
    if (ip) {
        window.location = '/ip/' + ip;
    }
    return false;
});
