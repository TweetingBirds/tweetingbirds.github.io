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

    markSeason();
    setUpWire();
    setUpWalker();
})();

// Winter (December to February) puts scarves on the birds. Add ?season=winter
// or ?season=none to the URL to preview either look.
function markSeason() {
    var forced = new URLSearchParams(location.search).get('season');
    var month = new Date().getMonth();
    var winter = forced ? forced === 'winter' : (month === 11 || month <= 1);
    document.documentElement.classList.toggle('season-winter', winter);
}

// The birds on the hero wire. Tap a bird and it hops and says something new.
// Pluck the wire (swipe the cursor across it fast, or tap right on it) and it
// twangs like a spring; a hard pluck sends a bird or two flapping off, and
// they land back a moment later. At night the birds sleep; tapping one wakes
// it for a moment.
function setUpWire() {
    var scene = document.querySelector('.wire-scene');
    if (!scene) return;

    var path = scene.querySelector('.wire path');
    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    // The wire is a quadratic curve in a 1000×230 viewBox stretched to the scene:
    // from (-10, 120) to (1010, 120), pulled down by a control point at (500, REST).
    var END_Y = 120;
    var REST = 210;
    var FEET = 0.95;        // where the feet sit in the bird drawing, as a share of its height
    var STIFFNESS = 170;
    var DAMPING = 3.5;

    var DAY_LINES = [
        'Hire us!', 'Tweet tweet!', 'Have you tried SwiftUI?', 'We ship on Fridays (carefully)',
        'Placemoir is out! 🗺️', 'Quips keeps your quotes ✍️', 'App Bird is open source 🦉',
        'Got an app idea?', 'Rails ♥', 'Swift!', 'Ship it 🚀', 'CloudKit keeps it in sync ☁️',
        'Hi there 👋', 'Say hi below ⬇️'
    ];
    var NIGHT_LINES = [
        'Zzz… oh, hi!', 'Five more minutes…', 'Past my bedtime 🌙', 'Shh, the others are asleep',
        'Dreaming in Swift…', 'Still shipping at this hour? 🦉', 'Is it morning yet?'
    ];

    var sag = 0;            // how far the control point is pulled from REST
    var sagSpeed = 0;
    var frame = 0;
    var lastTime = 0;
    var lastPointer = null;

    var birds = Array.prototype.map.call(scene.querySelectorAll('.perch'), function (el) {
        var bubble = el.querySelector('.tweet');
        return {
            el: el,
            xPercent: parseFloat(el.getAttribute('data-x')) || 0,
            bubble: bubble,
            originalText: bubble ? bubble.textContent : null,
            motion: null,
            restTop: 0,
            share: 0,       // how much of the wire's sag reaches this bird (0 at the posts, 0.5 mid-wire)
            lastLine: '',
            timer: 0
        };
    });

    function isNight() {
        var theme = root.getAttribute('data-theme');
        return theme ? theme === 'dark' : prefersDark.matches;
    }

    function wireYAt(t, control) {
        return (1 - t) * (1 - t) * END_Y + 2 * (1 - t) * t * control + t * t * END_Y;
    }

    function tAtPixel(px, width) {
        return (px / width * 1000 + 10) / 1020;
    }

    // Sit every bird exactly on the wire.
    function layout() {
        var width = scene.clientWidth;
        birds.forEach(function (bird) {
            var size = bird.el.offsetWidth;
            var t = tAtPixel(bird.xPercent / 100 * width + size / 2, width);
            bird.share = 2 * (1 - t) * t;
            bird.restTop = wireYAt(t, REST) - size * FEET;
            bird.el.style.top = bird.restTop.toFixed(1) + 'px';
        });
    }

    function animating() {
        return Math.abs(sag) > 0.05 || Math.abs(sagSpeed) > 0.05 || birds.some(function (b) { return b.motion; });
    }

    function start() {
        if (frame) return;
        lastTime = 0;
        frame = requestAnimationFrame(step);
    }

    function step(now) {
        var dt = lastTime ? Math.min(0.033, (now - lastTime) / 1000) : 1 / 60;
        lastTime = now;

        // Damped spring for the wire.
        sagSpeed += (-STIFFNESS * sag - DAMPING * sagSpeed) * dt;
        sag = Math.max(-90, Math.min(90, sag + sagSpeed * dt));
        if (Math.abs(sag) < 0.05 && Math.abs(sagSpeed) < 0.05) { sag = 0; sagSpeed = 0; }
        path.setAttribute('d', 'M-10 120 Q 500 ' + (REST + sag).toFixed(2) + ' 1010 120');

        birds.forEach(function (bird) {
            var dx = 0;
            var lift = 0;
            var m = bird.motion;
            if (m) {
                m.t += dt;
                var p = Math.min(1, m.t / m.duration);
                if (m.kind === 'hop') {
                    lift = Math.sin(Math.PI * p) * m.height;
                } else {
                    // Fly up, flutter about, then come back down to the same spot.
                    var up = p < 0.3 ? easeOut(p / 0.3) : p > 0.72 ? 1 - easeIn((p - 0.72) / 0.28) : 1;
                    lift = up * m.height + (p > 0.3 && p < 0.72 ? Math.sin(m.t * 9) * 5 : 0);
                    dx = Math.sin(p * Math.PI) * m.drift;
                }
                if (p >= 1) {
                    bird.motion = null;
                    bird.el.classList.remove('flapping');
                }
            }
            // Birds in the air don't ride the wire.
            var y = (m && m.kind === 'fly' ? 0 : bird.share * sag) - lift;
            bird.el.style.transform = (dx || y) ? 'translate(' + dx.toFixed(1) + 'px, ' + y.toFixed(1) + 'px)' : '';
        });

        frame = animating() ? requestAnimationFrame(step) : 0;
    }

    function easeOut(x) { return 1 - (1 - x) * (1 - x); }
    function easeIn(x) { return x * x; }

    function pluck(strength, direction) {
        if (reduceMotion.matches) return;
        sagSpeed += direction * strength * 1000;
        if (strength > 0.55) {
            // A hard pluck startles one or two birds that aren't already in the air.
            var grounded = birds.filter(function (b) { return !b.motion; });
            var count = Math.min(grounded.length, strength > 0.85 ? 2 : 1);
            for (var i = 0; i < count; i++) {
                var pick = grounded.splice(Math.floor(Math.random() * grounded.length), 1)[0];
                pick.motion = {
                    kind: 'fly', t: 0, duration: 1.7 + Math.random() * 0.5,
                    height: 90 + Math.random() * 50, drift: (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 30)
                };
                pick.el.classList.add('flapping');
            }
        }
        start();
    }

    function chirp(bird) {
        var lines = isNight() ? NIGHT_LINES : DAY_LINES;
        var line;
        do { line = lines[Math.floor(Math.random() * lines.length)]; } while (line === bird.lastLine && lines.length > 1);
        bird.lastLine = line;

        if (!bird.bubble) {
            bird.bubble = document.createElement('div');
            bird.bubble.className = 'tweet';
            bird.el.insertBefore(bird.bubble, bird.el.firstChild);
        }
        bird.bubble.textContent = line;
        bird.bubble.classList.remove('chirp');
        void bird.bubble.offsetWidth; // restart the pop-in animation
        bird.bubble.classList.add('chirp');
        bird.el.classList.add('awake');

        clearTimeout(bird.timer);
        bird.timer = setTimeout(function () {
            bird.el.classList.remove('awake');
            bird.bubble.classList.remove('chirp');
            if (bird.originalText === null) {
                bird.bubble.remove();
                bird.bubble = null;
            } else {
                bird.bubble.textContent = bird.originalText;
            }
        }, 3200);

        if (!reduceMotion.matches && !bird.motion) {
            bird.motion = { kind: 'hop', t: 0, duration: 0.34, height: 18 };
            start();
        }
    }

    // Distance from a point (in scene pixels) to the wire, and which side it's on.
    function wireOffset(x, y) {
        var t = tAtPixel(x, scene.clientWidth);
        return y - wireYAt(Math.min(1, Math.max(0, t)), REST + sag);
    }

    function scenePoint(event) {
        var box = scene.getBoundingClientRect();
        return { x: event.clientX - box.left, y: event.clientY - box.top, time: event.timeStamp };
    }

    birds.forEach(function (bird) {
        bird.el.addEventListener('click', function (event) {
            event.stopPropagation();
            chirp(bird);
        });
    });

    // A cursor swiping across the wire fast enough plucks it.
    scene.addEventListener('pointermove', function (event) {
        if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
        var point = scenePoint(event);
        var side = wireOffset(point.x, point.y);
        if (lastPointer) {
            var crossed = (side > 0) !== (lastPointer.side > 0);
            var elapsed = Math.max(1, point.time - lastPointer.time);
            var speed = Math.hypot(point.x - lastPointer.x, point.y - lastPointer.y) / elapsed; // px per ms
            if (crossed && speed > 0.25) pluck(Math.min(1, speed / 2.2), side > 0 ? 1 : -1);
        }
        lastPointer = { x: point.x, y: point.y, time: point.time, side: side };
    });

    scene.addEventListener('pointerleave', function () {
        lastPointer = null;
    });

    // A tap or click right on the wire plucks it too.
    scene.addEventListener('click', function (event) {
        var point = scenePoint(event);
        if (Math.abs(wireOffset(point.x, point.y)) < 26) pluck(0.75, 1);
    });

    layout();
    window.addEventListener('resize', layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
}

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
