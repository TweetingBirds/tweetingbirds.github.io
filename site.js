// Shared behavior for every page: footer year, theme toggle, mobile menu,
// and (on the home page) the birds and their seasons. Everything starts from
// main(), called at the bottom of this file once all the constants are defined.

function main() {
    var root = document.documentElement;
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    function updateNight() {
        var theme = root.getAttribute('data-theme');
        root.classList.toggle('night', theme ? theme === 'dark' : prefersDark.matches);
    }
    updateNight();
    prefersDark.addEventListener('change', updateNight);

    var themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            var next = root.classList.contains('night') ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            updateNight();
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

    var occasion = pickOccasion();
    applyOccasion(occasion);
    var scenery = setUpScenery(occasion);
    setUpWire(occasion, scenery);
    setUpWalker();
}

/* ---------------------------------------------------------------------------
   Seasons and holidays

   The season comes from the month; holidays from the date. To preview any of
   them, add to the URL:
     ?season=spring | summer | fall | winter | none
     ?holiday=newyear | valentines | stpatricks | easter | july4 | halloween |
              thanksgiving | december | christmas | none   (comma-separate several)
     ?date=2026-10-31   (pretend it's that day)
     ?rainbow=1         (force the spring rainbow)
   --------------------------------------------------------------------------- */

var SEASONS = ['spring', 'summer', 'fall', 'winter'];
var HOLIDAYS = ['newyear', 'valentines', 'stpatricks', 'easter', 'july4', 'halloween', 'thanksgiving', 'december', 'christmas'];
var HAT_HOLIDAYS = ['newyear', 'stpatricks', 'easter', 'thanksgiving', 'christmas'];

function pickOccasion() {
    var params = new URLSearchParams(location.search);
    var today = new Date();
    var forcedDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(params.get('date') || '');
    if (forcedDate) today = new Date(+forcedDate[1], +forcedDate[2] - 1, +forcedDate[3]);

    var season = seasonFor(today);
    var holidays = holidaysFor(today);

    var forcedSeason = params.get('season');
    if (forcedSeason) season = SEASONS.indexOf(forcedSeason) >= 0 ? forcedSeason : null;

    var forcedHoliday = params.get('holiday');
    if (forcedHoliday) {
        holidays = forcedHoliday.split(',').filter(function (h) { return HOLIDAYS.indexOf(h) >= 0; });
        if (holidays.indexOf('christmas') >= 0 && holidays.indexOf('december') < 0) holidays.push('december');
    }

    return {
        season: season,
        holidays: holidays,
        rainbow: season === 'spring' && (params.get('rainbow') === '1' || Math.random() < 0.3)
    };
}

function seasonFor(date) {
    var month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
}

function holidaysFor(date) {
    var y = date.getFullYear();
    var m = date.getMonth();
    var d = date.getDate();
    var list = [];
    function near(target, before, after) {
        var days = Math.round((Date.UTC(y, m, d) - Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())) / 86400000);
        return days >= -before && days <= after;
    }
    if ((m === 11 && d === 31) || (m === 0 && d <= 2)) list.push('newyear');
    if (m === 1 && d >= 12 && d <= 14) list.push('valentines');
    if (m === 2 && d >= 15 && d <= 17) list.push('stpatricks');
    if (near(easterSunday(y), 3, 1)) list.push('easter');
    if (m === 6 && d >= 2 && d <= 4) list.push('july4');
    if (m === 9 && d >= 24) list.push('halloween');
    if (near(thanksgiving(y), 3, 3)) list.push('thanksgiving');
    if (m === 11 && d <= 30) list.push('december');
    if (m === 11 && d >= 18 && d <= 26) list.push('christmas');
    return list;
}

// Western Easter Sunday (anonymous Gregorian algorithm).
function easterSunday(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100;
    var d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    var n = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * n + 114) / 31);
    var day = ((h + l - 7 * n + 114) % 31) + 1;
    return new Date(y, month - 1, day);
}

// US Thanksgiving: the fourth Thursday of November.
function thanksgiving(y) {
    var first = new Date(y, 10, 1).getDay();
    return new Date(y, 10, 1 + ((4 - first + 7) % 7) + 21);
}

function applyOccasion(occasion) {
    var root = document.documentElement;
    SEASONS.forEach(function (s) { root.classList.toggle('season-' + s, occasion.season === s); });
    HOLIDAYS.forEach(function (h) { root.classList.toggle('holiday-' + h, occasion.holidays.indexOf(h) >= 0); });
    root.classList.toggle('has-holiday-hat', occasion.holidays.some(function (h) { return HAT_HOLIDAYS.indexOf(h) >= 0; }));
}

