// ============================================
// CIRCUIT NETWORK BACKGROUND
// ============================================
(function() {
    const canvas = document.getElementById('circuit-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const PURPLE = { r: 124, g: 92, b: 252 };
    const CYAN = { r: 34, g: 211, b: 238 };
    const GRID = 80;           // spacing between potential node positions
    const NODE_RADIUS = 4;
    const NODE_STROKE = 1;
    const EDGE_WIDTH = 1.5;
    const BASE_ALPHA = 0.15;   // dim resting state
    const PULSE_SPEED = 100;   // px per second (slower = longer visible)
    const MAX_PULSES = 24;
    const SPAWN_INTERVAL = 300; // ms between new pulse spawns
    const GLOW_RADIUS = 40;

    let nodes = [];
    let edges = [];
    let pulses = [];
    let W, H, fullH, dpr;
    let lastSpawn = 0;

    // Content exclusion zone — center column where text lives
    function contentZone() {
        const maxW = 1280; // max-w-5xl ≈ 1024 + padding, generous
        const cx = W / 2;
        const half = Math.min(maxW, W * 0.55) / 2;
        return { left: cx - half, right: cx + half };
    }

    function inExclusionZone(x) {
        const z = contentZone();
        // Soft fade zone — nodes partially allowed in margins
        const margin = 60;
        return x > (z.left - margin) && x < (z.right + margin);
    }

    function resize() {
        dpr = window.devicePixelRatio || 1;
        W = window.innerWidth;
        H = window.innerHeight;
        fullH = document.documentElement.scrollHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildNetwork();
    }

    function buildNetwork() {
        nodes = [];
        edges = [];
        pulses = [];

        const cols = Math.ceil(W / GRID) + 1;
        const rows = Math.ceil(fullH / GRID) + 1;
        const nodeMap = {};

        // Place nodes on a jittered grid, excluding center
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const baseX = col * GRID;
                const baseY = row * GRID;

                if (inExclusionZone(baseX)) continue;

                // 60% chance to place a node (sparse)
                if (Math.random() > 0.6) continue;

                const jitter = GRID * 0.3;
                const x = baseX + (Math.random() - 0.5) * jitter;
                const y = baseY + (Math.random() - 0.5) * jitter;

                const id = nodes.length;
                const node = { x, y, id, edges: [] };
                nodes.push(node);
                nodeMap[`${col},${row}`] = node;

                // Connect to neighbors (right, down, diagonal-right-down)
                const neighbors = [
                    [col - 1, row],
                    [col, row - 1],
                    [col - 1, row - 1],
                    [col + 1, row - 1],
                ];

                for (const [nc, nr] of neighbors) {
                    const neighbor = nodeMap[`${nc},${nr}`];
                    if (!neighbor) continue;

                    // Only connect ~50% of potential edges (organic feel)
                    if (Math.random() > 0.5) continue;

                    // Don't connect if edge crosses exclusion zone
                    const midX = (x + neighbor.x) / 2;
                    if (inExclusionZone(midX)) continue;

                    const edge = {
                        from: neighbor,
                        to: node,
                        length: Math.hypot(x - neighbor.x, y - neighbor.y),
                    };
                    edges.push(edge);
                    node.edges.push(edge);
                    neighbor.edges.push(edge);
                }
            }
        }
    }

    function spawnPulse() {
        if (pulses.length >= MAX_PULSES || edges.length === 0) return;

        // Pick a random edge to start
        const startEdge = edges[Math.floor(Math.random() * edges.length)];
        const reverse = Math.random() > 0.5;
        const color = Math.random() > 0.4 ? PURPLE : CYAN;

        pulses.push({
            edge: startEdge,
            progress: 0,          // 0 to 1 along current edge
            reverse,              // direction on current edge
            color,
            life: 1.0,            // fades over time
            pathLength: 0,        // total distance traveled
            maxPath: 800 + Math.random() * 1200, // how far before dying
        });
    }

    function advancePulse(pulse, dt) {
        const speed = PULSE_SPEED / pulse.edge.length;
        pulse.progress += speed * dt;
        pulse.pathLength += PULSE_SPEED * dt;

        // Smooth life curve — quick fade in, long sustain, gentle fade out
        const t = pulse.pathLength / pulse.maxPath;
        const fadeIn = Math.min(1, pulse.pathLength / 60);   // ramp up over first 60px
        const fadeOut = t > 0.7 ? 1 - Math.pow((t - 0.7) / 0.3, 1.5) : 1; // gentle out last 30%
        pulse.life = Math.max(0, fadeIn * fadeOut);

        if (pulse.progress >= 1) {
            // Reached end of edge — pick next edge
            const arriveAt = pulse.reverse ? pulse.edge.from : pulse.edge.to;
            const nextEdges = arriveAt.edges.filter(e => e !== pulse.edge);

            if (nextEdges.length === 0 || pulse.life <= 0.05) {
                pulse.dead = true;
                return;
            }

            const nextEdge = nextEdges[Math.floor(Math.random() * nextEdges.length)];
            const nextReverse = nextEdge.to === arriveAt;

            pulse.edge = nextEdge;
            pulse.progress = 0;
            pulse.reverse = nextReverse;
        }
    }

    function pulsePosition(pulse) {
        const t = pulse.progress;
        const e = pulse.edge;
        const from = pulse.reverse ? e.to : e.from;
        const to = pulse.reverse ? e.from : e.to;
        return {
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t,
        };
    }

    const LERP_SPEED = 0.12; // how fast glow ramps up/down (0-1, lower = smoother)

    // Compute instantaneous proximity to active pulses
    function pulseInfluence(x, y) {
        let best = 0;
        let bestColor = PURPLE;
        for (const pulse of pulses) {
            const pos = pulsePosition(pulse);
            const dist = Math.hypot(pos.x - x, pos.y - y);
            const influence = Math.max(0, 1 - dist / (GLOW_RADIUS * 3)) * pulse.life;
            if (influence > best) {
                best = influence;
                bestColor = pulse.color;
            }
        }
        return { strength: best, color: bestColor };
    }

    function draw(time) {
        ctx.clearRect(0, 0, W, H);

        // Offset by scroll so network moves with page
        const scrollY = window.scrollY || window.pageYOffset;
        ctx.save();
        ctx.translate(0, -scrollY);

        // Draw edges — illuminate when pulse is nearby, lerp glow
        for (const edge of edges) {
            const midX = (edge.from.x + edge.to.x) / 2;
            const midY = (edge.from.y + edge.to.y) / 2;
            const target = pulseInfluence(midX, midY);

            // Initialize stored glow
            if (edge.glow === undefined) edge.glow = 0;
            if (!edge.glowColor) edge.glowColor = PURPLE;

            // Lerp toward target
            edge.glow += (target.strength - edge.glow) * LERP_SPEED;
            if (target.strength > 0.05) edge.glowColor = target.color;

            const alpha = BASE_ALPHA + edge.glow * 0.5;
            const c = edge.glow > 0.02 ? edge.glowColor : PURPLE;

            // Shorten edge so it stops at node boundary
            const dx = edge.to.x - edge.from.x;
            const dy = edge.to.y - edge.from.y;
            const len = Math.hypot(dx, dy);
            if (len < NODE_RADIUS * 3) continue; // skip tiny edges
            const ux = dx / len;
            const uy = dy / len;
            const gap = NODE_RADIUS + 1.5; // stop just outside the circle
            const x1 = edge.from.x + ux * gap;
            const y1 = edge.from.y + uy * gap;
            const x2 = edge.to.x - ux * gap;
            const y2 = edge.to.y - uy * gap;

            ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
            ctx.lineWidth = EDGE_WIDTH + edge.glow * 1.5;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // Draw nodes — hollow circles with clear center, lerp glow
        for (const node of nodes) {
            const target = pulseInfluence(node.x, node.y);

            if (node.glow === undefined) node.glow = 0;
            if (!node.glowColor) node.glowColor = PURPLE;

            node.glow += (target.strength - node.glow) * LERP_SPEED;
            if (target.strength > 0.05) node.glowColor = target.color;

            const alpha = BASE_ALPHA * 1.8 + node.glow * 0.7;
            const c = node.glow > 0.02 ? node.glowColor : PURPLE;

            // Clear interior to background color
            ctx.fillStyle = '#08080c';
            ctx.beginPath();
            ctx.arc(node.x, node.y, NODE_RADIUS + 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Draw circle outline
            ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
            ctx.lineWidth = NODE_STROKE + node.glow * 0.5;
            ctx.beginPath();
            ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw pulses — glow + bright trail on edge
        for (const pulse of pulses) {
            const pos = pulsePosition(pulse);
            const c = pulse.color;
            const alpha = pulse.life;

            // Glow
            const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, GLOW_RADIUS);
            grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${0.3 * alpha})`);
            grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, GLOW_RADIUS, 0, Math.PI * 2);
            ctx.fill();

            // Bright trail along current edge behind the pulse
            const e = pulse.edge;
            const from = pulse.reverse ? e.to : e.from;
            const to = pulse.reverse ? e.from : e.to;
            const trailLen = 0.35;
            const trailStart = Math.max(0, pulse.progress - trailLen);

            const sx = from.x + (to.x - from.x) * trailStart;
            const sy = from.y + (to.y - from.y) * trailStart;
            const ex = from.x + (to.x - from.x) * pulse.progress;
            const ey = from.y + (to.y - from.y) * pulse.progress;

            const trailGrad = ctx.createLinearGradient(sx, sy, ex, ey);
            trailGrad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
            trailGrad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, ${0.8 * alpha})`);

            ctx.strokeStyle = trailGrad;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();

            // Bright dot at pulse head
            ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${0.9 * alpha})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
            ctx.fill();

            // White-hot core
            ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * alpha})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    let lastTime = 0;
    function animate(timestamp) {
        const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;

        // Spawn pulses
        if (timestamp - lastSpawn > SPAWN_INTERVAL) {
            spawnPulse();
            lastSpawn = timestamp;
        }

        // Update pulses
        for (const pulse of pulses) {
            advancePulse(pulse, dt);
        }
        pulses = pulses.filter(p => !p.dead);

        draw(timestamp);
        requestAnimationFrame(animate);
    }

    // Only run on desktop
    if (window.innerWidth >= 1024) {
        resize();
        requestAnimationFrame(animate);

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(resize, 200);
        });
    }
})();

