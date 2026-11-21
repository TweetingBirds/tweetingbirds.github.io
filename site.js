// Shared behavior for every page: footer year, theme toggle, mobile menu.

(function () {
    var root = document.documentElement;

    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    var themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            var current = root.getAttribute('data-theme');
            var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            var isDark = current ? current === 'dark' : prefersDark;
            var next = isDark ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        });
    }

    var navToggle = document.querySelector('.nav-toggle');
    var navMenu = document.querySelector('.nav-menu');
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function () {
            var open = navMenu.classList.toggle('active');
            navToggle.classList.toggle('active', open);
            navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        navMenu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }
})();