function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function between(min, max) {
    return min + Math.random() * (max - min);
}

var LEAF_COLORS = ['#e8832f', '#d9542b', '#f2b134', '#b5562f', '#c9a227'];
var PARTY_COLORS = ['#ff7a6b', '#ffc93c', '#5bb8f5', '#4cc38a', '#8f6cf0', '#ff9cc0'];
var EGG_COLORS = ['#ff9cc0', '#8fd3ff', '#b9f0a9', '#ffe08a', '#d3b8ff'];

// Weather, sky and hill decorations for the hero. Returns helpers that the
// wire uses for one-off effects when it's plucked.
function setUpScenery(occasion) {
    var hero = document.querySelector('.hero');
    var scene = document.querySelector('.wire-scene');
    var ground = document.querySelector('.hero .ground');
    if (!hero || !scene) return null;

    var layer = document.createElement('div');
    layer.className = 'seasonal';
    layer.setAttribute('aria-hidden', 'true');
    hero.insertBefore(layer, hero.firstChild);

    var has = function (h) { return occasion.holidays.indexOf(h) >= 0; };

    function add(className, style, text) {
        var el = document.createElement('span');
        el.className = className;
        Object.keys(style || {}).forEach(function (key) { el.style.setProperty(key, style[key]); });
        if (text) el.textContent = text;
        layer.appendChild(el);
        return el;
    }

    // Falling (or rising) particles, already mid-way when the page opens.
    function particles(kind, count, duration, colors, text) {
        for (var i = 0; i < count; i++) {
            var d = between(duration[0], duration[1]);
            add('fx ' + kind, {
                left: between(-5, 100).toFixed(1) + '%',
                '--d': d.toFixed(2) + 's',
                '--c': colors ? pick(colors) : '',
                '--drift': between(-40, 40).toFixed(0) + 'px',
                'animation-delay': (-Math.random() * d).toFixed(2) + 's'
            }, text);
        }
    }

    // Things that sit on the hill crest, placed along its curve.
    var hillItems = [];
    function onHill(className, fraction, style, text) {
        var el = add('hill-decor ' + className, style, text);
        hillItems.push({ el: el, fraction: fraction });
    }
    function placeHill() {
        if (!ground) return;
        var top = ground.offsetTop;
        var height = ground.offsetHeight;
        hillItems.forEach(function (item) {
            var x = (0.5 - item.fraction) / 0.5;
            var dip = height * (1 - Math.sqrt(Math.max(0, 1 - x * x)));
            item.el.style.left = (item.fraction * 100).toFixed(2) + '%';
            item.el.style.top = (top + dip + 6).toFixed(1) + 'px';
        });
    }

    if (occasion.season === 'spring') {
        particles('rain', 34, [0.8, 1.3]);
        [0.12, 0.2, 0.31, 0.43, 0.57, 0.66, 0.78, 0.88].forEach(function (f, i) {
            onHill('flower', f, { '--c': pick(['#ff9cc0', '#ffffff', '#d3b8ff', '#ff7a6b']) });
        });
        if (occasion.rainbow) add('rainbow');
    }
    if (occasion.season === 'summer') add('sky-sun');
    if (occasion.season === 'fall') particles('leaf', 14, [7, 12], LEAF_COLORS);
    if (occasion.season === 'winter') particles('snow', 36, [7, 13]);

    if (has('newyear')) particles('confetti', 26, [5, 9], PARTY_COLORS);
    if (has('valentines')) particles('heart', 12, [6, 10], null, '♥');
    if (has('stpatricks')) [0.16, 0.34, 0.52, 0.7, 0.86].forEach(function (f) { onHill('', f, {}, '☘️'); });
    if (has('easter')) [0.14, 0.27, 0.41, 0.6, 0.73, 0.85].forEach(function (f) { onHill('egg', f, { '--c': pick(EGG_COLORS) }); });
    if (has('july4')) {
        [[12, 40], [28, 18], [72, 26], [88, 52], [20, 70], [80, 82]].forEach(function (spot, i) {
            add('firework', { left: spot[0] + '%', top: spot[1] + 'px', '--c': pick(PARTY_COLORS), 'animation-delay': (-i * 0.45).toFixed(2) + 's' });
        });
    }
    if (has('halloween')) {
        add('bat', {}, '🦇');
        var pumpkin = document.createElement('span');
        pumpkin.className = 'pumpkin';
        pumpkin.setAttribute('aria-hidden', 'true');
        scene.appendChild(pumpkin);
    }
    layer.querySelectorAll('.heart').forEach(function (el) { el.style.color = pick(['#ff5d8f', '#ff7a6b', '#ff9cc0']); });

    placeHill();
    window.addEventListener('resize', placeHill);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeHill);

    // One-off burst of particles from a point in the wire scene.
    function burst(kind, count, sceneX, sceneY, options) {
        var heroBox = hero.getBoundingClientRect();
        var sceneBox = scene.getBoundingClientRect();
        var x = sceneX + sceneBox.left - heroBox.left;
        var y = sceneY + sceneBox.top - heroBox.top;
        for (var i = 0; i < count; i++) {
            var el = add('fx burst ' + kind, {
                left: x.toFixed(0) + 'px',
                top: y.toFixed(0) + 'px',
                '--c': options.colors ? pick(options.colors) : '',
                '--bx': between(-options.spread, options.spread).toFixed(0) + 'px',
                '--by': between(options.rise[0], options.rise[1]).toFixed(0) + 'px',
                '--br': between(-540, 540).toFixed(0) + 'deg'
            }, options.text);
            if (options.textColor) el.style.color = pick(options.textColor);
            setTimeout(el.remove.bind(el), 1900);
        }
    }

    var lastBall = 0;
    function beachBall() {
        var now = Date.now();
        if (now - lastBall < 4000) return;
        lastBall = now;
        var ball = add('beach-ball');
        setTimeout(ball.remove.bind(ball), 3400);
    }

    // What a pluck shakes loose, by season and holiday.
    function onPluck(strength, sceneX, sceneY) {
        if (occasion.season === 'fall') burst('leaf', Math.round(4 + strength * 6), sceneX, sceneY, { colors: LEAF_COLORS, spread: 140, rise: [80, 220] });
        if (occasion.season === 'winter') burst('snow', Math.round(5 + strength * 8), sceneX, sceneY, { spread: 110, rise: [40, 160] });
        if (occasion.season === 'spring') burst('rain', Math.round(4 + strength * 6), sceneX, sceneY, { spread: 80, rise: [30, 120] });
        if (occasion.season === 'summer' && strength > 0.55) beachBall();
        if (has('newyear')) burst('confetti', Math.round(10 + strength * 14), sceneX, sceneY, { colors: PARTY_COLORS, spread: 180, rise: [-160, 120] });
        if (has('valentines')) burst('heart', Math.round(3 + strength * 5), sceneX, sceneY, { spread: 90, rise: [-200, -80], text: '♥', textColor: ['#ff5d8f', '#ff7a6b'] });
    }

    return { onPluck: onPluck };
}

