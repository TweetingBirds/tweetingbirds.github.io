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

    setUpWalker();
})();

// The bird in the contact section walks back and forth along the path,
// turning around at each edge. When the cursor or a tap comes close it hops
// away, and if it's backed into an edge it jumps over to the other side.
function setUpWalker() {
    var section = document.querySelector('.contact');
    var walker = section && section.querySelector('.walker');
    if (!walker) return;

    var face = walker.querySelector('.walker-face');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    var BIRD = 64;          // matches .walker width
    var EDGE = 10;          // gap kept from each screen edge
    var WALK_SPEED = 45;    // px per second
    var SCARE_RADIUS = 130; // how close the pointer can get, in px
    var CORNERED = 90;      // less room than this means "backed into an edge"

    var x = 0;
    var dir = 1;
    var speed = WALK_SPEED;
    var hop = null;
    var restUntil = 0;
    var lastTime = 0;
    var frame = 0;
    var onScreen = false;

    function maxX() {
        return Math.max(EDGE, section.clientWidth - BIRD - EDGE);
    }

    function setState(name) {
        walker.classList.toggle('walking', name === 'walking');
        walker.classList.toggle('pecking', name === 'pecking');
        walker.classList.toggle('hopping', name === 'hopping');
    }

    function draw(lift) {
        walker.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + (-lift).toFixed(1) + 'px)';
        face.style.transform = dir < 0 ? 'scaleX(-1)' : '';
    }

    function startHop(direction, distance, height, duration) {
        dir = direction;
        hop = { t: 0, duration: duration, height: height, vx: direction * distance / duration };
        restUntil = 0;
        setState('hopping');
    }

    function step(now) {
        var dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0;
        lastTime = now;
        var lift = 0;
        var right = maxX();

        if (hop) {
            hop.t += dt;
            var progress = Math.min(1, hop.t / hop.duration);
            x += hop.vx * dt;
            lift = Math.sin(Math.PI * progress) * hop.height;
            if (progress >= 1) hop = null;
        } else if (now < restUntil) {
            setState('pecking');
        } else {
            // After a scare it scurries, then eases back to a stroll.
            speed += (WALK_SPEED - speed) * Math.min(1, dt * 1.5);
            x += dir * speed * dt;
            setState('walking');
            if (Math.random() < dt * 0.06) restUntil = now + 900 + Math.random() * 1500;
        }

        if (x <= EDGE) {
            x = EDGE;
            dir = 1;
            if (hop) hop.vx = Math.abs(hop.vx);
        } else if (x >= right) {
            x = right;
            dir = -1;
            if (hop) hop.vx = -Math.abs(hop.vx);
        }

        draw(lift);
        frame = onScreen && !reduceMotion.matches ? requestAnimationFrame(step) : 0;
    }

    function start() {
        if (frame || !onScreen || reduceMotion.matches) return;
        lastTime = 0;
        frame = requestAnimationFrame(step);
    }

    function scare(clientX, clientY) {
        if (hop || reduceMotion.matches) return;
        var box = walker.getBoundingClientRect();
        var dx = box.left + box.width / 2 - clientX;
        var dy = box.top + box.height / 2 - clientY;
        if (Math.hypot(dx, dy) > SCARE_RADIUS) return;

        var away = dx >= 0 ? 1 : -1;
        var right = maxX();
        var room = away > 0 ? right - x : x - EDGE;

        if (room < CORNERED) {
            // Backed into an edge: jump over the pointer to the open side.
            var across = Math.min(260, away > 0 ? x - EDGE : right - x);
            startHop(-away, across, 95, 0.75);
        } else {
            startHop(away, Math.min(room, 110), 34, 0.38);
        }
        speed = 170;
        start();
    }

    section.addEventListener('pointermove', function (event) {
        if (event.pointerType === 'mouse' || event.pointerType === 'pen') scare(event.clientX, event.clientY);
    });
    section.addEventListener('pointerdown', function (event) {
        scare(event.clientX, event.clientY);
    });

    x = EDGE + Math.random() * (maxX() - EDGE);
    dir = Math.random() < 0.5 ? -1 : 1;
    draw(0);

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            onScreen = entries[0].isIntersecting;
            start();
        }).observe(section);
    } else {
        onScreen = true;
        start();
    }

    reduceMotion.addEventListener('change', start);
    window.addEventListener('resize', function () {
        x = Math.min(x, maxX());
        draw(0);
    });
}