// ============================================
// SCROLL ANIMATIONS (blur-in reveal)
// ============================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ============================================
// SMOOTH SCROLL
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ============================================
// MOBILE MENU
// ============================================
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (mobileMenuBtn && mobileMenu) {
    const mobileNavLinks = mobileMenu.querySelectorAll('.mobile-nav-link');

    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileNavLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            mobileMenu.classList.add('hidden');
        });
    });

    document.addEventListener('click', (e) => {
        if (!mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            mobileMenu.classList.add('hidden');
        }
    });
}

// ============================================
// SLOT MACHINE STAT ANIMATION
// ============================================
const statNumbers = document.querySelectorAll('.stat-number');

const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statEl = entry.target;
            const digits = statEl.querySelectorAll('.stat-digit');

            digits.forEach((digit, i) => {
                const value = parseInt(digit.dataset.value);
                const inner = digit.querySelector('.stat-digit-inner');
                if (!inner || value === 0) return;

                setTimeout(() => {
                    inner.style.transform = `translateY(-${value}em)`;
                }, 120 * i);
            });

            statObserver.unobserve(statEl);
        }
    });
}, { threshold: 0.3 });

statNumbers.forEach(el => statObserver.observe(el));

// ============================================
// TIMELINE NODE ACTIVATION ON SCROLL
// ============================================
if (window.innerWidth >= 1024) {
    const timelineNodes = document.querySelectorAll('.timeline-node, .timeline-node-cyan');
    const nodeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const section = entry.target;
                const nodes = section.querySelectorAll('.timeline-node');
                nodes.forEach(node => node.classList.add('active'));
            }
        });
    }, { threshold: 0.2 });

    document.querySelectorAll('section[id]').forEach(s => nodeObserver.observe(s));
}