/* ---------------------------------------------------------------------------
   The birds on the hero wire

   Tap a bird and it hops and says something new. Pluck the wire (swipe the
   cursor across it fast, or tap right on it) and it wobbles; a hard pluck
   sends a bird or two flapping off, and they land back a moment later. At
   night the birds sleep; tapping one wakes it for a moment. In spring a bird
   now and then flies off and comes back with a twig for its nest.
   --------------------------------------------------------------------------- */

var LINES = {
    day: [
        'Hire us!', 'Tweet tweet!', 'Have you tried SwiftUI?', 'We ship on Fridays (carefully)',
        'Placemoir is out! 🗺️', 'Quips keeps your quotes ✍️', 'App Bird is open source 🦉',
        'Got an app idea?', 'Rails ♥', 'Swift!', 'Ship it 🚀', 'CloudKit keeps it in sync ☁️',
        'Hi there 👋', 'Say hi below ⬇️'
    ],
    night: [
        'Zzz… oh, hi!', 'Five more minutes…', 'Past my bedtime 🌙', 'Shh, the others are asleep',
        'Dreaming in Swift…', 'Still shipping at this hour? 🦉', 'Is it morning yet?'
    ],
    spring: ['April showers ☔', 'Spring cleaning my code 🌷', 'Nest building season 🪺', 'Fresh features blooming 🌸', 'Good thing I brought an umbrella'],
    summer: ['Too hot to ship 😎', 'Out of office (not really)', 'SPF 50 and SwiftUI', 'Summer sprint ☀️', 'Want some ice cream? 🍦'],
    fall: ['Leaf me alone, I\'m coding 🍂', 'Sweater weather 🧶', 'Falling for Rails 🍁', 'Pumpkin spice and Swift ☕'],
    winter: ['Brrr… ❄️', 'Cozy coding weather ☕', 'Snow day? Ship day.', 'Wrapped up warm 🧣'],
    newyear: ['Happy New Year! 🎉', 'New year, new apps', 'Resolution: ship more 🚀'],
    valentines: ['Be my Valentine? 💌', 'We ❤️ our users', 'Love at first launch 💘'],
    stpatricks: ['Feeling lucky! 🍀', 'Top o\' the mornin\'!', 'Found a pot of gold… I mean bugs'],
    easter: ['Happy Easter! 🐣', 'Found an egg! 🥚', 'Hop to it! 🐰'],
    july4: ['Happy Fourth! 🎆', 'Ooh, fireworks! 🎇', 'Shipping with a bang 💥'],
    halloween: ['Boo! 👻', 'Trick or tweet! 🎃', 'This bug is spooky 🕷️'],
    halloweenNight: ['Did you hear that? 👀', 'Too spooky to sleep 🦇'],
    thanksgiving: ['Happy Thanksgiving! 🦃', 'Thankful for you 🧡', 'Gobble gobble? 🦃'],
    december: ['Happy holidays! ✨', 'Deck the wires 🎄'],
    christmas: ['Merry Christmas! 🎄', 'Ho ho ho! 🎅', 'Making a list, checking it twice ✅'],
    rainbow: ['Look, a rainbow! 🌈']
};

function setUpWire(occasion, scenery) {
    var scene = document.querySelector('.wire-scene');
    if (!scene) return;

    var path = scene.querySelector('.wire path');
    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // The wire is a cubic curve in a 1000×230 viewBox stretched to the scene,
    // from (-10, 120) to (1010, 120), with control points at x = 330 and 670.
    // At rest both sit at y = 180 (the same sag as before). Each control point
    // has its own spring, so a pluck wobbles the wire unevenly, not like a metronome.
    var END_Y = 120;
    var REST = 180;
    var FEET = 0.95;        // where the feet sit in the bird drawing, as a share of its height

    var wire = [
        { offset: 0, speed: 0, stiffness: 170, damping: 3.4 },
        { offset: 0, speed: 0, stiffness: 150, damping: 3.0 }
    ];
    var frame = 0;
    var lastTime = 0;
    var lastPointer = null;
    var calmSince = 0;

    // Seasonal and holiday lines get mixed in more often than the everyday ones.
    var dayLines = LINES.day.slice();
    function weigh(list, times) { for (var i = 0; i < times; i++) dayLines = dayLines.concat(list); }
    if (occasion.season) weigh(LINES[occasion.season], 2);
    occasion.holidays.forEach(function (h) { weigh(LINES[h], 3); });
    if (occasion.rainbow) weigh(LINES.rainbow, 2);
    var nightLines = LINES.night.slice();
    if (occasion.holidays.indexOf('halloween') >= 0) nightLines = nightLines.concat(LINES.halloweenNight, LINES.halloweenNight);

    var birds = Array.prototype.map.call(scene.querySelectorAll('.perch'), function (el) {
        var bubble = el.querySelector('.tweet');
        return {
            el: el,
            xPercent: parseFloat(el.getAttribute('data-x')) || 0,
            bubble: bubble,
            originalText: bubble ? bubble.textContent : null,
            motion: null,
            // Each bird hangs on with its own little spring, so they lag and
            // overshoot the wire a bit differently.
            ride: 0,
            rideSpeed: 0,
            grip: between(240, 420),
            settle: between(8, 14),
            near: 0,        // how much of each control point's pull reaches this bird
            far: 0,
            lastLine: '',
            chirping: false,
            timer: 0
        };
    });

    // December: a string of lights hanging from the wire.
    var bulbs = [];
    if (occasion.holidays.indexOf('december') >= 0) {
        for (var i = 0; i < 13; i++) {
            var bulb = document.createElement('span');
            bulb.className = 'bulb';
            bulb.style.setProperty('--c', PARTY_COLORS[i % PARTY_COLORS.length]);
            bulb.style.animationDelay = (-i * 0.37).toFixed(2) + 's';
            scene.appendChild(bulb);
            bulbs.push({ el: bulb, t: 0.06 + i * (0.88 / 12) });
        }
    }

    function isNight() {
        return root.classList.contains('night');
    }

    function weights(t) {
        return { near: 3 * (1 - t) * (1 - t) * t, far: 3 * (1 - t) * t * t, ends: (1 - t) * (1 - t) * (1 - t) + t * t * t };
    }

    function wireYAt(t, live) {
        var w = weights(t);
        var a = live ? wire[0].offset : 0;
        var b = live ? wire[1].offset : 0;
        return w.ends * END_Y + w.near * (REST + a) + w.far * (REST + b);
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
            var w = weights(t);
            bird.near = w.near;
            bird.far = w.far;
            bird.el.style.top = (wireYAt(t, false) - size * FEET).toFixed(1) + 'px';
        });
        drawBulbs();
    }

    function drawBulbs() {
        if (!bulbs.length) return;
        var width = scene.clientWidth;
        bulbs.forEach(function (b) {
            var x = (-10 + 1020 * b.t) / 1000 * width;
            var y = wireYAt(b.t, true) + 1;
            b.el.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px)';
        });
    }

    function wireMoving() {
        return wire.some(function (c) { return Math.abs(c.offset) > 0.3 || Math.abs(c.speed) > 0.3; });
    }

    function animating() {
        return wireMoving() || birds.some(function (b) {
            return b.motion || Math.abs(b.ride) > 0.05 || Math.abs(b.rideSpeed) > 0.05 || b.el.classList.contains('stirred');
        });
    }

    function start() {
        if (frame) return;
        lastTime = 0;
        frame = requestAnimationFrame(step);
    }

    function step(now) {
        var dt = lastTime ? Math.min(0.033, (now - lastTime) / 1000) : 1 / 60;
        lastTime = now;

        wire.forEach(function (c) {
            c.speed += (-c.stiffness * c.offset - c.damping * c.speed) * dt;
            c.offset = Math.max(-110, Math.min(110, c.offset + c.speed * dt));
            if (Math.abs(c.offset) < 0.05 && Math.abs(c.speed) < 0.05) { c.offset = 0; c.speed = 0; }
        });
        path.setAttribute('d', 'M-10 120 C 330 ' + (REST + wire[0].offset).toFixed(2) + ' 670 ' + (REST + wire[1].offset).toFixed(2) + ' 1010 120');
        drawBulbs();

        var shaking = wireMoving();
        if (shaking) calmSince = now;

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
                    var up = p < m.rise ? easeOut(p / m.rise) : p > 1 - m.fall ? 1 - easeIn((p - (1 - m.fall)) / m.fall) : 1;
                    var flutter = p > m.rise && p < 1 - m.fall ? Math.sin(m.t * m.flutterRate) * m.flutter : 0;
                    lift = up * m.height + flutter;
                    dx = Math.sin(p * Math.PI) * m.drift + Math.sin(m.t * m.flutterRate * 0.5) * m.flutter * up;
                }
                if (p >= 1) {
                    bird.motion = null;
                    bird.el.classList.remove('flapping');
                    if (!bird.chirping) bird.el.classList.remove('awake');
                    if (m.onLand) m.onLand();
                }
            }

            // Follow the wire through this bird's own spring (birds in the air let go).
            var target = m && m.kind === 'fly' ? 0 : bird.near * wire[0].offset + bird.far * wire[1].offset;
            bird.rideSpeed += (bird.grip * (target - bird.ride) - bird.settle * bird.rideSpeed) * dt;
            bird.ride += bird.rideSpeed * dt;
            if (Math.abs(bird.ride - target) < 0.05 && Math.abs(bird.rideSpeed) < 0.05) { bird.ride = target; bird.rideSpeed = 0; }

            var tilt = Math.max(-14, Math.min(14, bird.rideSpeed * 0.06));
            var y = bird.ride - lift;
            var moving = Math.abs(y) > 0.05 || Math.abs(dx) > 0.05 || Math.abs(tilt) > 0.05;
            bird.el.style.transform = moving
                ? 'translate(' + dx.toFixed(1) + 'px, ' + y.toFixed(1) + 'px) rotate(' + tilt.toFixed(2) + 'deg)'
                : '';

            // Sleeping birds stop snoring the moment the wire shakes or they take off,
            // and drift back off once it's been calm for a little while.
            var stirred = shaking || bird.motion || now - calmSince < 900;
            bird.el.classList.toggle('stirred', !!stirred);
        });

        frame = animating() ? requestAnimationFrame(step) : 0;
    }

    function easeOut(x) { return 1 - (1 - x) * (1 - x); }
    function easeIn(x) { return x * x; }

    function takeOff(bird, options) {
        bird.motion = {
            kind: 'fly', t: 0,
            duration: options.duration || between(1.5, 2.6),
            height: options.height || between(55, 180),
            drift: (Math.random() < 0.5 ? -1 : 1) * (options.drift || between(10, 70)),
            rise: between(0.22, 0.34),
            fall: between(0.22, 0.32),
            flutter: between(3, 8),
            flutterRate: between(7, 11),
            onLand: options.onLand
        };
        bird.el.classList.add('flapping', 'awake');
        start();
    }

    // sceneX/sceneY: where on the wire it was plucked, in scene pixels.
    function pluck(strength, direction, sceneX, sceneY) {
        if (reduceMotion.matches) return;
        var fraction = Math.max(0, Math.min(1, sceneX / scene.clientWidth));
        var kick = direction * strength * between(1100, 1500);
        // The side nearer the pluck takes more of it.
        wire[0].speed += kick * (1.25 - fraction * 0.9);
        wire[1].speed += kick * (0.35 + fraction * 0.9);
        // A slightly different spring every time keeps it from looking mechanical.
        wire.forEach(function (c) {
            c.stiffness = between(120, 230);
            c.damping = between(2.6, 4.2);
        });
        calmSince = performance.now();

        if (strength > 0.55) {
            // A hard pluck startles one to three birds that aren't already in the air.
            var grounded = birds.filter(function (b) { return !b.motion; });
            var count = Math.min(grounded.length, strength > 0.85 ? (Math.random() < 0.4 ? 3 : 2) : 1);
            for (var i = 0; i < count; i++) {
                var bird = grounded.splice(Math.floor(Math.random() * grounded.length), 1)[0];
                // Stagger take-offs a little: not everyone reacts at once.
                setTimeout(takeOff.bind(null, bird, {}), between(0, 180));
            }
        }
        if (scenery) scenery.onPluck(strength, sceneX, sceneY);
        start();
    }

    function chirp(bird) {
        var lines = isNight() ? nightLines : dayLines;
        var line;
        do { line = pick(lines); } while (line === bird.lastLine && lines.length > 1);
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
        bird.chirping = true;

        clearTimeout(bird.timer);
        bird.timer = setTimeout(function () {
            bird.chirping = false;
            if (!bird.motion) bird.el.classList.remove('awake');
            bird.bubble.classList.remove('chirp');
            if (bird.originalText === null) {
                bird.bubble.remove();
                bird.bubble = null;
            } else {
                bird.bubble.textContent = bird.originalText;
            }
        }, 3200);

        if (!reduceMotion.matches && !bird.motion) {
            bird.motion = { kind: 'hop', t: 0, duration: between(0.3, 0.4), height: between(14, 24) };
            start();
        }
    }

    // Spring: now and then a bird flies off and comes back with a twig.
    if (occasion.season === 'spring') {
        var nextTrip = performance.now() + between(8000, 15000);
        setInterval(function () {
            var now = performance.now();
            if (now < nextTrip || document.hidden || reduceMotion.matches || isNight()) return;
            var free = birds.filter(function (b) { return !b.motion && !b.el.classList.contains('has-twig'); });
            if (!free.length) return;
            nextTrip = now + between(18000, 32000);
            var bird = pick(free);
            takeOff(bird, {
                duration: between(2.6, 3.4), height: between(160, 230), drift: between(60, 110),
                onLand: function () {
                    bird.el.classList.add('has-twig');
                    setTimeout(function () { bird.el.classList.remove('has-twig'); }, 9000);
                }
            });
        }, 1000);
    }

    // Distance from a point (in scene pixels) to the wire, and which side it's on.
    function wireOffset(x, y) {
        var t = Math.min(1, Math.max(0, tAtPixel(x, scene.clientWidth)));
        return y - wireYAt(t, true);
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
            if (crossed && speed > 0.25) pluck(Math.min(1, speed / 2.2), side > 0 ? 1 : -1, point.x, point.y - side);
        }
        lastPointer = { x: point.x, y: point.y, time: point.time, side: side };
    });

    scene.addEventListener('pointerleave', function () {
        lastPointer = null;
    });

    // A tap or click right on the wire plucks it too.
    scene.addEventListener('click', function (event) {
        var point = scenePoint(event);
        var off = wireOffset(point.x, point.y);
        if (Math.abs(off) < 26) pluck(between(0.65, 0.85), 1, point.x, point.y - off);
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

main();
